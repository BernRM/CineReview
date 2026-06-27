"""Integration tests for admin endpoints — RBAC enforcement."""


def _login_as(client, email, password):
    client.post("/api/auth/login", json={"email": email, "password": password})
    return client.cookies.get("csrf_token")


def test_dashboard_requires_admin(client):
    # Not logged in
    resp = client.get("/api/admin/dashboard")
    assert resp.status_code == 401


def test_dashboard_requires_admin_role(client):
    client.post("/api/auth/register", json={
        "username": "normaluser2",
        "email": "normal2@test.com",
        "password": "pass123456",
    })
    _login_as(client, "normal2@test.com", "pass123456")
    resp = client.get("/api/admin/dashboard")
    assert resp.status_code == 403


def test_dashboard_accessible_to_admin(client, admin_user):
    _login_as(client, "admin@example.com", "adminpass123")
    resp = client.get("/api/admin/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "total_movies" in data
    assert "open_reports" in data


def test_admin_users_list(client, admin_user):
    _login_as(client, "admin@example.com", "adminpass123")
    resp = client.get("/api/admin/users")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total_pages" in data


def test_admin_movies_list(client, admin_user):
    _login_as(client, "admin@example.com", "adminpass123")
    resp = client.get("/api/admin/movies")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data


def test_admin_can_create_local_movie(client, admin_user):
    csrf = _login_as(client, "admin@example.com", "adminpass123")
    response = client.post(
        "/api/admin/movies",
        json={"title": "Filme local", "overview": "Criado para teste."},
        headers={"X-CSRF-Token": csrf or ""},
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Filme local"


def test_suspend_user_requires_csrf(client, admin_user, regular_user):
    _login_as(client, "admin@example.com", "adminpass123")
    resp = client.patch(f"/api/admin/users/{regular_user.id}/status", json={"status": "suspended"})
    assert resp.status_code == 403  # missing CSRF


def test_suspend_user_with_csrf(client, admin_user, regular_user):
    csrf = _login_as(client, "admin@example.com", "adminpass123")
    resp = client.patch(
        f"/api/admin/users/{regular_user.id}/status",
        json={"status": "suspended"},
        headers={"X-CSRF-Token": csrf or ""},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_admin_cannot_suspend_self(client, admin_user):
    csrf = _login_as(client, "admin@example.com", "adminpass123")
    resp = client.patch(
        f"/api/admin/users/{admin_user.id}/status",
        json={"status": "suspended"},
        headers={"X-CSRF-Token": csrf or ""},
    )
    assert resp.status_code == 400
