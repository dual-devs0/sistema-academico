from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Apunte(Base):
    __tablename__ = "apuntes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    archivo_url = Column(Text, nullable=True)
    storage_key = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
    aprobado = Column(Boolean, default=False)
    tipo_contenido = Column(String(50), default="pdf")
    likes = Column(Integer, default=0)
    descargas = Column(Integer, default=0)
    visibilidad = Column(String(20), default="publico")
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())
