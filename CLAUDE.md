# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

Proyecto capstone: una aplicación de **Centro de Ayuda**. Hoy existe un **prototipo frontend funcional**
en `app/` (las 4 pantallas, bilingüe, con datos ficticios). El **backend está planificado** —decisiones
tomadas, sin implementar aún— en el cambio OpenSpec `backend-cms-autenticacion`. Varias secciones de este
documento se irán completando a medida que se construya.

## Stack

El prototipo funcional vive en `app/`:

- **React 19 + TypeScript**, con **Vite 8** como servidor de desarrollo y empaquetador.
- **Tailwind CSS v4** mediante `@tailwindcss/vite`, sin archivo de configuración ni PostCSS.
- **react-router-dom 7** con el idioma en el primer segmento de la dirección (`/es/…`, `/pt/…`).
- **react-i18next** para las etiquetas de interfaz; el contenido vive en módulos tipados por idioma.
- Estado local con `useState`. El prototipo funciona **sin backend**: el contenido son módulos estáticos.

Se eligió este stack porque el prototipo de `design/` ya era una aplicación React funcional con la
accesibilidad resuelta: se portó en lugar de reescribirla. El razonamiento completo, con las alternativas
descartadas, está en `openspec/changes/archive/2026-07-28-prototipo-centro-ayuda/design.md`.

El `.zip` de `design/` sigue siendo **referencia visual**; no se edita ni se descomprime dentro del repo.

### Backend (implementado en `api/`, pendiente de ejecutar y validar)

Backend del cambio OpenSpec `backend-cms-autenticacion`, ya escrito en `api/` (modelos, routers, auth, seed
y tests) pero aún sin ejecutar ni integrar por PR. El razonamiento completo con alternativas está en el
`design.md` de ese cambio.

- **FastAPI + Python** (Pydantic + SQLAlchemy + Alembic). Se eligió Python por el RAG futuro; los esquemas
  Pydantic reproducen `src/types.ts` campo a campo y Vite proxya `/api`.
- **PostgreSQL + pgvector** como única base de datos (RAG-ready desde la primera migración), levantada con
  Docker Compose. Modelo bilingüe entidad estable + traducciones por idioma; `parrafos`/`how_to`/`faq` en
  JSONB; métricas del panel derivadas por consulta.
- **Autenticación de administrador:** correo + contraseña con hash **argon2** y sesión **JWT**. Protege
  `/api/admin/*` y restringe el Panel Interno (`/:idioma/panel`) a sesión válida.
- **Consumo desde el frontend** con **loaders de react-router-dom 7**: `src/data/index.ts` pasa a llamar a
  la API sin tocar componentes ni su ARIA.
- **Alcance:** API de contenido + CRUD de artículos + auth ahora; **RAG solo diseñado**, no construido.

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
app/                  Prototipo funcional (React + Vite)
  src/pages/          Inicio, artículo, panel interno y no encontrado
  src/components/     Componentes compartidos y widget de chat
  src/data/{es,pt}/   Contenido tipado por idioma (futuro contrato de la API)
  src/i18n/           Configuración de i18next, traducciones y rutas
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

Las pantallas consumen el contenido siempre a través de `src/data/index.ts`. Ese es el punto por el que se
sustituirá el contenido ficticio por la API sin tocar componentes (con loaders de router; ver el cambio
`backend-cms-autenticacion`).

El flujo de integración es `/crear-pr`: prepara rama, commit y Pull Request, y espera aprobación antes de
ejecutar nada.

`prompts/prompt_diseno_centro_ayuda.md` es la fuente de la verdad del diseño: define las 4 pantallas
(inicio, artículo, chatbot con citas, panel interno de preguntas sin resolver), el sistema de diseño y
los requisitos de accesibilidad. Consultarlo antes de proponer UI.

## Comandos

Desde `app/`:

```bash
npm install        # una sola vez
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # comprueba tipos (tsc --noEmit) y compila
npm run preview    # sirve la compilación de producción
npm test           # tests con Vitest (una pasada)
npm run test:watch # tests en modo continuo
```

Se usa **npm**, no pnpm: pnpm no está instalado en la máquina de desarrollo. No hay linter.

**Tests del frontend: Vitest, solo lógica pura.** Corren en entorno `node`, sin DOM: cubren `src/data/`,
`src/i18n/rutas.ts`, `src/i18n/config.ts`, `src/i18n/fechas.ts`, `src/types.ts` y `src/auth/sesion.ts`. Lo que necesita
`localStorage`, `navigator` o `fetch` los sustituye por dobles en el propio test. Los componentes **no** se
prueban: eso exigiría jsdom y Testing Library, y se decidió no introducirlos por ahora. Los archivos son
`src/**/*.test.ts`, junto al código que prueban.

`src/data/contenido.test.ts` es aparte: no prueba funciones sino **invariantes del contenido** de
`src/data/{es,pt}` (enlaces de `relacionados`, citas del chat, fechas ISO, paridad es/pt). Ese contenido
alimenta el seed del backend, así que un artículo en un solo idioma se propagaría a la API. Está escrito
para que añadir o traducir artículos no lo rompa; olvidarse de un idioma sí.

La configuración vive en **`vitest.config.ts`**, separada de `vite.config.ts` a propósito: Vitest trae
anidada su propia copia de Vite (rollup) y el proyecto usa Vite 8 (rolldown), así que compartir archivo
rompe los tipos de `Plugin`. El config de tests no carga los plugins de React ni de Tailwind porque no
hacen falta para probar `.ts` sin JSX.

Backend (desde `api/`, con la base de datos levantada por `docker compose up -d`):

```bash
pip install -e ".[dev]"                 # dependencias (en un entorno virtual)
alembic upgrade head                    # esquema + extensión pgvector
node ../app/scripts/exportar-datos.mjs  # exporta el contenido TS a JSON para el seed
python seed.py                          # carga el contenido y siembra el admin
uvicorn app.main:app --reload           # API en http://localhost:8000
pytest                                  # pruebas del backend (SQLite en memoria)
```

El detalle está en `api/README.md`. El frontend proxya `/api` al backend en desarrollo.

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
