import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database ---
    database_url: str = (
        "postgresql://tfe_user:tfe_password@localhost:5432/tfe_ads"
    )

    # --- Auth ---
    secret_key: str = "insecure-dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # --- Admin ---
    admin_email: str = "admin@mahavirshree.com"
    admin_password: str = "ChangeMe123!"

    # --- CORS ---
    cors_origins: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:5500,"
        "http://127.0.0.1:5500,"
        "https://toolsforengineers.com,"
        "https://www.toolsforengineers.com"
    )

    # --- Uploads ---
    upload_dir: str = "uploads"

    # --- Public API ---
    public_base_url: str = "http://127.0.0.1:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()

os.makedirs(settings.upload_dir, exist_ok=True)