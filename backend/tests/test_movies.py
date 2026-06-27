"""Integration tests for movie reviews and user library."""


def _register_and_login(client, username, email, password="testpass123"):
    client.post("/api/auth/register", json={"username": username, "email": email, "password": password})
    client.post("/api/auth/login", json={"email": email, "password": password})
    return client.cookies.get("csrf_token")


def _create_movie(db):
    from app.models.movie import Movie
    from datetime import date
    m = Movie(
        title="Test Movie",
        overview="A test film.",
        release_date=date(2020, 1, 1),
        is_active=True,
        is_featured=False,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def test_unauthenticated_review_rejected(client, db):
    movie = _create_movie(db)
    resp = client.put(f"/api/movies/{movie.id}/review", json={"rating": 8})
    assert resp.status_code == 401


def test_create_review(client, db):
    movie = _create_movie(db)
    csrf = _register_and_login(client, "reviewer1", "reviewer1@test.com")
    resp = client.put(
        f"/api/movies/{movie.id}/review",
        json={"rating": 8, "title": "Great film", "body": "Loved it very much!", "contains_spoiler": False},
        headers={"X-CSRF-Token": csrf or ""},
    )
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["rating"] == 8
    assert data["title"] == "Great film"


def test_get_reviews(client, db):
    movie = _create_movie(db)
    csrf = _register_and_login(client, "reviewer2", "reviewer2@test.com")
    client.put(
        f"/api/movies/{movie.id}/review",
        json={"rating": 7},
        headers={"X-CSRF-Token": csrf or ""},
    )
    resp = client.get(f"/api/movies/{movie.id}/reviews")
    assert resp.status_code == 200
    reviews = resp.json()
    assert isinstance(reviews, list)
    assert len(reviews) >= 1


def test_upsert_review_replaces_existing(client, db):
    movie = _create_movie(db)
    csrf = _register_and_login(client, "upsertuser", "upsert@test.com")
    client.put(
        f"/api/movies/{movie.id}/review",
        json={"rating": 5},
        headers={"X-CSRF-Token": csrf or ""},
    )
    resp = client.put(
        f"/api/movies/{movie.id}/review",
        json={"rating": 9},
        headers={"X-CSRF-Token": csrf or ""},
    )
    assert resp.status_code in (200, 201)
    assert resp.json()["rating"] == 9


def test_delete_review(client, db):
    movie = _create_movie(db)
    csrf = _register_and_login(client, "deluser", "del@test.com")
    client.put(
        f"/api/movies/{movie.id}/review",
        json={"rating": 6},
        headers={"X-CSRF-Token": csrf or ""},
    )
    resp = client.delete(
        f"/api/movies/{movie.id}/review",
        headers={"X-CSRF-Token": csrf or ""},
    )
    assert resp.status_code == 204


def test_deleted_review_can_be_created_again(client, db):
    movie = _create_movie(db)
    csrf = _register_and_login(client, "restoreuser", "restore@test.com")
    headers = {"X-CSRF-Token": csrf or ""}

    client.put(f"/api/movies/{movie.id}/review", json={"rating": 6}, headers=headers)
    client.delete(f"/api/movies/{movie.id}/review", headers=headers)
    resp = client.put(f"/api/movies/{movie.id}/review", json={"rating": 9}, headers=headers)

    assert resp.status_code == 200
    assert resp.json()["rating"] == 9
    assert resp.json()["status"] == "published"


def test_watchlist_operations(client, db):
    movie = _create_movie(db)
    csrf = _register_and_login(client, "wluser", "wl@test.com")

    # Add to watchlist
    resp = client.put(f"/api/me/watchlist/{movie.id}", headers={"X-CSRF-Token": csrf or ""})
    assert resp.status_code in (200, 201, 204)

    # List watchlist
    resp = client.get("/api/me/watchlist")
    assert resp.status_code == 200
    ids = [i["movie_id"] for i in resp.json()]
    assert movie.id in ids

    # Remove from watchlist
    resp = client.delete(f"/api/me/watchlist/{movie.id}", headers={"X-CSRF-Token": csrf or ""})
    assert resp.status_code == 204

    resp = client.get("/api/me/watchlist")
    ids = [i["movie_id"] for i in resp.json()]
    assert movie.id not in ids


def test_mark_watched(client, db):
    movie = _create_movie(db)
    csrf = _register_and_login(client, "watcheduser", "watched@test.com")

    resp = client.put(f"/api/me/watched/{movie.id}", headers={"X-CSRF-Token": csrf or ""})
    assert resp.status_code in (200, 201, 204)

    resp = client.get("/api/me/watched")
    assert resp.status_code == 200
    ids = [i["movie_id"] for i in resp.json()]
    assert movie.id in ids
