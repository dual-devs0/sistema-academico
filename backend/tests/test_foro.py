from datetime import datetime, timedelta, timezone

from app.models.foro import ForoHilo, ForoMensaje
from app.models.inscripcion import Inscripcion


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _crear_hilo(db, seed):
    # El alumno del seed necesita estar inscripto para poder postear en el foro
    existente = db.query(Inscripcion).filter(
        Inscripcion.alumno_id == seed["alumno"].id,
        Inscripcion.oferta_materia_id == seed["oferta"].id,
    ).first()
    if not existente:
        db.add(Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id))
        db.commit()

    hilo = ForoHilo(materia_id=seed["materia"].id, titulo="Hilo test", creado_por=seed["profesor"].id)
    db.add(hilo)
    db.commit()
    db.refresh(hilo)
    return hilo


def test_editar_mensaje_propio_dentro_de_ventana(client, seed, tokens, db):
    hilo = _crear_hilo(db, seed)
    res = client.post(f"/foro/hilos/{hilo.id}/mensajes", json={"contenido": "original"}, headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    mensaje_id = res.json()["id"]

    res = client.patch(f"/foro/mensajes/{mensaje_id}", json={"contenido": "editado"}, headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    assert res.json()["contenido"] == "editado"


def test_editar_mensaje_fuera_de_ventana_403(client, seed, tokens, db):
    hilo = _crear_hilo(db, seed)
    msg = ForoMensaje(
        hilo_id=hilo.id, user_id=seed["alumno"].id, contenido="viejo",
        created_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=20),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    res = client.patch(f"/foro/mensajes/{msg.id}", json={"contenido": "tarde"}, headers=auth(tokens["alumno"]))
    assert res.status_code == 403


def test_editar_mensaje_de_otro_usuario_403(client, seed, tokens, db):
    hilo = _crear_hilo(db, seed)
    res = client.post(f"/foro/hilos/{hilo.id}/mensajes", json={"contenido": "de alumno"}, headers=auth(tokens["alumno"]))
    mensaje_id = res.json()["id"]

    res = client.patch(f"/foro/mensajes/{mensaje_id}", json={"contenido": "hackeado"}, headers=auth(tokens["alumno2"]))
    assert res.status_code == 403


def test_fijar_hilo_profesor_no_titular_403(client, seed, tokens, db):
    from app.models.materia import Materia
    from app.models.oferta_materia import OfertaMateria

    otra_materia = Materia(nombre="Otra Materia Foro", carrera_id=seed["carrera"].id)
    db.add(otra_materia)
    db.flush()
    otra_oferta = OfertaMateria(materia_id=otra_materia.id, profesor_id=seed["alumno"].id, periodo="2026-1", activa=True)
    db.add(otra_oferta)
    db.commit()

    hilo = ForoHilo(materia_id=otra_materia.id, titulo="Hilo de otra materia", creado_por=seed["admin"].id)
    db.add(hilo)
    db.commit()
    db.refresh(hilo)

    res = client.put(f"/foro/hilos/{hilo.id}", json={"fijado": True}, headers=auth(tokens["profesor"]))
    assert res.status_code == 403


def test_fijar_hilo_profesor_titular_ok(client, seed, tokens, db):
    hilo = _crear_hilo(db, seed)
    res = client.put(f"/foro/hilos/{hilo.id}", json={"fijado": True}, headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    assert res.json()["fijado"] is True


def test_paginacion_mensajes(client, seed, tokens, db):
    hilo = _crear_hilo(db, seed)
    for i in range(5):
        db.add(ForoMensaje(hilo_id=hilo.id, user_id=seed["alumno"].id, contenido=f"msg {i}"))
    db.commit()

    res = client.get(f"/foro/hilos/{hilo.id}/mensajes?skip=0&limit=2", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2
