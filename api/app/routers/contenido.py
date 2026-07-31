"""API pública de contenido: sirve el `ContenidoIdioma` por idioma."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ContenidoIdiomaOut
from app.servicios import IDIOMAS, ensamblar_contenido

router = APIRouter(prefix="/api", tags=["contenido"])


@router.get(
    "/{idioma}/contenido",
    response_model=ContenidoIdiomaOut,
    response_model_exclude_none=True,
)
def obtener_contenido(idioma: str, db: Session = Depends(get_db)) -> dict:
    if idioma not in IDIOMAS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Idioma no encontrado")
    return ensamblar_contenido(db, idioma)
