from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, UniqueConstraint
from app.database import Base

class ExpedienteSemestre(Base):
    __tablename__ = "expediente_semestres"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    periodo = Column(String(10), nullable=False)
    ppa_periodo = Column(Numeric(5, 2), nullable=True)
    creditos_periodo = Column(Integer, nullable=False, default=0)
    materias_aprobadas = Column(Integer, nullable=False, default=0)
    materias_reprobadas = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("alumno_id", "periodo", name="uq_expediente_semestre_alumno_periodo"),
    )
