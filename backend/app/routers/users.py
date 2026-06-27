from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_active_user, require_csrf
from app.models.library import WatchedMovie, WatchlistItem
from app.models.movie import Movie
from app.models.review import Review, ReviewStatus
from app.models.user import User
from app.schemas.user import UpdateProfileRequest, PublicProfileResponse
from app.services.movie_sync import get_or_sync_movie
from app.services.ratings import get_user_review

router = APIRouter(tags=["users"])


def _now():
    return datetime.now(timezone.utc)


# ---------- Profile ----------

@router.get("/api/me/profile")
def my_profile(user: User = Depends(get_active_user)):
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "role": user.role.value,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
    }


@router.patch("/api/me/profile")
def update_profile(
    body: UpdateProfileRequest,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    if body.name is not None:
        user.name = body.name
    if body.bio is not None:
        user.bio = body.bio or None
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url or None
    user.updated_at = _now()
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "username": user.username, "avatar_url": user.avatar_url, "bio": user.bio}


# ---------- Watchlist ----------

@router.get("/api/me/watchlist")
def my_watchlist(user: User = Depends(get_active_user)):
    return [
        {
            "movie_id": item.movie_id,
            "title": item.movie.title,
            "poster_path": item.movie.poster_path,
            "tmdb_id": item.movie.tmdb_id,
            "added_at": item.created_at,
        }
        for item in user.watchlist_items
        if item.movie.is_active
    ]


@router.put("/api/me/watchlist/{movie_id}", status_code=204)
def add_watchlist(
    movie_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(404, "Filme não encontrado.")
    exists = db.query(WatchlistItem).filter_by(user_id=user.id, movie_id=movie_id).first()
    if not exists:
        db.add(WatchlistItem(user_id=user.id, movie_id=movie_id, created_at=_now()))
        db.commit()


@router.delete("/api/me/watchlist/{movie_id}", status_code=204)
def remove_watchlist(
    movie_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    item = db.query(WatchlistItem).filter_by(user_id=user.id, movie_id=movie_id).first()
    if item:
        db.delete(item)
        db.commit()


# ---------- Watched ----------

@router.get("/api/me/watched")
def my_watched(user: User = Depends(get_active_user)):
    return [
        {
            "movie_id": item.movie_id,
            "title": item.movie.title,
            "poster_path": item.movie.poster_path,
            "tmdb_id": item.movie.tmdb_id,
            "watched_at": item.watched_at,
        }
        for item in user.watched_movies
        if item.movie.is_active
    ]


@router.put("/api/me/watched/{movie_id}", status_code=204)
def mark_watched(
    movie_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(404, "Filme não encontrado.")

    # Mark as watched
    now = _now()
    exists = db.query(WatchedMovie).filter_by(user_id=user.id, movie_id=movie_id).first()
    if not exists:
        db.add(WatchedMovie(user_id=user.id, movie_id=movie_id, watched_at=now, created_at=now))

    # Remove from watchlist
    item = db.query(WatchlistItem).filter_by(user_id=user.id, movie_id=movie_id).first()
    if item:
        db.delete(item)

    db.commit()


@router.delete("/api/me/watched/{movie_id}", status_code=204)
def unmark_watched(
    movie_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_active_user),
    _csrf=Depends(require_csrf),
):
    item = db.query(WatchedMovie).filter_by(user_id=user.id, movie_id=movie_id).first()
    if item:
        db.delete(item)
        db.commit()


# ---------- My reviews ----------

@router.get("/api/me/reviews")
def my_reviews(user: User = Depends(get_active_user)):
    return [
        {
            "id": r.id,
            "movie_id": r.movie_id,
            "movie_title": r.movie.title,
            "rating": float(r.rating),
            "title": r.title,
            "body": r.body,
            "contains_spoiler": r.contains_spoiler,
            "created_at": r.created_at,
        }
        for r in user.reviews
        if r.status == ReviewStatus.published
    ]


# ---------- Public profile ----------

@router.get("/api/users/{username}")
def public_profile(username: str, db: DbSession = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or user.status.value != "active":
        raise HTTPException(404, "Usuário não encontrado.")

    reviews_query = db.query(Review).filter(
        Review.user_id == user.id, Review.status == ReviewStatus.published
    )
    review_count = reviews_query.count()
    watched_count = db.query(WatchedMovie).filter(WatchedMovie.user_id == user.id).count()
    watchlist_count = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).count()
    recent_reviews = reviews_query.order_by(Review.created_at.desc()).limit(5).all()

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "review_count": review_count,
        "watched_count": watched_count,
        "watchlist_count": watchlist_count,
        "recent_reviews": [
            {
                "id": review.id,
                "movie_id": review.movie_id,
                "movie_title": review.movie.title,
                "movie_tmdb_id": review.movie.tmdb_id,
                "rating": float(review.rating),
                "title": review.title,
                "body": review.body,
                "contains_spoiler": review.contains_spoiler,
                "created_at": review.created_at,
            }
            for review in recent_reviews
        ],
    }
