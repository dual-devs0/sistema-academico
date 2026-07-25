from typing import Optional
from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


# Inscripción de un alumno a una oferta de materia. Alta bloqueada por correlatividades
# (services/pensum.py) y por mora (services/financiero.py) salvo beca 100%.
class Inscripcion(Base):
    __tablename__ = "inscripciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    oferta_materia_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("ofertas_materia.id"), index=True)

    alumno = relationship("User")
    oferta = relationship("OfertaMateria")
