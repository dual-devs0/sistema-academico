"""
Modelos SQLAlchemy — Fase 4: Módulo Financiero + Becas Diferenciadas.

REGLA: todos los montos monetarios usan Numeric(12,2) — nunca float.
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Optional
from sqlalchemy import (
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Text,
    ForeignKey,
    Numeric,
    JSON,
    CheckConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class FuenteBeca(Base):
    __tablename__ = "fuentes_beca"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    tipo: Mapped[str] = mapped_column(String(80), nullable=False)
    es_externa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    requiere_reporte_externo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    editable_porcentaje: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    becas = relationship("BecaCatalogo", back_populates="fuente", cascade="all, delete-orphan")
    becas_activas = relationship("BecaActiva", back_populates="fuente")


class BecaCatalogo(Base):
    __tablename__ = "becas_catalogo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    fuente_id: Mapped[int] = mapped_column(Integer, ForeignKey("fuentes_beca.id", ondelete="CASCADE"), nullable=False)
    porcentaje_descuento: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    monto_fijo: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    requisitos: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cupos_totales: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cupos_disponibles: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "porcentaje_descuento >= 0 AND porcentaje_descuento <= 100",
            name="ck_beca_porcentaje_rango",
        ),
    )

    fuente = relationship("FuenteBeca", back_populates="becas")
    postulaciones = relationship("PostulacionBeca", back_populates="beca", cascade="all, delete-orphan")
    activas = relationship("BecaActiva", back_populates="beca", cascade="all, delete-orphan")


class PostulacionBeca(Base):
    __tablename__ = "postulaciones_beca"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    beca_id: Mapped[int] = mapped_column(Integer, ForeignKey("becas_catalogo.id", ondelete="CASCADE"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    fecha_postulacion: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    documentos_storage_keys: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    motivo_rechazo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    revisado_por: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    revisado_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente','en_revision','aprobada','rechazada')",
            name="ck_postulacion_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    revisor = relationship("User", foreign_keys=[revisado_por])
    beca = relationship("BecaCatalogo", back_populates="postulaciones")


class BecaActiva(Base):
    __tablename__ = "becas_activas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    beca_id: Mapped[int] = mapped_column(Integer, ForeignKey("becas_catalogo.id", ondelete="CASCADE"), nullable=False)
    fuente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fuentes_beca.id"), nullable=False
    )  # denorm para reportes
    periodo_inicio: Mapped[str] = mapped_column(String(10), nullable=False)
    periodo_fin: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    promedio_minimo_requerido: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    promedio_actual: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    estado_renovacion: Mapped[str] = mapped_column(String(30), nullable=False, default="vigente")
    otorgado_por: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    otorgado_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint(
            "estado_renovacion IN ('vigente','en_riesgo','suspendida','finalizada')",
            name="ck_beca_activa_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    otorgante = relationship("User", foreign_keys=[otorgado_por])
    beca = relationship("BecaCatalogo", back_populates="activas")
    fuente = relationship("FuenteBeca", back_populates="becas_activas")
    cuotas = relationship("Cuota", back_populates="beca_aplicada")


class ConceptoArancel(Base):
    __tablename__ = "conceptos_arancel"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    carrera_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("carreras.id"), nullable=True)
    monto_base: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    periodicidad: Mapped[str] = mapped_column(String(80), nullable=False, default="mensual")
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    carrera = relationship("Carrera")
    cuotas = relationship("Cuota", back_populates="concepto", cascade="all, delete-orphan")


class Cuota(Base):
    __tablename__ = "cuotas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    concepto_id: Mapped[int] = mapped_column(Integer, ForeignKey("conceptos_arancel.id", ondelete="CASCADE"), nullable=False)
    periodo: Mapped[str] = mapped_column(String(10), nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    monto_descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    beca_aplicada_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("becas_activas.id"), nullable=True)
    generado_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    generado_por: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente','pagada','vencida','anulada')",
            name="ck_cuota_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    generador = relationship("User", foreign_keys=[generado_por])
    concepto = relationship("ConceptoArancel", back_populates="cuotas")
    beca_aplicada = relationship("BecaActiva", back_populates="cuotas")
    pagos = relationship("Pago", back_populates="cuota", cascade="all, delete-orphan")


class Pago(Base):
    """
    Los pagos son INMUTABLES. Nunca se editan ni eliminan.
    Correcciones = nuevo Pago con es_ajuste=True
    y pago_ajuste_ref_id apuntando al original.
    """

    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cuota_id: Mapped[int] = mapped_column(Integer, ForeignKey("cuotas.id", ondelete="CASCADE"), nullable=False)
    monto_pagado: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fecha_pago: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    metodo: Mapped[str] = mapped_column(String(50), nullable=False)
    referencia: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    registrado_por: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    pago_ajuste_ref_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("pagos.id"), nullable=True)
    es_ajuste: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    nota_ajuste: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    cuota = relationship("Cuota", back_populates="pagos")
    registrador = relationship("User", foreign_keys=[registrado_por])
    comprobante = relationship("Comprobante", back_populates="pago", uselist=False, cascade="all, delete-orphan")


class Comprobante(Base):
    __tablename__ = "comprobantes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pago_id: Mapped[int] = mapped_column(Integer, ForeignKey("pagos.id", ondelete="CASCADE"), nullable=False, unique=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="factura")
    numero_comprobante: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cdc: Mapped[Optional[str]] = mapped_column(String(44), nullable=True)  # DNIT
    timbrado: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    url_pdf: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # PDF servido por guarani.app
    storage_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    estado_emision: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    # pendiente / emitido / error / reintentando
    intentos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ultimo_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_emision: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado_emision IN ('pendiente','emitido','error','reintentando')",
            name="ck_comprobante_estado_emision",
        ),
    )

    pago = relationship("Pago", back_populates="comprobante")


class AuditoriaOverrideMora(Base):
    """Registro de auditoría cuando admin omite el bloqueo por mora."""

    __tablename__ = "auditoria_override_mora"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    oferta_materia_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("ofertas_materia.id"), nullable=True)
    motivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    registrado_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    admin = relationship("User", foreign_keys=[admin_id])


class PagoOnline(Base):
    """Pago iniciado por gateway online (Stripe Checkout)."""

    __tablename__ = "pagos_online"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cuota_id: Mapped[int] = mapped_column(Integer, ForeignKey("cuotas.id"), nullable=False)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    stripe_session_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    gateway_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    gateway_response: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    creado_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    confirmado_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    cuota = relationship("Cuota")
    alumno = relationship("User", foreign_keys=[alumno_id])


class SuscripcionPush(Base):
    """Suscripción Web Push para notificaciones."""

    __tablename__ = "suscripciones_push"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    p256dh: Mapped[str] = mapped_column(String(200), nullable=False)
    auth: Mapped[str] = mapped_column(String(200), nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="suscripciones_push")
