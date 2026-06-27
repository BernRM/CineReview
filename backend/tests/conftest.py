"""
Test fixtures using SQLite in-memory DB to avoid needing a live PostgreSQL.
Tests cover unit logic and FastAPI integration via TestClient.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole, UserStatus
from app.security.passwords import hash_password

SQLITE_URL = "sqlite:///:memory:"

engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    session = TestingSession()
    yield session
    session.rollback()
    session.close()


@pytest.fixture()
def client():
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture()
def regular_user(db):
    u = User(
        name="Test User",
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    yield u
    db.delete(u)
    db.commit()


@pytest.fixture()
def admin_user(db):
    u = User(
        name="Admin User",
        username="adminuser",
        email="admin@example.com",
        password_hash=hash_password("adminpass123"),
        role=UserRole.admin,
        status=UserStatus.active,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    yield u
    db.delete(u)
    db.commit()
