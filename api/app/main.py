"""Punto de entrada de la API del Centro de Ayuda."""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.routers import (
    admin_ajustes,
    admin_articulos,
    admin_categorias,
    admin_config_ia,
    admin_panel,
    admin_usuarios,
    auth,
    contenido,
    marca,
)
from app.servicios_ia import ErrorProveedor, ProveedorNoConfigurado

app = FastAPI(
    title="Centro de Ayuda API",
    description="Contenido bilingüe, CRUD de artículos y autenticación del panel interno.",
    version="0.1.0",
)

app.include_router(contenido.router)
app.include_router(marca.router)
app.include_router(auth.router)
app.include_router(admin_articulos.router)
app.include_router(admin_categorias.router)
app.include_router(admin_panel.router)
app.include_router(admin_usuarios.router)
app.include_router(admin_ajustes.router)
app.include_router(admin_config_ia.router)


# Errores de traducción -> HTTP. Se registran a nivel de app para que el mapeo valga
# tanto si el error se lanza al resolver el proveedor (dependencia) como al traducir.
@app.exception_handler(ProveedorNoConfigurado)
def _sin_proveedor(_: Request, __: ProveedorNoConfigurado) -> JSONResponse:
    # 409: el estado del servidor (sin proveedor/clave) impide traducir; el frontend
    # lo distingue para pedir a un usuario Root que configure el proveedor.
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "No hay proveedor de IA configurado. Un usuario Root debe configurarlo."},
    )


@app.exception_handler(ErrorProveedor)
def _error_proveedor(_: Request, __: ErrorProveedor) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": "El proveedor de IA no pudo completar la traducción. Inténtalo de nuevo."},
    )


@app.get("/api/salud", tags=["salud"])
def salud() -> dict:
    return {"estado": "ok"}
