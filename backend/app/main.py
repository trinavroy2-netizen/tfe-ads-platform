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


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


def _run_startup_migrations():
    """
    Additive, idempotent column migrations.

    Existing production data is preserved.
    For anything beyond simple additive columns, use Alembic.
    """
    with engine.connect() as conn:
        try:
            conn.exec_driver_sql(
                """
                ALTER TABLE placements
                ADD COLUMN IF NOT EXISTS description VARCHAR DEFAULT ''
                """
            )
            conn.commit()

        except Exception as e:
            # Best effort for SQLite/tests or already-applied migrations.
            print(
                f"[migrations] skipped "
                f"(non-Postgres or already applied): {e}"
            )


_run_startup_migrations()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="MSI Universal Ads Platform API",
    version="2.0.0",
)


# ============================================================
# ADMIN / DASHBOARD CORS
# ============================================================
#
# This CORS configuration is for the MSI Ads Dashboard and
# other explicitly configured administrative frontends.
#
# Vendor website CORS is handled dynamically below.
#

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DYNAMIC PUBLIC WIDGET CORS
# ============================================================

class PublicWidgetCorsMiddleware(BaseHTTPMiddleware):
    """
    Dynamic per-vendor CORS for /api/public/*.

    Vendor domains are NOT hardcoded here.

    The requesting browser Origin is checked against the
    vendor's configured `allowed_domains`.

    Example:

        Vendor:
            toolsforengineers

        allowed_domains:
            https://toolsforengineers.com
            https://www.toolsforengineers.com
            http://localhost:5500
            http://127.0.0.1:5500

    Browser:

        Origin:
            http://127.0.0.1:5500

    Request:

        /api/public/ads?vendor=toolsforengineers&placement=homepage

    If the origin is configured for that vendor, the middleware
    returns:

        Access-Control-Allow-Origin:
            http://127.0.0.1:5500

    This means every vendor can have its own allowed domains
    without modifying or redeploying the backend code.
    """

    async def dispatch(self, request: Request, call_next):
        # --------------------------------------------------------
        # Only handle public/widget API routes.
        # --------------------------------------------------------

        if not request.url.path.startswith("/api/public/"):
            return await call_next(request)

        origin = request.headers.get("origin")
        vendor_slug = request.query_params.get("vendor")

        allow_this_origin = False

        # --------------------------------------------------------
        # GET /api/public/ads
        #
        # Vendor is identified using:
        #
        # ?vendor=toolsforengineers
        # --------------------------------------------------------

        if origin and vendor_slug:
            db = SessionLocal()

            try:
                vendor = (
                    db.query(models.Vendor)
                    .filter(models.Vendor.slug == vendor_slug)
                    .first()
                )

                if vendor:
                    try:
                        allow_this_origin = _domain_allowed(
                            vendor,
                            request,
                        )
                    except Exception as e:
                        print(
                            "[cors] Domain validation error: "
                            f"{e}"
                        )
                        allow_this_origin = False

            finally:
                db.close()

        # --------------------------------------------------------
        # Other public endpoints
        #
        # Example:
        #
        # POST /api/public/track
        #
        # These endpoints may identify the vendor using the
        # request body/ad_id rather than the query string.
        #
        # The actual route performs the authoritative validation.
        # --------------------------------------------------------

        elif origin and not vendor_slug:
            allow_this_origin = True

        # --------------------------------------------------------
        # Handle browser CORS preflight.
        #
        # The browser sends OPTIONS before the actual GET/POST
        # when custom headers such as X-API-Key are involved.
        # --------------------------------------------------------

        if request.method == "OPTIONS":
            response = Response(status_code=204)

        else:
            response = await call_next(request)

        # --------------------------------------------------------
        # Add dynamic CORS headers only when the vendor/domain
        # is allowed.
        # --------------------------------------------------------

        if origin and allow_this_origin:
            response.headers["Access-Control-Allow-Origin"] = origin

            response.headers["Vary"] = "Origin"

            response.headers["Access-Control-Allow-Credentials"] = (
                "false"
            )

            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, X-API-Key"
            )

            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, OPTIONS"
            )

        return response


# Register dynamic widget CORS middleware.
app.add_middleware(PublicWidgetCorsMiddleware)


# ============================================================
# STATIC UPLOADS
# ============================================================

app.mount(
    "/uploads",
    StaticFiles(directory=settings.upload_dir),
    name="uploads",
)


# ============================================================
# UNIVERSAL MSI ADS COMPONENT
# ============================================================
#
# Public URL remains:
#
# /components/msi-ads-component.js
#
# Internally the production/minified component is served.
#

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


# ============================================================
# API ROUTERS
# ============================================================

app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(placements.router)
app.include_router(ads.router)
app.include_router(upload.router)
app.include_router(public.router)
app.include_router(stats.router)


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def bootstrap_admin():
    db = SessionLocal()

    try:
        # Create default admin only when no users exist.
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


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }