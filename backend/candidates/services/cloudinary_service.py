import re

import cloudinary
import cloudinary.uploader
from django.conf import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
CLOUDINARY_CLOUD_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


def _validate_cloudinary_config() -> None:
    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET

    if not all([cloud_name, api_key, api_secret]):
        raise ValueError(
            "Cloudinary credentials are not configured. "
            "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env."
        )

    if not CLOUDINARY_CLOUD_NAME_PATTERN.match(cloud_name):
        raise ValueError(
            "Invalid CLOUDINARY_CLOUD_NAME. Use only letters, numbers, hyphens, and underscores "
            "(copy the exact cloud name from your Cloudinary dashboard)."
        )

def configure_cloudinary():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def validate_image_file(uploaded_file) -> None:
    if uploaded_file.size > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Image exceeds the 5 MB size limit.")

    name = uploaded_file.name.lower()
    if not any(name.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise ValueError("Invalid image file extension. Only JPEG, PNG, and WebP are allowed.")

    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    if content_type and content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("Invalid image type. Only JPEG, PNG, and WebP are allowed.")

def upload_candidate_photo(uploaded_file) -> dict:
    _validate_cloudinary_config()
    validate_image_file(uploaded_file)
    configure_cloudinary()

    uploaded_file.seek(0)
    try:
        result = cloudinary.uploader.upload(
            uploaded_file,
            folder="election/candidates",
            resource_type="image",
            quality="auto",
            fetch_format="auto",
        )
    except Exception as exc:
        detail = str(exc).strip() or "Unknown Cloudinary error."
        if "Invalid cloud_name" in detail:
            raise ValueError(
                f"Cloudinary cloud name '{settings.CLOUDINARY_CLOUD_NAME}' is invalid. "
                "Copy the exact Cloud name from https://console.cloudinary.com/settings/api-keys "
                "into CLOUDINARY_CLOUD_NAME in backend/.env, then restart the server."
            ) from exc
        if "Invalid API key" in detail or "Unauthorized" in detail:
            raise ValueError(
                "Cloudinary API key or secret is invalid. "
                "Verify CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env."
            ) from exc
        raise ValueError(f"Cloudinary upload failed: {detail}") from exc
    return {
        "photo_url": result["secure_url"],
        "public_id": result["public_id"],
        "format": result.get("format"),
        "bytes": result.get("bytes"),
    }
