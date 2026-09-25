from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/admin/placements", tags=["placements (admin)"])


@router.get("", response_model=list[schemas.PlacementOut])
def list_placements(vendor_id: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(models.Placement)
    if vendor_id:
        q = q.filter(models.Placement.vendor_id == vendor_id)
    return q.order_by(models.Placement.created_at.desc()).all()


@router.post("", response_model=schemas.PlacementOut)
def create_placement(payload: schemas.PlacementCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if not db.query(models.Vendor).filter(models.Vendor.id == payload.vendor_id).first():
        raise HTTPException(404, "Vendor not found")
    placement = models.Placement(**payload.model_dump())
    db.add(placement)
    db.commit()
    db.refresh(placement)
    return placement


@router.patch("/{placement_id}", response_model=schemas.PlacementOut)
def update_placement(placement_id: str, payload: schemas.PlacementUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    placement = db.query(models.Placement).filter(models.Placement.id == placement_id).first()
    if not placement:
        raise HTTPException(404, "Placement not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(placement, k, v)
    db.commit()
    db.refresh(placement)
    return placement


@router.delete("/{placement_id}")
def delete_placement(placement_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    placement = db.query(models.Placement).filter(models.Placement.id == placement_id).first()
    if not placement:
        raise HTTPException(404, "Placement not found")
    db.delete(placement)
    db.commit()
    return {"ok": True}
