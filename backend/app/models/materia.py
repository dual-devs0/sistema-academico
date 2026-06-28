from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Materia(Base):
    __tablename__ = "materias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    profesor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    carrera_id = Column(Integer, ForeignKey("carreras.id"), nullable=True)
    anio = Column(Integer, default=1)
    semestre = Column(Integer, default=1)

    profesor = relationship("User", foreign_keys=[profesor_id])
