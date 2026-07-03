from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base

class ForoHilo(Base):
    __tablename__ = "foro_hilos"

    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    creado_por = Column(Integer, ForeignKey("users.id"), nullable=False)
    fijado = Column(Boolean, default=False)
    cerrado = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class ForoMensaje(Base):
    __tablename__ = "foro_mensajes"

    id = Column(Integer, primary_key=True, index=True)
    hilo_id = Column(Integer, ForeignKey("foro_hilos.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contenido = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
