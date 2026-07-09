from sqlalchemy import Column, Integer, String
from app.database import Base


class Carrera(Base):
    __tablename__ = "carreras"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), unique=True, nullable=False)
    duracion_semestres = Column(Integer, nullable=True)
    creditos_totales = Column(Integer, nullable=True)
    max_cuotas_mora = Column(Integer, nullable=False, default=1)
