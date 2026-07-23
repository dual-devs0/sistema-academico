import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database
from app.dependencias import get_current_user, require_role
from app.schemas.global_settings import (
    GlobalSettingOut,
    GlobalSettingUpdate,
    SettingAuditLogOut,
    SettingsExportData,
    SettingsImportResult,
)

router = APIRouter(prefix="/admin/settings", tags=["admin"])


DEFAULTS: list[dict] = [
    # Académico
    {"key": "periodo_actual", "value": "2026-2", "tipo": "string", "categoria": "academico", "descripcion": "Período lectivo actual"},
    {"key": "fecha_inicio_inscripciones", "value": None, "tipo": "date", "categoria": "academico", "descripcion": "Inicio de inscripciones"},
    {"key": "fecha_fin_inscripciones", "value": None, "tipo": "date", "categoria": "academico", "descripcion": "Fin de inscripciones"},
    {"key": "ppa_minimo", "value": "2.0", "tipo": "number", "categoria": "academico", "descripcion": "PPA mínimo para regularidad"},
    {"key": "porcentaje_asistencia_minimo", "value": "75", "tipo": "number", "categoria": "academico", "descripcion": "% de asistencia mínimo requerido"},
    {"key": "max_intentos_materia", "value": "3", "tipo": "number", "categoria": "academico", "descripcion": "Intentos máximos por materia"},
    {"key": "creditos_minimos_graduacion", "value": "200", "tipo": "number", "categoria": "academico", "descripcion": "Créditos mínimos para egreso"},
    # Financiero
    {"key": "mora_dias_tolerancia", "value": "30", "tipo": "number", "categoria": "financiero", "descripcion": "Días de tolerancia en mora"},
    {"key": "interes_mora_mensual", "value": "2", "tipo": "number", "categoria": "financiero", "descripcion": "Interés mensual por mora (%)"},
    {"key": "costo_credito", "value": None, "tipo": "number", "categoria": "financiero", "descripcion": "Costo por crédito (Gs.)"},
    {"key": "periodo_cobro", "value": "mensual", "tipo": "string", "categoria": "financiero", "descripcion": "Periodicidad de cobro [mensual, semestral]"},
    # Sistema
    {"key": "email_contacto", "value": "admin@uca.edu.py", "tipo": "string", "categoria": "sistema", "descripcion": "Correo de contacto del sistema"},
    {"key": "dominio_institucional", "value": "uca.edu.py", "tipo": "string", "categoria": "sistema", "descripcion": "Dominio de email institucional"},
    {"key": "max_archivo_size_mb", "value": "10", "tipo": "number", "categoria": "sistema", "descripcion": "Tamaño máximo de archivos (MB)"},
    {"key": "mantenimiento_activo", "value": "false", "tipo": "boolean", "categoria": "sistema", "descripcion": "Modo mantenimiento activo"},
    {"key": "mensaje_mantenimiento", "value": None, "tipo": "string", "categoria": "sistema", "descripcion": "Mensaje mostrado en modo mantenimiento"},
    # Notificaciones
    {"key": "email_notificaciones_activo", "value": "true", "tipo": "boolean", "categoria": "notificaciones", "descripcion": "Notificaciones por email activas"},
    {"key": "push_notificaciones_activo", "value": "true", "tipo": "boolean", "categoria": "notificaciones", "descripcion": "Notificaciones push activas"},
    {"key": "alerta_asistencia_porcentaje", "value": "25", "tipo": "number", "categoria": "notificaciones", "descripcion": "% de inasistencia para alerta"},
    {"key": "recordatorio_inscripcion_dias", "value": "7", "tipo": "number", "categoria": "notificaciones", "descripcion": "Días antes del cierre para recordatorio"},
]


def _seed_defaults(db: Session):
    GS = models.global_settings.GlobalSetting
    count = db.query(GS).count()
    if count > 0:
        return
    for d in DEFAULTS:
        db.add(GS(**d))
    db.commit()


def _to_setting_out(s: models.global_settings.GlobalSetting) -> GlobalSettingOut:
    return GlobalSettingOut(
        key=s.key,
        value=s.value,
        tipo=s.tipo,
        categoria=s.categoria,
        descripcion=s.descripcion,
        editable=s.editable,
        updated_at=s.updated_at,
        updated_by=s.updated_by,
    )


