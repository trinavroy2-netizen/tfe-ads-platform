from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from PIL import Image
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import AdImage
from ..security import get_current_user


router = APIRouter(
    prefix="/api/admin/upload",
    tags=["upload (admin)"],
)


# ============================================================
# IMAGE CONFIGURATION
# ============================================================

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

MAX_BYTES = 5 * 1024 * 1024  # 5MB


# ============================================================
# UPLOAD IMAGE
# ============================================================

@router.post("")
async def upload_image(
    file: UploadFile = File(...),
    _=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload an advertisement image directly into PostgreSQL.

    IMPORTANT:
    - No filesystem storage.
    - No /uploads folder.
    - No temporary image file.
    - Image bytes are stored in PostgreSQL BYTEA.
    """

    # --------------------------------------------------------
    # Validate MIME type
    # --------------------------------------------------------

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only JPEG, PNG, WebP or GIF "
                "images are allowed"
            ),
        )

    # --------------------------------------------------------
    # Read image into memory
    # --------------------------------------------------------

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty",
        )

    # --------------------------------------------------------
    # Validate maximum file size
    # --------------------------------------------------------

    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Image must be under 5MB",
        )

    # --------------------------------------------------------
    # Validate actual image content
    #
    # The image is validated directly from memory.
    # No file is created on disk.
    # --------------------------------------------------------

    try:
        with Image.open(BytesIO(contents)) as image:
            image.verify()

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid image",
        )

    # --------------------------------------------------------
    # Store image directly in PostgreSQL
    # --------------------------------------------------------

    image_record = AdImage(
        filename=file.filename or "uploaded-image",
        content_type=file.content_type,
        data=contents,
    )

    db.add(image_record)

    try:
        db.commit()
        db.refresh(image_record)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to save image to database",
        )

    # --------------------------------------------------------
    # Return FULL database-backed image URL
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # The dashboard runs on a different port/domain than
    # the FastAPI backend.
    #
    # Local example:
    # http://localhost:8000/api/public/images/UUID
    #
    # Production example:
    # https://tfe-ads-backend.onrender.com/api/public/images/UUID
    #
    # This prevents the browser from requesting:
    # http://localhost:3000/api/public/images/UUID
    #
    # --------------------------------------------------------

    base_url = settings.public_base_url.rstrip("/")

    image_url = (
        f"{base_url}/api/public/images/{image_record.id}"
    )

    return {
        "url": image_url,
        "filename": image_record.filename,
        "id": str(image_record.id),
    }