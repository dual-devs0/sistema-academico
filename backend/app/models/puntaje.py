from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime, timezone
from app.database import Base

class Puntaje(Base):
    __tablename__ = "puntajes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # parcial1, parcial2, practico, final
    valor = Column(Numeric(5,2), nullable=False)
    editado_por = Column(Integer, ForeignKey("users.id"), nullable=True)
    editado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_id", "materia_id", "tipo", name="uq_puntaje_user_materia_tipo"),
    )
