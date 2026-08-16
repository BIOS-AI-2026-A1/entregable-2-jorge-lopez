# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

Proyecto capstone: una aplicación de **Centro de Ayuda**. El **frontend** vive en `app/` (las 4 pantallas,
bilingüe), migrado a **Next.js (App Router) con renderizado en servidor y sesión en cookie httpOnly**
(cambio OpenSpec `migrar-frontend-nextjs`), y el **backend** en `api/` (FastAPI) incluye el control de
acceso en tres niveles Anonymous / Editor / Administrador. Varias secciones de este documento se irán completando
a medida que se construya.

## Stack

El frontend vive en `app/`:

- **Next.js 16 (App Router) + React 19 + TypeScript.** Enrutado por archivos con el idioma en el primer
  segmento (`app/app/[idioma]/…` → `/es/…`, `/pt/…`); `next dev`/`next build` como servidor y empaquetador.
- **Contenido público renderizado en servidor** (Server Components): inicio y artículo llegan en el HTML
  inicial; solo son islas de cliente los componentes con estado.
- **Sesión de administrador en cookies `httpOnly` (patrón BFF).** El token JWT nunca llega al navegador:
  lo custodian los Route Handlers de `app/app/api/*`, que reenvían al backend con `Authorization: Bearer`.
  Un refresh token opaco y rotatorio renueva el acceso. Las guardias del panel se resuelven en servidor
  (`app/proxy.ts` en el borde + `sesionActual()` en las páginas).
- **Traducción isomórfica** con i18next (`src/i18n/traducir.ts`, `getFixedT`), sin idioma global mutable;
  funciona igual en Server y Client Components. react-i18next se conserva solo para los componentes
  reutilizados del panel (`PanelI18n` fija el idioma antes de renderizarlos).
- **Tailwind CSS v4** mediante `@tailwindcss/postcss`, sin archivo de configuración; el acento sigue
  expuesto como token `--acento`.
- El contenido lo sirve la API por idioma; las pantallas lo consumen por `src/data/` sin tocar su ARIA.

Se llegó aquí **migrando el prototipo SPA** (React + Vite + react-router, con el token en `localStorage`)
a Next.js: cambio OpenSpec `migrar-frontend-nextjs` (SSR del contenido público, sesión en cookie httpOnly
y guardias en servidor). El razonamiento del prototipo original, con las alternativas descartadas, está en
`openspec/changes/archive/2026-07-28-prototipo-centro-ayuda/design.md`.

El `.zip` de `design/` sigue siendo **referencia visual**; no se edita ni se descomprime dentro del repo.

### Backend (implementado y validado en `api/`, pendiente de integrar por PR)

Backend del cambio OpenSpec `backend-cms-autenticacion`, escrito en `api/` (modelos, routers, auth, seed
y tests) y **validado localmente**: migraciones (incluida `0002`), seed y `pytest` en verde. Pendiente solo
de integrar por PR. El razonamiento completo con alternativas está en el `design.md` de ese cambio.

- **FastAPI + Python** (Pydantic + SQLAlchemy + Alembic). Se eligió Python por el RAG futuro; los esquemas
  Pydantic reproducen `src/types.ts` campo a campo y Next reescribe `/api/(es|pt)/*` al backend en desarrollo.
- **PostgreSQL + pgvector** como única base de datos (RAG-ready desde la primera migración), levantada con
  Docker Compose. Modelo bilingüe entidad estable + traducciones por idioma; `parrafos`/`how_to`/`faq` en
  JSONB; métricas del panel derivadas por consulta.
- **Autenticación de administrador:** correo + contraseña con hash **argon2** y sesión **JWT**. Protege
  `/api/admin/*` y restringe el Panel Interno (`/:idioma/panel`) a sesión válida.
- **Control de acceso en tres niveles jerárquicos:** Anonymous (sin sesión, solo centro de ayuda),
  Editor (panel + funciones de producto) y Administrador (además gestión de usuarios y campo `[Empresa]`). La
  dependencia `requiere_nivel` aplica la autorización **en el servidor** (403 por nivel insuficiente),
  leyendo nivel y estado `activo` de la base en cada petición (no del JWT), para revocar acceso al instante.
- **Consumo desde el frontend** con **Server Components de Next**: el contenido público se carga en el
  servidor (`src/data/servidor.ts`) y el panel usa el BFF por cookie (`src/bff/apiFetch.ts`), sin tocar
  componentes ni su ARIA.
- **Alcance:** API de contenido + CRUD de artículos + auth + control de acceso por niveles, gestión de
  usuarios (Administrador) y campo `[Empresa]` (valor de marca global) ahora; **RAG solo diseñado**, no construido.

