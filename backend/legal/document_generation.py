"""Generation helpers for official legal documents."""
from datetime import date
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.conf import settings


NOH_TEMPLATE = Path(settings.BASE_DIR) / 'legal' / 'templates' / 'CERTIV_NOH.docx'


def _document_dependencies():
    """Load optional document packages only when NOH generation is requested.

    This keeps the whole Django application, including staff sign-in, available
    if a developer accidentally starts it outside the project's virtualenv.
    """
    try:
        from docx import Document
        from docx.shared import Pt
        from docx2pdf import convert
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            'NOH document generation dependencies are missing. Start Django with '
            'backend\\venv\\Scripts\\python.exe or install backend/requirements.txt.'
        ) from exc
    return Document, Pt, convert


def _display_date(value):
    if not value:
        return ''
    if isinstance(value, str):
        try:
            value = date.fromisoformat(value)
        except ValueError:
            return value
    return value.strftime('%B %d, %Y')


def _replace_in_paragraph(paragraph, old, new):
    """Replace a marker without discarding its run formatting."""
    for run in paragraph.runs:
        if old in run.text:
            run.text = run.text.replace(old, new)
            return
    if old in paragraph.text and paragraph.runs:
        paragraph.runs[0].text = paragraph.text.replace(old, new)
        for run in paragraph.runs[1:]:
            run.text = ''


def _set_cell(cell, value):
    paragraph = cell.paragraphs[0]
    if paragraph.runs:
        paragraph.runs[0].text = str(value or '')
        for run in paragraph.runs[1:]:
            run.text = ''
    else:
        paragraph.add_run(str(value or ''))


def build_notice_docx(values):
    """Return a populated CERTIV_NOH document as DOCX bytes."""
    if not NOH_TEMPLATE.exists():
        raise FileNotFoundError('The Notice of Hearing template is missing.')

    Document, Pt, _ = _document_dependencies()
    document = Document(NOH_TEMPLATE)
    fields = [
        'applicant_name', 'applicant_address', 'applicant_email',
        'case_or_docket_number', 'date_of_filing', 'nature_of_application',
        'route_or_area', 'service_applied_for', 'units_applied_for',
        'hearing_date', 'hearing_time_label', 'venue_or_platform',
        'opposition_period', 'opposition_address', 'foe_period', 'foe_address',
    ]
    table = document.tables[0]
    for row, field in enumerate(fields):
        value = values.get(field, '')
        if field in ('date_of_filing', 'hearing_date'):
            value = _display_date(value)
        _set_cell(table.cell(row, 1), value)

    hearing_date = _display_date(values.get('hearing_date'))
    date_issued = _display_date(values.get('date_issued') or date.today())
    replacements = {
        '[insert venue here]': values.get('venue_or_platform', ''),
        '[INSERT DATE HERE]': hearing_date,
        '[INSERT TIME HERE]': values.get('hearing_time_label', ''),
        '[INSERT VENUE HERE]': values.get('venue_or_platform', ''),
        '[INSERT NAME HERE]': values.get('hearing_officer', ''),
        '[INSERT DATE ISSUED HERE]': date_issued,
        '[insert date issued here]': date_issued,
    }
    for paragraph in document.paragraphs:
        had_date_issued_marker = any(marker in paragraph.text for marker in ('[INSERT DATE ISSUED HERE]', '[insert date issued here]'))
        for marker, value in replacements.items():
            _replace_in_paragraph(paragraph, marker, str(value or ''))
        if not had_date_issued_marker and 'Date Issued:' in paragraph.text:
            _replace_in_paragraph(
                paragraph, 'Date Issued:', f'Date Issued: {date_issued}'
            )

    output = BytesIO()
    document.save(output)
    return output.getvalue()


def convert_to_pdf(docx_bytes):
    """Convert a DOCX through Microsoft Word on the Windows demo host."""
    import time as _time
    import pythoncom

    pythoncom.CoInitialize()
    try:
        with TemporaryDirectory(prefix='certiv-noh-') as directory:
            _, _, convert = _document_dependencies()
            source = Path(directory) / 'notice.docx'
            target = Path(directory) / 'notice.pdf'
            source.write_bytes(docx_bytes)
            last_error = None
            for attempt in range(3):
                try:
                    convert(str(source), str(target))
                except PermissionError as exc:
                    last_error = exc
                    if attempt == 2:
                        break
                    _time.sleep(1.5)
                    continue
                if target.exists():
                    return target.read_bytes()
            raise RuntimeError(
                'Word could not create the PDF version of the Notice of Hearing.'
            ) if last_error is None else last_error
    finally:
        pythoncom.CoUninitialize()
