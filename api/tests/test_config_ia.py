"""Configuración de proveedor de IA: solo Root, claves cifradas y nunca expuestas."""

from __future__ import annotations

from app.cifrado import descifrar
from app.models import ConfigIA
from app.servicios_ia import CONFIG_IA_ID


def test_root_ve_anthropic_por_defecto(client, auth):
    r = client.get("/api/admin/config-ia", headers=auth)
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["proveedorActivo"] == "anthropic"
    # Sin claves configuradas todavía; ninguna clave viaja en la respuesta.
    por_id = {p["id"]: p["configurada"] for p in cuerpo["proveedores"]}
    assert por_id == {"anthropic": False, "google": False}


def test_root_guarda_clave_y_no_vuelve_en_claro(client, auth):
    r = client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-secreta-de-prueba"},
        headers=auth,
    )
    assert r.status_code == 200
    assert "sk-secreta-de-prueba" not in r.text  # la clave nunca se serializa
    por_id = {p["id"]: p["configurada"] for p in r.json()["proveedores"]}
    assert por_id["anthropic"] is True

    # Y al releer, sigue sin exponerse la clave.
    leido = client.get("/api/admin/config-ia", headers=auth).json()
    assert "sk-secreta-de-prueba" not in str(leido)


def test_clave_se_guarda_cifrada_en_reposo(client, auth, db_session):
    client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-otra-clave"},
        headers=auth,
    )
    fila = db_session.get(ConfigIA, CONFIG_IA_ID)
    guardada = fila.claves["anthropic"]
    assert guardada != "sk-otra-clave"  # no está en texto plano
    assert descifrar(guardada) == "sk-otra-clave"  # pero se puede recuperar


def test_clave_vacia_significa_no_cambiar(client, auth):
    client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-persistente"},
        headers=auth,
    )
    # Cambia solo el proveedor activo, sin reescribir la clave.
    r = client.put("/api/admin/config-ia", json={"proveedorActivo": "google"}, headers=auth)
    assert r.status_code == 200
    por_id = {p["id"]: p["configurada"] for p in r.json()["proveedores"]}
    assert por_id["anthropic"] is True  # la clave de anthropic sigue ahí
    assert r.json()["proveedorActivo"] == "google"


def test_proveedor_no_admitido_es_422(client, auth):
    r = client.put("/api/admin/config-ia", json={"proveedorActivo": "openai"}, headers=auth)
    assert r.status_code == 422


def test_standard_no_accede(client, standard_auth):
    assert client.get("/api/admin/config-ia", headers=standard_auth).status_code == 403
    r = client.put(
        "/api/admin/config-ia", json={"proveedorActivo": "anthropic"}, headers=standard_auth
    )
    assert r.status_code == 403


def test_anonimo_no_accede(client):
    assert client.get("/api/admin/config-ia").status_code == 401
    assert client.put("/api/admin/config-ia", json={"proveedorActivo": "anthropic"}).status_code == 401
