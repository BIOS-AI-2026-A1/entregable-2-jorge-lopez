"""Servicio de IA: traducción de artículos con el proveedor configurado.

La traducción vive en el backend (no en el navegador) por tres razones: las claves
de API nunca tocan el cliente, el proveedor se resuelve en un único lugar y se
comparte con el RAG futuro. El proveedor se abstrae tras `ProveedorTraduccion` para
que añadir otro (o el RAG) no toque los routers; hoy hay una implementación
Anthropic (Claude), el proveedor por defecto.

`obtener_traductor` es una dependencia de FastAPI: en producción resuelve el
proveedor desde `ConfigIA`; en los tests se sustituye con un doble para no llamar a
la red ni exigir una clave real.
"""

from __future__ import annotations

import json
from typing import Protocol

from fastapi import Depends
from sqlalchemy.orm import Session

from app.cifrado import CifradoNoConfigurado, descifrar
from app.database import get_db
from app.models import ConfigIA
from app.schemas import TraduccionArticuloIn

# Proveedor efectivo por defecto si aún no hay fila de configuración.
PROVEEDOR_POR_DEFECTO = "anthropic"
CONFIG_IA_ID = 1

# Nombres de idioma para redactar el prompt.
_NOMBRE_IDIOMA = {"es": "español", "pt": "portugués"}

# Modelo de Claude por defecto para traducir (ver skill claude-api antes de subirlo).
MODELO_ANTHROPIC = "claude-sonnet-5"


class ErrorTraduccion(RuntimeError):
    """Base de los errores de traducción, para que el router los mapee a HTTP."""


class ProveedorNoConfigurado(ErrorTraduccion):
    """No hay clave (o cifrado) para el proveedor activo: Root debe configurarlo."""


class ErrorProveedor(ErrorTraduccion):
    """El proveedor respondió con error, límite o una salida no interpretable."""


def _otro_idioma(idioma: str) -> str:
    return "pt" if idioma == "es" else "es"


def _prompt(origen: str, destino: str, contenido: dict) -> str:
    """Instrucción de traducción que preserva la estructura y pide JSON de vuelta."""
    return (
        f"Traduce el contenido de un artículo de centro de ayuda del "
        f"{_NOMBRE_IDIOMA[origen]} al {_NOMBRE_IDIOMA[destino]}.\n"
        "Reglas:\n"
        "- Conserva EXACTAMENTE la misma estructura JSON: las mismas claves y el mismo "
        "número de elementos en las listas (parrafos, howTo.pasos, faq).\n"
        "- Traduce solo los valores de texto; no traduzcas ni cambies el campo `slug`.\n"
        "- Mantén sin traducir los nombres de marca y el literal [Empresa] si aparecen.\n"
        "- Registro formal y vocabulario de soporte, natural en el idioma destino.\n"
        "- Responde ÚNICAMENTE con el JSON traducido, sin texto adicional ni ```.\n\n"
        f"JSON de entrada:\n{json.dumps(contenido, ensure_ascii=False)}"
    )


class ProveedorTraduccion(Protocol):
    """Contrato de un proveedor de traducción."""

    def traducir(self, origen: str, destino: str, contenido: dict) -> dict: ...


class ProveedorAnthropic:
    """Traducción con Claude (Anthropic). Importa el SDK de forma perezosa para que
    el módulo se pueda importar aunque el paquete no esté instalado (p. ej. en tests
    que sustituyen el proveedor)."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def traducir(self, origen: str, destino: str, contenido: dict) -> dict:
        try:
            import anthropic
        except ImportError as exc:  # pragma: no cover - depende del entorno
            raise ErrorProveedor("El SDK de Anthropic no está instalado.") from exc

        cliente = anthropic.Anthropic(api_key=self._api_key)
        try:
            respuesta = cliente.messages.create(
                model=MODELO_ANTHROPIC,
                max_tokens=4096,
                messages=[{"role": "user", "content": _prompt(origen, destino, contenido)}],
            )
            texto = "".join(bloque.text for bloque in respuesta.content if bloque.type == "text")
        except Exception as exc:  # error de red, autenticación o límite del proveedor
            raise ErrorProveedor(str(exc)) from exc

        try:
            return json.loads(texto)
        except json.JSONDecodeError as exc:
            raise ErrorProveedor("El proveedor no devolvió un JSON válido.") from exc


def _clave_del_proveedor(config: ConfigIA | None, proveedor: str) -> str:
    if config is None:
        raise ProveedorNoConfigurado(proveedor)
    token = (config.claves or {}).get(proveedor)
    if not token:
        raise ProveedorNoConfigurado(proveedor)
    try:
        return descifrar(token)
    except CifradoNoConfigurado as exc:
        # Falta la clave de cifrado o cambió: se trata como «no configurado».
        raise ProveedorNoConfigurado(proveedor) from exc


def crear_proveedor(db: Session) -> ProveedorTraduccion:
    """Resuelve el proveedor activo desde `ConfigIA` y devuelve su implementación."""
    config = db.get(ConfigIA, CONFIG_IA_ID)
    proveedor = config.proveedor_activo if config is not None else PROVEEDOR_POR_DEFECTO
    clave = _clave_del_proveedor(config, proveedor)
    if proveedor == "anthropic":
        return ProveedorAnthropic(clave)
    # `google` u otros: aún no implementados como motor; se contempla el punto de
    # extensión (ver design.md). Hasta entonces, se trata como no disponible.
    raise ProveedorNoConfigurado(proveedor)


def obtener_traductor(db: Session = Depends(get_db)) -> ProveedorTraduccion:
    """Dependencia de FastAPI. Se sustituye en tests con `dependency_overrides`."""
    return crear_proveedor(db)


def traducir_contenido(
    traductor: ProveedorTraduccion, origen: str, contenido: TraduccionArticuloIn
) -> dict:
    """Traduce `contenido` del idioma `origen` al otro. Preserva el slug de origen
    (la traducción no debe inventar un slug: cada idioma tiene el suyo)."""
    destino = _otro_idioma(origen)
    entrada = contenido.model_dump()
    traducido = traductor.traducir(origen, destino, entrada)
    if not isinstance(traducido, dict):
        raise ErrorProveedor("La traducción no tiene la forma esperada.")
    # El slug no se traduce: se conserva el del contenido de origen como punto de
    # partida editable; el formulario ya lo deriva del título por idioma.
    traducido["slug"] = entrada["slug"]
    return traducido
