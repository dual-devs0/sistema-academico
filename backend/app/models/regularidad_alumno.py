from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    DateTime,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.sql import func
from app.database import Base


class RegularidadAlumno(Base):
    __tablename__ = "regularidad_alumno"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    estado = Column(String(20), nullable=False)  # activo|en_riesgo|irregular|de_baja
    ppa_acumulado = Column(Numeric(5, 2), nullable=True)
    motivo = Column(String(255), nullable=True)
    calculado_en = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "estado IN ('activo','en_riesgo','irregular','de_baja')",
            name="ck_regularidad_estado",
        ),
    )
