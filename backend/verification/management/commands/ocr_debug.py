"""Development helper: dump PaddleOCR output for one or more ID photos.

Usage:
    python manage.py ocr_debug <image> [<image> ...] [--type driver]

Shows exactly what the OCR engine reads from each photo and how every ID
profile scores against that text, so marker rules can be tuned against real
card photos instead of guessed output.
"""

import argparse
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from verification.ocr import ID_PROFILES, extract_text, score_text, validate_id_type


class Command(BaseCommand):
    help = 'Run PaddleOCR on an image file and print exactly what it reads.'

    def add_arguments(self, parser):
        parser.add_argument(
            'images',
            nargs='+',
            type=Path,
            help='Path(s) to an ID photo (jpg/png).',
        )
        parser.add_argument(
            '--type',
            default='',
            help='Expected ID type to validate (driver, national, passport, umid, postal, prc).',
        )

    def handle(self, *args, **options):
        id_type = options['type']
        if id_type and id_type not in ID_PROFILES:
            raise CommandError(
                f'Unknown --type {id_type!r}. Valid: {", ".join(ID_PROFILES)}.'
            )

        for path in options['images']:
            path = Path(path)
            if not path.is_file():
                self.stderr.write(self.style.WARNING(f'!! skipped (not a file): {path}'))
                continue

            data = path.read_bytes()
            suffix = path.suffix.lower() or '.jpg'
            self.stdout.write(self.style.SUCCESS(f'== {path}'))

            try:
                text = extract_text(data, suffix=suffix)
            except Exception as exc:  # surface even the cloud-less setup errors loudly
                self.stderr.write(self.style.ERROR(f'   OCR failed: {exc}'))
                if id_type:
                    result = validate_id_type(data, id_type)
                    self.stdout.write(
                        f'   validate_id_type({id_type}) -> '
                        f"{'ACCEPT' if result.accepted else 'REJECT'}"
                    )
                    self.stdout.write(f'   message: {result.message}')
                continue

            if not text.strip():
                self.stdout.write(self.style.WARNING('   OCR returned no text.'))
            else:
                self.stdout.write('   --- extracted text ---')
                for line in text.splitlines():
                    self.stdout.write('   ' + line)
                self.stdout.write('   ----------------------')

            self.stdout.write('   marker hits:')
            scores = score_text(text)
            for key, profile in scores.items():
                strong = ', '.join(profile.strong) if profile.strong else '-'
                weak = ', '.join(profile.weak) if profile.weak else '-'
                self.stdout.write(
                    f'   {key:9s} score={profile.score:2d}  '
                    f'strong: {strong:38s} weak: {weak}'
                )

            if id_type:
                result = validate_id_type(data, id_type)
                tag = 'ACCEPT' if result.accepted else 'REJECT'
                self.stdout.write(f'   validate_id_type({id_type}) -> {tag}')
                self.stdout.write(f'   detected_type   : {result.detected_type or "-"}')
                self.stdout.write(
                    f'   matched_markers : {", ".join(result.matched_markers) or "-"}'
                )
                self.stdout.write(f'   message         : {result.message}')