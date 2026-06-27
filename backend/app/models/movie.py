from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.library import WatchedMovie, WatchlistItem
    from app.models.review import Review


def _now():
    return datetime.now(timezone.utc)


movie_genres = Table(
    "movie_genres",
    Base.metadata,
    Column("movie_id", Integer, ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(primary_key=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)

    movies: Mapped[list["Movie"]] = relationship("Movie", secondary=movie_genres, back_populates="genres")


class Movie(Base):
    __tablename__ = "movies"

    id: Mapped[int] = mapped_column(primary_key=True)
    tmdb_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    original_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    overview: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    runtime_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    original_language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    poster_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    backdrop_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    trailer_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tmdb_vote_average: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    tmdb_vote_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )
    tmdb_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    genres: Mapped[list[Genre]] = relationship("Genre", secondary=movie_genres, back_populates="movies")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="movie")  # noqa: F821
    watchlist_items: Mapped[list["WatchlistItem"]] = relationship("WatchlistItem", back_populates="movie", cascade="all, delete-orphan")  # noqa: F821
    watched_movies: Mapped[list["WatchedMovie"]] = relationship("WatchedMovie", back_populates="movie", cascade="all, delete-orphan")  # noqa: F821
