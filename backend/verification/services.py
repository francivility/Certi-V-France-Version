"""Face + ID verification pipeline.

Runs fully offline on the backend machine. No external API.

Pipeline:
  1. Blink challenge (liveness): count eye closures over a short frame burst
     using MediaPipe Face Landmark blendshapes (eyeBlinkLeft/Right).
  2. Face matching: the best selfie frame is compared against the face found
     in the photo of the government-issued ID. Embeddings come from OpenCV's
     SFace model, driven by YuNet face detection (both ONNX models from the
     OpenCV Zoo).

All model files live in ``model_assets/`` so no internet is needed at runtime.
"""

import cv2
import numpy as np
from pathlib import Path

from .ocr import OCRUnavailableError, validate_id_type

MODELS_DIR = Path(__file__).resolve().parent / 'model_assets'
YUNET_PATH = MODELS_DIR / 'face_detection_yunet_2023mar.onnx'
SFACE_PATH = MODELS_DIR / 'face_recognition_sface_2021dec.onnx'
LANDMARKER_PATH = MODELS_DIR / 'face_landmarker.task'

# How many eyeblinks are required to pass the liveness step.
BLINK_REQUIRED = 2
# Measured "closed" when the average eyeBlink blendshape is above this.
# Slightly below 0.5 so blinks remain detectable on compressed phone JPEGs
# where MediaPipe blendshape scores run a touch lower than LiveView.
EYE_CLOSED_SCORE = 0.45
# Minimum SFace cosine similarity to consider the ID face and selfie the same
# person. OpenCV's canonical SFace demo uses ~0.363; 0.35 keeps it slightly
# forgiving for real-world phone photos.
MATCH_THRESHOLD = 0.35
# Compare more than one clear selfie frame. A single frame can be blurred,
# mid-expression, or poorly exposed even when the live camera detected a face.
SELFIE_MATCH_FRAMES = 3


class VerificationError(Exception):
    """A user-fixable problem (no face, no blink, unreadable ID...)."""


_cache = {}


def _load_models():
    if 'ready' in _cache:
        return _cache

    missing = [p.name for p in (YUNET_PATH, SFACE_PATH, LANDMARKER_PATH) if not p.exists()]
    if missing:
        raise VerificationError(
            'Verification models are missing (%s). '
            'Run `python -m verification.fetch_models` once.' % ', '.join(missing)
        )

    detector = cv2.FaceDetectorYN_create(str(YUNET_PATH), '', (640, 640))
    recognizer = cv2.FaceRecognizerSF_create(str(SFACE_PATH), '')

    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision

    landmarker_options = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(LANDMARKER_PATH)),
        num_faces=1,
        output_face_blendshapes=True,
    )
    landmarker = vision.FaceLandmarker.create_from_options(landmarker_options)

    _cache.update(detector=detector, recognizer=recognizer,
                  landmarker=landmarker, mp=mp, ready=True)
    return _cache


