from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base


class ForoHilo(Base):
    __tablename__ = "foro_hilos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creado_por: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    fijado: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    cerrado: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ForoMensaje(Base):
    __tablename__ = "foro_mensajes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    hilo_id: Mapped[int] = mapped_column(Integer, ForeignKey("foro_hilos.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
