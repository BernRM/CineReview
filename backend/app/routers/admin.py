import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_admin_user, require_csrf
from app.models.moderation import AdminAuditLog, ReviewReport, ReportStatus
from app.models.movie import Movie
from app.models.review import Review, ReviewStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.admin import (
    DashboardStats, MovieCreateAdmin, MovieFeaturedUpdate, MovieUpdateAdmin,
    ReportStatusUpdate, ReviewStatusUpdate, UserRoleUpdate, UserStatusUpdate,
)
from app.security.sessions import revoke_all_user_sessions
from app.services.movie_sync import upsert_movie_from_tmdb

router = APIRouter(prefix="/api/admin", tags=["admin"])

PAGE_SIZE = 20


def _now():
    return datetime.now(timezone.utc)


def _audit(db: DbSession, admin: User, action: str, target_type: str, target_id: int | None = None, meta: dict | None = None):
    log = AdminAuditLog(
        admin_user_id=admin.id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        metadata_=meta,
        created_at=_now(),
    )
    db.add(log)
    db.flush()


def _paginate(total: int, page: int) -> dict:
    return {"total": total, "page": page, "total_pages": max(1, math.ceil(total / PAGE_SIZE))}


def _username_for(db: DbSession, user_id: int | None) -> str | None:
    if user_id is None:
        return None
    user = db.get(User, user_id)
    return user.username if user else None


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: DbSession = Depends(get_db), admin: User = Depends(get_admin_user)):
    from app.models.moderation import AdminAuditLog
    recent = (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.status == UserStatus.active).count(),
        "total_movies": db.query(Movie).filter(Movie.is_active).count(),
        "total_reviews": db.query(Review).filter(Review.status == ReviewStatus.published).count(),
        "open_reports": db.query(ReviewReport).filter(ReviewReport.status == ReportStatus.open).count(),
        "recent_activity": [
            {
                "id": log.id,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "admin_username": _username_for(db, log.admin_user_id),
                "created_at": log.created_at,
            }
            for log in recent
        ],
    }


# ---------- Users ----------

