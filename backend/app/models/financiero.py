"""
Modelos SQLAlchemy — Fase 4: Módulo Financiero + Becas Diferenciadas.

REGLA: todos los montos monetarios usan Numeric(12,2) — nunca float.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Text,
    ForeignKey, Numeric, JSON, CheckConstraint, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class FuenteBeca(Base):
    __tablename__ = "fuentes_beca"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, unique=True)
    tipo = Column(String(80), nullable=False)
    es_externa = Column(Boolean, nullable=False, default=False)
    requiere_reporte_externo = Column(Boolean, nullable=False, default=False)
    editable_porcentaje = Column(Boolean, nullable=False, default=True)

    becas = relationship("BecaCatalogo", back_populates="fuente")
    becas_activas = relationship("BecaActiva", back_populates="fuente")


class BecaCatalogo(Base):
    __tablename__ = "becas_catalogo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    fuente_id = Column(Integer, ForeignKey("fuentes_beca.id"), nullable=False)
    porcentaje_descuento = Column(Numeric(5, 2), nullable=False)
    monto_fijo = Column(Numeric(12, 2), nullable=True)
    requisitos = Column(Text, nullable=True)
    cupos_totales = Column(Integer, nullable=True)
    cupos_disponibles = Column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "porcentaje_descuento >= 0 AND porcentaje_descuento <= 100",
            name="ck_beca_porcentaje_rango",
        ),
    )

    fuente = relationship("FuenteBeca", back_populates="becas")
    postulaciones = relationship("PostulacionBeca", back_populates="beca")
    activas = relationship("BecaActiva", back_populates="beca")


class PostulacionBeca(Base):
    __tablename__ = "postulaciones_beca"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    beca_id = Column(Integer, ForeignKey("becas_catalogo.id"), nullable=False)
    estado = Column(String(20), nullable=False, default="pendiente")
    fecha_postulacion = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    documentos_storage_keys = Column(JSON, nullable=True)
    motivo_rechazo = Column(Text, nullable=True)
    revisado_por = Column(Integer, ForeignKey("users.id"), nullable=True)
    revisado_en = Column(DateTime(timezone=True), nullable=True)

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

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    beca_id = Column(Integer, ForeignKey("becas_catalogo.id"), nullable=False)
    fuente_id = Column(Integer, ForeignKey("fuentes_beca.id"), nullable=False)  # denorm para reportes
    periodo_inicio = Column(String(10), nullable=False)
    periodo_fin = Column(String(10), nullable=True)
    promedio_minimo_requerido = Column(Numeric(5, 2), nullable=True)
    promedio_actual = Column(Numeric(5, 2), nullable=True)
    estado_renovacion = Column(String(30), nullable=False, default="vigente")
    otorgado_por = Column(Integer, ForeignKey("users.id"), nullable=True)
    otorgado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

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

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    carrera_id = Column(Integer, ForeignKey("carreras.id"), nullable=True)
    monto_base = Column(Numeric(12, 2), nullable=False)
    periodicidad = Column(String(80), nullable=False, default="mensual")
    activo = Column(Boolean, nullable=False, default=True)

    carrera = relationship("Carrera")
    cuotas = relationship("Cuota", back_populates="concepto")


class Cuota(Base):
    __tablename__ = "cuotas"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    concepto_id = Column(Integer, ForeignKey("conceptos_arancel.id"), nullable=False)
    periodo = Column(String(10), nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    monto_descuento = Column(Numeric(12, 2), nullable=False, default=0)
    fecha_vencimiento = Column(Date, nullable=False)
    estado = Column(String(20), nullable=False, default="pendiente")
    beca_aplicada_id = Column(Integer, ForeignKey("becas_activas.id"), nullable=True)
    generado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    generado_por = Column(Integer, ForeignKey("users.id"), nullable=True)

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
    pagos = relationship("Pago", back_populates="cuota")


class Pago(Base):
    """
    Los pagos son INMUTABLES. Nunca se editan ni eliminan.
    Correcciones = nuevo Pago con es_ajuste=True y pago_ajuste_ref_id apuntando al original.
    """
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    cuota_id = Column(Integer, ForeignKey("cuotas.id"), nullable=False)
    monto_pagado = Column(Numeric(12, 2), nullable=False)
    fecha_pago = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    metodo = Column(String(50), nullable=False)
    referencia = Column(String(200), nullable=True)
    registrado_por = Column(Integer, ForeignKey("users.id"), nullable=False)
    pago_ajuste_ref_id = Column(Integer, ForeignKey("pagos.id"), nullable=True)
    es_ajuste = Column(Boolean, nullable=False, default=False)
    nota_ajuste = Column(Text, nullable=True)

    cuota = relationship("Cuota", back_populates="pagos")
    registrador = relationship("User", foreign_keys=[registrado_por])
    comprobante = relationship("Comprobante", back_populates="pago", uselist=False)


class Comprobante(Base):
    __tablename__ = "comprobantes"

    id = Column(Integer, primary_key=True, index=True)
    pago_id = Column(Integer, ForeignKey("pagos.id"), nullable=False, unique=True)
    tipo = Column(String(20), nullable=False, default="factura")
    numero_comprobante = Column(String(50), nullable=True)
    cdc = Column(String(44), nullable=True)  # DNIT
    timbrado = Column(String(20), nullable=True)
    url_pdf = Column(String(500), nullable=True)  # PDF servido por guarani.app
    storage_key = Column(String(500), nullable=True)
    estado_emision = Column(String(20), nullable=False, default="pendiente")
    # pendiente / emitido / error / reintentando
    intentos = Column(Integer, nullable=False, default=0)
    ultimo_error = Column(Text, nullable=True)
    fecha_emision = Column(DateTime(timezone=True), nullable=True)

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

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    oferta_materia_id = Column(Integer, ForeignKey("ofertas_materia.id"), nullable=True)
    motivo = Column(Text, nullable=True)
    registrado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    alumno = relationship("User", foreign_keys=[alumno_id])
    admin = relationship("User", foreign_keys=[admin_id])
