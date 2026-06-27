"""Unit tests for password hashing — no DB needed."""
from app.security.passwords import hash_password, verify_password


def test_hash_is_not_plaintext():
    h = hash_password("secret123")
    assert h != "secret123"
    assert len(h) > 20


def test_verify_correct_password():
    h = hash_password("mypassword")
    assert verify_password("mypassword", h) is True


def test_verify_wrong_password():
    h = hash_password("mypassword")
    assert verify_password("wrongpassword", h) is False


def test_verify_empty_password():
    h = hash_password("mypassword")
    assert verify_password("", h) is False


def test_different_hashes_for_same_password():
    # Argon2id uses random salt — same password must produce different hashes
    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2
    assert verify_password("same", h1) is True
    assert verify_password("same", h2) is True
