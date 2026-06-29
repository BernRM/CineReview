import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request

from app.config import get_settings
from app.database import SessionLocal, check_database_connection
from app.logger import alog_event, log_event
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


def _bootstrap_demo_data():
    """Populate deterministic presentation data when demo mode is enabled."""
    from app.services.demo_seed import seed_demo_data

    if not get_settings().demo_seed_enabled:
        logger.info("Bootstrap: carga de demonstração desativada.")
        return

    db = SessionLocal()
    try:
        summary = seed_demo_data(db)
        logger.info(
            "Bootstrap demo: %s usuários, %s filmes e %s avaliações disponíveis.",
            summary["users"],
            summary["movies"],
            summary["reviews"],
        )
    except Exception:
        db.rollback()
        logger.exception("Falha ao preparar os dados de demonstração.")
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log_event("Aplicação CineView iniciada.", "info")
    try:
        check_database_connection()
    except Exception as exc:  # noqa: BLE001 - registra antes de propagar
        log_event(f"Erro de conexão com o PostgreSQL: {exc}", "error")
    _bootstrap_admin()
    _bootstrap_demo_data()
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

@app.middleware("http")
async def loki_request_logging(request: Request, call_next):
    """Envia ao Loki um registro de cada requisição (método, rota, status).

    O envio é agendado como tarefa em segundo plano para não atrasar a resposta.
    """
    response = await call_next(request)
    message = f"{request.method} {request.url.path} -> {response.status_code}"
    level = "error" if response.status_code >= 500 else "info"
    asyncio.create_task(alog_event(message, level))
    return response


app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(movies.router)
app.include_router(users.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
