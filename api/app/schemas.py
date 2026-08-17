"""Esquemas Pydantic. Reproducen el contrato `app/src/types.ts` campo a campo.

Los nombres usan camelCase (minutosLectura, howTo) para que el JSON coincida
exactamente con lo que el frontend ya consume.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Idioma = Literal["es", "pt"]

# Cotas de tamaño para el contenido de artículo que entra por el panel (alta, edición
# y traducción). Son holgadas frente al contenido real de `app/src/data/{es,pt}` (la
# cadena más larga ronda los ~370 caracteres y ninguna lista pasa de unos pocos ítems),
# pero cortan payloads desmesurados antes de gastar el proveedor de IA en la traducción
# (defensa contra inyección de prompts y coste; ver cambio `guardarrailes-inyeccion-runtime`).
MAX_TEXTO_CORTO = 300  # títulos y preguntas
MAX_TEXTO_LARGO = 5000  # párrafos, notas, descripciones y respuestas
MAX_ITEMS_LISTA = 50  # nº de párrafos, pasos o preguntas por artículo

TextoCorto = Annotated[str, Field(min_length=1, max_length=MAX_TEXTO_CORTO)]
TextoLargo = Annotated[str, Field(max_length=MAX_TEXTO_LARGO)]


# --- Bloques de contenido ---------------------------------------------------

class CategoriaOut(BaseModel):
    id: str
    slug: str
    nombre: str
    icono: str
    fondo: str
    texto: str


class PasoHowTo(BaseModel):
    titulo: TextoCorto
    descripcion: TextoLargo


class BloqueHowTo(BaseModel):
    titulo: TextoCorto
    pasos: list[PasoHowTo] = Field(max_length=MAX_ITEMS_LISTA)


class PreguntaFrecuente(BaseModel):
    pregunta: TextoCorto
    respuesta: TextoLargo


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
    # Marca visual pública: alimenta los tokens de acento y el degradado del banner
    # en el HTML servido (SSR). El logo no viaja aquí (se sirve por `/api/marca/logo`).
    acento: str
    bannerDesde: str
    bannerMedio: str
    bannerHasta: str
    # Indica si hay logotipo subido (para cabecera y favicon); el binario no viaja aquí.
    logo: bool
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
    slug: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    titulo: TextoCorto
    parrafos: list[TextoLargo] = Field(max_length=MAX_ITEMS_LISTA)
    howTo: BloqueHowTo
    nota: TextoLargo | None = None
    faq: list[PreguntaFrecuente] = Field(max_length=MAX_ITEMS_LISTA)


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


# --- CRUD de categorías (entrada bilingüe) ----------------------------------

class TraduccionCategoriaIn(BaseModel):
    slug: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    nombre: TextoCorto


class CategoriaIn(BaseModel):
    """Categoría bilingüe: `es` y `pt` son obligatorios (paridad de idiomas).

    Espejo de `Categoria`/`CategoriaTraduccion`: la entidad estable lleva la
    presentación (icono, fondo, texto, orden) y cada idioma su nombre y slug.
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    icono: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    fondo: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    texto: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    orden: int = Field(default=0, ge=0)
    es: TraduccionCategoriaIn
    pt: TraduccionCategoriaIn


class CategoriaUpdateIn(BaseModel):
    """Como `CategoriaIn` pero sin `id` (viene de la ruta)."""

    model_config = ConfigDict(extra="forbid")

    icono: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    fondo: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    texto: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    orden: int = Field(default=0, ge=0)
    es: TraduccionCategoriaIn
    pt: TraduccionCategoriaIn


class CategoriaAdminOut(BaseModel):
    """Categoría con sus dos idiomas, para gestionar en el panel.

    Distinta de `CategoriaOut` (proyección pública de un solo idioma que viaja en
    el contenido), como `ArticuloAdminOut` lo es de `ArticuloOut`.
    """

    id: str
    icono: str
    fondo: str
    texto: str
    orden: int
    es: TraduccionCategoriaIn
    pt: TraduccionCategoriaIn


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

# Nivel asignable a un usuario: Editor (2) o Administrador (3). Anónimo (1) no se
# asigna nunca (es la ausencia de sesión), así que se excluye del contrato.
NivelAsignable = Literal[2, 3]

