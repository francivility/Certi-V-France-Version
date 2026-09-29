"""Local OCR and document-type validation shared by verification workflows.

The OCR engine extracts text; it does not, by itself, prove a document's type.
Type checks therefore rely on multiple markers, tolerate the noise that
phone-camera photos introduce (blur, glare, light typos), and fail closed when
the image is unreadable or inconclusive.

Markers are split so a generic word shared by several card types (e.g.
"REPUBLIC OF THE PHILIPPINES") can never decide the type by itself:

* ``strong`` markers are distinctive to one card type (its title line or
  issuing authority). A document is accepted only when the *selected* type has
  at least one strong marker, and it is rejected as a mismatch when another
  type is more strongly identified.
* ``weak`` markers are shared field labels (EXPIRATION DATE, BLOOD TYPE, ...).
  They add a little confidence but never trigger a mismatch verdict.
"""

from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
import re
import tempfile


class OCRUnavailableError(Exception):
    """Raised when the configured OCR engine cannot be used for an image."""


@dataclass(frozen=True)
class OCRValidation:
    accepted: bool
    expected_type: str
    detected_type: str | None
    matched_markers: tuple[str, ...]
    text: str
    message: str


# --- tuning ----------------------------------------------------------------

# Per-word similarity required to accept a >=5-char OCR word as a match.
FUZZY_THRESHOLD = 0.85
# Words shorter than this are treated as codes (PSN, PRC, LTO...). They only
# match when read exactly, because fuzzy matching 3-4 letter strings
# (e.g. PRC vs. PROC) creates false positives.
FUZZ_MIN_LEN = 5
# Points awarded per strong / weak marker group hit.
STRONG_WEIGHT = 3
WEAK_WEIGHT = 1
# A selected type must hit at least this many strong groups to be accepted.
STRONG_REQUIRED = 1

_engine = None


# --- profiles ----------------------------------------------------------------

ID_PROFILES = {
    'driver': {
        'label': "Driver's License",
        'strong': (
            ('DRIVER LICENSE', 'DRIVERS LICENSE', 'DRIVER S LICENSE'),
            ('LAND TRANSPORTATION OFFICE',),
            ('DEPARTMENT OF TRANSPORTATION',),
            ('NON-PROFESSIONAL', 'NON PROFESSIONAL'),
        ),
        'weak': (
            ('LICENSE NO', 'LICENSE NUMBER', 'DL NO'),
            ('EXPIRATION DATE', 'VALID UNTIL'),
            ('AGENCY CODE',),
            ('BLOOD TYPE',),
            ('RESTRICTION', 'RESTRICTIONS'),
            ('REPUBLIC OF THE PHILIPPINES',),
            ('LTO',),
        ),
    },
    'national': {
        'label': 'Philippine National ID',
        'strong': (
            ('PAMBANSANG PAGKAKAKILANLAN',),
            ('PHILIPPINE IDENTIFICATION CARD',),
            ('PHILIPPINE IDENTIFICATION SYSTEM',),
            ('PHILIPPINE STATISTICS AUTHORITY',),
            ('PHILID',),
        ),
        'weak': (
            ('PHILSYS',),
            ('PSN',),
            ('PCN',),
            ('PETSA NG KAPANGANAKAN',),
            ('URING DUGO',),
            ('TIRAHAN',),
            ('REPUBLIC OF THE PHILIPPINES',),
        ),
    },
    'passport': {
        'label': 'Passport',
        'strong': (
            ('PASSPORT',),
            ('PASAPORTE',),
            ('DEPARTMENT OF FOREIGN AFFAIRS',),
            ('DFA',),
        ),
        'weak': (
            ('REPUBLIC OF THE PHILIPPINES',),
            ('PHL',),
            ('DATE OF ISSUE',),
            ('DATE OF EXPIRY',),
            ('PLACE OF BIRTH',),
            ('SURNAME', 'GIVEN NAME', 'MIDDLE NAME'),
        ),
    },
    'umid': {
        'label': 'UMID',
        'strong': (
            ('UNIFIED MULTIPURPOSE IDENTIFICATION',),
            ('UMID',),
            ('SOCIAL SECURITY SYSTEM',),
            ('GOVERNMENT SERVICE INSURANCE SYSTEM',),
        ),
        'weak': (
            ('SSS',),
            ('GSIS',),
            ('PHILHEALTH',),
            ('PAG-IBIG', 'PAG IBIG', 'PAGIBIG'),
            ('COMMON REFERENCE NUMBER', 'CRN'),
            ('SURNAME', 'GIVEN NAME', 'MIDDLE NAME'),
        ),
    },
    'postal': {
        'label': 'Postal ID',
        'strong': (
            ('POSTAL ID',),
            ('POSTAL IDENTITY CARD',),
            ('PHILIPPINE POSTAL CORPORATION',),
            ('PHLPOST', 'PHIL POST'),
        ),
        'weak': (
            ('POST OFFICE',),
            ('PID',),
            ('POSTAL ID NO', 'PID NO'),
            ('REPUBLIC OF THE PHILIPPINES',),
        ),
    },
    'prc': {
        'label': 'PRC ID',
        'strong': (
            ('PROFESSIONAL REGULATION COMMISSION',),
            ('PROFESSIONAL IDENTIFICATION CARD',),
            ('PRC',),
        ),
        'weak': (
            ('REGISTRATION NO', 'REGISTRATION NUMBER', 'LICENSE NUMBER'),
            ('PROFESSION',),
            ('VALID UNTIL',),
            ('REPUBLIC OF THE PHILIPPINES',),
        ),
    },
}


