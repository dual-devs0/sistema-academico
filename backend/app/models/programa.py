from typing import Optional
from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Programa(Base):
    __tablename__ = "programas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    semana: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
