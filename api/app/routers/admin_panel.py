"""Panel interno: preguntas sin resolver y creación de artículo desde una pregunta (ciclo KCS)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import admin_actual
from app.models import Articulo, PreguntaSinResolver
from app.schemas import ArticuloAdminOut, ArticuloIn, PreguntaAdminOut
from app.servicios import aplicar_datos_articulo, articulo_a_admin_dict

router = APIRouter(
    prefix="/api/admin/preguntas-sin-resolver",
    tags=["admin"],
    dependencies=[Depends(admin_actual)],
)


@router.get("", response_model=list[PreguntaAdminOut])
def listar(idioma: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    consulta = db.query(PreguntaSinResolver)
    if idioma is not None:
        consulta = consulta.filter(PreguntaSinResolver.idioma == idioma)
    filas = consulta.order_by(PreguntaSinResolver.orden).all()
    return [
        {
            "id": p.id,
            "idioma": p.idioma,
            "pregunta": p.pregunta,
            "veces": p.veces,
            "similitud": p.similitud,
            "fecha": p.fecha.isoformat(),
            "estado": p.estado,
        }
        for p in filas
    ]


@router.post(
    "/{pregunta_id}/crear-articulo",
    response_model=ArticuloAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_articulo_desde_pregunta(
    pregunta_id: int, datos: ArticuloIn, db: Session = Depends(get_db)
) -> dict:
    pregunta = db.get(PreguntaSinResolver, pregunta_id)
    if pregunta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pregunta no encontrada")
    if db.get(Articulo, datos.id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un artículo con ese identificador")

    a = Articulo()
    aplicar_datos_articulo(a, datos, incluir_id=True)
    db.add(a)
    # Cierra el ciclo KCS: la pregunta queda cubierta por el nuevo artículo.
    pregunta.estado = "cubierta"
    db.commit()
    db.refresh(a)
    return articulo_a_admin_dict(a)
