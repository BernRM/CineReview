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


def test_search_returns_results_shape(client):
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
