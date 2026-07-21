from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    Integer,
    String,
    Numeric,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base


class ExpedienteMateria(Base):
    __tablename__ = "expediente_materias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    oferta_materia_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ofertas_materia.id"), nullable=False
    )
    nota_final: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    creditos: Mapped[int] = mapped_column(Integer, nullable=False)
    condicion: Mapped[str] = mapped_column(String(20), nullable=False)  # 'aprobada' | 'reprobada'
    cerrado_por: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    cerrado_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "oferta_materia_id", name="uq_expediente_alumno_oferta"
        ),
        CheckConstraint(
            "condicion IN ('aprobada','reprobada')", name="ck_expediente_condicion"
        ),
    )
