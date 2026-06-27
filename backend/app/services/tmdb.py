"""TMDB API v3 client with in-memory TTL cache."""
import time
from typing import Any

import httpx

from app.config import get_settings

_BASE = "https://api.themoviedb.org/3"
_IMAGE_BASE = "https://image.tmdb.org/t/p"
_CACHE: dict[str, tuple[float, Any]] = {}
_TTL = 300  # 5 minutes


def _cached(key: str, ttl: int = _TTL) -> Any | None:
    entry = _CACHE.get(key)
    if entry and time.time() - entry[0] < ttl:
        return entry[1]
    return None


def _store(key: str, value: Any) -> Any:
    _CACHE[key] = (time.time(), value)
    return value


def _headers() -> dict[str, str]:
    token = get_settings().tmdb_api_token
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def _get(path: str, params: dict | None = None, ttl: int = _TTL) -> dict | None:
    key = f"{path}?{params}"
    cached = _cached(key, ttl)
    if cached is not None:
        return cached

    if not get_settings().tmdb_api_token:
        return None

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{_BASE}{path}", headers=_headers(), params=params or {})
            if resp.status_code == 429:
                return None
            resp.raise_for_status()
            data = resp.json()
            return _store(key, data)
    except (httpx.TimeoutException, httpx.HTTPError):
        return None


def poster_url(path: str | None, size: str = "w500") -> str | None:
    if not path:
        return None
    return f"{_IMAGE_BASE}/{size}{path}"


def backdrop_url(path: str | None, size: str = "w1280") -> str | None:
    if not path:
        return None
    return f"{_IMAGE_BASE}/{size}{path}"


def get_trending(page: int = 1) -> dict | None:
    return _get("/trending/movie/week", {"language": "pt-BR", "page": page})


def search_movies(query: str, page: int = 1) -> dict | None:
    return _get(
        "/search/movie",
        {"query": query, "language": "pt-BR", "page": page, "include_adult": "false", "region": "BR"},
        ttl=60,
    )


def get_movie_detail(tmdb_id: int) -> dict | None:
    return _get(f"/movie/{tmdb_id}", {"language": "pt-BR", "append_to_response": "videos,credits"})


def get_genres() -> list[dict]:
    data = _get("/genre/movie/list", {"language": "pt-BR"}, ttl=3600)
    if data:
        return data.get("results") or data.get("genres") or []
    return []


def get_discover(genre_id: int | None = None, year: int | None = None, page: int = 1) -> dict | None:
    params: dict[str, Any] = {
        "language": "pt-BR",
        "include_adult": "false",
        "region": "BR",
        "sort_by": "popularity.desc",
        "page": page,
    }
    if genre_id:
        params["with_genres"] = genre_id
    if year:
        params["primary_release_year"] = year
    return _get("/discover/movie", params, ttl=120)


def _pick_trailer(videos: list[dict]) -> str | None:
    """Pick official YouTube trailer in pt-BR, then any trailer."""
    for lang in ("pt", None):
        for v in videos:
            if (
                v.get("site") == "YouTube"
                and v.get("type") == "Trailer"
                and v.get("official", False)
                and (lang is None or v.get("iso_639_1") == lang)
            ):
                return v["key"]
    return None


def parse_movie_detail(data: dict) -> dict:
    videos = (data.get("videos") or {}).get("results") or []
    credits = data.get("credits") or {}
    cast = (credits.get("cast") or [])[:10]

    genres = [{"tmdb_id": g["id"], "name": g["name"]} for g in data.get("genres") or []]
    release = data.get("release_date") or None

    return {
        "tmdb_id": data["id"],
        "title": data.get("title", ""),
        "original_title": data.get("original_title"),
        "overview": data.get("overview"),
        "release_date": release,
        "runtime_minutes": data.get("runtime"),
        "original_language": data.get("original_language"),
        "poster_path": data.get("poster_path"),
        "backdrop_path": data.get("backdrop_path"),
        "trailer_key": _pick_trailer(videos),
        "tmdb_vote_average": data.get("vote_average"),
        "tmdb_vote_count": data.get("vote_count"),
        "genres": genres,
        "cast": [{"name": a["name"], "character": a.get("character"), "profile_path": a.get("profile_path")} for a in cast],
    }
