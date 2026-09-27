from datetime import datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/public", tags=["public (widget)"])

KATHMANDU_TZ = ZoneInfo("Asia/Kathmandu")


def _normalize_origin(origin: str | None) -> str:
    """
    Normalize a browser Origin value.

    Examples:
        https://example.com       -> https://example.com
        https://www.example.com/  -> https://www.example.com
        http://localhost:3000     -> http://localhost:3000
    """
    if not origin:
        return ""

    origin = origin.strip().rstrip("/")

    try:
        parsed = urlparse(origin)

        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return ""

        return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"

    except Exception:
        return ""


def _allowed_origins(vendor: models.Vendor) -> set[str]:
    """
    Convert Vendor.allowed_domains into normalized origins.

    Existing database format:
        example.com,www.example.com

    Also accepts:
        https://example.com
        http://localhost:3000
    """
    raw = vendor.allowed_domains or ""

    origins: set[str] = set()

    for item in raw.split(","):
        value = item.strip()

        if not value:
            continue

        # If only a hostname/domain was stored, allow both HTTP and HTTPS.
        if "://" not in value:
            value = value.rstrip("/")

            if value:
                origins.add(f"https://{value.lower()}")
                origins.add(f"http://{value.lower()}")

            continue

        normalized = _normalize_origin(value)

        if normalized:
            origins.add(normalized)

    return origins


def _origin_allowed(vendor: models.Vendor, origin: str | None) -> bool:
    """
    Check whether the browser Origin is authorized for the vendor.

    Important:
    - Missing Origin is allowed because some non-browser clients,
      server-side requests, health checks, etc. may not send it.
    - Browser requests with an Origin must match an allowed vendor domain.
    """
    normalized_origin = _normalize_origin(origin)

    if not normalized_origin:
        return True

    allowed = _allowed_origins(vendor)

    # If no domains have been configured, do not silently allow
    # browser embedding in production.
    if not allowed:
        return False

    return normalized_origin in allowed


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
    3. Browser origin is authorized
    """
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.slug == vendor_slug)
        .first()
    )

    if not vendor or not vendor.is_active:
        raise HTTPException(404, "Unknown or inactive vendor")

    if not vendor.api_key or x_api_key != vendor.api_key:
        raise HTTPException(401, "Invalid or missing API key")

    if not _origin_allowed(vendor, origin):
        raise HTTPException(403, "Origin is not authorized for this vendor")

    return vendor


def _validate_ad_origin(
    vendor: models.Vendor,
    origin: str | None,
):
    """
    Validate the requesting browser origin against the vendor.

    Missing Origin is allowed for compatibility with non-browser requests.
    """
    if not _origin_allowed(vendor, origin):
        raise HTTPException(403, "Origin is not authorized for this vendor")


@router.get("/ads", response_model=schemas.PublicAdsResponse)
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
        GET /api/public/ads?vendor=toolsforengineers&placement=homepage

    Header:
        X-API-Key: <vendor api key>

    Browser:
        Origin: https://toolsforengineers.com
    """

    origin = request.headers.get("origin")

    v = _resolve_vendor(
        db=db,
        vendor_slug=vendor,
        x_api_key=x_api_key,
        origin=origin,
    )

    p = (
        db.query(models.Placement)
        .filter(
            models.Placement.vendor_id == v.id,
            models.Placement.slug == placement,
            models.Placement.is_active == True,  # noqa: E712
        )
        .first()
    )

    if not p:
        raise HTTPException(
            404,
            "Unknown or inactive placement",
        )

    now = datetime.now(KATHMANDU_TZ).replace(tzinfo=None)

    ads = (
        db.query(models.Ad)
        .filter(
            models.Ad.placement_id == p.id,
            models.Ad.is_active == True,  # noqa: E712
        )
        .filter(
            (models.Ad.start_at == None) | (models.Ad.start_at <= now)  # noqa: E711
        )
        .filter(
            (models.Ad.end_at == None) | (models.Ad.end_at >= now)  # noqa: E711
        )
        .order_by(
            models.Ad.sort_order.asc(),
            models.Ad.created_at.desc(),
        )
        .all()
    )

    return schemas.PublicAdsResponse(
        placement=p.slug,
        dimensions={
            "desktop_width": p.desktop_width,
            "desktop_height": p.desktop_height,
            "tablet_height": p.tablet_height,
            "mobile_height": p.mobile_height,
        },
        ads=[
            schemas.PublicAdOut(
                id=a.id,
                title=a.title,
                image_url=a.image_url,
                target_url=a.target_url,
                alt_text=a.alt_text,
                open_in_new_tab=a.open_in_new_tab,
            )
            for a in ads
        ],
    )


@router.post("/track")
def track_event(
    payload: schemas.TrackEventRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Lightweight impression/click tracking endpoint.

    The widget sends:
        - ad_id
        - event_type

    The backend verifies:
        1. Ad exists
        2. Event type is valid
        3. Ad belongs to an active placement
        4. Placement belongs to an active vendor
        5. Browser Origin belongs to that vendor

    No API key is required here so cross-origin beacon/fetch tracking
    remains lightweight.
    """

    # ---------------------------------------------------------
    # 1. Validate event type
    # ---------------------------------------------------------
    try:
        event_type = models.EventType(payload.event_type)
    except (ValueError, TypeError):
        raise HTTPException(
            400,
            "Invalid event type",
        )

    # ---------------------------------------------------------
    # 2. Load ad + placement + vendor relationship
    # ---------------------------------------------------------
    ad = (
        db.query(models.Ad)
        .filter(models.Ad.id == payload.ad_id)
        .first()
    )

    if not ad:
        raise HTTPException(
            404,
            "Ad not found",
        )

    placement = (
        db.query(models.Placement)
        .filter(models.Placement.id == ad.placement_id)
        .first()
    )

    if not placement:
        raise HTTPException(
            404,
            "Placement not found",
        )

    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.id == placement.vendor_id)
        .first()
    )

    if not vendor or not vendor.is_active:
        raise HTTPException(
            404,
            "Vendor not found or inactive",
        )

    # ---------------------------------------------------------
    # 3. Validate placement/ad state
    # ---------------------------------------------------------
    if not placement.is_active:
        raise HTTPException(
            403,
            "Placement is inactive",
        )

    if not ad.is_active:
        raise HTTPException(
            403,
            "Ad is inactive",
        )

    # ---------------------------------------------------------
    # 4. Validate current ad schedule
    # ---------------------------------------------------------
    now = datetime.now(KATHMANDU_TZ).replace(tzinfo=None)

    if ad.start_at is not None and ad.start_at > now:
        raise HTTPException(
            403,
            "Ad is not currently active",
        )

    if ad.end_at is not None and ad.end_at < now:
        raise HTTPException(
            403,
            "Ad is no longer active",
        )

    # ---------------------------------------------------------
    # 5. Validate browser Origin
    # ---------------------------------------------------------
    origin = request.headers.get("origin")

    _validate_ad_origin(
        vendor=vendor,
        origin=origin,
    )

    # ---------------------------------------------------------
    # 6. Record event
    # ---------------------------------------------------------
    event = models.AdEvent(
        ad_id=ad.id,
        event_type=event_type,
        referrer=request.headers.get("referer", "")[:500],
    )

    db.add(event)
    db.commit()

    return {"ok": True}