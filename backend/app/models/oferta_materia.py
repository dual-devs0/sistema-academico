from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class OfertaMateria(Base):
    __tablename__ = "ofertas_materia"

    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    profesor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    periodo = Column(String(10), nullable=False)  # ej. '2026-1'
    activa = Column(Boolean, default=True)

    materia = relationship("Materia")
    profesor = relationship("User", foreign_keys=[profesor_id])

    __table_args__ = (
        UniqueConstraint("materia_id", "periodo", name="uq_oferta_materia_periodo"),
    )