# Application document profiles reuse the same validation mechanics. The
# application upload flow calls validate_document_type() when it is wired in.
DOCUMENT_PROFILES = {
    'or_cr': {
        'label': 'OR/CR',
        'strong': (
            ('OFFICIAL RECEIPT', 'CERTIFICATE OF REGISTRATION'),
            ('LAND TRANSPORTATION OFFICE',),
        ),
        'weak': (
            ('PLATE NO', 'PLATE NUMBER'),
            ('CHASSIS NO', 'ENGINE NO'),
            ('MV FILE NO',),
        ),
    },
    'operator_data_sheet': {
        'label': "Operator's Data Sheet",
        'strong': (
            ("OPERATOR'S DATA SHEET", 'OPERATOR DATA SHEET', 'OPERATORS DATA SHEET'),
            ('FRANCHISE',),
        ),
        'weak': (
            ('OPERATOR',),
            ('AUTHORITY', 'AUTHORIZED'),
            ('LICENSE', 'PERMIT'),
        ),
    },
}


# --- matching ----------------------------------------------------------------

def _normalise(text):
    return f" {re.sub(r'[^A-Z0-9]+', ' ', text.upper()).strip()} "


def _word_similar(word_a, word_b):
    return SequenceMatcher(None, word_a, word_b).ratio()


def _matches(normalised, phrase):
    """True when ``phrase`` appears in the normalised OCR text.

    The exact substring check is word-safe because both sides are space
    wrapped. When that fails, phrases built from longer words are checked for
    a fuzzy, order-preserving match inside the OCR token stream, with words
    shorter than ``FUZZ_MIN_LEN`` required to match exactly.
    """
    marker = _normalise(phrase).strip()
    if marker in normalised:
        return True

    marker_words = marker.split()
    text_words = normalised.split()
    if not marker_words or len(text_words) < len(marker_words):
        return False

    for start in range(len(text_words) - len(marker_words) + 1):
        window = text_words[start:start + len(marker_words)]
        for expected, actual in zip(marker_words, window):
            if len(expected) < FUZZ_MIN_LEN:
                if actual != expected:
                    break
            elif _word_similar(expected, actual) < FUZZY_THRESHOLD:
                break
        else:
            return True
    return False


def _group_hit(normalised, alternatives):
    for alternative in alternatives:
        if _matches(normalised, alternative):
            return alternative
    return None


@dataclass(frozen=True)
class ProfileScore:
    type: str
    label: str
    strong: tuple[str, ...]
    weak: tuple[str, ...]

    @property
    def score(self):
        return STRONG_WEIGHT * len(self.strong) + WEAK_WEIGHT * len(self.weak)


