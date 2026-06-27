from datetime import datetime
from pydantic import BaseModel, Field


class UserAdminOut(BaseModel):
    id: int
    name: str
    username: str
    email: str
    role: str
    status: str
    created_at: datetime
    last_login_at: datetime | None
    review_count: int = 0
    model_config = {"from_attributes": True}


class UserStatusUpdate(BaseModel):
    status: str


class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_movies: int
    total_reviews: int
    open_reports: int
    recent_activity: list = []


class AuditLogOut(BaseModel):
    id: int
    admin_user_id: int | None
    action: str
    target_type: str
    target_id: int | None
    metadata_: dict | None
    created_at: datetime
    admin_username: str | None = None
    model_config = {"from_attributes": True}


class ReportAdminOut(BaseModel):
    id: int
    review_id: int
    reporter_user_id: int | None
    reason: str
    details: str | None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ReviewStatusUpdate(BaseModel):
    status: str


class ReportStatusUpdate(BaseModel):
    status: str


class MovieUpdateAdmin(BaseModel):
    title: str | None = None
    overview: str | None = None
    is_featured: bool | None = None
    is_active: bool | None = None


class MovieCreateAdmin(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    overview: str | None = Field(default=None, max_length=5000)


class UserRoleUpdate(BaseModel):
    role: str


class MovieFeaturedUpdate(BaseModel):
    featured: bool
