from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from app.database import Base

class ExpedienteMateria(Base):
    __tablename__ = "expediente_materias"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    oferta_materia_id = Column(Integer, ForeignKey("ofertas_materia.id"), nullable=False)
    nota_final = Column(Numeric(5, 2), nullable=False)
    creditos = Column(Integer, nullable=False)
    condicion = Column(String(20), nullable=False)  # 'aprobada' | 'reprobada'
    cerrado_por = Column(Integer, ForeignKey("users.id"), nullable=False)
    cerrado_en = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("alumno_id", "oferta_materia_id", name="uq_expediente_alumno_oferta"),
        CheckConstraint("condicion IN ('aprobada','reprobada')", name="ck_expediente_condicion"),
    )
