import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.moderation import ReviewReport
    from app.models.movie import Movie
    from app.models.user import User


class ReviewStatus(str, enum.Enum):
    published = "published"
    hidden = "hidden"
    deleted = "deleted"


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_review_user_movie"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    legacy_reviewer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    rating: Mapped[float] = mapped_column(Numeric(3, 1), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    contains_spoiler: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), nullable=False, default=ReviewStatus.published)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    movie: Mapped["Movie"] = relationship("Movie", back_populates="reviews")  # noqa: F821
    user: Mapped["User | None"] = relationship("User", back_populates="reviews")  # noqa: F821
    reports: Mapped[list["ReviewReport"]] = relationship("ReviewReport", back_populates="review", cascade="all, delete-orphan")  # noqa: F821
