from sqlalchemy import Column, Integer, String, Time, ForeignKey, UniqueConstraint
from app.database import Base

class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    dia_semana = Column(Integer, nullable=False)  # 0=Lunes, 6=Domingo
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    aula = Column(String(50), nullable=True)

    __table_args__ = (
        UniqueConstraint("materia_id", "dia_semana", "hora_inicio", name="uq_horario_materia_dia_hora"),
    )
