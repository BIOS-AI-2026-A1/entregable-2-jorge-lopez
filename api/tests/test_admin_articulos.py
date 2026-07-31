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


# --- Listado y detalle ------------------------------------------------------

def test_listar_vacio_al_principio(client, auth):
    r = client.get("/api/admin/articulos", headers=auth)
    assert r.status_code == 200
    assert r.json() == []


def test_listar_incluye_los_creados(client, auth):
    client.post("/api/admin/articulos", json=articulo_valido("uno"), headers=auth)
    client.post("/api/admin/articulos", json=articulo_valido("dos"), headers=auth)

    # Todos comparten `orden` por defecto: se compara el conjunto, no la secuencia.
    ids = {a["id"] for a in client.get("/api/admin/articulos", headers=auth).json()}
    assert ids == {"uno", "dos"}


def test_obtener_devuelve_los_dos_idiomas_con_su_slug(client, auth):
    client.post("/api/admin/articulos", json=articulo_valido(), headers=auth)

    cuerpo = client.get("/api/admin/articulos/nuevo-articulo", headers=auth).json()
    assert cuerpo["es"]["slug"] == "nuevo-articulo"
    assert cuerpo["pt"]["slug"] == "novo-artigo"
    assert cuerpo["es"]["titulo"] == "Nuevo artículo"
    assert cuerpo["pt"]["titulo"] == "Novo artigo"


def test_obtener_inexistente_es_404(client, auth):
    assert client.get("/api/admin/articulos/no-existe", headers=auth).status_code == 404


def test_listar_y_obtener_sin_sesion_rechazados(client):
    assert client.get("/api/admin/articulos").status_code == 401
    assert client.get("/api/admin/articulos/nuevo-articulo").status_code == 401


# --- Validación de la escritura ---------------------------------------------

def test_crear_con_id_duplicado_es_409(client, auth):
    assert client.post("/api/admin/articulos", json=articulo_valido(), headers=auth).status_code == 201
    assert client.post("/api/admin/articulos", json=articulo_valido(), headers=auth).status_code == 409


def test_crear_con_minutos_negativos_rechazado(client, auth):
    payload = articulo_valido()
    payload["minutosLectura"] = -1
    assert client.post("/api/admin/articulos", json=payload, headers=auth).status_code == 422


def test_crear_con_titulo_vacio_rechazado(client, auth):
    payload = articulo_valido()
    payload["es"]["titulo"] = ""
    assert client.post("/api/admin/articulos", json=payload, headers=auth).status_code == 422


def test_editar_exige_los_dos_idiomas(client, auth):
    client.post("/api/admin/articulos", json=articulo_valido(), headers=auth)

    cambio = articulo_valido()
    del cambio["id"]
    del cambio["pt"]
    assert client.put("/api/admin/articulos/nuevo-articulo", json=cambio, headers=auth).status_code == 422


def test_editar_rechaza_el_id_en_el_cuerpo(client, auth):
    client.post("/api/admin/articulos", json=articulo_valido(), headers=auth)

    # El id va en la dirección; el esquema de actualización prohíbe campos extra.
    cambio = articulo_valido()  # conserva "id"
    assert client.put("/api/admin/articulos/nuevo-articulo", json=cambio, headers=auth).status_code == 422


def test_editar_inexistente_es_404(client, auth):
    cambio = articulo_valido()
    del cambio["id"]
    assert client.put("/api/admin/articulos/no-existe", json=cambio, headers=auth).status_code == 404


def test_eliminar_inexistente_es_404(client, auth):
    assert client.delete("/api/admin/articulos/no-existe", headers=auth).status_code == 404


def test_editar_y_eliminar_sin_sesion_rechazados(client):
    cambio = articulo_valido()
    del cambio["id"]
    assert client.put("/api/admin/articulos/nuevo-articulo", json=cambio).status_code == 401
    assert client.delete("/api/admin/articulos/nuevo-articulo").status_code == 401


# --- Campos que deben sobrevivir al viaje -----------------------------------

def test_los_relacionados_conservan_su_orden(client, auth):
    payload = articulo_valido()
    payload["relacionados"] = ["zeta", "alfa", "mu"]

    creado = client.post("/api/admin/articulos", json=payload, headers=auth).json()
    assert creado["relacionados"] == ["zeta", "alfa", "mu"]

    # Y sigue igual al releerlo, no solo en la respuesta de creación.
    leido = client.get("/api/admin/articulos/nuevo-articulo", headers=auth).json()
    assert leido["relacionados"] == ["zeta", "alfa", "mu"]


def test_la_nota_opcional_viaja_como_nula(client, auth):
    creado = client.post("/api/admin/articulos", json=articulo_valido(), headers=auth).json()
    assert creado["es"]["nota"] is None


def test_la_nota_con_texto_se_conserva(client, auth):
    payload = articulo_valido()
    payload["es"]["nota"] = "Ojo con esto."
    payload["pt"]["nota"] = "Atenção a isto."

    client.post("/api/admin/articulos", json=payload, headers=auth)

    leido = client.get("/api/admin/articulos/nuevo-articulo", headers=auth).json()
    assert leido["es"]["nota"] == "Ojo con esto."
    assert leido["pt"]["nota"] == "Atenção a isto."


def test_el_bloque_de_pasos_y_las_faq_sobreviven(client, auth):
    leido_tras_crear = client.post("/api/admin/articulos", json=articulo_valido(), headers=auth).json()

    assert leido_tras_crear["es"]["howTo"] == {
        "titulo": "Pasos",
        "pasos": [{"titulo": "Paso 1", "descripcion": "Hazlo."}],
    }
    assert leido_tras_crear["es"]["faq"] == [{"pregunta": "¿Y?", "respuesta": "Pues eso."}]


def test_editar_reemplaza_las_traducciones_sin_duplicarlas(client, auth):
    client.post("/api/admin/articulos", json=articulo_valido(), headers=auth)

    cambio = articulo_valido()
    del cambio["id"]
    cambio["es"]["titulo"] = "Otro título"
    cambio["pt"]["titulo"] = "Outro título"
    client.put("/api/admin/articulos/nuevo-articulo", json=cambio, headers=auth)

    leido = client.get("/api/admin/articulos/nuevo-articulo", headers=auth).json()
    assert leido["es"]["titulo"] == "Otro título"
    assert leido["pt"]["titulo"] == "Outro título"
