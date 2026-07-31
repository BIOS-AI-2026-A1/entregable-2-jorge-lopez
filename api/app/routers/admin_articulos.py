"""CRUD de artículos, protegido por sesión de administrador. Crear/editar exige es+pt."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import admin_actual
from app.models import Articulo
from app.schemas import ArticuloAdminOut, ArticuloIn, ArticuloUpdateIn
from app.servicios import aplicar_datos_articulo, articulo_a_admin_dict

router = APIRouter(
    prefix="/api/admin/articulos",
    tags=["admin"],
    dependencies=[Depends(admin_actual)],
)


@router.get("", response_model=list[ArticuloAdminOut])
def listar(db: Session = Depends(get_db)) -> list[dict]:
    articulos = db.query(Articulo).order_by(Articulo.orden).all()
    return [articulo_a_admin_dict(a) for a in articulos]


@router.get("/{articulo_id}", response_model=ArticuloAdminOut)
def obtener(articulo_id: str, db: Session = Depends(get_db)) -> dict:
    a = db.get(Articulo, articulo_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artículo no encontrado")
    return articulo_a_admin_dict(a)


@router.post("", response_model=ArticuloAdminOut, status_code=status.HTTP_201_CREATED)
def crear(datos: ArticuloIn, db: Session = Depends(get_db)) -> dict:
    if db.get(Articulo, datos.id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un artículo con ese identificador")
    a = Articulo()
    aplicar_datos_articulo(a, datos, incluir_id=True)
    db.add(a)
    db.commit()
    db.refresh(a)
    return articulo_a_admin_dict(a)


@router.put("/{articulo_id}", response_model=ArticuloAdminOut)
def actualizar(articulo_id: str, datos: ArticuloUpdateIn, db: Session = Depends(get_db)) -> dict:
    a = db.get(Articulo, articulo_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artículo no encontrado")
    aplicar_datos_articulo(a, datos, incluir_id=False)
    db.commit()
    db.refresh(a)
    return articulo_a_admin_dict(a)


@router.delete("/{articulo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(articulo_id: str, db: Session = Depends(get_db)) -> None:
    a = db.get(Articulo, articulo_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artículo no encontrado")
    db.delete(a)
    db.commit()
