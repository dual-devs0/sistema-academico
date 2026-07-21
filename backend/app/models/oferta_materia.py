from typing import Optional
from sqlalchemy import Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class OfertaMateria(Base):
    __tablename__ = "ofertas_materia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    profesor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    periodo: Mapped[str] = mapped_column(String(10), nullable=False)  # ej. '2026-1'
    activa: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)

    materia = relationship("Materia")
    profesor = relationship("User", foreign_keys=[profesor_id])

    __table_args__ = (
        UniqueConstraint("materia_id", "periodo", name="uq_oferta_materia_periodo"),
    )
