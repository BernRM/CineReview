from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserStatus
from app.security.csrf import CSRF_HEADER, SESSION_COOKIE
from app.security.sessions import get_session_by_token, touch_session, verify_csrf


def _get_current_session(
    db: Session = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
):
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")
    sess = get_session_by_token(db, session_token)
    if sess is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada.")
    touch_session(db, sess)
    return sess


def get_current_user(
    db: Session = Depends(get_db),
    sess=Depends(_get_current_session),
) -> User:
    user = db.get(User, sess.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado.")
    return user


def get_active_user(user: User = Depends(get_current_user)) -> User:
    if user.status == UserStatus.suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta suspensa.")
    return user


def get_admin_user(user: User = Depends(get_active_user)) -> User:
    from app.models.user import UserRole
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")
    return user


def require_csrf(
    sess=Depends(_get_current_session),
    csrf_token: str | None = Header(default=None, alias=CSRF_HEADER),
):
    if not verify_csrf(sess, csrf_token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token CSRF inválido.")
    return sess
