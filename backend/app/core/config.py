from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()