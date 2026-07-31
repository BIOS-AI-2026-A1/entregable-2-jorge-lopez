"""CRUD de artículos y creación desde una pregunta sin resolver."""

from __future__ import annotations

from tests.conftest import articulo_valido


def test_crear_bilingue_valido(client, auth):
    r = client.post("/api/admin/articulos", json=articulo_valido(), headers=auth)
    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["es"]["titulo"] == "Nuevo artículo"
    assert cuerpo["pt"]["titulo"] == "Novo artigo"


def test_crear_con_un_solo_idioma_rechazado(client, auth):
    payload = articulo_valido()
    del payload["pt"]
    r = client.post("/api/admin/articulos", json=payload, headers=auth)
    assert r.status_code == 422  # falta un idioma obligatorio


def test_crear_sin_sesion_rechazado(client):
    r = client.post("/api/admin/articulos", json=articulo_valido())
    assert r.status_code == 401


def test_editar_y_eliminar(client, auth):
    client.post("/api/admin/articulos", json=articulo_valido(), headers=auth)

    cambio = articulo_valido()
    del cambio["id"]
    cambio["es"]["titulo"] = "Título editado"
    r = client.put("/api/admin/articulos/nuevo-articulo", json=cambio, headers=auth)
    assert r.status_code == 200
    assert r.json()["es"]["titulo"] == "Título editado"

    assert client.delete("/api/admin/articulos/nuevo-articulo", headers=auth).status_code == 204
    assert client.get("/api/admin/articulos/nuevo-articulo", headers=auth).status_code == 404


def test_crear_articulo_desde_pregunta_marca_cubierta(client, auth):
    preguntas = client.get("/api/admin/preguntas-sin-resolver", headers=auth).json()
    pid = preguntas[0]["id"]
    assert preguntas[0]["estado"] == "nueva"

    r = client.post(
        f"/api/admin/preguntas-sin-resolver/{pid}/crear-articulo",
        json=articulo_valido("desde-pregunta"),
        headers=auth,
    )
    assert r.status_code == 201

    despues = client.get("/api/admin/preguntas-sin-resolver", headers=auth).json()
    assert despues[0]["estado"] == "cubierta"
