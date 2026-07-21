from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    Integer,
    String,
    Numeric,
    DateTime,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base


class RegularidadAlumno(Base):
    __tablename__ = "regularidad_alumno"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False)  # activo|en_riesgo|irregular|de_baja
    ppa_acumulado: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    motivo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    calculado_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "estado IN ('activo','en_riesgo','irregular','de_baja')",
            name="ck_regularidad_estado",
        ),
    )
