from sqlalchemy import Column, Integer, Boolean, Date, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Asistencia(Base):
    __tablename__ = "asistencias"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    oferta_materia_id = Column(Integer, ForeignKey("ofertas_materia.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    presente = Column(Boolean, nullable=False, default=True)
    es_becado = Column(Boolean, default=False)  # snapshot
    motivo = Column(String, nullable=True)       # motivo de ausencia

    oferta = relationship("OfertaMateria")

    @property
    def materia_id(self):
        return self.oferta.materia_id if self.oferta else None

    __table_args__ = (
        UniqueConstraint("user_id", "oferta_materia_id", "fecha", name="uq_asistencia_user_oferta_fecha"),
    )
