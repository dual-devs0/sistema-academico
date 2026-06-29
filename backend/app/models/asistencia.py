from sqlalchemy import Column, Integer, Boolean, Date, String, ForeignKey
from app.database import Base

class Asistencia(Base):
    __tablename__ = "asistencias"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    presente = Column(Boolean, nullable=False, default=True)
    es_becado = Column(Boolean, default=False)  # snapshot
    motivo = Column(String, nullable=True)       # motivo de ausencia
