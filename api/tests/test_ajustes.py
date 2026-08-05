"""Campo [Empresa]: editable por Root, legible en el contenido público."""

from __future__ import annotations


def test_root_edita_empresa_y_se_refleja_en_el_publico(client, auth):
    r = client.put("/api/admin/ajustes/empresa", json={"empresa": "Nueva Marca"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["empresa"] == "Nueva Marca"

    assert client.get("/api/es/contenido").json()["empresa"] == "Nueva Marca"
    assert client.get("/api/pt/contenido").json()["empresa"] == "Nueva Marca"


def test_empresa_vacia_da_422(client, auth):
    assert client.put("/api/admin/ajustes/empresa", json={"empresa": ""}, headers=auth).status_code == 422


def test_standard_no_edita_empresa(client, standard_auth):
    r = client.put("/api/admin/ajustes/empresa", json={"empresa": "X"}, headers=standard_auth)
    assert r.status_code == 403


def test_anonimo_no_edita_empresa(client):
    assert client.put("/api/admin/ajustes/empresa", json={"empresa": "X"}).status_code == 401
