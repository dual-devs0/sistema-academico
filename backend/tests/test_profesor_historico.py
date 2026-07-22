from app.models.puntaje import Puntaje
from app.models.oferta_materia import OfertaMateria


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_historico_vacio_sin_ofertas(client, seed, tokens, db):
    """Un profesor sin ofertas propias recibe lista vacia, no 404."""
    from app.models.users import User
    from app.security import hash_password

    otro_profesor = User(
        username="prof_sin_historico",
        hashed_password=hash_password("p"),
        role="profesor",
        nombre="Sin Historico",
    )
    db.add(otro_profesor)
    db.commit()
    db.refresh(otro_profesor)

    from app.auth import create_access_token

    token = create_access_token(
        {"sub": otro_profesor.username, "role": "profesor", "user_id": otro_profesor.id}
    )

    res = client.get("/profesor/mi-historico", headers=auth(token))
    assert res.status_code == 200
    assert res.json() == []


def test_historico_agrupa_por_periodo(client, seed, tokens, db):
    oferta2 = OfertaMateria(
        materia_id=seed["materia"].id,
        profesor_id=seed["profesor"].id,
        periodo="2025-2",
        activa=False,
    )
    db.add(oferta2)
    db.commit()
    db.refresh(oferta2)

    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=seed["oferta"].id,
            tipo="parcial1",
            valor=8.0,
        )
    )
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta2.id,
            tipo="parcial1",
            valor=5.0,
        )
    )
    db.commit()

    res = client.get("/profesor/mi-historico", headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    data = res.json()
    periodos = [p["periodo"] for p in data]
    assert "2026-1" in periodos
    assert "2025-2" in periodos
    assert periodos.index("2026-1") < periodos.index("2025-2")

    cat_2025 = next(p for p in data if p["periodo"] == "2025-2")["catedras"][0]
    assert cat_2025["promedio_grupo"] == 5.0
    assert cat_2025["porcentaje_aprobacion"] == 0.0


def test_historico_requiere_rol_profesor(client, seed, tokens):
    res = client.get("/profesor/mi-historico", headers=auth(tokens["alumno"]))
    assert res.status_code == 403
