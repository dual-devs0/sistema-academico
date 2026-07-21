from typing import Optional
from sqlalchemy import Integer, String
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class Carrera(Base):
    __tablename__ = "carreras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    duracion_semestres: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    creditos_totales: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_cuotas_mora: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    users = relationship("User", back_populates="carrera")
