from datetime import datetime
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: float = Field(ge=1.0, le=10.0)
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, min_length=10, max_length=2000)
    contains_spoiler: bool = False


class ReviewOut(BaseModel):
    id: int
    movie_id: int
    user_id: int | None
    legacy_reviewer_name: str | None
    rating: float
    title: str | None
    body: str | None
    contains_spoiler: bool
    status: str
    created_at: datetime
    updated_at: datetime
    author_name: str | None = None
    author_username: str | None = None
    model_config = {"from_attributes": True}


class ReportRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=100)
    details: str | None = Field(default=None, max_length=500)
