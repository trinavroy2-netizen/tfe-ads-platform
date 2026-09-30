from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/admin/stats", tags=["stats (admin)"])


@router.get("/overview", response_model=schemas.OverviewStats)
def overview(db: Session = Depends(get_db), _=Depends(get_current_user)):
    vendors = db.query(models.Vendor).all()
    total_placements = db.query(func.count(models.Placement.id)).scalar() or 0
    total_ads = db.query(func.count(models.Ad.id)).scalar() or 0
    active_ads_total = db.query(func.count(models.Ad.id)).filter(models.Ad.is_active == True).scalar() or 0  # noqa: E712

    total_impressions = db.query(func.count(models.AdEvent.id)).filter(
        models.AdEvent.event_type == models.EventType.impression
    ).scalar() or 0
    total_clicks = db.query(func.count(models.AdEvent.id)).filter(
        models.AdEvent.event_type == models.EventType.click
    ).scalar() or 0
    overall_ctr = round((total_clicks / total_impressions) * 100, 2) if total_impressions else 0.0

    by_vendor = []
    for v in vendors:
        placement_ids = [p.id for p in v.placements]
        placement_count = len(placement_ids)
        if placement_ids:
            active_ads = db.query(func.count(models.Ad.id)).filter(
                models.Ad.placement_id.in_(placement_ids), models.Ad.is_active == True  # noqa: E712
            ).scalar() or 0
            ad_ids_sub = db.query(models.Ad.id).filter(models.Ad.placement_id.in_(placement_ids)).subquery()
            impressions = db.query(func.count(models.AdEvent.id)).filter(
                models.AdEvent.ad_id.in_(db.query(ad_ids_sub.c.id)),
                models.AdEvent.event_type == models.EventType.impression,
            ).scalar() or 0
            clicks = db.query(func.count(models.AdEvent.id)).filter(
                models.AdEvent.ad_id.in_(db.query(ad_ids_sub.c.id)),
                models.AdEvent.event_type == models.EventType.click,
            ).scalar() or 0
        else:
            active_ads = impressions = clicks = 0
        ctr = round((clicks / impressions) * 100, 2) if impressions else 0.0
        by_vendor.append(schemas.VendorSummary(
            vendor_id=v.id, vendor_name=v.name, placements=placement_count,
            active_ads=active_ads, impressions=impressions, clicks=clicks, ctr=ctr,
        ))

    return schemas.OverviewStats(
        total_vendors=len(vendors),
        active_vendors=sum(1 for v in vendors if v.is_active),
        total_placements=total_placements,
        total_ads=total_ads,
        active_ads=active_ads_total,
        total_impressions=total_impressions,
        total_clicks=total_clicks,
        overall_ctr=overall_ctr,
        by_vendor=by_vendor,
    )
