from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "cinereview"
    db_user: str = "postgres"
    db_password: str = "postgres"
    # Caminho para um arquivo de senha (ex.: secret do Swarm em /run/secrets/...).
    # Quando preenchido, tem prioridade sobre db_password.
    db_password_file: str = ""

    # Endpoint do Grafana Loki para envio de logs.
    loki_url: str = "http://loki:3100"

    tmdb_api_token: str = ""
    session_secret: str = "insecure-dev-secret-change-me"
    cookie_secure: bool = False
    session_ttl_hours: int = 720  # 30 days

    admin_email: str = "admin@exemplo.com"
    admin_username: str = "admin"
    admin_password: str = ""
    demo_seed_enabled: bool = True

    @model_validator(mode="after")
    def _load_password_from_file(self) -> "Settings":
        """Lê a senha do banco de um arquivo de secret, se informado.

        Permite usar secrets do Docker Swarm (montados em /run/secrets/...)
        sem expor a senha em variáveis de ambiente.
        """
        if self.db_password_file:
            try:
                with open(self.db_password_file, "r", encoding="utf-8") as handle:
                    self.db_password = handle.read().strip()
            except OSError:
                # Mantém db_password atual se o arquivo não existir/for ilegível.
                pass
        return self

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
