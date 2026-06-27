"""Upsert TMDB movie data into local movies table."""
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session as DbSession

from app.models.movie import Genre, Movie, movie_genres
from app.services.tmdb import get_movie_detail, parse_movie_detail


def _now():
    return datetime.now(timezone.utc)


def upsert_genre(db: DbSession, tmdb_id: int, name: str) -> Genre:
    genre = db.query(Genre).filter(Genre.tmdb_id == tmdb_id).first()
    if genre is None:
        genre = Genre(tmdb_id=tmdb_id, name=name)
        db.add(genre)
        db.flush()
    return genre


def upsert_movie_from_tmdb(db: DbSession, tmdb_id: int) -> Movie | None:
    """Fetch from TMDB and upsert into local DB. Returns None if TMDB unavailable."""
    data = get_movie_detail(tmdb_id)
    if data is None:
        return None
    return upsert_movie_from_data(db, parse_movie_detail(data))


def upsert_movie_from_data(db: DbSession, parsed: dict) -> Movie:
    tmdb_id = parsed["tmdb_id"]
    now = _now()

    movie = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
    if movie is None:
        movie = Movie(created_at=now)
        db.add(movie)

    movie.tmdb_id = tmdb_id
    movie.title = parsed.get("title", "")
    movie.original_title = parsed.get("original_title")
    movie.overview = parsed.get("overview")
    movie.original_language = parsed.get("original_language")
    movie.poster_path = parsed.get("poster_path")
    movie.backdrop_path = parsed.get("backdrop_path")
    movie.trailer_key = parsed.get("trailer_key")
    movie.tmdb_vote_average = parsed.get("tmdb_vote_average")
    movie.tmdb_vote_count = parsed.get("tmdb_vote_count")
    movie.updated_at = now
    movie.tmdb_synced_at = now

    release = parsed.get("release_date")
    if isinstance(release, str) and release:
        try:
            movie.release_date = date.fromisoformat(release)
        except ValueError:
            pass
    elif isinstance(release, date):
        movie.release_date = release

    runtime = parsed.get("runtime_minutes") or parsed.get("runtime")
    if runtime:
        movie.runtime_minutes = runtime

    db.flush()

    genres_data = parsed.get("genres") or []
    current_genre_ids = {g.tmdb_id for g in movie.genres}
    for gd in genres_data:
        if gd["tmdb_id"] not in current_genre_ids:
            genre = upsert_genre(db, gd["tmdb_id"], gd["name"])
            movie.genres.append(genre)

    db.commit()
    db.refresh(movie)
    return movie


def get_or_sync_movie(db: DbSession, tmdb_id: int) -> Movie | None:
    """Return local movie if fresh enough, otherwise sync from TMDB."""
    from datetime import timedelta
    movie = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
    if movie is None:
        return upsert_movie_from_tmdb(db, tmdb_id)
    stale = movie.tmdb_synced_at is None or (
        _now() - movie.tmdb_synced_at.replace(tzinfo=timezone.utc) > timedelta(days=7)
    )
    if stale:
        upsert_movie_from_tmdb(db, tmdb_id)
        db.refresh(movie)
    return movie
