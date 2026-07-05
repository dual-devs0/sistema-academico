"""
Tests para app/services/storage.py.
Mockea boto3 — no requiere R2 real.
"""
import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://test.r2.example.com")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "test_key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "test_secret")
    monkeypatch.setenv("R2_BUCKET_NAME", "test-bucket")


@pytest.fixture()
def mock_boto(mocker):
    """Retorna el mock del client de boto3."""
    mock_client = MagicMock()
    mocker.patch("boto3.client", return_value=mock_client)
    return mock_client


# ---------------------------------------------------------------------------
# subir_archivo
# ---------------------------------------------------------------------------

def test_subir_archivo_retorna_storage_key_con_formato_correcto(mock_boto):
    from app.services.storage import subir_archivo

    key = subir_archivo(b"contenido", "apunte.pdf", "apunte")

    assert key.startswith("apunte/")
    assert key.endswith(".pdf")
    mock_boto.put_object.assert_called_once()
    call_kwargs = mock_boto.put_object.call_args.kwargs
    assert call_kwargs["Bucket"] == "test-bucket"
    assert call_kwargs["Key"] == key
    assert call_kwargs["Body"] == b"contenido"


def test_subir_archivo_foto_perfil_key_correcto(mock_boto):
    from app.services.storage import subir_archivo

    key = subir_archivo(b"imagen", "foto.jpg", "foto_perfil")

    assert key.startswith("foto_perfil/")
    assert key.endswith(".jpg")


def test_subir_archivo_extension_no_permitida_levanta_error(mock_boto):
    from app.services.storage import subir_archivo

    with pytest.raises(ValueError, match="Extensión no permitida"):
        subir_archivo(b"malware", "virus.exe", "apunte")

    mock_boto.put_object.assert_not_called()


def test_subir_archivo_tamano_excedido_levanta_error(mock_boto):
    from app.services.storage import subir_archivo

    big_file = b"x" * (21 * 1024 * 1024)  # 21 MB > límite de apunte (20 MB)

    with pytest.raises(ValueError, match="tamaño máximo"):
        subir_archivo(big_file, "grande.pdf", "apunte")

    mock_boto.put_object.assert_not_called()


def test_subir_foto_tamano_excedido(mock_boto):
    from app.services.storage import subir_archivo

    big_img = b"x" * (3 * 1024 * 1024)  # 3 MB > límite foto (2 MB)

    with pytest.raises(ValueError, match="tamaño máximo"):
        subir_archivo(big_img, "foto.jpg", "foto_perfil")


# ---------------------------------------------------------------------------
# obtener_url_firmada
# ---------------------------------------------------------------------------

def test_obtener_url_firmada_llama_generate_presigned(mock_boto):
    from app.services.storage import obtener_url_firmada

    mock_boto.generate_presigned_url.return_value = "https://signed.url/foto_perfil/abc.jpg?X-Sig=xxx"

    url = obtener_url_firmada("foto_perfil/abc.jpg")

    mock_boto.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "test-bucket", "Key": "foto_perfil/abc.jpg"},
        ExpiresIn=300,
    )
    assert url == "https://signed.url/foto_perfil/abc.jpg?X-Sig=xxx"


def test_obtener_url_firmada_expiry_custom(mock_boto):
    from app.services.storage import obtener_url_firmada

    mock_boto.generate_presigned_url.return_value = "https://signed.url/k"

    obtener_url_firmada("apunte/xyz.pdf", expires_in=3600)

    call_kwargs = mock_boto.generate_presigned_url.call_args.kwargs
    assert call_kwargs["ExpiresIn"] == 3600


# ---------------------------------------------------------------------------
# eliminar_archivo
# ---------------------------------------------------------------------------

def test_eliminar_archivo_llama_delete_object(mock_boto):
    from app.services.storage import eliminar_archivo

    eliminar_archivo("apunte/abc.pdf")

    mock_boto.delete_object.assert_called_once_with(
        Bucket="test-bucket", Key="apunte/abc.pdf"
    )
