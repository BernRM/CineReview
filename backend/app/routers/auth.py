import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_active_user, get_current_user, require_csrf
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest, UserMeResponse
from app.security.csrf import SESSION_COOKIE
from app.security.passwords import hash_password, verify_password
from app.security.sessions import create_session, get_session_by_token, revoke_all_user_sessions, revoke_session
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_cookies(response: Response, token: str, csrf: str) -> None:
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE, token,
        httponly=True,
        samesite="lax",
        path="/",
        secure=settings.cookie_secure,
        max_age=settings.session_ttl_hours * 3600,
    )
    response.set_cookie(
        "csrf_token", csrf,
        httponly=False,
        samesite="lax",
        path="/",
        secure=settings.cookie_secure,
        max_age=settings.session_ttl_hours * 3600,
    )


@router.post("/register", response_model=UserMeResponse, status_code=201)
def register(body: RegisterRequest, response: Response, db: DbSession = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "E-mail já cadastrado.")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username já em uso.")

    user = User(
        name=body.name or body.username,
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.user,
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token, csrf = create_session(db, user.id)
    _set_cookies(response, token, csrf)
    return user


@router.post("/login")
def login(body: LoginRequest, response: Response, db: DbSession = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Credenciais inválidas.")

    if user.status == UserStatus.suspended:
        raise HTTPException(403, "Conta suspensa.")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token, csrf = create_session(db, user.id)
    _set_cookies(response, token, csrf)
    return {"id": user.id, "role": user.role.value, "username": user.username}


@router.post("/logout")
def logout(
    response: Response,
    db: DbSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
):
    if session_token:
        sess = get_session_by_token(db, session_token)
        if sess:
            revoke_session(db, sess)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie("csrf_token", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserMeResponse)
def me(user: User = Depends(get_active_user)):
    return user


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Senha atual incorreta.")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    revoke_all_user_sessions(db, user.id)
    return {"ok": True}
