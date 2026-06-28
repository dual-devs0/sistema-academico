from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey
from app.database import Base

class EventoCalendario(Base):
    __tablename__ = "eventos_calendario"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    tipo = Column(String(20), nullable=False)  # parcial, final, feriado, asueto, entrega, actividad
    fecha = Column(Date, nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=True)
    carrera_id = Column(Integer, ForeignKey("carreras.id"), nullable=True)
    descripcion = Column(Text, nullable=True)
    creado_por = Column(Integer, ForeignKey("users.id"), nullable=True)
