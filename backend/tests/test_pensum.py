from app.services.pensum import validar_correlatividades
from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.correlatividad import Correlatividad
from app.models.puntaje import Puntaje
from app.models.inscripcion import Inscripcion


def _crear_materia_con_oferta(db, seed, nombre, profesor_id=None):
    m = Materia(nombre=nombre, carrera_id=seed["carrera"].id)
    db.add(m)
    db.flush()
    oferta = OfertaMateria(
        materia_id=m.id, profesor_id=profesor_id or seed["profesor"].id,
        periodo="2026-1", activa=True,
    )
    db.add(oferta)
    db.commit()
    db.refresh(m)
    db.refresh(oferta)
    return m, oferta


def test_sin_prerrequisitos_es_valido(seed, db):
    materia, _ = _crear_materia_con_oferta(db, seed, "Sin Prerrequisitos")
    resultado = validar_correlatividades(seed["alumno"].id, materia.id, db)
    assert resultado == {"valido": True, "pendientes": []}


def test_prerrequisito_aprobada_sin_nota_queda_pendiente(seed, db):
    base, _ = _crear_materia_con_oferta(db, seed, "Base")
    avanzada, _ = _crear_materia_con_oferta(db, seed, "Avanzada")
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base.id, tipo="aprobada"))
    db.commit()

    resultado = validar_correlatividades(seed["alumno"].id, avanzada.id, db)
    assert resultado["valido"] is False
    assert resultado["pendientes"] == [{"materia_id": base.id, "tipo": "aprobada"}]


def test_prerrequisito_aprobada_con_nota_suficiente(seed, db):
    base, oferta_base = _crear_materia_con_oferta(db, seed, "Base2")
    avanzada, _ = _crear_materia_con_oferta(db, seed, "Avanzada2")
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base.id, tipo="aprobada"))
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=oferta_base.id, tipo="final", valor=8.0))
    db.commit()

    resultado = validar_correlatividades(seed["alumno"].id, avanzada.id, db)
    assert resultado == {"valido": True, "pendientes": []}


def test_prerrequisito_aprobada_con_nota_insuficiente(seed, db):
    base, oferta_base = _crear_materia_con_oferta(db, seed, "Base3")
    avanzada, _ = _crear_materia_con_oferta(db, seed, "Avanzada3")
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base.id, tipo="aprobada"))
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=oferta_base.id, tipo="final", valor=4.0))
    db.commit()

    resultado = validar_correlatividades(seed["alumno"].id, avanzada.id, db)
    assert resultado["valido"] is False


def test_prerrequisito_cursando_con_inscripcion(seed, db):
    base, oferta_base = _crear_materia_con_oferta(db, seed, "Base4")
    avanzada, _ = _crear_materia_con_oferta(db, seed, "Avanzada4")
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base.id, tipo="cursando"))
    db.add(Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=oferta_base.id))
    db.commit()

    resultado = validar_correlatividades(seed["alumno"].id, avanzada.id, db)
    assert resultado == {"valido": True, "pendientes": []}


def test_prerrequisito_cursando_sin_inscripcion_pendiente(seed, db):
    base, _ = _crear_materia_con_oferta(db, seed, "Base5")
    avanzada, _ = _crear_materia_con_oferta(db, seed, "Avanzada5")
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base.id, tipo="cursando"))
    db.commit()

    resultado = validar_correlatividades(seed["alumno"].id, avanzada.id, db)
    assert resultado["valido"] is False
    assert resultado["pendientes"] == [{"materia_id": base.id, "tipo": "cursando"}]


def test_multiples_prerrequisitos_acumula_todos_los_pendientes(seed, db):
    base1, _ = _crear_materia_con_oferta(db, seed, "Base6a")
    base2, _ = _crear_materia_con_oferta(db, seed, "Base6b")
    avanzada, _ = _crear_materia_con_oferta(db, seed, "Avanzada6")
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base1.id, tipo="aprobada"))
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base2.id, tipo="cursando"))
    db.commit()

    resultado = validar_correlatividades(seed["alumno"].id, avanzada.id, db)
    assert resultado["valido"] is False
    assert len(resultado["pendientes"]) == 2
    tipos = {p["tipo"] for p in resultado["pendientes"]}
    assert tipos == {"aprobada", "cursando"}


def test_alumno_sin_historial_todo_pendiente(seed, db):
    base, _ = _crear_materia_con_oferta(db, seed, "Base7")
    avanzada, _ = _crear_materia_con_oferta(db, seed, "Avanzada7")
    db.add(Correlatividad(materia_id=avanzada.id, prerrequisito_id=base.id, tipo="aprobada"))
    db.commit()

    resultado = validar_correlatividades(seed["alumno2"].id, avanzada.id, db)
    assert resultado["valido"] is False
    assert resultado["pendientes"] == [{"materia_id": base.id, "tipo": "aprobada"}]
