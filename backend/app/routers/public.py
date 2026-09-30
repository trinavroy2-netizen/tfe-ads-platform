from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db


router = APIRouter(
    prefix="/api/public",
    tags=["public (widget)"],
)


# ---------- Domain Helpers ----------

def _hostname(url_or_host: str) -> str:
    """
    Extract a bare hostname from an Origin/Referer header or a plain
    domain entry.

    Supports values such as:
        https://example.com
        http://example.com:5500
        example.com
        www.example.com
    """
    value = url_or_host.strip().lower()

    if "//" in value:
        value = urlparse(value).hostname or ""
    else:
        value = value.split("/")[0]
        value = value.split(":")[0]

    return value.strip()


def _domain_allowed(
    vendor: models.Vendor,
    request: Request,
) -> bool:
    """
    Check the calling browser's Origin against the vendor's
    configured allowed_domains.

    If allowed_domains is empty, the vendor remains open for testing.

    The API key is still required separately for /ads.
    """

    allowed_raw = (vendor.allowed_domains or "").strip()

    if not allowed_raw:
        return True

    allowed = {
        _hostname(domain)
        for domain in allowed_raw.split(",")
        if domain.strip()
    }

    # Accept both:
    # example.com <-> www.example.com
    expanded = set(allowed)

    for domain in allowed:
        if domain.startswith("www."):
            expanded.add(domain[4:])
        else:
            expanded.add(f"www.{domain}")

    origin = (
        request.headers.get("origin")
        or request.headers.get("referer")
    )

    if not origin:
        # Server-to-server / curl requests may not have Origin.
        # API key authentication is still enforced separately.
        return True

    return _hostname(origin) in expanded


# ---------- Vendor Resolution ----------

def _resolve_vendor(
    db: Session,
    vendor_slug: str,
    x_api_key: str | None,
    request: Request,
):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.slug == vendor_slug)
        .first()
    )

    if not vendor or not vendor.is_active:
        raise HTTPException(
            status_code=404,
            detail="Unknown or inactive vendor",
        )

    if vendor.api_key and x_api_key != vendor.api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key",
        )

    if not _domain_allowed(vendor, request):
        raise HTTPException(
            status_code=403,
            detail="This origin is not authorized for this vendor",
        )

    return vendor


# ---------- Public Ads ----------

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
    Public endpoint used by the embeddable ads widget.

    Example:

    GET /api/public/ads?vendor=toolsforengineers&placement=homepage

    Required header:

    X-API-Key: <vendor api key>
    """

    # 1. Resolve and authenticate vendor
    vendor_obj = _resolve_vendor(
        db=db,
        vendor_slug=vendor,
        x_api_key=x_api_key,
        request=request,
    )

    # 2. Find active placement belonging to this vendor
    placement_obj = (
        db.query(models.Placement)
        .filter(
            models.Placement.vendor_id == vendor_obj.id,
            models.Placement.slug == placement,
        )
        .first()
    )

    if not placement_obj or not placement_obj.is_active:
        raise HTTPException(
            status_code=404,
            detail="Unknown or inactive placement",
        )

    # 3. Get current UTC time.
    #
    # Database currently uses DateTime without timezone=True,
    # so we intentionally convert UTC to a naive datetime before
    # comparing with start_at/end_at.
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # 4. Return only currently active and scheduled ads
    ads = (
        db.query(models.Ad)
        .filter(
            models.Ad.placement_id == placement_obj.id,
            models.Ad.is_active == True,  # noqa: E712
        )
        .filter(
            (models.Ad.start_at == None)
            | (models.Ad.start_at <= now_utc)  # noqa: E711
        )
        .filter(
            (models.Ad.end_at == None)
            | (models.Ad.end_at >= now_utc)  # noqa: E711
        )
        .order_by(
            models.Ad.sort_order.asc(),
            models.Ad.created_at.desc(),
        )
        .all()
    )

    # 5. Return public-safe ad data
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


# ---------- Tracking ----------

@router.post("/track")
def track_event(
    payload: schemas.TrackEventRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Fire-and-forget impression/click tracking.

    The widget does not need an API key for tracking because
    this endpoint is designed for cross-origin beacon requests.

    The ad must exist and its vendor domain must authorize
    the requesting origin.
    """

    # 1. Find ad
    ad = (
        db.query(models.Ad)
        .filter(models.Ad.id == payload.ad_id)
        .first()
    )

    if not ad:
        raise HTTPException(
            status_code=404,
            detail="Ad not found",
        )

    # 2. Resolve vendor through placement
    vendor = ad.placement.vendor

    # 3. Validate requesting domain
    if not _domain_allowed(vendor, request):
        raise HTTPException(
            status_code=403,
            detail="This origin is not authorized for this vendor",
        )

    # 4. Save event
    event = models.AdEvent(
        ad_id=ad.id,
        event_type=models.EventType(payload.event_type),
        referrer=request.headers.get("referer", "")[:500],
    )

    db.add(event)
    db.commit()

    return {"ok": True}