from datetime import date
from app.services.expediente import calcular_ppa, calcular_regularidad
from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.expediente_materia import ExpedienteMateria
from app.models.inscripcion import Inscripcion
from app.models.asistencia import Asistencia


def _materia_con_oferta(db, seed, nombre, periodo="2026-1"):
    m = Materia(nombre=nombre, carrera_id=seed["carrera"].id)
    db.add(m)
    db.flush()
    oferta = OfertaMateria(
        materia_id=m.id, profesor_id=seed["profesor"].id, periodo=periodo, activa=True
    )
    db.add(oferta)
    db.commit()
    db.refresh(m)
    db.refresh(oferta)
    return m, oferta


def _cerrar(db, alumno_id, oferta, nota, creditos, condicion=None, admin_id=1):
    cond = condicion or ("aprobada" if nota >= 6 else "reprobada")
    reg = ExpedienteMateria(
        alumno_id=alumno_id,
        oferta_materia_id=oferta.id,
        nota_final=nota,
        creditos=creditos,
        condicion=cond,
        cerrado_por=admin_id,
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


def test_ppa_sin_materias_aprobadas_es_none(seed, db):
    resultado = calcular_ppa(seed["alumno"].id, db)
    assert resultado == {"ppa": None, "creditos_computados": 0}


def test_ppa_una_materia_aprobada(seed, db):
    _, oferta = _materia_con_oferta(db, seed, "PPA Uno")
    _cerrar(db, seed["alumno"].id, oferta, nota=8.0, creditos=4)
    resultado = calcular_ppa(seed["alumno"].id, db)
    assert resultado == {"ppa": 8.0, "creditos_computados": 4}


def test_ppa_pondera_por_creditos_distintos(seed, db):
    _, oferta1 = _materia_con_oferta(db, seed, "PPA Chica", periodo="2026-1")
    _, oferta2 = _materia_con_oferta(db, seed, "PPA Grande", periodo="2026-1")
    _cerrar(db, seed["alumno"].id, oferta1, nota=10.0, creditos=2)
    _cerrar(db, seed["alumno"].id, oferta2, nota=6.0, creditos=8)
    resultado = calcular_ppa(seed["alumno"].id, db)
    # (10*2 + 6*8) / 10 = 6.8 -- distinto de un promedio simple (10+6)/2=8
    assert resultado == {"ppa": 6.8, "creditos_computados": 10}


def test_ppa_recalcula_tras_rectificacion(seed, db):
    _, oferta = _materia_con_oferta(db, seed, "PPA Rectificar")
    registro = _cerrar(db, seed["alumno"].id, oferta, nota=7.0, creditos=4)
    assert calcular_ppa(seed["alumno"].id, db)["ppa"] == 7.0

    registro.nota_final = 9.0
    db.commit()
    assert calcular_ppa(seed["alumno"].id, db)["ppa"] == 9.0


def test_ppa_ignora_reprobadas(seed, db):
    _, oferta = _materia_con_oferta(db, seed, "PPA Reprobada")
    _cerrar(db, seed["alumno"].id, oferta, nota=3.0, creditos=4)
    resultado = calcular_ppa(seed["alumno"].id, db)
    assert resultado == {"ppa": None, "creditos_computados": 0}


def test_regularidad_activo_sin_condiciones_de_riesgo(seed, db):
    _, oferta = _materia_con_oferta(db, seed, "Reg Activo")
    _cerrar(db, seed["alumno"].id, oferta, nota=8.0, creditos=4)
    resultado = calcular_regularidad(seed["alumno"].id, db)
    assert resultado["estado"] == "activo"
    assert resultado["motivo"] is None


def test_regularidad_en_riesgo_por_ppa_bajo(seed, db):
    # Aprobada (nota=6.0 >= 6) pero por debajo del umbral de riesgo (7.0) --
    # "aprobado pero flojo", no requiere manipular condicion a mano.
    _, oferta = _materia_con_oferta(db, seed, "Reg PPA Bajo")
    _cerrar(db, seed["alumno"].id, oferta, nota=6.0, creditos=4)
    resultado = calcular_regularidad(seed["alumno"].id, db)
    assert resultado["estado"] == "en_riesgo"
    assert "PPA" in resultado["motivo"]


def test_regularidad_en_riesgo_por_asistencia_baja(seed, db):
    _, oferta = _materia_con_oferta(db, seed, "Reg Asistencia")
    _cerrar(db, seed["alumno"].id, oferta, nota=8.0, creditos=4)
    for i in range(10):
        db.add(
            Asistencia(
                user_id=seed["alumno"].id,
                oferta_materia_id=oferta.id,
                fecha=date(2026, 3, i + 1),
                presente=(i < 5),
            )
        )
    db.commit()
    resultado = calcular_regularidad(seed["alumno"].id, db)
    assert resultado["estado"] == "en_riesgo"
    assert "Asistencia" in resultado["motivo"]


def test_regularidad_irregular_materia_reprobada_fuera_de_plazo(seed, db):
    # NB: el fixture `seed` ya crea una oferta en periodo "2026-1" -- se sigue
    # sumando a periodos_sistema, por eso el rango se arma con margen (0..3+)
    # para que la diferencia de indices supere PLAZO_RECURSAR_PERIODOS=2 sin
    # depender de dónde caiga "2026-1" en el orden.
    reprobada, oferta_vieja = _materia_con_oferta(
        db, seed, "Reg Irregular Base", periodo="2023-1"
    )
    _cerrar(db, seed["alumno"].id, oferta_vieja, nota=3.0, creditos=4)

    _materia_con_oferta(db, seed, "Reg Irregular Media 1", periodo="2023-2")
    _materia_con_oferta(db, seed, "Reg Irregular Media 2", periodo="2024-1")
    _, oferta_reciente = _materia_con_oferta(
        db, seed, "Reg Irregular Reciente", periodo="2025-2"
    )
    db.add(
        Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=oferta_reciente.id)
    )
    db.commit()

    resultado = calcular_regularidad(seed["alumno"].id, db)
    assert resultado["estado"] == "irregular"
    assert "Reg Irregular Base" in resultado["motivo"]


def test_regularidad_no_irregular_si_reprobada_fue_recursada_y_aprobada(seed, db):
    materia, oferta_vieja = _materia_con_oferta(
        db, seed, "Reg Recursada", periodo="2024-1"
    )
    _cerrar(db, seed["alumno"].id, oferta_vieja, nota=3.0, creditos=4)

    oferta_nueva = OfertaMateria(
        materia_id=materia.id,
        profesor_id=seed["profesor"].id,
        periodo="2025-2",
        activa=True,
    )
    db.add(oferta_nueva)
    db.commit()
    db.refresh(oferta_nueva)
    _cerrar(db, seed["alumno"].id, oferta_nueva, nota=8.0, creditos=4)
    db.add(Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=oferta_nueva.id))
    db.commit()

    resultado = calcular_regularidad(seed["alumno"].id, db)
    assert resultado["estado"] != "irregular"


def test_regularidad_de_baja_sin_inscripciones_recientes(seed, db):
    _, oferta1 = _materia_con_oferta(db, seed, "Baja P1", periodo="2024-1")
    _materia_con_oferta(db, seed, "Baja P2", periodo="2024-2")
    _materia_con_oferta(db, seed, "Baja P3", periodo="2025-1")
    _materia_con_oferta(db, seed, "Baja P4", periodo="2025-2")

    db.add(Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=oferta1.id))
    db.commit()

    resultado = calcular_regularidad(seed["alumno"].id, db)
    assert resultado["estado"] == "de_baja"
