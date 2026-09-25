from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ---------- Auth ----------

class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    role: str


# ---------- Vendor ----------

class VendorCreate(BaseModel):
    name: str
    slug: str
    allowed_domains: Optional[str] = ""


class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    api_key: str
    allowed_domains: str
    is_active: bool
    created_at: datetime


# ---------- Placement ----------

class PlacementCreate(BaseModel):
    vendor_id: str
    name: str
    slug: str
    desktop_width: int = 1320
    desktop_height: int = 300
    tablet_height: int = 260
    mobile_height: int = 220


class PlacementUpdate(BaseModel):
    name: Optional[str] = None
    desktop_width: Optional[int] = None
    desktop_height: Optional[int] = None
    tablet_height: Optional[int] = None
    mobile_height: Optional[int] = None
    is_active: Optional[bool] = None


class PlacementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    vendor_id: str
    name: str
    slug: str
    desktop_width: int
    desktop_height: int
    tablet_height: int
    mobile_height: int
    is_active: bool


# ---------- Ad ----------

class AdCreate(BaseModel):
    placement_id: str
    title: str
    image_url: str
    target_url: str
    alt_text: Optional[str] = ""
    is_active: bool = True
    sort_order: int = 0
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    open_in_new_tab: bool = True


class AdUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    target_url: Optional[str] = None
    alt_text: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    open_in_new_tab: Optional[bool] = None
    placement_id: Optional[str] = None


class AdOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    placement_id: str
    title: str
    image_url: str
    target_url: str
    alt_text: str
    is_active: bool
    sort_order: int
    start_at: Optional[datetime]
    end_at: Optional[datetime]
    open_in_new_tab: bool
    created_at: datetime
    updated_at: datetime


class AdStats(BaseModel):
    ad_id: str
    title: str
    impressions: int
    clicks: int
    ctr: float


# ---------- Public widget ----------

class PublicAdOut(BaseModel):
    id: str
    title: str
    image_url: str
    target_url: str
    alt_text: str
    open_in_new_tab: bool


class PublicAdsResponse(BaseModel):
    placement: str
    dimensions: dict
    ads: List[PublicAdOut]


class TrackEventRequest(BaseModel):
    ad_id: str
    event_type: str = Field(pattern="^(impression|click)$")