## Convenciones

Lo establecido hasta ahora:

- **Idiomas de la aplicación: español y portugués.** Todo texto de interfaz y contenido debe contemplar
  ambos desde el inicio (no dar por hecho un solo idioma al modelar contenidos o rutas).
- Documentación, commits y comunicación del repo en español.
- **Accesibilidad WCAG 2.2 nivel AA** como requisito no negociable, no como mejora posterior: contraste
  mínimo 4.5:1, foco visible en todo elemento interactivo, objetivos táctiles de 44×44px, etiquetas
  visibles en campos y estados que nunca se comuniquen solo con color.
- Color de acento expuesto como token `--acento` para poder recambiar la marca sin tocar componentes.
- **CRUD de artículos bilingüe atómico:** crear o editar un artículo exige español y portugués juntos; nunca
  se persiste un artículo en un solo idioma.
- **Acceso jerárquico estricto (`Administrador ⊃ Editor ⊃ Anonymous`):** la autorización se aplica **en el
  servidor**, no solo ocultando controles en la interfaz; un usuario nunca alcanza un recurso por encima de
  su nivel, ni por petición directa.
- **`[Empresa]` es el identificador interno del campo de marca**, no un marcador de posición: se conserva
  tal cual en el modelo de datos, la API y las claves de código (p. ej. `guardarEmpresa`, rutas y esquemas).
  En la **interfaz de administración** ya no se muestra ese literal: el campo se rotula "Nombre de empresa"
  (pt "Nome da empresa") y los avisos de guardado y error muestran el valor que el administrador guardó
  (interpolado como `{{empresa}}`), no el texto `[Empresa]`.
- **Secretos fuera del repo:** cadena de conexión, secreto de firma JWT y credenciales de administrador van
  en variables de entorno (`.env` ignorado), con un `.env.example` sin valores reales.
- **Licencia: Business Source License 1.1** (`LICENSE`, con `license: "BUSL-1.1"` en `app/package.json` y
  `api/pyproject.toml`). Se eligió por el objetivo declarado de convertir esto en un producto/negocio
  propio (SaaS con capa gratuita) sin renunciar al espíritu de código abierto: el código es visible y
  autohosteable por cualquiera (chico o grande) para uso propio, pero no puede revenderse como servicio
  hosteado competidor; a los cuatro años de cada versión pasa automáticamente a Apache License 2.0. La
  segmentación comercial "empresa chica gratis / empresa grande paga" es una decisión de producto
  (open-core, funciones de pago) y no está codificada en la licencia. Antes de lanzar cobros reales o
  contratos comerciales, revisar el texto de la licencia con una persona abogada.

Naming, formato, estrategia de tests y estructura de carpetas de código: _por definir._

## Estructura

```
app/                  Frontend Next.js (App Router)
  app/[idioma]/       Rutas por idioma: inicio, artículo, login, panel, usuarios, error y 404
  app/api/            Route Handlers del BFF (auth y proxy de /api/admin/* con la cookie)
  app/_componentes/   Componentes de servidor y cliente de las pantallas de Next
  proxy.ts            Guardia del panel en el borde + CSP con nonce (antes middleware.ts)
  src/components/     Componentes reutilizados (Tabs, Modal, formularios, chips, iconos, acordeón)
  src/bff/            Cookies httpOnly y cliente del panel (apiFetch)
  src/seguridad/      Construcción de la CSP
  src/data/{es,pt}/   Contenido tipado por idioma (alimenta el seed y los tests de paridad)
  src/i18n/           i18next: traductor isomórfico, traducciones y rutas
  src/types.ts        Contrato de datos
api/                  Backend FastAPI (modelos, routers, auth, seed, tests; ver api/README.md)
docker-compose.yml    PostgreSQL + pgvector (levanta la base de datos)
.claude/agents/       Subagentes del proyecto (vacío, reservado)
.claude/skills/       Skills del proyecto: crear-pr (flujo de PR) y los de OpenSpec
design/               Prototipo visual de referencia (Figma Make, .zip)
docs/architecture/    Diagramas C4: contexto (nivel 1) y contenedores (nivel 2)
docs/plans/           Planes de implementación (frontend, backend, RAG, infraestructura)
openspec/changes/     Cambios activos de OpenSpec (propuesta, diseño, specs, tareas)
openspec/changes/archive/  Cambios ya implementados y archivados
openspec/specs/       Especificaciones vigentes del sistema
prompts/              Prompts usados para generar entregables
```

