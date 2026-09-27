from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

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
# DYNAMIC VENDOR CORS
# =========================================================

def normalize_origin(origin: str | None) -> str:
    """
    Normalize a browser Origin value.

    Examples:
        https://example.com/    -> https://example.com
        https://www.example.com -> https://www.example.com
        http://localhost:5500   -> http://localhost:5500
    """

    if not origin:
        return ""

    origin = origin.strip().rstrip("/")

    try:
        parsed = urlparse(origin)

        if parsed.scheme not in {"http", "https"}:
            return ""

        if not parsed.netloc:
            return ""

        return (
            f"{parsed.scheme.lower()}://"
            f"{parsed.netloc.lower()}"
        )

    except Exception:
        return ""


def get_vendor_origins(db) -> set[str]:
    """
    Build allowed CORS origins dynamically from active vendors.

    Supported database values:

        example.com
        www.example.com

    or:

        https://example.com
        http://localhost:5500

    Multiple domains can be comma-separated.
    """

    origins: set[str] = set()

    vendors = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.is_active == True  # noqa: E712
        )
        .all()
    )

    for vendor in vendors:

        raw_domains = vendor.allowed_domains or ""

        for item in raw_domains.split(","):

            value = item.strip()

            if not value:
                continue

            # -------------------------------------------------
            # Domain-only format
            # -------------------------------------------------
            #
            # Example:
            # example.com
            #
            # Automatically allow:
            # https://example.com
            # http://example.com
            #

            if "://" not in value:

                value = value.rstrip("/")

                if value:
                    origins.add(
                        f"https://{value.lower()}"
                    )

                    origins.add(
                        f"http://{value.lower()}"
                    )

                continue

            # -------------------------------------------------
            # Full origin format
            # -------------------------------------------------

            normalized = normalize_origin(value)

            if normalized:
                origins.add(normalized)

    return origins


class DynamicVendorCORSMiddleware(BaseHTTPMiddleware):
    """
    Dynamic CORS middleware.

    Allowed origins are loaded from active vendors'
    allowed_domains values in the database.

    No Render CORS_ORIGINS update is required when
    vendor domains are changed through the dashboard.
    """

    async def dispatch(self, request, call_next):

        # -----------------------------------------------------
        # Browser Origin
        # -----------------------------------------------------

        origin = normalize_origin(
            request.headers.get("origin")
        )

        # -----------------------------------------------------
        # Non-browser request
        # -----------------------------------------------------

        if not origin:
            return await call_next(request)

        # -----------------------------------------------------
        # Load active vendor domains
        # -----------------------------------------------------

        db = SessionLocal()

        try:
            allowed_origins = get_vendor_origins(db)
        finally:
            db.close()

        # -----------------------------------------------------
        # OPTIONS / Preflight
        # -----------------------------------------------------

        if request.method == "OPTIONS":

            # Unknown origin
            if origin not in allowed_origins:
                return await call_next(request)

            response = await call_next(request)

            response.headers[
                "Access-Control-Allow-Origin"
            ] = origin

            response.headers[
                "Access-Control-Allow-Credentials"
            ] = "true"

            response.headers[
                "Access-Control-Allow-Methods"
            ] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )

            requested_headers = request.headers.get(
                "access-control-request-headers"
            )

            if requested_headers:

                response.headers[
                    "Access-Control-Allow-Headers"
                ] = requested_headers

            else:

                response.headers[
                    "Access-Control-Allow-Headers"
                ] = "*"

            response.headers["Vary"] = "Origin"

            return response

        # -----------------------------------------------------
        # Normal browser request
        # -----------------------------------------------------

        response = await call_next(request)

        if origin in allowed_origins:

            response.headers[
                "Access-Control-Allow-Origin"
            ] = origin

            response.headers[
                "Access-Control-Allow-Credentials"
            ] = "true"

            response.headers["Vary"] = "Origin"

        return response


# =========================================================
# ADD DYNAMIC CORS MIDDLEWARE
# =========================================================

app.add_middleware(
    DynamicVendorCORSMiddleware
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