"""One-time downloader for the verification models.

Models are committed to the repo, so normally you never need this. Run it only
if a model file is missing or corrupted:

    python -m verification.fetch_models

Sources (all open source, Apache-2.0 / MIT):
  - YuNet face detector:    OpenCV Zoo
  - SFace face recognizer:  OpenCV Zoo
  - Face Landmarker:        Google MediaPipe
"""

from pathlib import Path

try:
    import urllib.request
except ImportError:  # pragma: no cover
    urllib = None

MODELS_DIR = Path(__file__).resolve().parent / 'model_assets'

# name -> (url, minimum expected size in bytes)
MODELS = {
    'face_detection_yunet_2023mar.onnx': (
        'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/'
        'face_detection_yunet/face_detection_yunet_2023mar.onnx',
        100_000,
    ),
    'face_recognition_sface_2021dec.onnx': (
        'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/'
        'face_recognition_sface/face_recognition_sface_2021dec.onnx',
        30_000_000,
    ),
    'face_landmarker.task': (
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/'
        'face_landmarker/float16/1/face_landmarker.task',
        2_000_000,
    ),
}


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    for name, (url, min_size) in MODELS.items():
        target = MODELS_DIR / name
        if target.exists() and target.stat().st_size >= min_size:
            print(f'skip  {name} (already present)')
            continue
        print(f'downloading  {name} ...')
        tmp = target.with_suffix('.part')
        urllib.request.urlretrieve(url, tmp)
        if tmp.stat().st_size < min_size:
            tmp.unlink()
            raise SystemExit(f'{name} looks incomplete; check the URL.')
        tmp.rename(target)
        print(f'  ok ({target.stat().st_size:,} bytes)')
    print('\nAll models ready.')


if __name__ == '__main__':
    main()