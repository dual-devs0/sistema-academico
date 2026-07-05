import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from fastapi import BackgroundTasks


# ---------------------------------------------------------------------------
# _send_with_retry
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_with_retry_succeeds_on_first_attempt():
    from app.email_utils import _send_with_retry

    mock_send = AsyncMock()
    msg = MagicMock()

    with patch("app.email_utils.fm") as mock_fm:
        mock_fm.send_message = mock_send
        await _send_with_retry(msg)

    mock_send.assert_called_once_with(msg)


@pytest.mark.asyncio
async def test_send_with_retry_retries_on_failure():
    from app.email_utils import _send_with_retry

    msg = MagicMock()
    # Falla 2 veces, éxito en el tercero
    mock_send = AsyncMock(side_effect=[ConnectionError("timeout"), ConnectionError("timeout"), None])

    with patch("app.email_utils.fm") as mock_fm, \
         patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        mock_fm.send_message = mock_send
        await _send_with_retry(msg, max_attempts=3, backoff_base=2)

    assert mock_send.call_count == 3
    # Backoff: 2**0=1s después del primer fallo, 2**1=2s después del segundo
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(1)
    mock_sleep.assert_any_call(2)


@pytest.mark.asyncio
async def test_send_with_retry_gives_up_after_max_attempts():
    from app.email_utils import _send_with_retry

    msg = MagicMock()
    mock_send = AsyncMock(side_effect=ConnectionError("timeout"))

    with patch("app.email_utils.fm") as mock_fm, \
         patch("asyncio.sleep", new_callable=AsyncMock), \
         patch("app.email_utils.logger") as mock_logger:
        mock_fm.send_message = mock_send
        # No debe lanzar excepción — falla silenciosamente con log
        await _send_with_retry(msg, max_attempts=3, backoff_base=2)

    assert mock_send.call_count == 3
    mock_logger.error.assert_called_once()


# ---------------------------------------------------------------------------
# send_password_reset_email_bg
# ---------------------------------------------------------------------------

def test_password_reset_email_mocked_when_no_credentials(capsys):
    from app.email_utils import send_password_reset_email_bg

    bg = BackgroundTasks()
    with patch.dict("os.environ", {"MAIL_PASSWORD": "dummy"}, clear=False):
        send_password_reset_email_bg(bg, "test@example.com", "Juan", "abc123")

    captured = capsys.readouterr()
    assert "Mock" in captured.out
    assert len(bg.tasks) == 0  # no se agregó tarea real


def test_password_reset_email_queues_task_when_credentials_present():
    from app.email_utils import send_password_reset_email_bg

    bg = BackgroundTasks()
    with patch.dict("os.environ", {"MAIL_PASSWORD": "real_app_password"}, clear=False):
        send_password_reset_email_bg(bg, "test@example.com", "Juan", "abc123")

    assert len(bg.tasks) == 1


# ---------------------------------------------------------------------------
# send_new_grade_email_bg
# ---------------------------------------------------------------------------

def test_grade_email_mocked_when_no_credentials(capsys):
    from app.email_utils import send_new_grade_email_bg

    bg = BackgroundTasks()
    with patch.dict("os.environ", {"MAIL_PASSWORD": "dummy"}, clear=False):
        send_new_grade_email_bg(bg, "test@example.com", "Juan", "Matemáticas", "parcial1", 8.5)

    captured = capsys.readouterr()
    assert "Mock" in captured.out
    assert len(bg.tasks) == 0


def test_grade_email_queues_task_when_credentials_present():
    from app.email_utils import send_new_grade_email_bg

    bg = BackgroundTasks()
    with patch.dict("os.environ", {"MAIL_PASSWORD": "real_app_password"}, clear=False):
        send_new_grade_email_bg(bg, "test@example.com", "Juan", "Matemáticas", "parcial1", 8.5)

    assert len(bg.tasks) == 1
