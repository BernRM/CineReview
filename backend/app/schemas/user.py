from pydantic import BaseModel, Field, field_validator


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar(cls, value: str | None) -> str | None:
        if value is None:
            return None
        url = value.strip()
        if url and not (url.startswith("http://") or url.startswith("https://")):
            raise ValueError("avatar_url deve ser http ou https")
        return url or None


class PublicProfileResponse(BaseModel):
    id: int
    name: str
    username: str
    avatar_url: str | None
    bio: str | None
    review_count: int = 0
    watched_count: int = 0

    model_config = {"from_attributes": True}