@router.get("", response_model=list[GlobalSettingOut])
def list_settings(
    categoria: str | None = None,
    db: Session = Depends(database.get_db),
    _=Depends(require_role("admin")),
):
    _seed_defaults(db)
    q = db.query(models.global_settings.GlobalSetting)
    if categoria:
        q = q.filter(models.global_settings.GlobalSetting.categoria == categoria)
    return [_to_setting_out(s) for s in q.order_by(models.global_settings.GlobalSetting.key).all()]


@router.get("/{key}", response_model=GlobalSettingOut)
def get_setting(
    key: str,
    db: Session = Depends(database.get_db),
    _=Depends(require_role("admin")),
):
    _seed_defaults(db)
    s = db.query(models.global_settings.GlobalSetting).filter_by(key=key).first()
    if not s:
        raise HTTPException(404, f"Setting '{key}' no encontrado")
    return _to_setting_out(s)


@router.put("/{key}", response_model=GlobalSettingOut)
def update_setting(
    key: str,
    body: GlobalSettingUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    _seed_defaults(db)
    s = db.query(models.global_settings.GlobalSetting).filter_by(key=key).first()
    if not s:
        raise HTTPException(404, f"Setting '{key}' no encontrado")
    if not s.editable:
        raise HTTPException(403, f"Setting '{key}' no es editable")

    old_value = s.value
    s.value = body.value
    s.updated_at = datetime.now(timezone.utc)
    s.updated_by = current_user.user_id
    db.flush()

    log = models.global_settings.SettingAuditLog(
        setting_key=key,
        old_value=old_value,
        new_value=body.value,
        changed_by=current_user.user_id,
        reason=body.reason,
    )
    db.add(log)
    db.commit()
    db.refresh(s)
    return _to_setting_out(s)


@router.get("/audit/list", response_model=list[SettingAuditLogOut])
def list_audit_log(
    setting_key: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(database.get_db),
    _=Depends(require_role("admin")),
):
    _seed_defaults(db)
    q = db.query(
        models.global_settings.SettingAuditLog,
        models.user.User.nombre,
    ).join(
        models.user.User,
        models.global_settings.SettingAuditLog.changed_by == models.user.User.id,
        isouter=True,
    )
    if setting_key:
        q = q.filter(models.global_settings.SettingAuditLog.setting_key == setting_key)
    q = q.order_by(models.global_settings.SettingAuditLog.changed_at.desc())
    q = q.offset(offset).limit(limit)

    results = []
    for log_row, changer_nombre in q.all():
        results.append(
            SettingAuditLogOut(
                id=log_row.id,
                setting_key=log_row.setting_key,
                old_value=log_row.old_value,
                new_value=log_row.new_value,
                changed_by=log_row.changed_by,
                changed_at=log_row.changed_at,
                reason=log_row.reason,
                changer_nombre=changer_nombre,
            )
        )
    return results


@router.get("/export/all", response_model=SettingsExportData)
def export_settings(
    db: Session = Depends(database.get_db),
    _=Depends(require_role("admin")),
):
    _seed_defaults(db)
    settings = db.query(models.global_settings.GlobalSetting).order_by(
        models.global_settings.GlobalSetting.key
    ).all()
    return SettingsExportData(
        settings=[_to_setting_out(s) for s in settings]
    )


@router.post("/import", response_model=SettingsImportResult)
def import_settings(
    data: SettingsExportData,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    _seed_defaults(db)
    imported = 0
    skipped = 0
    errors = []

    for s_in in data.settings:
        existing = db.query(models.global_settings.GlobalSetting).filter_by(key=s_in.key).first()
        if existing and not existing.editable:
            skipped += 1
            continue
        try:
            if existing:
                old_value = existing.value
                existing.value = s_in.value
                existing.updated_at = datetime.now(timezone.utc)
                existing.updated_by = current_user.user_id
            else:
                old_value = None
                new_s = models.global_settings.GlobalSetting(
                    key=s_in.key,
                    value=s_in.value,
                    tipo=s_in.tipo,
                    categoria=s_in.categoria,
                    descripcion=s_in.descripcion,
                    editable=s_in.editable,
                    updated_by=current_user.user_id,
                )
                db.add(new_s)
            log = models.global_settings.SettingAuditLog(
                setting_key=s_in.key,
                old_value=old_value,
                new_value=s_in.value,
                changed_by=current_user.user_id,
                reason="Importación masiva",
            )
            db.add(log)
            imported += 1
        except Exception as e:
            errors.append(f"{s_in.key}: {e}")

    db.commit()
    return SettingsImportResult(imported=imported, skipped=skipped, errors=errors)
