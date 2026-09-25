from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine, SessionLocal
from . import models
from .security import hash_password
from .routers import auth, vendors, placements, ads, upload, public

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TFE Ads Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=".*",  # widget is embedded on arbitrary vendor domains; access is gated by API key
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.mount("/widget", StaticFiles(directory="widget"), name="widget")

app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(placements.router)
app.include_router(ads.router)
app.include_router(upload.router)
app.include_router(public.router)


@app.on_event("startup")
def bootstrap_admin():
    db = SessionLocal()
    try:
        if not db.query(models.User).first():
            admin = models.User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                role=models.UserRole.admin,
            )
            db.add(admin)
            db.commit()
            print(f"[bootstrap] Created default admin user: {settings.admin_email}")
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
