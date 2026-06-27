from sqlalchemy.orm import Session as DbSession
from sqlalchemy import func

from app.models.review import Review, ReviewStatus


def compute_community_rating(db: DbSession, movie_id: int) -> tuple[float | None, int]:
    """Returns (average, count) for published reviews of a movie."""
    result = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.movie_id == movie_id, Review.status == ReviewStatus.published)
        .first()
    )
    avg, count = result
    return (float(avg) if avg is not None else None), (count or 0)


def get_user_review(db: DbSession, user_id: int, movie_id: int) -> Review | None:
    return (
        db.query(Review)
        .filter(
            Review.user_id == user_id,
            Review.movie_id == movie_id,
            Review.status != ReviewStatus.deleted,
        )
        .first()
    )
