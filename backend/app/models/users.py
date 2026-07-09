from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, profesor, alumno

    nombre = Column(String(120), nullable=False, default="")
    email = Column(String(200), unique=True, nullable=True)
    cedula = Column(String(20), nullable=True)
    carrera_id = Column(Integer, ForeignKey("carreras.id"), nullable=True)
    es_becado = Column(Boolean, default=False)
    foto_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
