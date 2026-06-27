from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_active_user, require_csrf
from app.models.movie import Movie
from app.models.review import Review, ReviewStatus
from app.models.moderation import ReviewReport, ReportStatus
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut, ReportRequest
from app.services.movie_sync import get_or_sync_movie
from app.services.ratings import compute_community_rating, get_user_review

router = APIRouter(prefix="/api/movies", tags=["movies"])


def _now():
    return datetime.now(timezone.utc)


def _review_out(r: Review) -> dict:
    return {
        "id": r.id,
        "movie_id": r.movie_id,
        "user_id": r.user_id,
        "legacy_reviewer_name": r.legacy_reviewer_name,
        "rating": float(r.rating),
        "title": r.title,
        "body": r.body,
        "contains_spoiler": r.contains_spoiler,
        "status": r.status.value,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "author_name": r.user.name if r.user else r.legacy_reviewer_name,
        "author_username": r.user.username if r.user else None,
    }


@router.get("/{movie_id}")
def get_movie(movie_id: int, db: DbSession = Depends(get_db)):
    movie = db.get(Movie, movie_id)
    if not movie or not movie.is_active:
        raise HTTPException(404, "Filme não encontrado.")
    rating, count = compute_community_rating(db, movie_id)
    return {
        "id": movie.id,
        "tmdb_id": movie.tmdb_id,
        "title": movie.title,
        "overview": movie.overview,
        "poster_path": movie.poster_path,
        "backdrop_path": movie.backdrop_path,
        "release_date": movie.release_date,
        "runtime_minutes": movie.runtime_minutes,
        "trailer_key": movie.trailer_key,
        "tmdb_vote_average": float(movie.tmdb_vote_average) if movie.tmdb_vote_average else None,
        "genres": [{"id": g.id, "name": g.name} for g in movie.genres],
        "is_featured": movie.is_featured,
        "community_rating": rating,
        "review_count": count,
    }


@router.get("/{movie_id}/reviews")
def list_reviews(movie_id: int, db: DbSession = Depends(get_db)):
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(404, "Filme não encontrado.")
    reviews = (
        db.query(Review)
        .filter(Review.movie_id == movie_id, Review.status == ReviewStatus.published)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [_review_out(r) for r in reviews]


@router.put("/{movie_id}/review")
def upsert_review(
    movie_id: int,
    body: ReviewCreate,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    movie = db.get(Movie, movie_id)
    if not movie:
        # Try to sync from TMDB via tmdb_id — not applicable here; movie_id is local
        raise HTTPException(404, "Filme não encontrado.")

    # Round rating to 1 decimal
    rating = round(float(body.rating), 1)
    now = _now()

    existing = get_user_review(db, user.id, movie_id)
    if existing:
        existing.rating = rating
        existing.title = body.title
        existing.body = body.body
        existing.contains_spoiler = body.contains_spoiler
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return _review_out(existing)

    review = Review(
        movie_id=movie_id,
        user_id=user.id,
        rating=rating,
        title=body.title,
        body=body.body,
        contains_spoiler=body.contains_spoiler,
        status=ReviewStatus.published,
        created_at=now,
        updated_at=now,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _review_out(review)


@router.delete("/{movie_id}/review", status_code=204)
def delete_review(
    movie_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    review = get_user_review(db, user.id, movie_id)
    if not review:
        raise HTTPException(404, "Avaliação não encontrada.")
    review.status = ReviewStatus.deleted
    review.updated_at = _now()
    db.commit()


@router.post("/reviews/{review_id}/report")
def report_review(
    review_id: int,
    body: ReportRequest,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    review = db.get(Review, review_id)
    if not review or review.status != ReviewStatus.published:
        raise HTTPException(404, "Avaliação não encontrada.")

    existing = (
        db.query(ReviewReport)
        .filter(
            ReviewReport.review_id == review_id,
            ReviewReport.reporter_user_id == user.id,
            ReviewReport.status == ReportStatus.open,
        )
        .first()
    )
    if existing:
        raise HTTPException(409, "Você já denunciou esta avaliação.")

    report = ReviewReport(
        review_id=review_id,
        reporter_user_id=user.id,
        reason=body.reason,
        details=body.details,
        status=ReportStatus.open,
        created_at=_now(),
    )
    db.add(report)
    db.commit()
    return {"ok": True}
