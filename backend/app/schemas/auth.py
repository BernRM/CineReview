import re
from pydantic import BaseModel, EmailStr, Field, field_validator


USERNAME_RE = re.compile(r"^[a-zA-Z0-9_-]{3,30}$")


class RegisterRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError("Username deve ter 3-30 caracteres: letras, números, _ ou -")
        return v.lower()

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower()


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower()


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserMeResponse(BaseModel):
    id: int
    name: str
    username: str
    email: str
    role: str
    avatar_url: str | None
    bio: str | None

    model_config = {"from_attributes": True}
