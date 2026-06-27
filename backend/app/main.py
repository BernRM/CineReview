import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI

from app.config import get_settings
from app.database import SessionLocal
from app.routers import auth, catalog, movies, users, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _bootstrap_admin():
    """Create the first admin if none exists. Reads credentials from env."""
    from app.models.user import User, UserRole, UserStatus
    from app.security.passwords import hash_password

    settings = get_settings()
    if not settings.admin_password:
        logger.warning("ADMIN_PASSWORD não definido — bootstrap de admin ignorado.")
        return

    db = SessionLocal()
    try:
        exists = db.query(User).filter(User.role == UserRole.admin).first()
        if exists:
            return
        admin_user = User(
            name="Administrador",
            username=settings.admin_username,
            email=settings.admin_email,
            password_hash=hash_password(settings.admin_password),
            role=UserRole.admin,
            status=UserStatus.active,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(admin_user)
        db.commit()
        logger.info("Bootstrap: conta de administrador criada com username '%s'.", settings.admin_username)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _bootstrap_admin()
    yield


app = FastAPI(
    title="CineView API",
    description=(
        "Plataforma de descoberta e avaliação de filmes.\n\n"
        "This product uses the TMDB API but is not endorsed or certified by TMDB."
    ),
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(movies.router)
app.include_router(users.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
