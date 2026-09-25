import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


def gen_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    admin = "admin"
    editor = "editor"


class EventType(str, enum.Enum):
    impression = "impression"
    click = "click"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.admin, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Vendor(Base):
    """A partner website that will embed the ad widget, e.g. ToolsForEngineers.com"""
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)  # e.g. "toolsforengineers"
    api_key = Column(String, unique=True, nullable=False, index=True, default=lambda: uuid.uuid4().hex)
    allowed_domains = Column(Text, default="")  # comma separated, for widget origin checking
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    placements = relationship("Placement", back_populates="vendor", cascade="all, delete-orphan")


class Placement(Base):
    """A specific ad slot on a vendor's site, e.g. Homepage / Hydro Dashboard / Solar Dashboard"""
    __tablename__ = "placements"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    vendor_id = Column(UUID(as_uuid=False), ForeignKey("vendors.id"), nullable=False)
    name = Column(String, nullable=False)          # "Homepage"
    slug = Column(String, nullable=False, index=True)  # "homepage"
    desktop_width = Column(Integer, default=1320)
    desktop_height = Column(Integer, default=300)
    tablet_height = Column(Integer, default=260)
    mobile_height = Column(Integer, default=220)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="placements")
    ads = relationship("Ad", back_populates="placement", cascade="all, delete-orphan")


class Ad(Base):
    __tablename__ = "ads"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    placement_id = Column(UUID(as_uuid=False), ForeignKey("placements.id"), nullable=False)
    title = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    target_url = Column(String, nullable=False)
    alt_text = Column(String, default="")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    start_at = Column(DateTime, nullable=True)   # null = starts immediately
    end_at = Column(DateTime, nullable=True)     # null = never expires
    open_in_new_tab = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    placement = relationship("Placement", back_populates="ads")
    events = relationship("AdEvent", back_populates="ad", cascade="all, delete-orphan")


class AdEvent(Base):
    """Impression / click log, kept lightweight & append-only."""
    __tablename__ = "ad_events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    ad_id = Column(UUID(as_uuid=False), ForeignKey("ads.id"), nullable=False, index=True)
    event_type = Column(SAEnum(EventType), nullable=False)
    referrer = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    ad = relationship("Ad", back_populates="events")
