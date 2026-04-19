from nanoid import generate

from app.config import settings

ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"


def generate_inbox_address() -> str:
    short_id = generate(ALPHABET, 10)
    return f"shifts-{short_id}@{settings.app_email_domain}"
