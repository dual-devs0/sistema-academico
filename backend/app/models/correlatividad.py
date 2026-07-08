from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, CheckConstraint
from app.database import Base

class Correlatividad(Base):
    __tablename__ = "correlatividades"

    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    prerrequisito_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # 'aprobada' | 'cursando'

    __table_args__ = (
        CheckConstraint("materia_id != prerrequisito_id", name="ck_correlatividad_no_autorreferencia"),
        UniqueConstraint("materia_id", "prerrequisito_id", "tipo", name="uq_correlatividad_regla"),
    )
