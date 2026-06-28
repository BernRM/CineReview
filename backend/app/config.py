from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "cinereview"
    db_user: str = "postgres"
    db_password: str = "postgres"

    tmdb_api_token: str = ""
    session_secret: str = "insecure-dev-secret-change-me"
    cookie_secure: bool = False
    session_ttl_hours: int = 720  # 30 days

    admin_email: str = "admin@exemplo.com"
    admin_username: str = "admin"
    admin_password: str = ""
    demo_seed_enabled: bool = True

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
