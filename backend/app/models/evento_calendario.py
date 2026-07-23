from datetime import date
from typing import Optional
from sqlalchemy import Integer, String, Text, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class EventoCalendario(Base):
    __tablename__ = "eventos_calendario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # parcial, final, feriado, asueto, entrega, actividad
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    materia_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("materias.id"), nullable=True)
    carrera_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("carreras.id"), nullable=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creado_por: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    anio: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    semestre: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    archivo_pdf: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hora: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)         # HH:MM formato 24h
    ubicacion: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Ej. "Aula 203"
