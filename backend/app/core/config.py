import os
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ENVIRONMENT selects which .env file is loaded: development (default) or production.
# Files are resolved relative to backend/, so commands work from any directory.
# Real environment variables always win over values from the file.
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
_env_file = BACKEND_DIR / f".env.{ENVIRONMENT}"
if not _env_file.exists():
    _env_file = BACKEND_DIR / ".env"

_INSECURE_SECRET = "development-only-change-this-secret"


class Settings(BaseSettings):
    environment: str = ENVIRONMENT
    log_level: str = "INFO"
    database_url: str
    jwt_secret_key: str = _INSECURE_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    # Comma-separated list of allowed browser origins.
    frontend_url: str = "http://localhost:5173"
    app_base_url: str = "http://localhost:8000"
    mercado_pago_access_token: str = ""
    mercado_pago_public_key: str = ""
    mercado_pago_webhook_secret: str = ""
    mercado_pago_api_base_url: str = "https://api.mercadopago.com"

    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, value: str) -> str:
        # Hosting providers hand out postgres:// URLs; SQLAlchemy needs the psycopg (v3) driver name.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_url.split(",") if origin.strip()]

    @property
    def public_frontend_url(self) -> str:
        """First configured origin; used to build links sent to customers."""
        return self.cors_origins[0] if self.cors_origins else "http://localhost:5173"

    @model_validator(mode="after")
    def _validate_production(self) -> "Settings":
        if not self.is_production:
            return self
        problems = []
        if self.jwt_secret_key == _INSECURE_SECRET or len(self.jwt_secret_key) < 32:
            problems.append("JWT_SECRET_KEY deve ser definido com pelo menos 32 caracteres")
        if any("localhost" in origin for origin in self.cors_origins):
            problems.append("FRONTEND_URL não pode apontar para localhost")
        if problems:
            raise ValueError("Configuração de produção inválida: " + "; ".join(problems))
        return self


settings = Settings()
