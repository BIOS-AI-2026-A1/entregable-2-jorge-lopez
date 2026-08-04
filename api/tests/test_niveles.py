"""Niveles de acceso: identidad, herencia de permisos y rechazo por nivel."""

from __future__ import annotations

from tests.conftest import ADMIN_EMAIL, STANDARD_EMAIL, articulo_valido


def test_me_identifica_al_root(client, auth):
    r = client.get("/api/auth/me", headers=auth)
    assert r.status_code == 200
    assert r.json() == {"email": ADMIN_EMAIL, "nivel": 3}


def test_me_identifica_al_standard(client, standard_auth):
    r = client.get("/api/auth/me", headers=standard_auth)
    assert r.status_code == 200
    assert r.json()["nivel"] == 2


def test_me_sin_sesion_rechazado(client):
    assert client.get("/api/auth/me").status_code == 401


def test_standard_usa_las_funciones_de_producto(client, standard_auth):
    # Nivel 2 hereda el CRUD de artículos y la lectura del panel.
    assert client.post("/api/admin/articulos", json=articulo_valido(), headers=standard_auth).status_code == 201
    assert client.get("/api/admin/preguntas-sin-resolver", headers=standard_auth).status_code == 200


def test_standard_no_alcanza_los_recursos_de_root(client, standard_auth):
    # Aunque pida por llamada directa, el backend lo rechaza con 403.
    assert client.get("/api/admin/usuarios", headers=standard_auth).status_code == 403
    r = client.put("/api/admin/ajustes/empresa", json={"empresa": "X"}, headers=standard_auth)
    assert r.status_code == 403


def test_anonimo_solo_alcanza_el_centro_de_ayuda(client):
    # Contenido público: sí. Cualquier recurso de administración: 401.
    assert client.get("/api/es/contenido").status_code == 200
    assert client.get("/api/admin/usuarios").status_code == 401
    assert client.get("/api/admin/articulos").status_code == 401
    assert client.put("/api/admin/ajustes/empresa", json={"empresa": "X"}).status_code == 401


def test_usuario_desactivado_pierde_el_acceso_de_inmediato(client, auth, standard_token):
    # El Standard inicia sesión (token en mano); Root lo desactiva; el token deja de servir.
    usuarios = client.get("/api/admin/usuarios", headers=auth).json()
    std = next(u for u in usuarios if u["email"] == STANDARD_EMAIL)
    assert client.post(f"/api/admin/usuarios/{std['id']}/desactivar", headers=auth).status_code == 200

    cabecera = {"Authorization": f"Bearer {standard_token}"}
    assert client.get("/api/admin/articulos", headers=cabecera).status_code == 401
    assert client.get("/api/auth/me", headers=cabecera).status_code == 401