def decode_jpeg(data):
    arr = np.frombuffer(data, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def _detect(img):
    """Run YuNet detection.

    Returns ``(faces, img_used)``. ``faces`` is an (N, 15) array from OpenCV
    (bbox + 5 landmarks) or ``None``. When the face is tiny (e.g. a low-res
    phone photo of an ID), the image is upscaled and detection retried so the
    returned coordinates always match ``img_used``.
    """
    models = _load_models()
    detector = models['detector']
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    _, faces = detector.detect(img)
    if faces is not None and len(faces) > 0:
        return faces.reshape(-1, 15), img
    for scale in (2, 3):
        up = cv2.resize(img, (w * scale, h * scale))
        detector.setInputSize((w * scale, h * scale))
        _, resized_faces = detector.detect(up)
        if resized_faces is not None and len(resized_faces) > 0:
            return resized_faces.reshape(-1, 15), up
    return None, img


def _eye_closure_score(bgr_img):
    """Average ``eyeBlinkLeft``/``eyeBlinkRight`` blendshape score (0..1)."""
    models = _load_models()
    rgb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    mp_img = models['mp'].Image(image_format=models['mp'].ImageFormat.SRGB, data=rgb)
    result = models['landmarker'].detect(mp_img)
    if not result.face_blendshapes:
        return None
    blendshapes = {b.category_name: b.score for b in result.face_blendshapes[0]}
    left = blendshapes.get('eyeBlinkLeft', 0.0)
    right = blendshapes.get('eyeBlinkRight', 0.0)
    return (left + right) / 2.0


def _count_blinks(frames):
    """Returns ``(blink_count, face_detected)`` for a frame burst."""
    prev_closed = False
    blink_started = False
    blink_count = 0
    face_detected = False

    for data in frames:
        img = decode_jpeg(data)
        if img is None:
            continue
        faces, _ = _detect(img)
        if faces is None:
            prev_closed = False
            continue
        face_detected = True
        closure = _eye_closure_score(img)
        if closure is None:
            continue
        is_closed = closure > EYE_CLOSED_SCORE
        if is_closed and not prev_closed:
            blink_started = True
        if blink_started and prev_closed and not is_closed:
            blink_count += 1
            blink_started = False
        prev_closed = is_closed

    return blink_count, face_detected


def _selfie_match_candidates(frames):
    """Return several clear, open-eye selfie frames for face matching.

    The browser sends a burst of frames rather than one photograph. Selecting
    only the largest face made genuine matches fluctuate when that one frame
    was slightly blurred or captured during an expression. We score candidates
    by face size and sharpness, prefer open eyes, and keep spaced-out frames so
    the final comparison represents the capture rather than one instant.
    """
    candidates = []
    for index, data in enumerate(frames):
        img = decode_jpeg(data)
        if img is None:
            continue
        faces, img_used = _detect(img)
        if faces is None:
            continue
        faces = [f for f in faces if f[2] > 0 and f[3] > 0]
        if not faces:
            continue
        largest = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = [int(v) for v in largest[:4]]
        area = w * h

        # A Laplacian variance is a lightweight focus measure. Clamp the crop
        # to the image before evaluating it because face detectors may place a
        # landmark close to an edge.
        img_h, img_w = img_used.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(img_w, x + w), min(img_h, y + h)
        face_crop = img_used[y1:y2, x1:x2]
        sharpness = 0.0
        if face_crop.size:
            sharpness = float(cv2.Laplacian(cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())

        closure = _eye_closure_score(img_used)
        open_eyes = closure is not None and closure <= EYE_CLOSED_SCORE
        # Face area is normalized so an enlarged source image does not win just
        # because it contains more pixels.
        face_ratio = area / max(1, img_w * img_h)
        candidates.append((open_eyes, face_ratio, sharpness, index, img_used, largest))

    if not candidates:
        return []

    # Open-eye frames are preferred, but retain fallback frames for devices
    # where blendshape data is briefly unavailable.
    preferred = [candidate for candidate in candidates if candidate[0]] or candidates
    preferred.sort(key=lambda candidate: (candidate[1], candidate[2]), reverse=True)

    selected = []
    for candidate in preferred:
        # Avoid selecting near-identical consecutive video frames.
        if all(abs(candidate[3] - picked[3]) >= 3 for picked in selected):
            selected.append(candidate)
        if len(selected) == SELFIE_MATCH_FRAMES:
            break

    return [(candidate[4], candidate[5]) for candidate in selected]


def _face_from_photo(id_image):
    """Extract the largest face from an ID photo. Returns (img, face_row)."""
    img = decode_jpeg(id_image)
    if img is None:
        raise VerificationError('The ID photo could not be read.')
    faces, img_used = _detect(img)
    if faces is None:
        raise VerificationError(
            'No face could be found in the ID photo. Retake it in good light '
            'and make sure the face on the ID is clearly visible.'
        )
    faces = [f for f in faces if f[2] > 0 and f[3] > 0]
    if not faces:
        raise VerificationError('No usable face found in the ID photo.')
    largest = max(faces, key=lambda f: f[2] * f[3])
    return img_used, largest


def _best_id_photo(id_images):
    """Choose the sharpest usable ID image from a short still burst."""
    best = None
    for data in id_images:
        img = decode_jpeg(data)
        if img is None:
            continue
        faces, img_used = _detect(img)
        if faces is None:
            continue
        faces = [face for face in faces if face[2] > 0 and face[3] > 0]
        if not faces:
            continue
        largest = max(faces, key=lambda face: face[2] * face[3])
        x, y, w, h = [int(value) for value in largest[:4]]
        img_h, img_w = img_used.shape[:2]
        face_crop = img_used[max(0, y):min(img_h, y + h), max(0, x):min(img_w, x + w)]
        if not face_crop.size:
            continue
        sharpness = float(cv2.Laplacian(cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())
        face_ratio = (w * h) / max(1, img_w * img_h)
        quality = (face_ratio, sharpness)
        if best is None or quality > best[0]:
            best = (quality, data)

    if best is None:
        raise VerificationError(
            'No face could be found in the ID photo. Retake it in good light '
            'and make sure the face on the ID is clearly visible.'
        )
    return best[1]


def _match_faces(selfie_img, selfie_face, id_img):
    """SFace cosine similarity between the selfie face and the ID face."""
    models = _load_models()
    recognizer = models['recognizer']
    id_img_used, id_face = _face_from_photo(id_img)
    crop1 = recognizer.alignCrop(selfie_img, selfie_face)
    crop2 = recognizer.alignCrop(id_img_used, id_face)
    feat1 = recognizer.feature(crop1)
    feat2 = recognizer.feature(crop2)
    score = recognizer.match(feat1, feat2, cv2.FaceRecognizerSF_FR_COSINE)
    return float(np.clip(score, 0.0, 1.0))


def _match_selfie_candidates(candidates, id_images):
    """Match several quality-selected selfie frames against the ID face.

    The median keeps one soft or awkward frame from turning a genuine match
    into a rejection, while still requiring the selected frames to agree.
    """
    models = _load_models()
    recognizer = models['recognizer']
    id_img_used, id_face = _face_from_photo(_best_id_photo(id_images))
    id_crop = recognizer.alignCrop(id_img_used, id_face)
    id_feature = recognizer.feature(id_crop)

    scores = []
    for selfie_img, selfie_face in candidates:
        selfie_crop = recognizer.alignCrop(selfie_img, selfie_face)
        selfie_feature = recognizer.feature(selfie_crop)
        score = recognizer.match(selfie_feature, id_feature, cv2.FaceRecognizerSF_FR_COSINE)
        scores.append(float(np.clip(score, 0.0, 1.0)))

    if not scores:
        raise VerificationError('No usable open-eye selfie frames were captured.')

    return float(np.median(scores)), scores


def run(frames, id_images, phone_blinks=None, id_type=''):
    """Run the full verification.

    ``frames``: list of JPEG bytes captured during the blink challenge.
    ``id_images``: one or more JPEG bytes of the government-issued ID photo.
    ``phone_blinks``: optional count reported by the phone's real-time
    blendshape counter. The phone evaluates the live feed (same MediaPipe
    blendshapes) which is more reliable than reconstituting blinks from a
    sparse set of JPEGs, so the higher of the two counts is trusted.
    ``id_type``: selected document type, validated against OCR markers.

    Returns a dict:
      blink_count, face_detected, match_score, match_passed, selfie_frame
    Raises VerificationError when a user-fixable step fails.
    """
    print(f'[VERIFY-STEP] pipeline entered, id_type={id_type!r}', flush=True)
    _load_models()

    if not frames:
        raise VerificationError('No selfie frames were received.')

    computed, face_detected = _count_blinks(frames)
    if not face_detected:
        raise VerificationError(
            'No face was detected in the video. Center your face and try again.'
        )
    blink_count = max(computed, int(phone_blinks or 0))
    if blink_count < BLINK_REQUIRED:
        raise VerificationError(
            f'The system counted only {blink_count} blink(s). '
            f'Please blink slowly {BLINK_REQUIRED} times.'
        )

    candidates = _selfie_match_candidates(frames)
    if not candidates:
        raise VerificationError('No usable face frames were captured.')

    if not id_images:
        raise VerificationError('No ID photo was received.')
    id_image = _best_id_photo(id_images)
    try:
        id_ocr = validate_id_type(id_image, id_type)
    except OCRUnavailableError as exc:
        raise VerificationError(str(exc)) from exc
    print(
        f'[OCR-STEP] id_type={id_type!r} accepted={id_ocr.accepted} '
        f'detected={id_ocr.detected_type!r} markers={id_ocr.matched_markers} '
        f'message={id_ocr.message!r}',
        flush=True,
    )
    if not id_ocr.accepted:
        raise VerificationError(id_ocr.message)

    match_score, _ = _match_selfie_candidates(candidates, [id_image])
    match_passed = match_score >= MATCH_THRESHOLD

    # Keep the clearest selected frame for the audit trail / UI preview.
    selfie_img = candidates[0][0]

    ok, encoded = cv2.imencode('.jpg', selfie_img)
    selfie_frame = encoded.tobytes() if ok else None

    return {
        'blink_count': blink_count,
        'face_detected': True,
        'match_score': match_score,
        'match_passed': match_passed,
        'selfie_frame': selfie_frame,
    }
