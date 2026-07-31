"""API pública de contenido."""

from __future__ import annotations


def test_contenido_idioma_admitido(client):
    r = client.get("/api/es/contenido")
    assert r.status_code == 200
    cuerpo = r.json()
    assert set(cuerpo) == {"categorias", "articulos", "conversacion", "preguntasSinResolver", "metricas"}
    assert cuerpo["categorias"][0]["id"] == "cuenta"


def test_contenido_idioma_no_admitido(client):
    r = client.get("/api/fr/contenido")
    assert r.status_code == 404


def test_articulo_creado_aparece_en_contenido(client, auth):
    from tests.conftest import articulo_valido

    assert client.post("/api/admin/articulos", json=articulo_valido(), headers=auth).status_code == 201

    r = client.get("/api/es/contenido")
    ids = [a["id"] for a in r.json()["articulos"]]
    assert "nuevo-articulo" in ids
