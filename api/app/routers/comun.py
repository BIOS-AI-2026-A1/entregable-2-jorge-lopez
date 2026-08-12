"""Comprobaciones HTTP que comparten los routers de administración.

Viven aquí, y no en `app.servicios`, para que la capa de servicios siga sin
depender de FastAPI: lo que se comparte es la traducción de un estado de la base
a un código de respuesta, que es asunto del router.
"""

from __future__ import annotations

from collections.abc import Iterable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Articulo


def obtener_articulo_o_404(db: Session, articulo_id: str) -> Articulo:
    """Devuelve el artículo o corta con 404."""
    a = db.get(Articulo, articulo_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artículo no encontrado")
    return a


def exigir_id_disponible(db: Session, articulo_id: str) -> None:
    """Corta con 409 si ya hay un artículo con ese identificador."""
    if db.get(Articulo, articulo_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un artículo con ese identificador")


def validar_relacionados(db: Session, articulo_id: str, relacionados: Iterable[str]) -> None:
    """Corta con 422 si algún relacionado es inválido.

    Un relacionado es inválido si es el propio artículo (auto-referencia) o si no
    corresponde a un artículo existente. Se comprueba en el servidor para dar un
    error de validación claro en vez de un 500 por la FK (que además, al ser
    diferible, solo saltaría al hacer commit)."""
    for rid in relacionados:
        if rid == articulo_id:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Un artículo no puede relacionarse consigo mismo: «{rid}».",
            )
        if db.get(Articulo, rid) is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"El artículo relacionado no existe: «{rid}».",
            )
