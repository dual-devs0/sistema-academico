from datetime import date, datetime, time, timedelta

from app.models.horario import Horario
from app.models.evento_calendario import EventoCalendario


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_agenda_vacia_sin_eventos(client, seed, tokens):
    desde = date.today().isoformat()
    hasta = (date.today() + timedelta(days=7)).isoformat()
    res = client.get(f"/profesor/mi-agenda?desde={desde}&hasta={hasta}", headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []


def test_agenda_incluye_clase_fija(client, seed, tokens, db):
    hoy = date.today()
    h = Horario(materia_id=seed["materia"].id, dia_semana=hoy.weekday(), hora_inicio=time(8, 0), hora_fin=time(10, 0))
    db.add(h)
    db.commit()

    res = client.get(f"/profesor/mi-agenda?desde={hoy.isoformat()}&hasta={hoy.isoformat()}", headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    items = res.json()["items"]
    assert any(i["tipo"] == "clase" and i["materia_id"] == seed["materia"].id for i in items)


def test_agenda_incluye_evento_institucional(client, seed, tokens, db):
    hoy = date.today()
    ev = EventoCalendario(titulo="Feriado", tipo="feriado", fecha=hoy, materia_id=None)
    db.add(ev)
    db.commit()

    res = client.get(f"/profesor/mi-agenda?desde={hoy.isoformat()}&hasta={hoy.isoformat()}", headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    items = res.json()["items"]
    assert any(i["tipo"] == "evento" and i["titulo"] == "Feriado" for i in items)


def test_agenda_requiere_rol_profesor(client, seed, tokens):
    hoy = date.today().isoformat()
    res = client.get(f"/profesor/mi-agenda?desde={hoy}&hasta={hoy}", headers=auth(tokens["admin"]))
    assert res.status_code == 403


def test_crear_editar_eliminar_recordatorio(client, seed, tokens):
    payload = {"titulo": "Corregir parciales", "fecha": datetime.now().isoformat()}
    res = client.post("/profesor/recordatorios", json=payload, headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    rec_id = res.json()["id"]
    assert res.json()["completado"] is False

    res = client.patch(f"/profesor/recordatorios/{rec_id}", json={"completado": True}, headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    assert res.json()["completado"] is True

    res = client.delete(f"/profesor/recordatorios/{rec_id}", headers=auth(tokens["profesor"]))
    assert res.status_code == 200


def test_recordatorio_de_otro_profesor_403(client, seed, tokens, db):
    from app.models.users import User
    from app.security import hash_password
    from app.auth import create_access_token

    otro = User(username="otro_prof_agenda", hashed_password=hash_password("p"), role="profesor", nombre="Otro")
    db.add(otro)
    db.commit()
    db.refresh(otro)
    token_otro = create_access_token({"sub": otro.username, "role": "profesor", "user_id": otro.id})

    res = client.post("/profesor/recordatorios", json={"titulo": "Propio", "fecha": datetime.now().isoformat()}, headers=auth(token_otro))
    rec_id = res.json()["id"]

    res = client.patch(f"/profesor/recordatorios/{rec_id}", json={"completado": True}, headers=auth(tokens["profesor"]))
    assert res.status_code == 403