@router.get("/users")
def list_users(
    page: int = Query(default=1, ge=1),
    q: str | None = None,
    status: str | None = None,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter((User.username.ilike(like)) | (User.email.ilike(like)))
    if status:
        try:
            query = query.filter(User.status == UserStatus(status))
        except ValueError:
            raise HTTPException(400, "Status de usuário inválido.")
    total = query.count()
    users = query.order_by(User.id).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {
        **_paginate(total, page),
        "items": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role.value,
                "status": u.status.value,
                "review_count": db.query(Review).filter(Review.user_id == u.id).count(),
                "created_at": u.created_at,
                "last_login_at": u.last_login_at,
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: UserStatusUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")
    if user.id == admin.id:
        raise HTTPException(400, "Você não pode alterar sua própria conta.")
    if body.status not in ("active", "suspended"):
        raise HTTPException(400, "Status inválido.")
    user.status = UserStatus(body.status)
    if body.status == "suspended":
        revoke_all_user_sessions(db, user.id)
    _audit(db, admin, f"user_{body.status}", "user", user_id)
    db.commit()
    return {"ok": True}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    body: UserRoleUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")
    if user.id == admin.id:
        raise HTTPException(400, "Você não pode alterar sua própria conta.")
    if body.role not in ("user", "admin"):
        raise HTTPException(400, "Role inválido.")
    user.role = UserRole(body.role)
    _audit(db, admin, f"user_role_{body.role}", "user", user_id)
    db.commit()
    return {"ok": True}


# ---------- Movies ----------

@router.post("/movies", status_code=201)
def create_local_movie(
    body: MovieCreateAdmin,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    now = _now()
    movie = Movie(
        title=body.title,
        overview=body.overview,
        is_active=True,
        is_featured=False,
        created_at=now,
        updated_at=now,
    )
    db.add(movie)
    db.flush()
    _audit(db, admin, "create_local_movie", "movie", movie.id)
    db.commit()
    db.refresh(movie)
    return {"id": movie.id, "title": movie.title, "tmdb_id": None}


@router.get("/movies")
def list_movies(
    page: int = Query(default=1, ge=1),
    q: str | None = None,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Movie)
    if q:
        query = query.filter(Movie.title.ilike(f"%{q}%"))
    total = query.count()
    movies = query.order_by(Movie.id).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {
        **_paginate(total, page),
        "items": [
            {
                "id": m.id,
                "tmdb_id": m.tmdb_id,
                "title": m.title,
                "overview": m.overview,
                "is_featured": m.is_featured,
                "is_active": m.is_active,
                "release_date": m.release_date,
                "poster_path": m.poster_path,
                "review_count": db.query(Review).filter(Review.movie_id == m.id, Review.status == ReviewStatus.published).count(),
            }
            for m in movies
        ],
    }


@router.post("/movies/import/{tmdb_id}", status_code=201)
def import_movie(
    tmdb_id: int,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    existing = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
    if existing:
        return {"id": existing.id, "title": existing.title, "already_exists": True}
    movie = upsert_movie_from_tmdb(db, tmdb_id)
    if not movie:
        raise HTTPException(503, "Não foi possível buscar o filme no TMDB.")
    _audit(db, admin, "import_movie", "movie", movie.id, {"tmdb_id": tmdb_id})
    db.commit()
    return {"id": movie.id, "title": movie.title}


@router.patch("/movies/{movie_id}")
def update_movie(
    movie_id: int,
    body: MovieUpdateAdmin,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(404, "Filme não encontrado.")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(movie, field, val)
    movie.updated_at = _now()
    _audit(db, admin, "update_movie", "movie", movie_id)
    db.commit()
    return {"ok": True}


@router.patch("/movies/{movie_id}/featured")
def toggle_featured(
    movie_id: int,
    body: MovieFeaturedUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(404, "Filme não encontrado.")
    movie.is_featured = body.featured
    movie.updated_at = _now()
    _audit(db, admin, "toggle_featured", "movie", movie_id, {"featured": movie.is_featured})
    db.commit()
    return {"is_featured": movie.is_featured}


# ---------- Reports ----------

@router.get("/reports")
def list_reports(
    page: int = Query(default=1, ge=1),
    status: str | None = Query(default=None),
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(ReviewReport)
    if status:
        try:
            query = query.filter(ReviewReport.status == ReportStatus(status))
        except ValueError:
            raise HTTPException(400, "Status de reporte inválido.")
    total = query.count()
    reports = query.order_by(ReviewReport.created_at.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {
        **_paginate(total, page),
        "items": [
            {
                "id": r.id,
                "review_id": r.review_id,
                "reporter_user_id": r.reporter_user_id,
                "reporter_username": _username_for(db, r.reporter_user_id),
                "reason": r.reason,
                "details": r.details,
                "status": r.status.value,
                "created_at": r.created_at,
            }
            for r in reports
        ],
    }


@router.patch("/reports/{report_id}")
def update_report(
    report_id: int,
    body: ReportStatusUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    report = db.get(ReviewReport, report_id)
    if not report:
        raise HTTPException(404, "Denúncia não encontrada.")
    if body.status not in ("resolved", "dismissed"):
        raise HTTPException(400, "Status inválido.")
    report.status = ReportStatus(body.status)
    report.resolved_by = admin.id
    report.resolved_at = _now()
    _audit(db, admin, f"report_{body.status}", "review_report", report_id)
    db.commit()
    return {"ok": True}


# ---------- Reviews ----------

@router.get("/reviews")
def list_moderated_reviews(
    page: int = Query(default=1, ge=1),
    status: str = Query(default="hidden"),
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    try:
        review_status = ReviewStatus(status)
    except ValueError:
        raise HTTPException(400, "Status de avaliação inválido.")

    query = db.query(Review).filter(Review.status == review_status)
    total = query.count()
    reviews = (
        query.order_by(Review.updated_at.desc())
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .all()
    )
    return {
        **_paginate(total, page),
        "items": [
            {
                **_review_admin_item(review),
            }
            for review in reviews
        ],
    }


def _review_admin_item(review: Review) -> dict:
    return {
        "id": review.id,
        "movie_id": review.movie_id,
        "movie_title": review.movie.title,
        "author_name": review.user.name if review.user else review.legacy_reviewer_name,
        "rating": float(review.rating),
        "title": review.title,
        "body": review.body,
        "contains_spoiler": review.contains_spoiler,
        "status": review.status.value,
        "updated_at": review.updated_at,
    }


@router.patch("/reviews/{review_id}/status")
def moderate_review(
    review_id: int,
    body: ReviewStatusUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Avaliação não encontrada.")
    if body.status not in ("published", "hidden"):
        raise HTTPException(400, "Status inválido.")
    review.status = ReviewStatus(body.status)
    review.updated_at = _now()
    _audit(db, admin, f"review_{body.status}", "review", review_id)
    db.commit()
    return {"ok": True}


@router.delete("/reviews/{review_id}", status_code=204)
def delete_review_admin(
    review_id: int,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Avaliação não encontrada.")
    review.status = ReviewStatus.deleted
    review.updated_at = _now()
    _audit(db, admin, "delete_review", "review", review_id)
    db.commit()


# ---------- Audit ----------

@router.get("/audit")
def audit_log(
    page: int = Query(default=1, ge=1),
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    total = db.query(AdminAuditLog).count()
    logs = (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .all()
    )
    return {
        **_paginate(total, page),
        "items": [
            {
                "id": log.id,
                "admin_user_id": log.admin_user_id,
                "admin_username": _username_for(db, log.admin_user_id),
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "metadata": log.metadata_,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }
