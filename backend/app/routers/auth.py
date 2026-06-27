import logging
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
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
_LOGIN_WINDOW_SECONDS = 300
_LOGIN_MAX_FAILURES = 5
_login_failures: dict[str, deque[float]] = defaultdict(deque)
_login_lock = threading.Lock()
_dummy_password_hash = hash_password("cineview-dummy-password")


def _login_key(request: Request, email: str) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{host}:{email.lower()}"


def _check_login_limit(key: str) -> None:
    now = time.monotonic()
    with _login_lock:
        attempts = _login_failures[key]
        while attempts and now - attempts[0] > _LOGIN_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= _LOGIN_MAX_FAILURES:
            retry_after = max(1, int(_LOGIN_WINDOW_SECONDS - (now - attempts[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas. Aguarde antes de tentar novamente.",
                headers={"Retry-After": str(retry_after)},
            )


def _record_login_failure(key: str) -> None:
    with _login_lock:
        _login_failures[key].append(time.monotonic())


def _clear_login_failures(key: str) -> None:
    with _login_lock:
        _login_failures.pop(key, None)


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
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
):
    key = _login_key(request, body.email)
    _check_login_limit(key)
    user = db.query(User).filter(User.email == body.email).first()
    password_hash = user.password_hash if user else _dummy_password_hash
    if not verify_password(body.password, password_hash) or not user:
        _record_login_failure(key)
        raise HTTPException(401, "Credenciais inválidas.")

    if user.status == UserStatus.suspended:
        _record_login_failure(key)
        raise HTTPException(403, "Conta suspensa.")

    _clear_login_failures(key)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token, csrf = create_session(db, user.id)
    _set_cookies(response, token, csrf)
    return {"id": user.id, "role": user.role.value, "username": user.username}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DbSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    _csrf=Depends(require_csrf),
):
    if session_token:
        sess = get_session_by_token(db, session_token)
        if sess:
            revoke_session(db, sess)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie("csrf_token", path="/")
    return None


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
