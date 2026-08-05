"""CRUD de artículos, protegido por sesión de administrador. Crear/editar exige es+pt."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import requiere_nivel
from app.models import Articulo, NivelAcceso
from app.routers.comun import exigir_id_disponible, obtener_articulo_o_404
from app.schemas import ArticuloAdminOut, ArticuloIn, ArticuloUpdateIn
from app.servicios import aplicar_datos_articulo, articulo_a_admin_dict

# El CRUD de artículos es una función de producto: la usa cualquier sesión válida
# (Nivel 2, Standard, o superior).
router = APIRouter(
    prefix="/api/admin/articulos",
    tags=["admin"],
    dependencies=[Depends(requiere_nivel(NivelAcceso.ESTANDAR))],
)


@router.get("", response_model=list[ArticuloAdminOut])
def listar(db: Session = Depends(get_db)) -> list[dict]:
    articulos = db.query(Articulo).order_by(Articulo.orden).all()
    return [articulo_a_admin_dict(a) for a in articulos]


@router.get("/{articulo_id}", response_model=ArticuloAdminOut)
def obtener(articulo_id: str, db: Session = Depends(get_db)) -> dict:
    return articulo_a_admin_dict(obtener_articulo_o_404(db, articulo_id))


@router.post("", response_model=ArticuloAdminOut, status_code=status.HTTP_201_CREATED)
def crear(datos: ArticuloIn, db: Session = Depends(get_db)) -> dict:
    exigir_id_disponible(db, datos.id)
    a = Articulo()
    aplicar_datos_articulo(a, datos, incluir_id=True)
    db.add(a)
    db.commit()
    db.refresh(a)
    return articulo_a_admin_dict(a)


@router.put("/{articulo_id}", response_model=ArticuloAdminOut)
def actualizar(articulo_id: str, datos: ArticuloUpdateIn, db: Session = Depends(get_db)) -> dict:
    a = obtener_articulo_o_404(db, articulo_id)
    aplicar_datos_articulo(a, datos, incluir_id=False)
    db.commit()
    db.refresh(a)
    return articulo_a_admin_dict(a)


@router.delete("/{articulo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(articulo_id: str, db: Session = Depends(get_db)) -> None:
    db.delete(obtener_articulo_o_404(db, articulo_id))
    db.commit()