Las pantallas consumen el contenido a través de `src/data/`: el público en servidor con
`src/data/servidor.ts` (Server Components) y el panel con `src/bff/apiFetch.ts` (BFF por cookie). Ese es el
punto por el que el contenido ficticio quedó sustituido por la API sin tocar componentes ni su ARIA.

El flujo de integración es `/crear-pr`: prepara rama, commit y Pull Request, y espera aprobación antes de
ejecutar nada.

`prompts/prompt_diseno_centro_ayuda.md` es la fuente de la verdad del diseño: define las 4 pantallas
(inicio, artículo, chatbot con citas, panel interno de preguntas sin resolver), el sistema de diseño y
los requisitos de accesibilidad. Consultarlo antes de proponer UI.

## Comandos

Desde `app/`:

```bash
npm install        # una sola vez
npm run dev        # servidor de desarrollo Next en http://localhost:3000
npm run build      # comprueba tipos y compila la app de producción (next build)
npm start          # sirve la compilación de producción (next start)
npm test           # tests con Vitest (una pasada)
npm run test:watch # tests en modo continuo
```

Se usa **npm**, no pnpm: pnpm no está instalado en la máquina de desarrollo. No hay linter. En desarrollo
Next reescribe `/api/(es|pt)/*` al backend (`127.0.0.1:8000`); el panel usa los Route Handlers del BFF.

**Tests del frontend: Vitest, solo lógica pura.** Corren en entorno `node`, sin DOM: cubren `src/data/`,
`src/i18n/`, `src/types.ts`, `src/auth/nivel.ts`, `src/bff/cookies.ts`, `src/seguridad/csp.ts` y
`src/panel/panelPestanas.ts`. Lo que necesita `fetch` lo sustituye por dobles en el propio test. Los
componentes y los Route Handlers **no** se prueban con Vitest: eso exigiría jsdom/Testing Library (o el
runtime de Next) y se decidió no introducirlos por ahora. Los archivos son `src/**/*.test.ts`, junto al
código que prueban.

`src/data/contenido.test.ts` es aparte: no prueba funciones sino **invariantes del contenido** de
`src/data/{es,pt}` (enlaces de `relacionados`, citas del chat, fechas ISO, paridad es/pt). Ese contenido
alimenta el seed del backend, así que un artículo en un solo idioma se propagaría a la API. Está escrito
para que añadir o traducir artículos no lo rompa; olvidarse de un idioma sí.

La configuración vive en **`vitest.config.ts`**. Vitest necesita Vite instalado (por eso `vite` sigue en
`devDependencies` aunque ya no haya empaquetado de Vite propio); corre en entorno `node` y solo resuelve el
alias `@` → `src`, sin plugins de React ni Tailwind, porque prueba `.ts` sin JSX.

Backend (desde `api/`, con la base de datos levantada por `docker compose up -d`):

```bash
pip install -e ".[dev]"                 # dependencias (en un entorno virtual)
alembic upgrade head                    # esquema + extensión pgvector
node ../app/scripts/exportar-datos.mjs  # exporta el contenido TS a JSON para el seed
python seed.py                          # carga el contenido y siembra el admin
uvicorn app.main:app --reload           # API en http://localhost:8000
pytest                                  # pruebas del backend (SQLite en memoria)
```

El detalle está en `api/README.md`. En desarrollo hay que tener los tres procesos vivos: `docker compose
up -d` (Postgres), `uvicorn` en `api/` y `npm run dev` en `app/`.

## Reglas

- **Todo comando lo aprueba o lo ejecuta la persona desarrolladora.** Claude no ejecuta comandos por su
  cuenta: los propone y espera aprobación explícita, o los deja escritos para que se ejecuten a mano. Esto
  incluye instalaciones, scripts, herramientas de compilación y cualquier operación de git.
- **Ante ambigüedad en un prompt, entrar de inmediato en modo entrevista.** Si el encargo admite lecturas
  que llevarían a trabajos distintos, Claude pregunta antes de avanzar en lugar de elegir una
  interpretación y seguir. No se resuelve la duda con suposiciones.
- **No se hace commit directo.** Los cambios se integran mediante Pull Request, y el flujo se ejecuta a
  través de un SKILL, nunca con comandos de git sueltos. Tampoco se hace push a `main`.
- **No asumir el stack.** El stack del backend ya está decidido (FastAPI + PostgreSQL/pgvector + auth
  argon2/JWT; ver Stack › Backend), pero cualquier framework, dependencia o estructura **nuevos** se
  preguntan antes de introducirlos.
- **No editar ni descomprimir dentro del repo** el `.zip` de `design/`: es un artefacto de referencia.
- Mantener este archivo actualizado a medida que se definan stack, comandos y convenciones.
