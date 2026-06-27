from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_admin_user, require_csrf
from app.models.moderation import AdminAuditLog, ReviewReport, ReportStatus
from app.models.movie import Movie
from app.models.review import Review, ReviewStatus
from app.models.user import User, UserStatus
from app.schemas.admin import (
    DashboardStats, MovieUpdateAdmin, ReportStatusUpdate,
    ReviewStatusUpdate, UserStatusUpdate,
)
from app.security.sessions import revoke_all_user_sessions
from app.services.movie_sync import upsert_movie_from_tmdb

router = APIRouter(prefix="/api/admin", tags=["admin"])


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


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: DbSession = Depends(get_db), admin: User = Depends(get_admin_user)):
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.status == UserStatus.active).count(),
        "total_movies": db.query(Movie).filter(Movie.is_active).count(),
        "total_reviews": db.query(Review).filter(Review.status == ReviewStatus.published).count(),
        "open_reports": db.query(ReviewReport).filter(ReviewReport.status == ReportStatus.open).count(),
    }


# ---------- Users ----------

@router.get("/users")
def list_users(
    page: int = Query(default=1, ge=1),
    q: str | None = None,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter((User.username.ilike(like)) | (User.email.ilike(like)))
    total = query.count()
    users = query.order_by(User.id).offset((page - 1) * 20).limit(20).all()
    return {
        "total": total,
        "page": page,
        "results": [
            {
                "id": u.id,
                "name": u.name,
                "username": u.username,
                "email": u.email,
                "role": u.role.value,
                "status": u.status.value,
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


# ---------- Movies ----------

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
    movies = query.order_by(Movie.id).offset((page - 1) * 20).limit(20).all()
    return {
        "total": total,
        "page": page,
        "results": [
            {
                "id": m.id,
                "tmdb_id": m.tmdb_id,
                "title": m.title,
                "is_featured": m.is_featured,
                "is_active": m.is_active,
                "release_date": m.release_date,
                "poster_path": m.poster_path,
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
        return {"id": existing.id, "already_exists": True}
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
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    _csrf=Depends(require_csrf),
):
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(404, "Filme não encontrado.")
    movie.is_featured = not movie.is_featured
    movie.updated_at = _now()
    _audit(db, admin, "toggle_featured", "movie", movie_id, {"featured": movie.is_featured})
    db.commit()
    return {"is_featured": movie.is_featured}


# ---------- Reports ----------

@router.get("/reports")
def list_reports(
    page: int = Query(default=1, ge=1),
    status_filter: str | None = Query(default=None, alias="status"),
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(ReviewReport)
    if status_filter:
        query = query.filter(ReviewReport.status == ReportStatus(status_filter))
    total = query.count()
    reports = query.order_by(ReviewReport.created_at.desc()).offset((page - 1) * 20).limit(20).all()
    return {
        "total": total,
        "page": page,
        "results": [
            {
                "id": r.id,
                "review_id": r.review_id,
                "reporter_user_id": r.reporter_user_id,
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
        .offset((page - 1) * 20)
        .limit(20)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "results": [
            {
                "id": log.id,
                "admin_user_id": log.admin_user_id,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "metadata": log.metadata_,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }
