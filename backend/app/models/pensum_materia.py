from sqlalchemy import Column, Integer, Boolean, ForeignKey, UniqueConstraint
from app.database import Base

class PensumMateria(Base):
    __tablename__ = "pensum_materias"

    id = Column(Integer, primary_key=True, index=True)
    carrera_id = Column(Integer, ForeignKey("carreras.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    semestre = Column(Integer, nullable=False)
    creditos = Column(Integer, nullable=False)
    es_electiva = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("carrera_id", "materia_id", name="uq_pensum_carrera_materia"),
    )
