import os

from pydantic_settings import BaseSettings, SettingsConfigDict

# ENVIRONMENT selects which .env file is loaded: development (default) or production.
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
_ENV_FILE_BY_PROFILE = {
    "development": ".env.development",
    "production": ".env.production",
}
_env_file = _ENV_FILE_BY_PROFILE.get(ENVIRONMENT, ".env.development")
if not os.path.exists(_env_file):
    _env_file = ".env"


class Settings(BaseSettings):
    environment: str = ENVIRONMENT
    database_url: str
    jwt_secret_key: str = "development-only-change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:5173"
    app_base_url: str = "http://localhost:8000"
    mercado_pago_access_token: str = ""
    mercado_pago_public_key: str = ""
    mercado_pago_webhook_secret: str = ""
    mercado_pago_api_base_url: str = "https://api.mercadopago.com"
    mercado_pago_client_id: str = ""
    mercado_pago_client_secret: str = ""

    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()