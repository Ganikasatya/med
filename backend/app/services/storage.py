"""
Local file storage for uploads (photos, logos, documents).

One place to save a file under backend/uploads/<subdir>/<key>/ and get back the
public URL (served by the /uploads static mount). Swap this single module for an
S3/CDN uploader in production — callers don't change.
"""
import os
import re

from fastapi import UploadFile

_UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def save_upload(subdir: str, key, upload: UploadFile) -> tuple[str, int]:
    """Persist `upload` under uploads/<subdir>/<key>/; return (public_url, size_kb)."""
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", upload.filename or "file")
    folder = os.path.join(_UPLOAD_ROOT, subdir, str(key))
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, safe), "wb") as f:
        data = upload.file.read()
        f.write(data)
    return f"/uploads/{subdir}/{key}/{safe}", max(1, len(data) // 1024)


def require_image(upload: UploadFile) -> None:
    """Reject non-image uploads (used for photos/logos)."""
    from fastapi import HTTPException, status
    if not (upload.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please upload an image file")
