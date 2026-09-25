import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://tfe_user:tfe_password@localhost:5432/tfe_ads"
    secret_key: str = "insecure-dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    admin_email: str = "admin@mahavirshree.com"
    admin_password: str = "ChangeMe123!"
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "uploads"
    public_base_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
os.makedirs(settings.upload_dir, exist_ok=True)
