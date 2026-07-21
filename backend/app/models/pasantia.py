"""
Modelos SQLAlchemy — Fase 5C: Pasantías.
"""

from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import (
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    CheckConstraint,
    Text,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class EmpresaReceptora(Base):
    __tablename__ = "empresas_receptoras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    rubro: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contacto: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    convenio_activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    pasantias = relationship("Pasantia", back_populates="empresa")


class Pasantia(Base):
    __tablename__ = "pasantias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresas_receptoras.id"), nullable=False)
    tutor_academico_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    horas_requeridas: Mapped[int] = mapped_column(Integer, nullable=False)
    horas_completadas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    motivo_rechazo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente','en_curso','completada','rechazada')",
            name="ck_pasantia_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    tutor_academico = relationship("User", foreign_keys=[tutor_academico_id])
    empresa = relationship("EmpresaReceptora", back_populates="pasantias")
    informes = relationship("InformePasantia", back_populates="pasantia")

    @property
    def empresa_nombre(self) -> str | None:
        return self.empresa.nombre if self.empresa else None

    @property
    def tutor_nombre(self) -> str | None:
        return self.tutor_academico.nombre if self.tutor_academico else None

    @property
    def alumno_nombre(self) -> str | None:
        return self.alumno.nombre if self.alumno else None


class InformePasantia(Base):
    __tablename__ = "informes_pasantia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pasantia_id: Mapped[int] = mapped_column(Integer, ForeignKey("pasantias.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    storage_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    fecha_entrega: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('plan_trabajo','informe_parcial','informe_final')",
            name="ck_informe_tipo",
        ),
    )

    pasantia = relationship("Pasantia", back_populates="informes")
