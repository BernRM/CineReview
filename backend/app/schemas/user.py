from pydantic import BaseModel, HttpUrl, Field


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None

    def validate_avatar(self) -> None:
        if self.avatar_url is not None:
            url = self.avatar_url.strip()
            if url and not (url.startswith("http://") or url.startswith("https://")):
                raise ValueError("avatar_url deve ser http ou https")
            self.avatar_url = url or None


class PublicProfileResponse(BaseModel):
    id: int
    name: str
    username: str
    avatar_url: str | None
    bio: str | None
    review_count: int = 0
    watched_count: int = 0

    model_config = {"from_attributes": True}
