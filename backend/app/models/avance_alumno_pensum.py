from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base


class AvanceAlumnoPensum(Base):
    __tablename__ = "avance_alumno_pensum"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pensum_materia_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pensum_materias.id"), nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pendiente"
    )  # pendiente|cursando|aprobada|reprobada|bloqueada
    fecha_actualizacion: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "pensum_materia_id", name="uq_avance_alumno_pensum_materia"
        ),
    )
