"""Esquemas Pydantic. Reproducen el contrato `app/src/types.ts` campo a campo.

Los nombres usan camelCase (minutosLectura, howTo) para que el JSON coincida
exactamente con lo que el frontend ya consume.
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


class MetricaOut(BaseModel):
    clave: str
    valor: str


class ContenidoIdiomaOut(BaseModel):
    """Contenido público de un idioma.

    No incluye las preguntas sin resolver: son texto escrito por las personas
    usuarias y solo se sirven por el router de administración, autenticado.
    """

    empresa: str
    categorias: list[CategoriaOut]
    articulos: list[ArticuloOut]
    conversacion: list[dict[str, Any]]
    metricas: list[MetricaOut]


# --- Autenticación ----------------------------------------------------------

class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    # El BFF (servidor de frontend de confianza) recibe ambos tokens y los guarda
    # en cookies httpOnly; nunca llegan al JavaScript del navegador.
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    # Opcional: el logout siempre limpia la sesión del cliente; si llega el
    # refresh token, además se revoca su familia en el servidor.
    refresh_token: str | None = None


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


# --- Sesión y niveles -------------------------------------------------------

# Nivel asignable a un usuario: Standard (2) o Root (3). Anonymous (1) no se
# asigna nunca (es la ausencia de sesión), así que se excluye del contrato.
NivelAsignable = Literal[2, 3]

# Contraseña mínima para cuentas creadas por la API, alineada con el seed.
LONGITUD_MINIMA_CONTRASENA = 12


class MeOut(BaseModel):
    """Identidad de la sesión actual: el frontend la usa para ajustar la UI a su nivel."""

    email: str
    nivel: int


# --- Gestión de usuarios (solo Root) ----------------------------------------

class UsuarioOut(BaseModel):
    """Usuario administrable. Nunca incluye el hash de la contraseña."""

    id: int
    email: str
    nivel: int
    activo: bool
    creado: str


class UsuarioCrearIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3)
    password: str = Field(min_length=LONGITUD_MINIMA_CONTRASENA)
    nivel: NivelAsignable


class UsuarioActualizarIn(BaseModel):
    """Edita correo y nivel; la contraseña es opcional (reset)."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3)
    nivel: NivelAsignable
    password: str | None = Field(default=None, min_length=LONGITUD_MINIMA_CONTRASENA)


# --- Ajustes: campo [Empresa] -----------------------------------------------

class EmpresaIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    empresa: str = Field(min_length=1)


class EmpresaOut(BaseModel):
    empresa: str


# --- Configuración de proveedor de IA (solo Root) ---------------------------

# Proveedores admitidos. Anthropic (Claude) es el de por defecto; Google Translate
# queda como alternativa enchufable (ver design.md, Decisión 4.1).
ProveedorIA = Literal["anthropic", "google"]


class ProveedorEstado(BaseModel):
    """Estado de un proveedor: si tiene clave configurada. Nunca incluye la clave."""

    id: ProveedorIA
    configurada: bool


class ConfigIAOut(BaseModel):
    """Configuración de IA para el panel: proveedor activo y qué proveedores tienen
    clave. NUNCA devuelve las claves en claro (solo el booleano `configurada`)."""

    proveedorActivo: ProveedorIA
    proveedores: list[ProveedorEstado]


class ConfigIAIn(BaseModel):
    """Cambia el proveedor activo y, opcionalmente, la clave de un proveedor.

    `clave` vacía o ausente significa «no cambiar la clave» (espeja el patrón de la
    contraseña opcional al editar usuarios). `proveedor` indica a qué proveedor
    aplica la clave; por defecto, el proveedor activo.
    """

    model_config = ConfigDict(extra="forbid")

    proveedorActivo: ProveedorIA
    proveedor: ProveedorIA | None = None
    clave: str | None = None


# --- Traducción asistida por IA ---------------------------------------------

class TraduccionPeticionIn(BaseModel):
    """Pide traducir el contenido de un idioma al otro. No persiste nada."""

    model_config = ConfigDict(extra="forbid")

    origen: Idioma
    contenido: TraduccionArticuloIn