def _score_profile(name, profile, normalised):
    strong = tuple(
        hit for hit in (_group_hit(normalised, group) for group in profile['strong']) if hit
    )
    weak = tuple(
        hit for hit in (_group_hit(normalised, group) for group in profile['weak']) if hit
    )
    return ProfileScore(name, profile['label'], strong, weak)


def score_text(text, profiles=ID_PROFILES):
    """Score every profile against already-extracted OCR text."""
    normalised = _normalise(text)
    return {name: _score_profile(name, profile, normalised) for name, profile in profiles.items()}


# --- engine ------------------------------------------------------------------

def _get_engine():
    global _engine
    if _engine is not None:
        return _engine
    try:
        from paddleocr import PaddleOCR
    except ImportError as exc:
        raise OCRUnavailableError(
            'OCR is not installed on this server. Install the backend OCR dependencies first.'
        ) from exc

    # Mobile models keep CPU inference practical for a local development host.
    _engine = PaddleOCR(
        lang='en',
        text_detection_model_name='PP-OCRv5_mobile_det',
        text_recognition_model_name='en_PP-OCRv4_mobile_rec',
        use_doc_orientation_classify=True,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    return _engine


def _walk_text(value):
    """Read PP-OCR result objects without coupling validation to its UI API."""
    if isinstance(value, dict):
        texts = value.get('rec_texts')
        if isinstance(texts, (list, tuple)):
            yield from (str(item) for item in texts if item)
        for child in value.values():
            yield from _walk_text(child)
    elif isinstance(value, (list, tuple)):
        for child in value:
            yield from _walk_text(child)


def extract_text(image_bytes, suffix='.jpg'):
    """Return OCR text from one locally supplied document image."""
    if not image_bytes:
        return ''
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(image_bytes)
            temp_path = Path(temp_file.name)
        results = _get_engine().predict(str(temp_path))
        chunks = []
        for result in results:
            payload = getattr(result, 'json', result)
            if callable(payload):
                payload = payload()
            chunks.extend(_walk_text(payload))
        return '\n'.join(dict.fromkeys(chunks))
    except OCRUnavailableError:
        raise
    except Exception as exc:  # Keep the user-facing verification response clear.
        raise OCRUnavailableError('OCR could not read this image. Retake it in good light.') from exc
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


# --- validation ----------------------------------------------------------------

def _validate(image_bytes, expected_type, profiles):
    profile = profiles.get(expected_type)
    if profile is None:
        return OCRValidation(False, expected_type, None, (), '', 'Unknown ID type selected.')

    text = extract_text(image_bytes)
    if not text.strip():
        return OCRValidation(
            False,
            expected_type,
            None,
            (),
            text,
            "Could not read this document. Retake it in good light and keep the full card in frame.",
        )

    label = profile['label']
    scores = score_text(text, profiles)
    expected = scores[expected_type]

    # Types that are genuinely identified carry at least one strong marker.
    identified = [score for score in scores.values() if score.strong]

    if expected.strong:
        stronger = [score for score in identified if score.score > expected.score]
        if stronger:
            best = max(stronger, key=lambda score: score.score)
            return OCRValidation(
                False,
                expected_type,
                best.type,
                best.strong + best.weak,
                text,
                f"You selected {label}, but this appears to be {best.label}.",
            )
        tied = [score for score in identified if score.type != expected_type and score.score == expected.score]
        if tied:
            return OCRValidation(
                False,
                expected_type,
                None,
                expected.strong + expected.weak,
                text,
                'The document type could not be identified clearly. '
                'Retake it in better light and keep the full card in frame.',
            )
        return OCRValidation(True, expected_type, expected_type, expected.strong + expected.weak, text, '')

    if identified:
        best = max(identified, key=lambda score: score.score)
        return OCRValidation(
            False,
            expected_type,
            best.type,
            best.strong + best.weak,
            text,
            f"You selected {label}, but this appears to be {best.label}.",
        )

    return OCRValidation(
        False,
        expected_type,
        None,
        expected.strong + expected.weak,
        text,
        f"Could not verify that this is a {label}. Retake it in better light and keep the full document in frame.",
    )


def validate_id_type(image_bytes, expected_type):
    return _validate(image_bytes, expected_type, ID_PROFILES)


def validate_document_type(image_bytes, expected_type):
    return _validate(image_bytes, expected_type, DOCUMENT_PROFILES)