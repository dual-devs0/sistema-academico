from typing import Optional
from sqlalchemy import Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PensumMateria(Base):
    __tablename__ = "pensum_materias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    carrera_id: Mapped[int] = mapped_column(Integer, ForeignKey("carreras.id"), nullable=False)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    semestre: Mapped[int] = mapped_column(Integer, nullable=False)
    creditos: Mapped[int] = mapped_column(Integer, nullable=False)
    es_electiva: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("carrera_id", "materia_id", name="uq_pensum_carrera_materia"),
    )
