"""Configuración del proveedor de IA, reservada a Administrador (Nivel 3).

La clave de API completa nunca se devuelve al cliente: la lectura informa de si cada
proveedor tiene clave (`configurada`) y expone solo una **pista** (sus últimos
caracteres) para que el Administrador reconozca cuál está puesta. La escritura la cifra en
reposo. Dejar la clave vacía significa «no cambiarla». Sin fila, el proveedor
efectivo es Anthropic.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.cifrado import CifradoNoConfigurado, cifrar, descifrar
from app.database import get_db
from app.deps import requiere_nivel
from app.models import ConfigIA, NivelAcceso
from app.schemas import ConfigIAIn, ConfigIAOut, ProveedorEstado
from app.servicios_ia import CONFIG_IA_ID, PROVEEDOR_POR_DEFECTO

# Proveedores admitidos (coincide con el Literal `ProveedorIA` de schemas).
PROVEEDORES: tuple[str, ...] = ("anthropic", "google", "deepseek")

# Nº de caracteres finales que se revelan como pista y longitud mínima de clave
# para revelarlos: por debajo de este umbral, mostrar el final descubriría casi
# toda la clave, así que no se da pista (se informa solo de que está configurada).
PISTA_CARACTERES = 4
PISTA_LONGITUD_MINIMA = 8


def _pista(token: str | None) -> str | None:
    """Últimos caracteres de la clave cifrada `token`, o `None` si no hay clave,
    no puede descifrarse (falta/rota la clave de cifrado) o es demasiado corta."""
    if not token:
        return None
    try:
        clave = descifrar(token)
    except CifradoNoConfigurado:
        return None
    if len(clave) < PISTA_LONGITUD_MINIMA:
        return None
    return clave[-PISTA_CARACTERES:]

router = APIRouter(
    prefix="/api/admin/config-ia",
    tags=["admin", "ia"],
    dependencies=[Depends(requiere_nivel(NivelAcceso.ADMINISTRADOR))],
)


def _a_salida(config: ConfigIA | None) -> ConfigIAOut:
    activo = config.proveedor_activo if config is not None else PROVEEDOR_POR_DEFECTO
    claves = (config.claves if config is not None else {}) or {}
    return ConfigIAOut(
        proveedorActivo=activo,
        proveedores=[
            ProveedorEstado(
                id=p, configurada=bool(claves.get(p)), pista=_pista(claves.get(p))
            )
            for p in PROVEEDORES
        ],
    )


@router.get("", response_model=ConfigIAOut)
def obtener(db: Session = Depends(get_db)) -> ConfigIAOut:
    return _a_salida(db.get(ConfigIA, CONFIG_IA_ID))


@router.put("", response_model=ConfigIAOut)
def actualizar(datos: ConfigIAIn, db: Session = Depends(get_db)) -> ConfigIAOut:
    config = db.get(ConfigIA, CONFIG_IA_ID)
    if config is None:
        config = ConfigIA(id=CONFIG_IA_ID, proveedor_activo=datos.proveedorActivo, claves={})
        db.add(config)

    config.proveedor_activo = datos.proveedorActivo

    # Clave vacía o ausente = no cambiar. Si viene, se cifra y se guarda bajo el
    # proveedor indicado (o el activo). Reasignamos el dict entero para que
    # SQLAlchemy detecte el cambio del JSON (mutarlo en sitio no marca «sucio»).
    if datos.clave and datos.clave.strip():
        proveedor = datos.proveedor or datos.proveedorActivo
        try:
            token = cifrar(datos.clave.strip())
        except CifradoNoConfigurado as exc:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Falta CLAVE_CIFRADO_IA en el servidor: no se puede guardar la clave.",
            ) from exc
        config.claves = {**(config.claves or {}), proveedor: token}

    db.commit()
    db.refresh(config)
    return _a_salida(config)
