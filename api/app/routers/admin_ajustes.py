"""Ajustes globales de la instalación. Hoy: el campo [Empresa], editable por Root.

La lectura del nombre de marca es pública (viaja en `GET /api/{idioma}/contenido`);
aquí vive solo la escritura, reservada a Nivel 3 (Root).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import requiere_nivel
from app.models import Ajustes, NivelAcceso
from app.schemas import EmpresaIn, EmpresaOut
from app.servicios import AJUSTES_ID

router = APIRouter(
    prefix="/api/admin/ajustes",
    tags=["admin", "ajustes"],
    dependencies=[Depends(requiere_nivel(NivelAcceso.ROOT))],
)


@router.put("/empresa", response_model=EmpresaOut)
def actualizar_empresa(datos: EmpresaIn, db: Session = Depends(get_db)) -> EmpresaOut:
    ajuste = db.get(Ajustes, AJUSTES_ID)
    if ajuste is None:
        # Si el seed no creó la fila, se crea aquí (idempotente): siempre hay una.
        ajuste = Ajustes(id=AJUSTES_ID, empresa=datos.empresa)
        db.add(ajuste)
    else:
        ajuste.empresa = datos.empresa
    db.commit()
    return EmpresaOut(empresa=ajuste.empresa)
