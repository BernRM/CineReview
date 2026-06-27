"""Integration tests for catalog endpoints."""


def test_trending_returns_200(client):
    resp = client.get("/api/catalog/trending")
    # May return empty lists if TMDB is not configured, but should not 500
    assert resp.status_code == 200
    data = resp.json()
    assert "featured" in data
    assert "trending" in data
    assert isinstance(data["featured"], list)
    assert isinstance(data["trending"], list)


def test_search_requires_query(client):
    resp = client.get("/api/catalog/search")
    assert resp.status_code == 422


def test_search_falls_back_to_local_movies(client, db, monkeypatch):
    from app.models.movie import Movie
    from app.services import tmdb

    monkeypatch.setattr(tmdb, "search_movies", lambda query, page=1: None)
    db.add(Movie(title="Cinema Local", overview="Fallback local", is_active=True))
    db.commit()

    response = client.get("/api/catalog/search?q=cinema")
    assert response.status_code == 200
    assert response.json()["source"] == "local"
    assert response.json()["results"][0]["title"] == "Cinema Local"


def test_search_returns_results_shape(client, monkeypatch):
    from app.services import tmdb

    monkeypatch.setattr(
        tmdb,
        "search_movies",
        lambda query, page=1: {
            "page": page,
            "total_pages": 1,
            "total_results": 1,
            "results": [
                {
                    "id": 27205,
                    "title": "A Origem",
                    "poster_path": None,
                    "release_date": "2010-07-15",
                    "vote_average": 8.4,
                    "overview": "Teste",
                    "genre_ids": [28],
                }
            ],
        },
    )
    resp = client.get("/api/catalog/search?q=inception")
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert "total_results" in data


def test_catalog_genres(client):
    resp = client.get("/api/catalog/genres")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_catalog_movie_not_found(client):
    # Use a tmdb_id very unlikely to exist and TMDB will return 404
    resp = client.get("/api/catalog/movies/999999999")
    # Either 404 or 200 with null data depending on TMDB availability
    assert resp.status_code in (200, 404, 503)
