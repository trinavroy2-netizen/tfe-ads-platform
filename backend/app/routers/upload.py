import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from PIL import Image

from ..config import settings
from ..security import get_current_user

router = APIRouter(prefix="/api/admin/upload", tags=["upload (admin)"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5MB


@router.post("")
async def upload_image(file: UploadFile = File(...), _=Depends(get_current_user)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WebP or GIF images are allowed")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(400, "Image must be under 5MB")

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    # Validate it's really an image (also strips any weird EXIF-based exploits)
    try:
        with Image.open(filepath) as img:
            img.verify()
    except Exception:
        os.remove(filepath)
        raise HTTPException(400, "Uploaded file is not a valid image")

    url = f"{settings.public_base_url}/uploads/{filename}"
    return {"url": url, "filename": filename}
