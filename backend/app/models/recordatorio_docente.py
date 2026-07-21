from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class RecordatorioDocente(Base):
    __tablename__ = "recordatorios_docente"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profesor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    materia_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("materias.id"), nullable=True)
    completado: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
