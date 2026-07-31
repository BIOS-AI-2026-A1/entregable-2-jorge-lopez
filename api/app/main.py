"""Punto de entrada de la API del Centro de Ayuda."""

from __future__ import annotations

from fastapi import FastAPI

from app.routers import admin_articulos, admin_panel, auth, contenido

app = FastAPI(
    title="Centro de Ayuda API",
    description="Contenido bilingüe, CRUD de artículos y autenticación del panel interno.",
    version="0.1.0",
)

app.include_router(contenido.router)
app.include_router(auth.router)
app.include_router(admin_articulos.router)
app.include_router(admin_panel.router)


@app.get("/api/salud", tags=["salud"])
def salud() -> dict:
    return {"estado": "ok"}
