import secrets
import string


def generate_code(*exclude_models):
    """8-character uppercase code, kept free of any model's `code` column."""
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        if not any(model.objects.filter(code=code).exists() for model in exclude_models):
            return code