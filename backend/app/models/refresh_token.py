from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), nullable=False, unique=True)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    revocado = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
