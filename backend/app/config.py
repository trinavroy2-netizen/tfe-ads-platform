import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"  # "development" | "production"
    database_url: str = "postgresql://tfe_user:tfe_password@localhost:5432/tfe_ads"
    secret_key: str = "insecure-dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    admin_email: str = "admin@mahavirshree.com"
    admin_password: str = "ChangeMe123!"
    # Origins allowed to call the ADMIN API (the dashboard's own domain(s)).
    # This is deliberately NOT used for the public widget API - see main.py -
    # each vendor's allowed browser origins are controlled per-vendor instead,
    # via Vendor.allowed_domains, because the set of vendor domains is dynamic
    # and unknown at deploy time.
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "uploads"
    public_base_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


settings = Settings()
os.makedirs(settings.upload_dir, exist_ok=True)

if settings.is_production:
    _warnings = []
    if settings.secret_key == "insecure-dev-secret-change-me":
        _warnings.append("SECRET_KEY is still the insecure default")
    if settings.admin_password == "ChangeMe123!":
        _warnings.append("ADMIN_PASSWORD is still the insecure default")
    if "localhost" in settings.public_base_url or "127.0.0.1" in settings.public_base_url:
        _warnings.append("PUBLIC_BASE_URL still points at localhost")
    for w in _warnings:
        print(f"[config] WARNING (production): {w}")
