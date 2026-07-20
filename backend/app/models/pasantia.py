"""
Modelos SQLAlchemy — Fase 5C: Pasantías.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    CheckConstraint,
    Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class EmpresaReceptora(Base):
    __tablename__ = "empresas_receptoras"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True)
    rubro = Column(String(100), nullable=True)
    contacto = Column(String(150), nullable=True)
    telefono = Column(String(30), nullable=True)
    email = Column(String(200), nullable=True)
    convenio_activo = Column(Boolean, nullable=False, default=False)

    pasantias = relationship("Pasantia", back_populates="empresa")


class Pasantia(Base):
    __tablename__ = "pasantias"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas_receptoras.id"), nullable=False)
    tutor_academico_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=True)
    horas_requeridas = Column(Integer, nullable=False)
    horas_completadas = Column(Integer, nullable=False, default=0)
    estado = Column(String(20), nullable=False, default="pendiente")
    motivo_rechazo = Column(Text, nullable=True)

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


class InformePasantia(Base):
    __tablename__ = "informes_pasantia"

    id = Column(Integer, primary_key=True, index=True)
    pasantia_id = Column(Integer, ForeignKey("pasantias.id"), nullable=False)
    tipo = Column(String(30), nullable=False)
    storage_key = Column(String(500), nullable=True)
    fecha_entrega = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('plan_trabajo','informe_parcial','informe_final')",
            name="ck_informe_tipo",
        ),
    )

    pasantia = relationship("Pasantia", back_populates="informes")
