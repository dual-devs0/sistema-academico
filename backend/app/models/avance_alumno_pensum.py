from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class AvanceAlumnoPensum(Base):
    __tablename__ = "avance_alumno_pensum"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pensum_materia_id = Column(
        Integer, ForeignKey("pensum_materias.id"), nullable=False
    )
    estado = Column(
        String(20), nullable=False, default="pendiente"
    )  # pendiente|cursando|aprobada|reprobada|bloqueada
    fecha_actualizacion = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "pensum_materia_id", name="uq_avance_alumno_pensum_materia"
        ),
    )
