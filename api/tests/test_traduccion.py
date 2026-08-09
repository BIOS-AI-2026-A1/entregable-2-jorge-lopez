"""Traducción asistida por IA: borrador sin persistir, con proveedor sustituido."""

from __future__ import annotations

import pytest

from app.main import app
from app.servicios_ia import ProveedorNoConfigurado, obtener_traductor


class ProveedorFalso:
    """Doble de proveedor: no llama a la red. Devuelve un contenido «traducido»
    reconocible y registra la dirección con la que se le llamó."""

    def __init__(self) -> None:
        self.llamado_con: tuple[str, str] | None = None

    def traducir(self, origen: str, destino: str, contenido: dict) -> dict:
        self.llamado_con = (origen, destino)
        return {
            "slug": "no-deberia-usarse",  # el servicio conserva el slug de origen
            "titulo": f"[{destino}] {contenido['titulo']}",
            "parrafos": [f"[{destino}] {p}" for p in contenido["parrafos"]],
            "howTo": contenido["howTo"],
            "nota": contenido["nota"],
            "faq": contenido["faq"],
        }


CONTENIDO_ES = {
    "slug": "como-cambiar-contrasena",
    "titulo": "Cómo cambiar la contraseña",
    "parrafos": ["Primer párrafo.", "Segundo párrafo."],
    "howTo": {"titulo": "Pasos", "pasos": [{"titulo": "Paso 1", "descripcion": "Hazlo."}]},
    "nota": None,
    "faq": [{"pregunta": "¿Y?", "respuesta": "Pues eso."}],
}


@pytest.fixture
def proveedor_falso():
    """Sustituye la dependencia del traductor por el doble mientras dure el test."""
    falso = ProveedorFalso()
    app.dependency_overrides[obtener_traductor] = lambda: falso
    yield falso
    app.dependency_overrides.pop(obtener_traductor, None)


def test_traduce_es_a_pt_como_borrador(client, auth, proveedor_falso):
    r = client.post(
        "/api/admin/articulos/traducir",
        json={"origen": "es", "contenido": CONTENIDO_ES},
        headers=auth,
    )
    assert r.status_code == 200
    cuerpo = r.json()
    assert proveedor_falso.llamado_con == ("es", "pt")
    assert cuerpo["titulo"] == "[pt] Cómo cambiar la contraseña"
    # El slug no se traduce: se conserva el del contenido de origen.
    assert cuerpo["slug"] == "como-cambiar-contrasena"


def test_traduce_pt_a_es(client, auth, proveedor_falso):
    contenido_pt = {**CONTENIDO_ES, "slug": "alterar-senha", "titulo": "Alterar a senha"}
    r = client.post(
        "/api/admin/articulos/traducir",
        json={"origen": "pt", "contenido": contenido_pt},
        headers=auth,
    )
    assert r.status_code == 200
    assert proveedor_falso.llamado_con == ("pt", "es")
    assert r.json()["titulo"] == "[es] Alterar a senha"


def test_standard_puede_traducir(client, standard_auth, proveedor_falso):
    r = client.post(
        "/api/admin/articulos/traducir",
        json={"origen": "es", "contenido": CONTENIDO_ES},
        headers=standard_auth,
    )
    assert r.status_code == 200


def test_anonimo_no_puede_traducir(client):
    r = client.post(
        "/api/admin/articulos/traducir",
        json={"origen": "es", "contenido": CONTENIDO_ES},
    )
    assert r.status_code == 401


def test_sin_proveedor_configurado_da_409(client, auth):
    """Sin fila de ConfigIA ni clave, el traductor real corta con 409 (Root debe
    configurar). No se sustituye la dependencia: se ejerce la resolución real."""
    def traductor_sin_config():
        raise ProveedorNoConfigurado("anthropic")

    app.dependency_overrides[obtener_traductor] = traductor_sin_config
    try:
        r = client.post(
            "/api/admin/articulos/traducir",
            json={"origen": "es", "contenido": CONTENIDO_ES},
            headers=auth,
        )
        assert r.status_code == 409
    finally:
        app.dependency_overrides.pop(obtener_traductor, None)