# Contraseña mínima para cuentas creadas por la API, alineada con el seed.
LONGITUD_MINIMA_CONTRASENA = 12


class MeOut(BaseModel):
    """Identidad de la sesión actual: el frontend la usa para ajustar la UI a su nivel."""

    email: str
    nivel: int


# --- Gestión de usuarios (solo Administrador) -------------------------------

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


# --- Gestión de portales (solo SuperAdmin) ----------------------------------

# Slug de portal: minúsculas ASCII, dígitos y guiones internos; empieza y acaba en
# alfanumérico. Es la base del subdominio `<slug>.<base_domain>`, así que se ciñe a lo
# que admite una etiqueta de host (sin puntos, sin guiones al borde, ≤63 caracteres). La
# unicidad y la colisión con slugs reservados las valida el router (autoridad del servidor).
SlugPortal = Annotated[
    str,
    Field(min_length=2, max_length=63, pattern=r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"),
]


class PortalCrearIn(BaseModel):
    """Alta de un portal por el SuperAdmin: sus atributos y su Administrador inicial.

    El portal nace activo, con su fila de marca por defecto y su Administrador (nivel 3)
    acotado a él. No lleva `es`/`pt`: un portal no es contenido bilingüe.
    """

    model_config = ConfigDict(extra="forbid")

    slug: SlugPortal
    nombreEmpresa: str = Field(min_length=1, max_length=MAX_TEXTO_CORTO)
    adminEmail: str = Field(min_length=3)
    adminPassword: str = Field(min_length=LONGITUD_MINIMA_CONTRASENA)


class PortalOut(BaseModel):
    """Portal para el listado del SuperAdmin: identidad, estado y su host canónico."""

    id: str
    slug: str
    nombreEmpresa: str
    estado: str
    # Host principal (subdominio) por el que se sirve el portal; `None` si aún no tiene.
    host: str | None = None
    creado: str


# --- Ajustes: campo [Empresa] -----------------------------------------------

class EmpresaIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    empresa: str = Field(min_length=1)


class EmpresaOut(BaseModel):
    empresa: str


# --- Ajustes: marca visual (paleta + logo), solo Administrador --------------

# Color hexadecimal `#rgb` o `#rrggbb`. La validación de formato la hace Pydantic;
# la de contraste WCAG la hace el router con `app.contraste` (autoridad del servidor).
ColorHex = Annotated[str, Field(pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")]


class MarcaIn(BaseModel):
    """Paleta editable por Administrador: solo el acento.

    Las tres paradas del degradado del banner ya no son entrada: el servidor las deriva
    del acento (`derivar_degradado_banner`). `extra="ignore"` (por defecto) descarta sin
    error cualquier parada de banner que envíe un cliente antiguo o manipulado; el
    resultado guardado es siempre el derivado y validado, nunca el del cuerpo.
    """

    model_config = ConfigDict(extra="ignore")

    acento: ColorHex


class MarcaOut(BaseModel):
    acento: str
    bannerDesde: str
    bannerMedio: str
    bannerHasta: str


class LogoOut(BaseModel):
    """Estado del logotipo para el panel. Nunca incluye el binario."""

    presente: bool
    mime: str | None = None


# --- Configuración de proveedor de IA (solo Administrador) ------------------

# Proveedores admitidos. Anthropic (Claude) es el de por defecto. Anthropic y
# DeepSeek tienen motor de traducción real; Google Translate queda como opción
# listada sin motor (ver design.md del cambio `proveedor-deepseek-traduccion`).
ProveedorIA = Literal["anthropic", "google", "deepseek"]


class ProveedorEstado(BaseModel):
    """Estado de un proveedor: si tiene clave configurada y una pista para
    identificarla (los últimos caracteres). NUNCA incluye la clave completa."""

    id: ProveedorIA
    configurada: bool
    # Últimos caracteres de la clave (p. ej. "s7xq") para que el Administrador reconozca cuál
    # está puesta, sin exponer el resto. `None` si no hay clave o es demasiado corta
    # para revelar sin descubrir casi toda la clave.
    pista: str | None = None


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
