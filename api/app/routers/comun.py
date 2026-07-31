"""Comprobaciones HTTP que comparten los routers de administración.

Viven aquí, y no en `app.servicios`, para que la capa de servicios siga sin
depender de FastAPI: lo que se comparte es la traducción de un estado de la base
a un código de respuesta, que es asunto del router.
"""

from __future__ import annotations

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
