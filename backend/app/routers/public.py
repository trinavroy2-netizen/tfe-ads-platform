from datetime import datetime
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/public", tags=["public (widget)"])


def _hostname(url_or_host: str) -> str:
    """Extract a bare hostname from an Origin/Referer header or a plain
    domain entry, tolerating values with or without a scheme."""
    value = url_or_host.strip().lower()
    if "//" in value:
        value = urlparse(value).hostname or ""
    else:
        value = value.split("/")[0]
    return value.strip()


def _domain_allowed(vendor: models.Vendor, request: Request) -> bool:
    """Check the calling browser's Origin (falling back to Referer) against
    this vendor's configured allowed_domains. An empty allowed_domains list
    is treated as 'not yet configured' and left open, so a vendor can be
    tested before its domains are locked down - but production vendors
    should always set this (see the dashboard's Vendors page)."""
    allowed_raw = (vendor.allowed_domains or "").strip()
    if not allowed_raw:
        return True

    allowed = {_hostname(d) for d in allowed_raw.split(",") if d.strip()}
    # also accept the bare/"www." counterpart of each configured domain
    expanded = set(allowed)
    for d in allowed:
        expanded.add(d[4:] if d.startswith("www.") else f"www.{d}")

    origin = request.headers.get("origin") or request.headers.get("referer")
    if not origin:
        # Non-browser callers (server-to-server, curl) send no Origin header;
        # the API key is still required and checked separately.
        return True

    return _hostname(origin) in expanded


def _resolve_vendor(db: Session, vendor_slug: str, x_api_key: str | None, request: Request):
    vendor = db.query(models.Vendor).filter(models.Vendor.slug == vendor_slug).first()
    if not vendor or not vendor.is_active:
        raise HTTPException(404, "Unknown or inactive vendor")
    if vendor.api_key and x_api_key != vendor.api_key:
        raise HTTPException(401, "Invalid or missing API key")
    if not _domain_allowed(vendor, request):
        raise HTTPException(403, "This origin is not authorized for this vendor")
    return vendor


@router.get("/ads", response_model=schemas.PublicAdsResponse)
def get_public_ads(
    vendor: str,
    placement: str,
    request: Request,
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    """
    Called by the embeddable widget.
    Example: GET /api/public/ads?vendor=toolsforengineers&placement=homepage
    Header: X-API-Key: <vendor api key>
    """
    v = _resolve_vendor(db, vendor, x_api_key, request)

    p = (
        db.query(models.Placement)
        .filter(models.Placement.vendor_id == v.id, models.Placement.slug == placement)
        .first()
    )
    if not p or not p.is_active:
        raise HTTPException(404, "Unknown or inactive placement")

    now = datetime.utcnow()
    ads = (
        db.query(models.Ad)
        .filter(
            models.Ad.placement_id == p.id,
            models.Ad.is_active == True,  # noqa: E712
        )
        .filter((models.Ad.start_at == None) | (models.Ad.start_at <= now))  # noqa: E711
        .filter((models.Ad.end_at == None) | (models.Ad.end_at >= now))  # noqa: E711
        .order_by(models.Ad.sort_order.asc(), models.Ad.created_at.desc())
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
    """Fire-and-forget impression/click logging called by the widget. No auth required
    beyond the ad existing, so it stays lightweight for cross-origin beacon calls."""
    ad = db.query(models.Ad).filter(models.Ad.id == payload.ad_id).first()
    if not ad:
        raise HTTPException(404, "Ad not found")

    vendor = ad.placement.vendor
    if not _domain_allowed(vendor, request):
        raise HTTPException(403, "This origin is not authorized for this vendor")

    event = models.AdEvent(
        ad_id=ad.id,
        event_type=models.EventType(payload.event_type),
        referrer=request.headers.get("referer", "")[:500],
    )
    db.add(event)
    db.commit()
    return {"ok": True}
