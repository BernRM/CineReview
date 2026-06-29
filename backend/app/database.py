from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


def _make_engine():
    settings = get_settings()
    return create_engine(settings.database_url, pool_pre_ping=True)


engine = _make_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_database_connection() -> None:
    """Executa um SELECT 1 para validar a conexão com o PostgreSQL.

    Lança a exceção do driver se o banco estiver inacessível, permitindo que
    o chamador registre o erro (ex.: envio ao Loki na inicialização).
    """
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
