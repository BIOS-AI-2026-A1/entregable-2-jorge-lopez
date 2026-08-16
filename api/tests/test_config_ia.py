"""Configuración de proveedor de IA: solo Administrador, claves cifradas y nunca expuestas."""

from __future__ import annotations

from app.cifrado import descifrar
from app.models import ConfigIA
from app.servicios_ia import CONFIG_IA_ID


def test_administrador_ve_anthropic_por_defecto(client, auth):
    r = client.get("/api/admin/config-ia", headers=auth)
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["proveedorActivo"] == "anthropic"
    # Sin claves configuradas todavía; ninguna clave viaja en la respuesta.
    por_id = {p["id"]: p["configurada"] for p in cuerpo["proveedores"]}
    assert por_id == {"anthropic": False, "google": False, "deepseek": False}


def test_deepseek_es_proveedor_admitido(client, auth):
    """DeepSeek aparece entre los proveedores seleccionables y se acepta como activo."""
    r = client.get("/api/admin/config-ia", headers=auth)
    ids = {p["id"] for p in r.json()["proveedores"]}
    assert "deepseek" in ids

    guardado = client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "deepseek", "clave": "sk-deepseek-de-prueba"},
        headers=auth,
    )
    assert guardado.status_code == 200
    assert "sk-deepseek-de-prueba" not in guardado.text  # la clave nunca se serializa
    cuerpo = guardado.json()
    assert cuerpo["proveedorActivo"] == "deepseek"
    por_id = {p["id"]: p["configurada"] for p in cuerpo["proveedores"]}
    assert por_id["deepseek"] is True


def test_pista_expone_solo_ultimos_caracteres(client, auth):
    """La respuesta trae una pista (últimos caracteres) pero nunca la clave completa."""
    client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "deepseek", "clave": "sk-deepseek-1234ABCD"},
        headers=auth,
    )
    cuerpo = client.get("/api/admin/config-ia", headers=auth).json()
    por_id = {p["id"]: p for p in cuerpo["proveedores"]}
    assert por_id["deepseek"]["pista"] == "ABCD"  # solo los últimos 4
    assert "sk-deepseek-1234ABCD" not in str(cuerpo)  # nunca la clave completa


def test_pista_none_si_clave_demasiado_corta(client, auth):
    """Con una clave demasiado corta no se da pista: revelaría casi toda la clave."""
    client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-123"},  # < 8 caracteres
        headers=auth,
    )
    cuerpo = client.get("/api/admin/config-ia", headers=auth).json()
    por_id = {p["id"]: p for p in cuerpo["proveedores"]}
    assert por_id["anthropic"]["configurada"] is True
    assert por_id["anthropic"]["pista"] is None


def test_administrador_guarda_clave_y_no_vuelve_en_claro(client, auth):
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


def test_editor_no_accede(client, editor_auth):
    assert client.get("/api/admin/config-ia", headers=editor_auth).status_code == 403
    r = client.put(
        "/api/admin/config-ia", json={"proveedorActivo": "anthropic"}, headers=editor_auth
    )
    assert r.status_code == 403


def test_anonimo_no_accede(client):
    assert client.get("/api/admin/config-ia").status_code == 401
    assert client.put("/api/admin/config-ia", json={"proveedorActivo": "anthropic"}).status_code == 401
