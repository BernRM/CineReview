from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.models.movie import Movie
from app.schemas.movie import MovieSummary, TmdbMovieDetail, TmdbMovieSummary
from app.services import tmdb
from app.services.movie_sync import get_or_sync_movie
from app.services.ratings import compute_community_rating

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


def _movie_to_summary(movie: Movie, db: DbSession) -> dict:
    rating, count = compute_community_rating(db, movie.id)
    return {
        "id": movie.id,
        "tmdb_id": movie.tmdb_id,
        "title": movie.title,
        "release_date": movie.release_date,
        "poster_path": movie.poster_path,
        "tmdb_vote_average": float(movie.tmdb_vote_average) if movie.tmdb_vote_average else None,
        "is_featured": movie.is_featured,
        "genres": movie.genres,
        "community_rating": rating,
        "review_count": count,
    }


@router.get("/trending")
def trending(db: DbSession = Depends(get_db)):
    data = tmdb.get_trending()
    results = []
    featured = db.query(Movie).filter(Movie.is_featured, Movie.is_active).all()
    featured_tmdb_ids = {m.tmdb_id for m in featured if m.tmdb_id}

    if data:
        for item in (data.get("results") or [])[:20]:
            if item["id"] not in featured_tmdb_ids:
                results.append({
                    "tmdb_id": item["id"],
                    "title": item.get("title", ""),
                    "poster_path": item.get("poster_path"),
                    "backdrop_path": item.get("backdrop_path"),
                    "release_date": item.get("release_date"),
                    "vote_average": item.get("vote_average"),
                    "overview": item.get("overview"),
                    "genre_ids": item.get("genre_ids", []),
                })

    return {
        "featured": [_movie_to_summary(m, db) for m in featured],
        "trending": results,
    }


@router.get("/search")
def search(
    q: str = Query(min_length=2),
    page: int = Query(default=1, ge=1, le=500),
):
    data = tmdb.search_movies(q, page)
    if data is None:
        raise HTTPException(503, "Serviço de busca temporariamente indisponível.")
    results = []
    for item in data.get("results") or []:
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title", ""),
            "poster_path": item.get("poster_path"),
            "release_date": item.get("release_date"),
            "vote_average": item.get("vote_average"),
            "overview": item.get("overview"),
            "genre_ids": item.get("genre_ids", []),
        })
    return {
        "page": data.get("page", 1),
        "total_pages": data.get("total_pages", 1),
        "total_results": data.get("total_results", 0),
        "results": results,
    }


@router.get("/genres")
def genres():
    return tmdb.get_genres()


@router.get("/discover")
def discover(
    genre_id: int | None = None,
    year: int | None = None,
    page: int = Query(default=1, ge=1, le=500),
):
    data = tmdb.get_discover(genre_id, year, page)
    if data is None:
        raise HTTPException(503, "Serviço indisponível.")
    results = []
    for item in data.get("results") or []:
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title", ""),
            "poster_path": item.get("poster_path"),
            "release_date": item.get("release_date"),
            "vote_average": item.get("vote_average"),
            "overview": item.get("overview"),
            "genre_ids": item.get("genre_ids", []),
        })
    return {
        "page": data.get("page", 1),
        "total_pages": data.get("total_pages", 1),
        "results": results,
    }


@router.get("/movies/{tmdb_id}")
def movie_detail(tmdb_id: int, db: DbSession = Depends(get_db)):
    local = get_or_sync_movie(db, tmdb_id)
    data = tmdb.get_movie_detail(tmdb_id)

    if data is None and local is None:
        raise HTTPException(404, "Filme não encontrado.")

    if data:
        parsed = tmdb.parse_movie_detail(data)
        rating, count = compute_community_rating(db, local.id) if local else (None, 0)
        return {
            **parsed,
            "local_id": local.id if local else None,
            "is_featured": local.is_featured if local else False,
            "community_rating": rating,
            "review_count": count,
        }

    rating, count = compute_community_rating(db, local.id)
    return {
        "tmdb_id": local.tmdb_id,
        "title": local.title,
        "overview": local.overview,
        "poster_path": local.poster_path,
        "backdrop_path": local.backdrop_path,
        "local_id": local.id,
        "is_featured": local.is_featured,
        "community_rating": rating,
        "review_count": count,
    }
