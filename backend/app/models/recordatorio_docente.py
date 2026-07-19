from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from app.database import Base


class RecordatorioDocente(Base):
    __tablename__ = "recordatorios_docente"

    id = Column(Integer, primary_key=True, index=True)
    profesor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha = Column(DateTime(timezone=True), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=True)
    completado = Column(Boolean, default=False)
