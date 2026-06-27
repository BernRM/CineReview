import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session as DbSession

from app.config import get_settings
from app.models.session import Session


def _sha256(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: DbSession, user_id: int) -> tuple[str, str]:
    """Return (session_token, csrf_token) — raw values to send to the client."""
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=settings.session_ttl_hours)

    session = Session(
        user_id=user_id,
        token_hash=_sha256(token),
        csrf_token_hash=_sha256(csrf),
        expires_at=expires,
        created_at=now,
        last_used_at=now,
    )
    db.add(session)
    db.commit()
    return token, csrf


def get_session_by_token(db: DbSession, token: str) -> Session | None:
    now = datetime.now(timezone.utc)
    return (
        db.query(Session)
        .filter(
            Session.token_hash == _sha256(token),
            Session.revoked_at.is_(None),
            Session.expires_at > now,
        )
        .first()
    )


def touch_session(db: DbSession, session: Session) -> None:
    session.last_used_at = datetime.now(timezone.utc)
    db.commit()


def revoke_session(db: DbSession, session: Session) -> None:
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()


def revoke_all_user_sessions(db: DbSession, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    db.query(Session).filter(
        Session.user_id == user_id,
        Session.revoked_at.is_(None),
    ).update({"revoked_at": now})
    db.commit()


def verify_csrf(session: Session, csrf_header: str | None) -> bool:
    if not csrf_header:
        return False
    return _sha256(csrf_header) == session.csrf_token_hash
