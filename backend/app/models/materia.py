from typing import Optional
from sqlalchemy import Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class Materia(Base):
    __tablename__ = "materias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String, index=True, nullable=False)
    codigo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    carrera_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("carreras.id"), nullable=True)
    anio: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    semestre: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    creditos: Mapped[Optional[int]] = mapped_column(Integer, default=4)
    cupos: Mapped[Optional[int]] = mapped_column(Integer, default=40)
    horario: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    secciones: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    carrera = relationship("Carrera")

    __table_args__ = (
        UniqueConstraint("nombre", "carrera_id", name="uq_materia_nombre_carrera"),
        UniqueConstraint("carrera_id", "codigo", name="uq_materia_codigo_carrera"),
    )
