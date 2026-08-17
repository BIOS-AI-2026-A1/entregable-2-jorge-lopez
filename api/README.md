# Backend — Centro de Ayuda API

FastAPI + PostgreSQL (pgvector). Sirve el contenido bilingüe, el CRUD de artículos y la autenticación del
panel interno. Es **multi-tenant por portal** (cambio OpenSpec `multi-tenant-portales`): una sola instalación
sirve a varios clientes discriminando todos los datos por `portal_id`, y el portal se resuelve **del host de
la petición** (ver "Resolución de portal y proxy de confianza"). El control de acceso tiene cuatro niveles
jerárquicos `SUPERADMIN=4 > ADMINISTRADOR=3 > EDITOR=2 > ANONIMO=1`; `requiere_nivel` exige nivel suficiente
**y** pertenencia al portal del host (recurso de otro portal por id directo → 404). El RAG queda diseñado
(ver `../docs/plans/rag-centro-ayuda-preliminar.md`), no construido.

## Arranque diario (cada sesión)

Lo único que hay que hacer cada día para levantar el backend. Los datos persisten en el volumen de Docker,
así que **no** hay que volver a migrar ni sembrar.

```powershell
# Desde la raíz del repo
docker compose up -d                    # 1. arranca Postgres (los datos siguen ahí)

cd api
.venv\Scripts\Activate.ps1              # 2. activa el entorno virtual (PowerShell)
uvicorn app.main:app --reload           # 3. API en http://localhost:8000  (docs en /docs)
```

En otra terminal, el frontend (proxya `/api` al backend):

```powershell
cd app
npm run dev                             # http://localhost:5173
```

Para parar al final del día: `Ctrl+C` en cada terminal y, si se quiere, `docker compose stop`.
**Importante:** nunca uses `docker compose down -v` — el `-v` borra el volumen y con él todos los datos.

## Configuración inicial (una sola vez)

Estos pasos ya no se repiten salvo cambios (nueva migración, cambio de contenido o reinicio de la base).

```powershell
docker compose up -d                              # base de datos (Postgres + pgvector)

cd api
python -m venv .venv                              # crear el entorno virtual
.venv\Scripts\Activate.ps1                        # (Git Bash: source .venv/Scripts/activate)
pip install -e ".[dev]"                           # dependencias del backend

copy .env.example .env                            # y ajustar JWT_SECRET y ADMIN_PASSWORD

alembic upgrade head                              # esquema + extensión vector
node ../app/scripts/exportar-datos.mjs            # contenido TS → JSON (o, en app/: npm run exportar-datos)
python seed.py                                    # carga el contenido y siembra el admin
```

Cuándo repetir algún paso de esta sección:

- **Nueva migración** → `alembic upgrade head`.
- **Cambió el contenido de `app/src/data`** → `node ../app/scripts/exportar-datos.mjs` y `python seed.py`.
- **Quieres resetear la base** → `docker compose down -v` (borra datos) y repetir esta sección entera.

## Pruebas

```powershell
cd api
.venv\Scripts\Activate.ps1
pytest                                            # SQLite en memoria, no requiere Postgres
```

## Resolución de portal y proxy de confianza (multi-tenant)

El backend es **multi-tenant por host**: cada petición se atribuye a un portal (tenant) resolviendo su
**host**, y esa es la **única** fuente del portal. Nunca se toma de un parámetro de ruta/query, del cuerpo,
ni de una cabecera de aplicación que pueda fijar el cliente (`deps.py::portal_actual` →
`portales.py::resolver_portal`). Un host desconocido responde `404` y un portal suspendido `503`; jamás se
sirve el contenido de otro portal ni el de un portal por defecto.

### Cómo llega el host al backend

El frontend de Next es el **proxy inmediato** del backend. Como sus llamadas van al origen interno
(`127.0.0.1:8000`), el `Host` que vería el backend sería ese origen interno, que no identifica ningún
portal. Por eso Next reenvía el host del navegador en **`X-Forwarded-Host`** (`app/src/bff/portal.ts`), y el
backend lo **prefiere** sobre `Host` (`deps.py::_host_de_confianza`, tomando solo el primer valor de la
lista, el del cliente). En llamadas directas sin proxy (p. ej. los tests) se cae a `Host`.

### Configuración del proxy de confianza (producción) — evitar suplantación de portal

`X-Forwarded-Host` es **suplantable por definición**: cualquier cliente puede enviarlo. La resolución de
portal es segura **solo si el backend nunca es alcanzable sin pasar por el proxy de confianza**, de modo que
ese valor lo fije siempre el borde a partir del `Host` real y no un atacante. Configuración requerida al
desplegar:

1. **El backend no se expone a Internet.** Escucha en loopback o en una red privada; el único que puede
   llegar a él es el frontend de Next (Route Handlers del BFF). Si el backend fuera público, un cliente
   podría mandar `X-Forwarded-Host: portal-victima.tuapp.com` y leer/escribir en el portal de otro.
2. **El borde reescribe `X-Forwarded-Host` desde el `Host` real**, sin propagar el que mandara el cliente:
   `cabecerasPortal()` lo construye a partir del `Host` entrante de confianza (el host público servido por
   el proveedor), no de un `X-Forwarded-Host` recibido. Si se antepone otro proxy (CDN/balanceador), debe
   **descartar** cualquier `X-Forwarded-Host`/`X-Forwarded-*` entrante del cliente y ponerlo él.
3. **Un solo salto de confianza.** Se lee solo el primer valor de `X-Forwarded-Host`; no se encadenan
   proxies que añadan saltos no confiables antes del borde.

Con esas tres condiciones, el host efectivo es siempre el que el proveedor asignó al portal, no uno elegido
por el cliente. El comodín TLS `*.tuapp.com` y el diseño de dominios propios (ACME por dominio) quedan como
fase posterior (ver `infraestructura-despliegue`).

## Estructura

```
app/
  main.py            App FastAPI y montaje de routers
  config.py          Configuración por entorno (pydantic-settings)
  database.py        Motor, sesión y Base declarativa
  models.py          Modelos SQLAlchemy (patrón bilingüe; Portal + portal_id en todas las entidades)
  schemas.py         Esquemas Pydantic (reproducen app/src/types.ts)
  security.py        Hash argon2 + JWT; enum de niveles (SUPERADMIN..ANONIMO)
  deps.py            Dependencias: admin_actual, requiere_nivel y portal_actual (resuelve el portal del host)
  portales.py        Resolución host → portal (dominios, subdominio base, slugs reservados)
  servicios.py       Ensamblado de contenido y escritura de artículos (acotado al portal)
  routers/           contenido, comun, marca, auth, admin_articulos, admin_categorias, admin_usuarios,
                     admin_ajustes, admin_config_ia, admin_panel, admin_portales (gestión SuperAdmin)
alembic/             Migraciones (0001: extensión vector + tablas … 0006 portales, 0007 empresa en portal)
seed.py              Carga seed_data/*.json bajo el portal `default` y siembra su Administrador
tests/               pytest (contenido, auth, CRUD, aislamiento y gestión de portales)
```
