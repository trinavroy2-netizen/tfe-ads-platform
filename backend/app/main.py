from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine, SessionLocal
from . import models
from .security import hash_password
from .routers import auth, vendors, placements, ads, upload, public


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="TFE Ads Platform API",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================
#
# CORS is controlled through the CORS_ORIGINS environment
# variable from the backend configuration.
#
# Example:
#
# CORS_ORIGINS=https://tfe-ads-dashboard.onrender.com
#
# Multiple origins can be configured depending on how
# settings.cors_origins is parsed in config.py.
#
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-API-Key",
    ],
)


# =========================================================
# STATIC FILES
# =========================================================

app.mount(
    "/uploads",
    StaticFiles(
        directory=settings.upload_dir
    ),
    name="uploads",
)

app.mount(
    "/widget",
    StaticFiles(
        directory="widget"
    ),
    name="widget",
)


# =========================================================
# API ROUTERS
# =========================================================

app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(placements.router)
app.include_router(ads.router)
app.include_router(upload.router)
app.include_router(public.router)


# =========================================================
# ADMIN BOOTSTRAP
# =========================================================

@app.on_event("startup")
def bootstrap_admin():

    db = SessionLocal()

    try:

        if not db.query(models.User).first():

            admin = models.User(
                email=settings.admin_email,
                hashed_password=hash_password(
                    settings.admin_password
                ),
                role=models.UserRole.admin,
            )

            db.add(admin)
            db.commit()

            print(
                "[bootstrap] Created default admin user: "
                f"{settings.admin_email}"
            )

    finally:
        db.close()


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }