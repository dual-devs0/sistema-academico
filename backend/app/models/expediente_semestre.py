from decimal import Decimal
from typing import Optional
from sqlalchemy import Integer, String, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ExpedienteSemestre(Base):
    __tablename__ = "expediente_semestres"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    periodo: Mapped[str] = mapped_column(String(10), nullable=False)
    ppa_periodo: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    creditos_periodo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    materias_aprobadas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    materias_reprobadas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "periodo", name="uq_expediente_semestre_alumno_periodo"
        ),
    )
