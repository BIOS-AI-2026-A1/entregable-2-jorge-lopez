"""Esquemas Pydantic. Reproducen el contrato `app/src/types.ts` campo a campo.

Los nombres usan camelCase (minusLectura, howTo, preguntasSinResolver) para que el JSON
coincida exactamente con lo que el frontend ya consume.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Idioma = Literal["es", "pt"]


# --- Bloques de contenido ---------------------------------------------------

class CategoriaOut(BaseModel):
    id: str
    slug: str
    nombre: str
    icono: str
    fondo: str
    texto: str


class PasoHowTo(BaseModel):
    titulo: str
    descripcion: str


class BloqueHowTo(BaseModel):
    titulo: str
    pasos: list[PasoHowTo]


class PreguntaFrecuente(BaseModel):
    pregunta: str
    respuesta: str


class ArticuloOut(BaseModel):
    id: str
    slug: str
    titulo: str
    categoria: str
    actualizado: str
    minutosLectura: int
    destacado: bool
    parrafos: list[str]
    howTo: BloqueHowTo
    nota: str | None = None
    faq: list[PreguntaFrecuente]
    relacionados: list[str]


class PreguntaSinResolverOut(BaseModel):
    pregunta: str
    veces: int
    similitud: float
    fecha: str
    estado: str


class MetricaOut(BaseModel):
    clave: str
    valor: str


class ContenidoIdiomaOut(BaseModel):
    categorias: list[CategoriaOut]
    articulos: list[ArticuloOut]
    conversacion: list[dict[str, Any]]
    preguntasSinResolver: list[PreguntaSinResolverOut]
    metricas: list[MetricaOut]


# --- Autenticación ----------------------------------------------------------

class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- CRUD de artículos (entrada bilingüe) -----------------------------------

class TraduccionArticuloIn(BaseModel):
    slug: str = Field(min_length=1)
    titulo: str = Field(min_length=1)
    parrafos: list[str]
    howTo: BloqueHowTo
    nota: str | None = None
    faq: list[PreguntaFrecuente]


class ArticuloIn(BaseModel):
    """Artículo bilingüe: `es` y `pt` son obligatorios (paridad de idiomas)."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    categoria: str
    actualizado: str  # AAAA-MM-DD
    minutosLectura: int = Field(ge=0)
    destacado: bool = False
    relacionados: list[str] = Field(default_factory=list)
    es: TraduccionArticuloIn
    pt: TraduccionArticuloIn


class ArticuloUpdateIn(BaseModel):
    """Como `ArticuloIn` pero sin `id` (viene de la ruta)."""

    model_config = ConfigDict(extra="forbid")

    categoria: str
    actualizado: str
    minutosLectura: int = Field(ge=0)
    destacado: bool = False
    relacionados: list[str] = Field(default_factory=list)
    es: TraduccionArticuloIn
    pt: TraduccionArticuloIn


class ArticuloAdminOut(BaseModel):
    """Artículo con sus dos idiomas, para editar en el panel."""

    id: str
    categoria: str
    actualizado: str
    minutosLectura: int
    destacado: bool
    relacionados: list[str]
    es: TraduccionArticuloIn
    pt: TraduccionArticuloIn


# --- Panel: preguntas sin resolver ------------------------------------------

class PreguntaAdminOut(BaseModel):
    id: int
    idioma: str
    pregunta: str
    veces: int
    similitud: float
    fecha: str
    estado: str
