"""Comprobaciones HTTP que comparten los routers de administración.

Viven aquí, y no en `app.servicios`, para que la capa de servicios siga sin
depender de FastAPI: lo que se comparte es la traducción de un estado de la base
a un código de respuesta, que es asunto del router.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Articulo, Categoria


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


def obtener_categoria_o_404(db: Session, categoria_id: str) -> Categoria:
    """Devuelve la categoría o corta con 404."""
    c = db.get(Categoria, categoria_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada")
    return c


def exigir_categoria_id_disponible(db: Session, categoria_id: str) -> None:
    """Corta con 409 si ya hay una categoría con ese identificador (id/slug duplicado)."""
    if db.get(Categoria, categoria_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese identificador")


def exigir_categoria_sin_articulos(db: Session, categoria_id: str) -> None:
    """Corta con 409 si la categoría todavía tiene artículos asignados.

    Integridad referencial en la aplicación: el borrado nunca deja artículos sin
    categoría. La FK `articulos.categoria_id` no tiene cascada, así que esto refuerza
    a nivel de aplicación lo que la base ya impediría.
    """
    n = db.query(Articulo).filter(Articulo.categoria_id == categoria_id).count()
    if n > 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"No se puede borrar la categoría: tiene {n} artículo(s) asignado(s). "
            "Reasigna o elimina esos artículos primero.",
        )
