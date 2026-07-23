from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import Integer, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

PESO_DEFAULT = {
    "parcial1": Decimal("20"),
    "parcial2": Decimal("20"),
    "practico": Decimal("10"),
    "final": Decimal("50"),
}


class PesoEvaluacion(Base):
    """Puntaje máximo por tipo de evaluación, configurable por materia (default 20/20/10/50)."""

    __tablename__ = "pesos_evaluacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    parcial1_max: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=PESO_DEFAULT["parcial1"])
    parcial2_max: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=PESO_DEFAULT["parcial2"])
    practico_max: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=PESO_DEFAULT["practico"])
    final_max: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=PESO_DEFAULT["final"])
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint("materia_id", name="uq_peso_evaluacion_materia"),
    )
