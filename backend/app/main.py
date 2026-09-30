from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .config import settings
from .database import Base, engine, SessionLocal
from . import models
from .security import hash_password
from .routers import auth, vendors, placements, ads, upload, public, stats
from .routers.public import _domain_allowed


Base.metadata.create_all(bind=engine)


def _run_startup_migrations():
    """Additive, idempotent column migrations so existing production data
    (e.g. an already-deployed ToolsForEngineers vendor) is never dropped.
    For anything beyond simple additive columns, introduce Alembic."""
    with engine.connect() as conn:
        try:
            conn.exec_driver_sql(
                "ALTER TABLE placements ADD COLUMN IF NOT EXISTS description VARCHAR DEFAULT ''"
            )
            conn.commit()
        except Exception as e:  # pragma: no cover - best effort, e.g. on SQLite in tests
            print(f"[migrations] skipped (non-Postgres or already applied): {e}")


_run_startup_migrations()


app = FastAPI(
    title="MSI Universal Ads Platform API",
    version="2.0.0",
)


# --- Admin/dashboard CORS: a small, explicit allowlist only. No wildcard. ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PublicWidgetCorsMiddleware(BaseHTTPMiddleware):
    """
    Per-vendor CORS for /api/public/* (the widget-facing API).

    This is intentionally NOT a blanket allow-all: a vendor's browser origin
    is only echoed back (making the response readable by that vendor's page)
    when it matches that specific vendor's configured allowed_domains.

    The vendor slug for GET /api/public/ads is in the query string, so we can
    check it before the request even reaches the route.

    A vendor with no allowed_domains configured yet is left open for initial
    testing (see Vendor.allowed_domains) - the route handler enforces the same
    rule again (and additionally requires the vendor's API key), so this
    middleware is a fast, browser-facing layer on top of that authoritative
    check, not a replacement for it.
    """

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/public/"):
            return await call_next(request)

        origin = request.headers.get("origin")
        allow_this_origin = False

        vendor_slug = request.query_params.get("vendor")

        if origin and vendor_slug:
            db = SessionLocal()
            try:
                vendor = (
                    db.query(models.Vendor)
                    .filter(models.Vendor.slug == vendor_slug)
                    .first()
                )

                if vendor:
                    allow_this_origin = _domain_allowed(vendor, request)
            finally:
                db.close()

        elif origin and not vendor_slug:
            # e.g. POST /api/public/track, which identifies the vendor via the
            # ad_id in its body rather than a query param. The route itself
            # re-validates the domain against that ad's vendor; here we just
            # let the response through so the browser can read the result of
            # that check (a 403 is only useful to JS if CORS lets it through).
            allow_this_origin = True

        if request.method == "OPTIONS":
            response = Response(status_code=204)
        else:
            response = await call_next(request)

        if origin and allow_this_origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, X-API-Key"
            )
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, OPTIONS"
            )

        return response


app.add_middleware(PublicWidgetCorsMiddleware)


# --- Static uploads ---
app.mount(
    "/uploads",
    StaticFiles(directory=settings.upload_dir),
    name="uploads",
)


# --- Universal MSI Ads Component ---
# Keep the public URL unchanged:
# /components/msi-ads-component.js
#
# Internally serve the minified production file.
@app.get("/components/msi-ads-component.js")
async def serve_msi_ads_component():
    component_file = (
        Path(__file__).resolve().parent.parent
        / "components"
        / "msi-ads-component.min.js"
    )

    if not component_file.exists():
        return Response(
            content="MSI Ads Component is not available.",
            status_code=503,
            media_type="text/plain",
        )

    return FileResponse(
        path=component_file,
        media_type="application/javascript",
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(placements.router)
app.include_router(ads.router)
app.include_router(upload.router)
app.include_router(public.router)
app.include_router(stats.router)


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

            print(
                f"[bootstrap] Created default admin user: "
                f"{settings.admin_email}"
            )

    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}