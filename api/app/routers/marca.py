"""Servido público del logotipo de marca (cabecera + favicon).

La lectura es pública (la ve todo visitante, como el nombre de empresa y la paleta);
la escritura vive en `admin_ajustes` (Administrador). Se sirve desde el mismo origen para que la
CSP estricta (`img-src 'self'`) lo permita sin abrir a orígenes externos.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ajustes
from app.servicios import AJUSTES_ID

router = APIRouter(prefix="/api/marca", tags=["marca"])


@router.get("/logo")
def obtener_logo(db: Session = Depends(get_db)) -> Response:
    """Sirve el logotipo con su tipo real. 404 si no hay ninguno subido (fallback)."""
    ajuste = db.get(Ajustes, AJUSTES_ID)
    if ajuste is None or ajuste.logo_bin is None or ajuste.logo_mime is None:
        # Sin logo: 404. La cabecera cae al recuadro de iniciales y el favicon al
        # de por defecto; el frontend lo trata como ausencia, no como error.
        return Response(status_code=status.HTTP_404_NOT_FOUND)
    return Response(
        content=ajuste.logo_bin,
        media_type=ajuste.logo_mime,
        headers={
            # Impide que el navegador reinterprete el binario como otro tipo (p. ej.
            # HTML) y lo trate como imagen a mostrar, no como documento a renderizar.
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": 'inline; filename="logo"',
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )
