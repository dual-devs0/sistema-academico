from datetime import date
from typing import Optional
from sqlalchemy import (
    Integer,
    Boolean,
    Date,
    String,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class Asistencia(Base):
    __tablename__ = "asistencias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    oferta_materia_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ofertas_materia.id"), nullable=False, index=True
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    presente: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    es_becado: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)  # snapshot
    motivo: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # motivo de ausencia

    oferta = relationship("OfertaMateria")

    @property
    def materia_id(self):
        return self.oferta.materia_id if self.oferta else None

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "oferta_materia_id",
            "fecha",
            name="uq_asistencia_user_oferta_fecha",
        ),
    )
