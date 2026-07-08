from sqlalchemy.orm import Session
from app.models.expediente_materia import ExpedienteMateria
from app.models.oferta_materia import OfertaMateria
from app.models.inscripcion import Inscripcion
from app.models.asistencia import Asistencia
from app.models.materia import Materia

PPA_UMBRAL_RIESGO = 7.0  # nota: PPA solo promedia 'aprobada' (siempre nota>=6), asi que
                          # un umbral de 6.0 nunca dispara -- 7.0 marca "aprobado pero flojo"
ASISTENCIA_UMBRAL_RIESGO = 75  # %
PLAZO_RECURSAR_PERIODOS = 2
PERIODOS_INACTIVIDAD_BAJA = 3


def calcular_ppa(alumno_id: int, db: Session) -> dict:
    """PPA = Sum(nota_final * creditos) / Sum(creditos) sobre expediente_materias aprobadas.

    Devuelve {"ppa": float|None, "creditos_computados": int}. ppa es None
    (nunca 0.0) si el alumno no tiene ninguna materia aprobada en su expediente.
    """
    aprobadas = db.query(ExpedienteMateria).filter(
        ExpedienteMateria.alumno_id == alumno_id,
        ExpedienteMateria.condicion == "aprobada",
    ).all()
    if not aprobadas:
        return {"ppa": None, "creditos_computados": 0}

    creditos_totales = sum(a.creditos for a in aprobadas)
    if creditos_totales == 0:
        return {"ppa": None, "creditos_computados": 0}

    ponderado = sum(float(a.nota_final) * a.creditos for a in aprobadas)
    return {"ppa": round(ponderado / creditos_totales, 2), "creditos_computados": creditos_totales}


def calcular_regularidad(alumno_id: int, db: Session) -> dict:
    """Clasifica al alumno en activo/en_riesgo/irregular/de_baja.

    Precedencia (mas severo gana): de_baja > irregular > en_riesgo > activo.
    Devuelve {"estado": str, "motivo": str|None, "ppa_acumulado": float|None}.
    """
    ppa_info = calcular_ppa(alumno_id, db)
    ppa = ppa_info["ppa"]

    periodos_sistema = sorted({p for (p,) in db.query(OfertaMateria.periodo).distinct().all()})
    periodos_alumno = sorted({
        p for (p,) in db.query(OfertaMateria.periodo)
        .join(Inscripcion, Inscripcion.oferta_materia_id == OfertaMateria.id)
        .filter(Inscripcion.alumno_id == alumno_id)
        .distinct().all()
    })

    # 1. De baja: sin inscripciones en los ultimos N periodos del sistema.
    # Se salta si el sistema todavia no tiene suficiente historia (< N periodos distintos).
    if len(periodos_sistema) >= PERIODOS_INACTIVIDAD_BAJA:
        recientes = set(periodos_sistema[-PERIODOS_INACTIVIDAD_BAJA:])
        if not (set(periodos_alumno) & recientes):
            return {
                "estado": "de_baja",
                "motivo": f"Sin inscripciones en los ultimos {PERIODOS_INACTIVIDAD_BAJA} periodos",
                "ppa_acumulado": ppa,
            }

    # 2. Irregular: materia reprobada fuera de plazo sin recursar y aprobar despues.
    if periodos_alumno:
        idx_reciente = periodos_sistema.index(periodos_alumno[-1])
        reprobadas = db.query(ExpedienteMateria).filter(
            ExpedienteMateria.alumno_id == alumno_id,
            ExpedienteMateria.condicion == "reprobada",
        ).all()
        for r in reprobadas:
            oferta_r = db.query(OfertaMateria).filter(OfertaMateria.id == r.oferta_materia_id).first()
            if not oferta_r or oferta_r.periodo not in periodos_sistema:
                continue
            idx_r = periodos_sistema.index(oferta_r.periodo)
            if idx_reciente - idx_r <= PLAZO_RECURSAR_PERIODOS:
                continue
            aprobada_posterior = (
                db.query(ExpedienteMateria)
                .join(OfertaMateria, ExpedienteMateria.oferta_materia_id == OfertaMateria.id)
                .filter(
                    ExpedienteMateria.alumno_id == alumno_id,
                    ExpedienteMateria.condicion == "aprobada",
                    OfertaMateria.materia_id == oferta_r.materia_id,
                )
                .first()
            )
            if aprobada_posterior:
                continue
            materia = db.query(Materia).filter(Materia.id == oferta_r.materia_id).first()
            nombre = materia.nombre if materia else f"materia #{oferta_r.materia_id}"
            return {
                "estado": "irregular",
                "motivo": f"{nombre} reprobada, sin recursar en {PLAZO_RECURSAR_PERIODOS} periodos",
                "ppa_acumulado": ppa,
            }

    # 3. En riesgo: PPA bajo umbral o asistencia global < umbral.
    if ppa is not None and ppa < PPA_UMBRAL_RIESGO:
        return {"estado": "en_riesgo", "motivo": f"PPA {ppa} < {PPA_UMBRAL_RIESGO}", "ppa_acumulado": ppa}

    total_asistencias = db.query(Asistencia).filter(Asistencia.user_id == alumno_id).count()
    if total_asistencias:
        presentes = db.query(Asistencia).filter(
            Asistencia.user_id == alumno_id, Asistencia.presente == True,  # noqa: E712
        ).count()
        pct = round(presentes / total_asistencias * 100)
        if pct < ASISTENCIA_UMBRAL_RIESGO:
            return {
                "estado": "en_riesgo",
                "motivo": f"Asistencia {pct}% < {ASISTENCIA_UMBRAL_RIESGO}%",
                "ppa_acumulado": ppa,
            }

    # 4. Activo
    return {"estado": "activo", "motivo": None, "ppa_acumulado": ppa}
