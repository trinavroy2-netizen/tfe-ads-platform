from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/admin/vendors", tags=["vendors (admin)"])


@router.get("", response_model=list[schemas.VendorOut])
def list_vendors(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Vendor).order_by(models.Vendor.created_at.desc()).all()


@router.post("", response_model=schemas.VendorOut)
def create_vendor(payload: schemas.VendorCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(models.Vendor).filter(models.Vendor.slug == payload.slug).first():
        raise HTTPException(400, "A vendor with this slug already exists")
    vendor = models.Vendor(**payload.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.post("/{vendor_id}/rotate-key", response_model=schemas.VendorOut)
def rotate_key(vendor_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    import uuid
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    vendor.api_key = uuid.uuid4().hex
    db.commit()
    db.refresh(vendor)
    return vendor


@router.patch("/{vendor_id}", response_model=schemas.VendorOut)
def update_vendor(vendor_id: str, payload: schemas.VendorCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    for k, v in payload.model_dump().items():
        setattr(vendor, k, v)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    db.delete(vendor)
    db.commit()
    return {"ok": True}
