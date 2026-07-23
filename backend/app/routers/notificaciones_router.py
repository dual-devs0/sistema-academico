"""
Router Notificaciones Push — Fase 7F.2.

Endpoints:
  POST /notificaciones/subscribe    — guardar suscripción Web Push
  POST /notificaciones/test         — enviar notificación de prueba
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import database
from app.dependencias import get_current_user, require_role
from app.models.financiero import SuscripcionPush
from app.services.notificaciones_push import enviar_notificaciones_masivo, get_vapid_keys

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


@router.get(
    "/vapid-public-key",
    summary="Obtener clave pública VAPID",
)
def get_vapid_public_key():
    public_key, _, _ = get_vapid_keys()
    return {"public_key": public_key}


@router.post(
    "/subscribe",
    summary="Guardar suscripción Web Push",
)
def subscribe(
    body: dict,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    endpoint = body.get("endpoint")
    keys = body.get("keys", {})
    if not endpoint:
        raise HTTPException(400, "endpoint requerido")

    existing = db.query(SuscripcionPush).filter(
        SuscripcionPush.user_id == current_user.user_id,
        SuscripcionPush.endpoint == endpoint,
    ).first()

    if existing:
        existing.p256dh = keys.get("p256dh", existing.p256dh)
        existing.auth = keys.get("auth", existing.auth)
        existing.user_agent = request.headers.get("user-agent")
    else:
        sub = SuscripcionPush(
            user_id=current_user.user_id,
            endpoint=endpoint,
            p256dh=keys.get("p256dh", ""),
            auth=keys.get("auth", ""),
            user_agent=request.headers.get("user-agent"),
        )
        db.add(sub)

    db.commit()
    return {"mensaje": "Suscripción guardada"}


@router.delete(
    "/subscribe",
    summary="Eliminar suscripción Web Push",
)
def unsubscribe(
    body: dict,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    endpoint = body.get("endpoint")
    if not endpoint:
        raise HTTPException(400, "endpoint requerido")

    db.query(SuscripcionPush).filter(
        SuscripcionPush.user_id == current_user.user_id,
        SuscripcionPush.endpoint == endpoint,
    ).delete()
    db.commit()
    return {"mensaje": "Suscripción eliminada"}


@router.post(
    "/test",
    summary="Enviar notificación de prueba real",
)
def test_notification(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    subs = db.query(SuscripcionPush).filter(
        SuscripcionPush.user_id == current_user.user_id,
    ).all()
    if not subs:
        raise HTTPException(400, "No tenés suscripciones push activas. Activá las notificaciones desde tu perfil.")

    exitosos, fallidos = enviar_notificaciones_masivo(
        subscriptions=subs,
        titulo="🔔 Prueba de Notificación",
        cuerpo="¡Funciona! Recibiste esta notificación porque activaste las notificaciones push.",
        url="",
    )
    return {
        "mensaje": "Notificación enviada",
        "exitosos": exitosos,
        "fallidos": fallidos,
        "total": len(subs),
    }
