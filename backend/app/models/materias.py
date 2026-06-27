from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Materia(Base):
    __tablename__ = "materias"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)
    profesor_id = Column(Integer, ForeignKey("users.id"))

class Inscripcion(Base):
    __tablename__ = "inscripciones"
    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"))
    materia_id = Column(Integer, ForeignKey("materias.id"))