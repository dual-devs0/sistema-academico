from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.database import Base


class Materia(Base):
    __tablename__ = "materias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True, nullable=False)
    codigo = Column(String(20), nullable=True)
    carrera_id = Column(Integer, ForeignKey("carreras.id"), nullable=True)
    anio = Column(Integer, default=1)
    semestre = Column(Integer, default=1)
    creditos = Column(Integer, default=4)
    cupos = Column(Integer, default=40)
    horario = Column(String, nullable=True)
    secciones = Column(Integer, default=1)

    __table_args__ = (
        UniqueConstraint("nombre", "carrera_id", name="uq_materia_nombre_carrera"),
        UniqueConstraint("carrera_id", "codigo", name="uq_materia_codigo_carrera"),
    )
