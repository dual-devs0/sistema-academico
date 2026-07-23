from sqlalchemy import Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from typing import Optional
from app.database import Base


class GlobalSetting(Base):
    __tablename__ = "global_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="string")
    categoria: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    editable: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    updater = relationship("User", foreign_keys=[updated_by])


class SettingAuditLog(Base):
    __tablename__ = "setting_audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    setting_key: Mapped[str] = mapped_column(String(100), ForeignKey("global_settings.key"), nullable=False)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    changer = relationship("User", foreign_keys=[changed_by])
