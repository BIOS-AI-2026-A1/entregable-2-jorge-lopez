"""Configuración de proveedor de IA: solo SuperAdmin, claves cifradas y nunca expuestas.

Es config **global de la plataforma** (una sola fila, sin `portal_id`): vale para todos los
portales, así que la gestiona el SuperAdmin transversal, no el Administrador de un portal. Los
tests positivos entran por el host de plataforma (`superadmin_client`); el guard cross-tenant es
`test_administrador_de_portal_no_accede`: un Administrador (Nivel 3) no puede leerla ni pisarla.
"""

from __future__ import annotations

from app.cifrado import descifrar
from app.models import ConfigIA
from app.servicios_ia import CONFIG_IA_ID


def test_superadmin_ve_anthropic_por_defecto(superadmin_client, superadmin_auth):
    r = superadmin_client.get("/api/admin/config-ia", headers=superadmin_auth)
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["proveedorActivo"] == "anthropic"
    # Sin claves configuradas todavía; ninguna clave viaja en la respuesta.
    por_id = {p["id"]: p["configurada"] for p in cuerpo["proveedores"]}
    assert por_id == {"anthropic": False, "google": False, "deepseek": False}


def test_deepseek_es_proveedor_admitido(superadmin_client, superadmin_auth):
    """DeepSeek aparece entre los proveedores seleccionables y se acepta como activo."""
    r = superadmin_client.get("/api/admin/config-ia", headers=superadmin_auth)
    ids = {p["id"] for p in r.json()["proveedores"]}
    assert "deepseek" in ids

    guardado = superadmin_client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "deepseek", "clave": "sk-deepseek-de-prueba"},
        headers=superadmin_auth,
    )
    assert guardado.status_code == 200
    assert "sk-deepseek-de-prueba" not in guardado.text  # la clave nunca se serializa
    cuerpo = guardado.json()
    assert cuerpo["proveedorActivo"] == "deepseek"
    por_id = {p["id"]: p["configurada"] for p in cuerpo["proveedores"]}
    assert por_id["deepseek"] is True


def test_pista_expone_solo_ultimos_caracteres(superadmin_client, superadmin_auth):
    """La respuesta trae una pista (últimos caracteres) pero nunca la clave completa."""
    superadmin_client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "deepseek", "clave": "sk-deepseek-1234ABCD"},
        headers=superadmin_auth,
    )
    cuerpo = superadmin_client.get("/api/admin/config-ia", headers=superadmin_auth).json()
    por_id = {p["id"]: p for p in cuerpo["proveedores"]}
    assert por_id["deepseek"]["pista"] == "ABCD"  # solo los últimos 4
    assert "sk-deepseek-1234ABCD" not in str(cuerpo)  # nunca la clave completa


def test_pista_none_si_clave_demasiado_corta(superadmin_client, superadmin_auth):
    """Con una clave demasiado corta no se da pista: revelaría casi toda la clave."""
    superadmin_client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-123"},  # < 8 caracteres
        headers=superadmin_auth,
    )
    cuerpo = superadmin_client.get("/api/admin/config-ia", headers=superadmin_auth).json()
    por_id = {p["id"]: p for p in cuerpo["proveedores"]}
    assert por_id["anthropic"]["configurada"] is True
    assert por_id["anthropic"]["pista"] is None


def test_superadmin_guarda_clave_y_no_vuelve_en_claro(superadmin_client, superadmin_auth):
    r = superadmin_client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-secreta-de-prueba"},
        headers=superadmin_auth,
    )
    assert r.status_code == 200
    assert "sk-secreta-de-prueba" not in r.text  # la clave nunca se serializa
    por_id = {p["id"]: p["configurada"] for p in r.json()["proveedores"]}
    assert por_id["anthropic"] is True

    # Y al releer, sigue sin exponerse la clave.
    leido = superadmin_client.get("/api/admin/config-ia", headers=superadmin_auth).json()
    assert "sk-secreta-de-prueba" not in str(leido)


def test_clave_se_guarda_cifrada_en_reposo(superadmin_client, superadmin_auth, db_session):
    superadmin_client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-otra-clave"},
        headers=superadmin_auth,
    )
    fila = db_session.get(ConfigIA, CONFIG_IA_ID)
    guardada = fila.claves["anthropic"]
    assert guardada != "sk-otra-clave"  # no está en texto plano
    assert descifrar(guardada) == "sk-otra-clave"  # pero se puede recuperar


def test_clave_vacia_significa_no_cambiar(superadmin_client, superadmin_auth):
    superadmin_client.put(
        "/api/admin/config-ia",
        json={"proveedorActivo": "anthropic", "clave": "sk-persistente"},
        headers=superadmin_auth,
    )
    # Cambia solo el proveedor activo, sin reescribir la clave.
    r = superadmin_client.put(
        "/api/admin/config-ia", json={"proveedorActivo": "google"}, headers=superadmin_auth
    )
    assert r.status_code == 200
    por_id = {p["id"]: p["configurada"] for p in r.json()["proveedores"]}
    assert por_id["anthropic"] is True  # la clave de anthropic sigue ahí
    assert r.json()["proveedorActivo"] == "google"


def test_proveedor_no_admitido_es_422(superadmin_client, superadmin_auth):
    r = superadmin_client.put(
        "/api/admin/config-ia", json={"proveedorActivo": "openai"}, headers=superadmin_auth
    )
    assert r.status_code == 422


def test_administrador_de_portal_no_accede(client, auth):
    """El núcleo del aislamiento: la config de IA es global de plataforma, así que el
    Administrador de un portal (Nivel 3) NO puede leerla ni escribirla. Si pudiera, el
    admin de un tenant pisaría la clave/proveedor que usan todos los demás portales."""
    assert client.get("/api/admin/config-ia", headers=auth).status_code == 403
    r = client.put("/api/admin/config-ia", json={"proveedorActivo": "anthropic"}, headers=auth)
    assert r.status_code == 403


def test_editor_no_accede(client, editor_auth):
    assert client.get("/api/admin/config-ia", headers=editor_auth).status_code == 403
    r = client.put(
        "/api/admin/config-ia", json={"proveedorActivo": "anthropic"}, headers=editor_auth
    )
    assert r.status_code == 403


def test_anonimo_no_accede(client):
    assert client.get("/api/admin/config-ia").status_code == 401
    assert client.put("/api/admin/config-ia", json={"proveedorActivo": "anthropic"}).status_code == 401
