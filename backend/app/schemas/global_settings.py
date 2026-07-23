from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class GlobalSettingOut(BaseModel):
    key: str
    value: Optional[str] = None
    tipo: str
    categoria: str
    descripcion: Optional[str] = None
    editable: bool = True
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None

    model_config = {"from_attributes": True}


class GlobalSettingUpdate(BaseModel):
    value: Optional[str] = None
    reason: Optional[str] = None


class SettingAuditLogOut(BaseModel):
    id: int
    setting_key: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: int
    changed_at: Optional[datetime] = None
    reason: Optional[str] = None
    changer_nombre: Optional[str] = None

    model_config = {"from_attributes": True}


class SettingsExportData(BaseModel):
    settings: list[GlobalSettingOut]


class SettingsImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str]
