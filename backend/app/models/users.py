from sqlalchemy import Integer, String, Boolean, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime, timezone, date
from typing import Optional
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, index=True)  # admin, profesor, alumno

    nombre: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    email: Mapped[Optional[str]] = mapped_column(String(200), unique=True, nullable=True)
    cedula: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    carrera_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("carreras.id"), nullable=True)
    es_becado: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    foto_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    fecha_ingreso: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    cv: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    carrera = relationship("Carrera", back_populates="users")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
