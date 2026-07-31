# Backend — Centro de Ayuda API

FastAPI + PostgreSQL (pgvector). Sirve el contenido bilingüe, el CRUD de artículos y la autenticación del
panel interno. El RAG queda diseñado (ver `docs/rag.md`), no construido.

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

## Estructura

```
app/
  main.py            App FastAPI y montaje de routers
  config.py          Configuración por entorno (pydantic-settings)
  database.py        Motor, sesión y Base declarativa
  models.py          Modelos SQLAlchemy (patrón bilingüe)
  schemas.py         Esquemas Pydantic (reproducen app/src/types.ts)
  security.py        Hash argon2 + JWT
  deps.py            Dependencia admin_actual (protege /api/admin/*)
  servicios.py       Ensamblado de contenido y escritura de artículos
  routers/           contenido, auth, admin_articulos, admin_panel
alembic/             Migraciones (0001: extensión vector + tablas)
seed.py              Carga seed_data/*.json y siembra el admin
tests/               pytest (contenido, auth, CRUD)
docs/rag.md          Diseño del RAG futuro (no implementado)
```
