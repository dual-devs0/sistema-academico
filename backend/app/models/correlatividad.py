from sqlalchemy import (
    Integer,
    String,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Correlatividad(Base):
    __tablename__ = "correlatividades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    prerrequisito_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # 'aprobada' | 'cursando'

    __table_args__ = (
        CheckConstraint(
            "materia_id != prerrequisito_id",
            name="ck_correlatividad_no_autorreferencia",
        ),
        UniqueConstraint(
            "materia_id", "prerrequisito_id", "tipo", name="uq_correlatividad_regla"
        ),
    )
