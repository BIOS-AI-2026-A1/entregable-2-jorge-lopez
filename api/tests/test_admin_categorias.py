"""CRUD de categorías: atomicidad bilingüe, borrado con integridad y autorización."""

from __future__ import annotations

from tests.conftest import articulo_valido, categoria_valida


# --- Alta bilingüe ----------------------------------------------------------

def test_crear_bilingue_valido(client, auth):
    r = client.post("/api/admin/categorias", json=categoria_valida(), headers=auth)
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["es"]["nombre"] == "Facturación"
    assert cuerpo["pt"]["nombre"] == "Faturação"
    assert cuerpo["orden"] == 3


def test_crear_con_un_solo_idioma_rechazado(client, auth):
    payload = categoria_valida()
    del payload["pt"]
    assert client.post("/api/admin/categorias", json=payload, headers=auth).status_code == 422


def test_crear_con_nombre_vacio_rechazado(client, auth):
    payload = categoria_valida()
    payload["es"]["nombre"] = ""
    assert client.post("/api/admin/categorias", json=payload, headers=auth).status_code == 422


def test_crear_con_id_duplicado_es_409(client, auth):
    assert client.post("/api/admin/categorias", json=categoria_valida(), headers=auth).status_code == 201
    assert client.post("/api/admin/categorias", json=categoria_valida(), headers=auth).status_code == 409


def test_id_y_slugs_se_normalizan_en_el_servidor(client, auth):
    payload = categoria_valida()
    payload["id"] = "Pagos y Facturación"
    payload["es"]["slug"] = "Facturación Mensual"
    payload["pt"]["slug"] = "Faturação Mensal"
    creado = client.post("/api/admin/categorias", json=payload, headers=auth).json()
    assert creado["id"] == "pagos-y-facturacion"
    assert creado["es"]["slug"] == "facturacion-mensual"
    assert creado["pt"]["slug"] == "faturacao-mensal"
    assert client.get("/api/admin/categorias/pagos-y-facturacion", headers=auth).status_code == 200


# --- Listado y detalle ------------------------------------------------------

def test_listar_incluye_la_sembrada_y_las_creadas(client, auth):
    client.post("/api/admin/categorias", json=categoria_valida(), headers=auth)
    ids = {c["id"] for c in client.get("/api/admin/categorias", headers=auth).json()}
    assert {"cuenta", "facturacion"} <= ids


def test_obtener_devuelve_los_dos_idiomas(client, auth):
    client.post("/api/admin/categorias", json=categoria_valida(), headers=auth)
    cuerpo = client.get("/api/admin/categorias/facturacion", headers=auth).json()
    assert cuerpo["es"]["slug"] == "facturacion"
    assert cuerpo["pt"]["slug"] == "faturacao"


def test_obtener_inexistente_es_404(client, auth):
    assert client.get("/api/admin/categorias/no-existe", headers=auth).status_code == 404


# --- Edición ----------------------------------------------------------------

def test_editar_reemplaza_las_traducciones(client, auth):
    client.post("/api/admin/categorias", json=categoria_valida(), headers=auth)
    cambio = categoria_valida()
    del cambio["id"]
    cambio["es"]["nombre"] = "Pagos"
    cambio["pt"]["nombre"] = "Pagamentos"
    r = client.put("/api/admin/categorias/facturacion", json=cambio, headers=auth)
    assert r.status_code == 200
    assert r.json()["es"]["nombre"] == "Pagos"
    assert r.json()["pt"]["nombre"] == "Pagamentos"


def test_editar_exige_los_dos_idiomas(client, auth):
    client.post("/api/admin/categorias", json=categoria_valida(), headers=auth)
    cambio = categoria_valida()
    del cambio["id"]
    del cambio["pt"]
    assert client.put("/api/admin/categorias/facturacion", json=cambio, headers=auth).status_code == 422


def test_editar_rechaza_el_id_en_el_cuerpo(client, auth):
    client.post("/api/admin/categorias", json=categoria_valida(), headers=auth)
    cambio = categoria_valida()  # conserva "id"
    assert client.put("/api/admin/categorias/facturacion", json=cambio, headers=auth).status_code == 422


def test_editar_inexistente_es_404(client, auth):
    cambio = categoria_valida()
    del cambio["id"]
    assert client.put("/api/admin/categorias/no-existe", json=cambio, headers=auth).status_code == 404


# --- Borrado con integridad referencial -------------------------------------

def test_borrar_categoria_vacia(client, auth):
    client.post("/api/admin/categorias", json=categoria_valida(), headers=auth)
    assert client.delete("/api/admin/categorias/facturacion", headers=auth).status_code == 204
    assert client.get("/api/admin/categorias/facturacion", headers=auth).status_code == 404


def test_borrar_categoria_con_articulos_es_409(client, auth):
    # `articulo_valido` referencia la categoría sembrada "cuenta".
    client.post("/api/admin/articulos", json=articulo_valido(), headers=auth)
    r = client.delete("/api/admin/categorias/cuenta", headers=auth)
    assert r.status_code == 409
    # No se borró: la categoría sigue existiendo.
    assert client.get("/api/admin/categorias/cuenta", headers=auth).status_code == 200


def test_borrar_inexistente_es_404(client, auth):
    assert client.delete("/api/admin/categorias/no-existe", headers=auth).status_code == 404


# --- Autorización -----------------------------------------------------------

def test_standard_puede_gestionar_categorias(client, standard_auth):
    assert client.post("/api/admin/categorias", json=categoria_valida(), headers=standard_auth).status_code == 201
    assert client.get("/api/admin/categorias", headers=standard_auth).status_code == 200
    assert client.delete("/api/admin/categorias/facturacion", headers=standard_auth).status_code == 204


def test_anonymous_no_alcanza_el_crud(client):
    assert client.get("/api/admin/categorias").status_code == 401
    assert client.post("/api/admin/categorias", json=categoria_valida()).status_code == 401
    assert client.put("/api/admin/categorias/cuenta", json=categoria_valida()).status_code == 401
    assert client.delete("/api/admin/categorias/cuenta").status_code == 401
