"""Integration tests for auth endpoints using in-memory SQLite."""


def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "securepass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "username": "user_a",
        "email": "dup@example.com",
        "password": "pass123456",
    })
    resp = client.post("/api/auth/register", json={
        "username": "user_b",
        "email": "dup@example.com",
        "password": "pass123456",
    })
    assert resp.status_code == 400
    assert "E-mail" in resp.json()["detail"]


def test_register_duplicate_username(client):
    client.post("/api/auth/register", json={
        "username": "sameuser",
        "email": "first@example.com",
        "password": "pass123456",
    })
    resp = client.post("/api/auth/register", json={
        "username": "sameuser",
        "email": "second@example.com",
        "password": "pass123456",
    })
    assert resp.status_code == 400


def test_register_invalid_username(client):
    resp = client.post("/api/auth/register", json={
        "username": "ab",  # too short
        "email": "short@example.com",
        "password": "pass123456",
    })
    assert resp.status_code == 422


def test_login_success(client):
    client.post("/api/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "mypassword123",
    })
    resp = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "mypassword123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "loginuser"
    # Cookies should be set
    assert "session" in resp.cookies


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "username": "wrongpass",
        "email": "wrongpass@example.com",
        "password": "correctpassword",
    })
    resp = client.post("/api/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "anypassword",
    })
    assert resp.status_code == 401


def test_me_unauthenticated(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_authenticated(client):
    client.post("/api/auth/register", json={
        "username": "meuser",
        "email": "me@example.com",
        "password": "mepassword123",
    })
    login = client.post("/api/auth/login", json={
        "email": "me@example.com",
        "password": "mepassword123",
    })
    assert login.status_code == 200
    # Cookies are retained in TestClient session
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["username"] == "meuser"


def test_logout(client):
    client.post("/api/auth/register", json={
        "username": "logoutuser",
        "email": "logout@example.com",
        "password": "logoutpass123",
    })
    client.post("/api/auth/login", json={
        "email": "logout@example.com",
        "password": "logoutpass123",
    })
    csrf = client.cookies.get("csrf_token")
    resp = client.post("/api/auth/logout", json={}, headers={"X-CSRF-Token": csrf or ""})
    assert resp.status_code == 204
    me = client.get("/api/auth/me")
    assert me.status_code == 401
