from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Apunte(Base):
    __tablename__ = "apuntes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    archivo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    storage_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aprobado: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    tipo_contenido: Mapped[Optional[str]] = mapped_column(String(50), default="pdf")
    likes: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    descargas: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    visibilidad: Mapped[Optional[str]] = mapped_column(String(20), default="publico")
    fecha_subida: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("User", backref="apuntes")
