from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Inscripcion(Base):
    __tablename__ = "inscripciones"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"))
    materia_id = Column(Integer, ForeignKey("materias.id"))

    alumno = relationship("User")
    materia = relationship("Materia")
