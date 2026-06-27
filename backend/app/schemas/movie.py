from datetime import date, datetime
from pydantic import BaseModel


class GenreOut(BaseModel):
    id: int
    tmdb_id: int
    name: str
    model_config = {"from_attributes": True}


class MovieSummary(BaseModel):
    id: int
    tmdb_id: int | None
    title: str
    release_date: date | None
    poster_path: str | None
    tmdb_vote_average: float | None
    is_featured: bool
    genres: list[GenreOut] = []
    community_rating: float | None = None
    review_count: int = 0
    model_config = {"from_attributes": True}


class MovieDetail(MovieSummary):
    original_title: str | None
    overview: str | None
    runtime_minutes: int | None
    original_language: str | None
    backdrop_path: str | None
    trailer_key: str | None
    tmdb_vote_count: int | None
    tmdb_synced_at: datetime | None


class TmdbMovieSummary(BaseModel):
    tmdb_id: int
    title: str
    original_title: str | None
    release_date: str | None
    poster_path: str | None
    backdrop_path: str | None
    overview: str | None
    vote_average: float | None
    vote_count: int | None
    genre_ids: list[int] = []


class TmdbMovieDetail(TmdbMovieSummary):
    runtime: int | None
    original_language: str | None
    genres: list[GenreOut] = []
    trailer_key: str | None = None


class MovieUpdateAdmin(BaseModel):
    title: str | None = None
    overview: str | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    trailer_key: str | None = None
