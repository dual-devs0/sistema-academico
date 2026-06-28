from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from app.database import Base

class Apunte(Base):
    __tablename__ = "apuntes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    archivo_url = Column(Text, nullable=False)
    tags = Column(Text, nullable=True)  # comma-separated
    aprobado = Column(Boolean, default=False)
