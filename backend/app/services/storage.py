import os
import uuid
from pathlib import Path

import boto3

ALLOWED_EXTENSIONS: dict[str, set[str]] = {
    "foto_perfil": {".jpg", ".jpeg", ".png"},
    "apunte": {".pdf", ".docx", ".pptx"},
    "tramite": {".pdf"},
}
MAX_SIZE_BYTES: dict[str, int] = {
    "foto_perfil": 2 * 1024 * 1024,  # 2 MB
    "apunte": 20 * 1024 * 1024,  # 20 MB
    "tramite": 5 * 1024 * 1024,  # 5 MB
}


def _get_client():
    # Leer env vars en tiempo de llamada, no en import — permite override en tests
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    )


def _bucket() -> str:
    return os.getenv("R2_BUCKET_NAME", "uca-v2-storage")


def subir_archivo(file_bytes: bytes, filename: str, prefix: str) -> str:
    """Sube bytes a R2 y retorna la storage_key. Nunca guarda URL absoluta."""
    ext = Path(filename).suffix.lower()
    allowed = ALLOWED_EXTENSIONS.get(prefix, set())
    if ext not in allowed:
        raise ValueError(f"Extensión no permitida: {ext}. Permitidas: {allowed}")
    max_size = MAX_SIZE_BYTES.get(prefix, 0)
    if len(file_bytes) > max_size:
        raise ValueError(
            f"Archivo excede el tamaño máximo permitido "
            f"({max_size // (1024 * 1024)} MB)"
        )
    key = f"{prefix}/{uuid.uuid4()}{ext}"
    _get_client().put_object(Bucket=_bucket(), Key=key, Body=file_bytes)
    return key


def obtener_url_firmada(key: str, expires_in: int = 300) -> str:
    """URL firmada con expiración corta (default 5 min)."""
    return _get_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": _bucket(), "Key": key},
        ExpiresIn=expires_in,
    )


def eliminar_archivo(key: str) -> None:
    _get_client().delete_object(Bucket=_bucket(), Key=key)
