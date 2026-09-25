from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/admin/ads", tags=["ads (admin)"])


@router.get("", response_model=list[schemas.AdOut])
def list_ads(placement_id: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(models.Ad)
    if placement_id:
        q = q.filter(models.Ad.placement_id == placement_id)
    return q.order_by(models.Ad.sort_order.asc(), models.Ad.created_at.desc()).all()


@router.get("/{ad_id}", response_model=schemas.AdOut)
def get_ad(ad_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(404, "Ad not found")
    return ad


@router.post("", response_model=schemas.AdOut)
def create_ad(payload: schemas.AdCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if not db.query(models.Placement).filter(models.Placement.id == payload.placement_id).first():
        raise HTTPException(404, "Placement not found")
    ad = models.Ad(**payload.model_dump())
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return ad


@router.patch("/{ad_id}", response_model=schemas.AdOut)
def update_ad(ad_id: str, payload: schemas.AdUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(404, "Ad not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(ad, k, v)
    db.commit()
    db.refresh(ad)
    return ad


@router.post("/{ad_id}/toggle", response_model=schemas.AdOut)
def toggle_ad(ad_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(404, "Ad not found")
    ad.is_active = not ad.is_active
    db.commit()
    db.refresh(ad)
    return ad


@router.delete("/{ad_id}")
def delete_ad(ad_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(404, "Ad not found")
    db.delete(ad)
    db.commit()
    return {"ok": True}


@router.get("/{ad_id}/stats", response_model=schemas.AdStats)
def ad_stats(ad_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(404, "Ad not found")
    impressions = db.query(func.count(models.AdEvent.id)).filter(
        models.AdEvent.ad_id == ad_id, models.AdEvent.event_type == models.EventType.impression
    ).scalar() or 0
    clicks = db.query(func.count(models.AdEvent.id)).filter(
        models.AdEvent.ad_id == ad_id, models.AdEvent.event_type == models.EventType.click
    ).scalar() or 0
    ctr = round((clicks / impressions) * 100, 2) if impressions else 0.0
    return schemas.AdStats(ad_id=ad.id, title=ad.title, impressions=impressions, clicks=clicks, ctr=ctr)
