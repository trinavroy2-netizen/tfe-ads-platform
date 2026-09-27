from datetime import datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db


router = APIRouter(
    prefix="/api/public",
    tags=["public (widget)"],
)

KATHMANDU_TZ = ZoneInfo("Asia/Kathmandu")


# =========================================================
# ORIGIN HELPERS
# =========================================================

def _normalize_origin(origin: str | None) -> str:
    """
    Normalize a browser Origin value.

    Examples:
        https://example.com/      -> https://example.com
        https://www.example.com   -> https://www.example.com
        http://localhost:3000     -> http://localhost:3000
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


def _allowed_origins(vendor: models.Vendor) -> set[str]:
    """
    Convert Vendor.allowed_domains into normalized origins.

    Supported database formats:

        example.com
        www.example.com

    or:

        https://example.com
        http://localhost:3000

    Multiple domains can be comma-separated.
    """

    raw = vendor.allowed_domains or ""

    origins: set[str] = set()

    for item in raw.split(","):

        value = item.strip()

        if not value:
            continue

        # -----------------------------------------------------
        # Domain-only format
        # -----------------------------------------------------
        #
        # Example:
        # example.com
        #
        # Allow both HTTP and HTTPS.
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

        # -----------------------------------------------------
        # Full-origin format
        # -----------------------------------------------------

        normalized = _normalize_origin(value)

        if normalized:
            origins.add(normalized)

    return origins


def _origin_allowed(
    vendor: models.Vendor,
    origin: str | None,
) -> bool:
    """
    Check whether the browser Origin is authorized
    for the vendor.

    Missing Origin is allowed for non-browser requests.

    Browser requests with an Origin must match one of
    the vendor's configured allowed domains.
    """

    normalized_origin = _normalize_origin(origin)

    # Non-browser request
    if not normalized_origin:
        return True

    allowed = _allowed_origins(vendor)

    # No domains configured = browser embedding is denied.
    if not allowed:
        return False

    return normalized_origin in allowed


# =========================================================
# VENDOR VALIDATION
# =========================================================

def _resolve_vendor(
    db: Session,
    vendor_slug: str,
    x_api_key: str | None,
    origin: str | None = None,
):
    """
    Resolve and validate an active vendor.

    Validation order:

    1. Vendor exists and is active
    2. API key is valid
    3. Browser Origin is authorized
    """

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.slug == vendor_slug
        )
        .first()
    )

    if not vendor or not vendor.is_active:
        raise HTTPException(
            status_code=404,
            detail="Unknown or inactive vendor",
        )

    if not vendor.api_key or x_api_key != vendor.api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key",
        )

    if not _origin_allowed(
        vendor=vendor,
        origin=origin,
    ):
        raise HTTPException(
            status_code=403,
            detail="Origin is not authorized for this vendor",
        )

    return vendor


def _validate_ad_origin(
    vendor: models.Vendor,
    origin: str | None,
):
    """
    Validate browser Origin against the vendor.

    Missing Origin is allowed for non-browser requests.
    """

    if not _origin_allowed(
        vendor=vendor,
        origin=origin,
    ):
        raise HTTPException(
            status_code=403,
            detail="Origin is not authorized for this vendor",
        )


# =========================================================
# PUBLIC ADS
# =========================================================

@router.get(
    "/ads",
    response_model=schemas.PublicAdsResponse,
)
def get_public_ads(
    vendor: str,
    placement: str,
    request: Request,
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(
        default=None,
        alias="X-API-Key",
    ),
):
    """
    Public endpoint used by the embeddable TFE widget.

    Example:

        GET /api/public/ads
            ?vendor=toolsforengineers
            &placement=homepage

    Required header:

        X-API-Key: <vendor api key>

    Browser requests must also come from a domain
    configured in Vendor.allowed_domains.
    """

    # -----------------------------------------------------
    # Browser Origin
    # -----------------------------------------------------

    origin = request.headers.get("origin")

    # -----------------------------------------------------
    # Validate vendor
    # -----------------------------------------------------

    vendor_obj = _resolve_vendor(
        db=db,
        vendor_slug=vendor,
        x_api_key=x_api_key,
        origin=origin,
    )

    # -----------------------------------------------------
    # Resolve placement
    # -----------------------------------------------------

    placement_obj = (
        db.query(models.Placement)
        .filter(
            models.Placement.vendor_id == vendor_obj.id,
            models.Placement.slug == placement,
            models.Placement.is_active == True,  # noqa: E712
        )
        .first()
    )

    if not placement_obj:
        raise HTTPException(
            status_code=404,
            detail="Unknown or inactive placement",
        )

    # -----------------------------------------------------
    # Current Kathmandu time
    # -----------------------------------------------------

    now = datetime.now(
        KATHMANDU_TZ
    ).replace(tzinfo=None)

    # -----------------------------------------------------
    # Get active scheduled ads
    # -----------------------------------------------------

    ads = (
        db.query(models.Ad)
        .filter(
            models.Ad.placement_id
            == placement_obj.id,

            models.Ad.is_active
            == True,  # noqa: E712
        )
        .filter(
            (models.Ad.start_at == None)  # noqa: E711
            | (models.Ad.start_at <= now)
        )
        .filter(
            (models.Ad.end_at == None)  # noqa: E711
            | (models.Ad.end_at >= now)
        )
        .order_by(
            models.Ad.sort_order.asc(),
            models.Ad.created_at.desc(),
        )
        .all()
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return schemas.PublicAdsResponse(
        placement=placement_obj.slug,

        dimensions={
            "desktop_width": placement_obj.desktop_width,
            "desktop_height": placement_obj.desktop_height,
            "tablet_height": placement_obj.tablet_height,
            "mobile_height": placement_obj.mobile_height,
        },

        ads=[
            schemas.PublicAdOut(
                id=ad.id,
                title=ad.title,
                image_url=ad.image_url,
                target_url=ad.target_url,
                alt_text=ad.alt_text,
                open_in_new_tab=ad.open_in_new_tab,
            )
            for ad in ads
        ],
    )


# =========================================================
# TRACKING
# =========================================================

@router.post("/track")
def track_event(
    payload: schemas.TrackEventRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Lightweight impression/click tracking endpoint.

    Widget sends:

        ad_id
        event_type

    Backend verifies:

        1. Ad exists
        2. Event type is valid
        3. Ad belongs to an active placement
        4. Placement belongs to an active vendor
        5. Ad is currently active
        6. Browser Origin belongs to that vendor

    No API key is required here so widget tracking
    remains lightweight.
    """

    # -----------------------------------------------------
    # 1. Validate event type
    # -----------------------------------------------------

    try:
        event_type = models.EventType(
            payload.event_type
        )

    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid event type",
        )

    # -----------------------------------------------------
    # 2. Find ad
    # -----------------------------------------------------

    ad = (
        db.query(models.Ad)
        .filter(
            models.Ad.id == payload.ad_id
        )
        .first()
    )

    if not ad:
        raise HTTPException(
            status_code=404,
            detail="Ad not found",
        )

    # -----------------------------------------------------
    # 3. Find placement
    # -----------------------------------------------------

    placement = (
        db.query(models.Placement)
        .filter(
            models.Placement.id
            == ad.placement_id
        )
        .first()
    )

    if not placement:
        raise HTTPException(
            status_code=404,
            detail="Placement not found",
        )

    # -----------------------------------------------------
    # 4. Find vendor
    # -----------------------------------------------------

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == placement.vendor_id
        )
        .first()
    )

    if not vendor or not vendor.is_active:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found or inactive",
        )

    # -----------------------------------------------------
    # 5. Validate placement
    # -----------------------------------------------------

    if not placement.is_active:
        raise HTTPException(
            status_code=403,
            detail="Placement is inactive",
        )

    # -----------------------------------------------------
    # 6. Validate ad
    # -----------------------------------------------------

    if not ad.is_active:
        raise HTTPException(
            status_code=403,
            detail="Ad is inactive",
        )

    # -----------------------------------------------------
    # 7. Validate ad schedule
    # -----------------------------------------------------

    now = datetime.now(
        KATHMANDU_TZ
    ).replace(tzinfo=None)

    if (
        ad.start_at is not None
        and ad.start_at > now
    ):
        raise HTTPException(
            status_code=403,
            detail="Ad is not currently active",
        )

    if (
        ad.end_at is not None
        and ad.end_at < now
    ):
        raise HTTPException(
            status_code=403,
            detail="Ad is no longer active",
        )

    # -----------------------------------------------------
    # 8. Validate browser Origin
    # -----------------------------------------------------

    origin = request.headers.get("origin")

    _validate_ad_origin(
        vendor=vendor,
        origin=origin,
    )

    # -----------------------------------------------------
    # 9. Record event
    # -----------------------------------------------------

    event = models.AdEvent(
        ad_id=ad.id,
        event_type=event_type,
        referrer=request.headers.get(
            "referer",
            "",
        )[:500],
    )

    db.add(event)
    db.commit()

    return {
        "ok": True
    }