from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from app.database import Base

class Temario(Base):
    __tablename__ = "temarios"

    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    semana = Column(Integer, nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    bibliografia = Column(JSON, nullable=True)  # list of {autor, titulo, anio, tipo}
