"""Ajustes globales de la instalación. Hoy: el campo [Empresa], editable por Root.

La lectura del nombre de marca es pública (viaja en `GET /api/{idioma}/contenido`);
aquí vive solo la escritura, reservada a Nivel 3 (Root).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.contraste import validar_paleta
from app.database import get_db
from app.deps import requiere_nivel
from app.imagenes import MAX_LOGO_BYTES, detectar_mime_logo
from app.models import Ajustes, NivelAcceso
from app.schemas import EmpresaIn, EmpresaOut, LogoOut, MarcaIn, MarcaOut
from app.servicios import AJUSTES_ID, EMPRESA_POR_DEFECTO

router = APIRouter(
    prefix="/api/admin/ajustes",
    tags=["admin", "ajustes"],
    dependencies=[Depends(requiere_nivel(NivelAcceso.ROOT))],
)


def _fila_ajustes(db: Session) -> Ajustes:
    """Devuelve la fila única de ajustes, creándola si el seed aún no la creó."""
    ajuste = db.get(Ajustes, AJUSTES_ID)
    if ajuste is None:
        ajuste = Ajustes(id=AJUSTES_ID, empresa=EMPRESA_POR_DEFECTO)
        db.add(ajuste)
    return ajuste


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


@router.put("/marca", response_model=MarcaOut)
def actualizar_marca(datos: MarcaIn, db: Session = Depends(get_db)) -> MarcaOut:
    """Guarda la paleta si cumple WCAG AA; si no, rechaza con 422 y no persiste.

    La validación de contraste es la autoridad del servidor: deriva la escala de acento
    y comprueba todos los pares (botón, hover, foco, cada parada del banner). El frontend
    solo adelanta el aviso.
    """
    fallo = validar_paleta(datos.acento, datos.bannerDesde, datos.bannerMedio, datos.bannerHasta)
    if fallo is not None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "mensaje": f"Contraste insuficiente: {fallo.par}.",
                "par": fallo.par,
                "ratio": fallo.ratio,
                "minimo": fallo.minimo,
            },
        )
    ajuste = _fila_ajustes(db)
    ajuste.acento = datos.acento
    ajuste.banner_desde = datos.bannerDesde
    ajuste.banner_medio = datos.bannerMedio
    ajuste.banner_hasta = datos.bannerHasta
    db.commit()
    return MarcaOut(
        acento=ajuste.acento,
        bannerDesde=ajuste.banner_desde,
        bannerMedio=ajuste.banner_medio,
        bannerHasta=ajuste.banner_hasta,
    )


@router.post("/logo", response_model=LogoOut, status_code=status.HTTP_201_CREATED)
async def subir_logo(request: Request, db: Session = Depends(get_db)) -> LogoOut:
    """Sube el logotipo (PNG/ICO) como cuerpo binario crudo.

    Se recibe el binario directo (sin multipart) para no añadir `python-multipart`: el
    tipo se decide por magic bytes, no por el nombre de archivo, así que no hace falta
    el envoltorio de formulario. El BFF reenvía el cuerpo tal cual.
    """
    datos = await request.body()
    if len(datos) == 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El archivo está vacío.")
    if len(datos) > MAX_LOGO_BYTES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"El logotipo supera el tamaño máximo ({MAX_LOGO_BYTES // 1024} KB).",
        )
    # El tipo se decide por el contenido, no por la extensión ni el Content-Type cliente.
    mime = detectar_mime_logo(datos)
    if mime is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Formato no admitido. Solo se aceptan PNG o ICO (no SVG).",
        )
    ajuste = _fila_ajustes(db)
    ajuste.logo_bin = datos
    ajuste.logo_mime = mime
    db.commit()
    return LogoOut(presente=True, mime=mime)
