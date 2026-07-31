# Spec

Infraestructura preliminar para publicar el Centro de Ayuda en una URL en vivo.

## Problema

Hoy el Centro de Ayuda solo corre en local: el frontend de Vite (`app/`) y el backend de FastAPI (`api/`)
funcionan con `npm run dev` y `uvicorn` contra una base de datos que levanta `docker-compose.yml`. No hay
ninguna URL pública que evaluar, ni `Dockerfile`, ni configuración de hospedaje.

Dos hechos del código condicionan cada decisión. Primero, el frontend está acoplado a un **`/api` del mismo
origen**: todas las llamadas usan rutas relativas, la API no tiene middleware CORS y no existe una URL de API
configurable. Segundo, el backend requiere **PostgreSQL con la extensión `pgvector`**, exigida por el RAG
futuro del capstone. El objetivo es una **URL en vivo solo con *free tier***, sin cerrarle la puerta al RAG —
así que el despliegue debe conservar el mismo origen y ofrecer un almacén vectorial persistente.

## Criterios de aceptación (EARS)

### URL pública y free tier

1. El sistema DEBE ser accesible en una URL pública sobre HTTPS con certificado válido, sin pasos manuales en
   la máquina de la persona evaluadora.
2. CUANDO se llama a `GET /api/salud` contra la URL pública, el sistema DEBE responder `200` con cuerpo
   `{"estado":"ok"}`.
3. El sistema DEBE operar por completo en los niveles gratuitos de los proveedores y NO DEBE incurrir en
   cargos.

### Contenedor único mismo-origen

4. El sistema DEBE servir el SPA compilado (`app/dist`) y la API `/api` desde un **único origen** (mismo host
   y puerto).
5. CUANDO el frontend llama a `/api/...`, el sistema DEBE resolverlo en el mismo origen, sin cabeceras CORS y
   sin una URL de API configurable.
6. CUANDO se abre directamente o se recarga una ruta del cliente (p. ej. `/es/articulo/algún-id`), el sistema
   DEBE devolver `index.html` para que el router del cliente resuelva la vista, nunca un `404`.
7. Las rutas `/api` DEBEN tener precedencia sobre el *catch-all* de estáticos.

### Base de datos gestionada con pgvector

8. El sistema DEBE usar un PostgreSQL gestionado en *free tier* con la extensión `pgvector` habilitada y
   almacenamiento persistente, configurado mediante `DATABASE_URL`.
9. CUANDO se aplican las migraciones sobre la base de datos gestionada, la extensión `vector` DEBE existir y
   las columnas vectoriales DEBEN crearse sin error.
10. CUANDO el contenedor se reinicia o se reanuda tras una pausa por inactividad, los datos previamente
    sembrados y creados DEBEN persistir.
11. La base de datos de producción NO DEBE depender de `docker-compose.yml`, reservado para desarrollo local.

### Arranque idempotente de esquema y datos

12. Antes de atender tráfico, el sistema DEBE ejecutar `alembic upgrade head` y sembrar el contenido y el
    administrador inicial contra la base de datos gestionada.
13. CUANDO se despliega de nuevo sobre una base ya inicializada, el arranque DEBE terminar sin error y NO DEBE
    duplicar el contenido ni el administrador.

### Secretos fuera del repositorio

14. El sistema DEBE cargar `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` desde las variables
    de entorno del proveedor.
15. El repositorio NO DEBE contener valores reales de secretos; `api/.env.example` DEBE enumerar las variables
    sin valores.

### RAG-ready (sin construir)

16. El sistema DEBE ofrecer un almacén `pgvector` persistente listo para alojar *embeddings* futuros.
17. Este cambio NO DEBE incluir lógica de RAG ni fijar la estrategia de cómputo de *embeddings*; SI se añade
    una capacidad de RAG más adelante, ENTONCES DEBE definirse en su propio cambio OpenSpec.

## Ejemplos

| Entrada | Resultado esperado |
|---|---|
| Abrir la URL pública | Pantalla de Inicio servida sobre HTTPS con certificado válido |
| `GET /api/salud` en la URL pública | `200 {"estado":"ok"}` (JSON, no `index.html`) |
| Recargar `/pt/articulo/prazos-de-devolucao` | Se sirve `index.html`, el router del cliente resuelve — sin `404` |
| Segundo despliegue sobre una base sembrada | Migración + seed convergen; sin duplicados, sin error |
| Reinicio / reanudación tras pausa | El contenido y el administrador previos siguen presentes |
| `DATABASE_URL` sin definir al arrancar | La app falla rápido con error de configuración en vez de servir rota |

## Edge Cases

- **El *catch-all* de estáticos tapa la API** → los routers `/api` se registran **antes** de montar
  `StaticFiles`; `GET /api/salud` debe devolver JSON, no `index.html`.
- **Seed no idempotente** → un segundo despliegue fallaría por restricciones de unicidad; el seed debe
  protegerse contra datos ya sembrados.
- **Arranque en frío de Render free** → el web service duerme tras ~15 min de inactividad; la primera petición
  tarda 30–60 s.
- **Pausa por inactividad de Supabase** → el proyecto se pausa tras 7 días sin queries y se reanuda en la
  siguiente petición; un *ping* programado ligero puede mantenerlo caliente durante la evaluación.
- **Falta `app/dist` en la imagen** → el sitio queda en blanco; la etapa de build de Docker debe producir
  `dist` antes de que la etapa de la API lo copie.
- **Desajuste de driver / TLS con Supabase** → la cadena de conexión debe usar `postgresql+psycopg://` con
  `sslmode=require`.

## Que NO hacer

- **Nada de hospedaje partido**: sin CDN de frontend separado del host de la API, sin CORS, sin URL de API
  configurable — el contenedor único mismo-origen es justamente el punto.
- **Nada de Supabase Auth, Storage ni Edge Functions**: Supabase se usa **solo** como Postgres gestionado; se
  conserva la autenticación argon2 + JWT de la app.
- **Nada de RAG**: sin *embeddings*, sin llamadas a modelos, sin scripts de ingesta — solo un almacén
  `pgvector` persistente.
- **Sin Postgres free de Render**: caduca a los 30 días; la base de datos vive en Supabase.
- **Sin secretos reales en el repo**: `.env` sigue git-ignored; `api/.env.example` lista las variables sin
  valores.
- **Sin commit directo**: la integración va por Pull Request mediante `/crear-pr`.

## Stack permitido

| Pieza | Elección | Por qué |
|---|---|---|
| Host de contenedor | Render (web service *free*) | Despliegue por Git simple, TLS y URL pública automáticos, sin tarjeta |
| Base de datos | Supabase (Postgres + `pgvector`) | Único *free tier* con Postgres persistente que trae `pgvector` |
| Empaquetado | `Dockerfile` multietapa | Compila el SPA y ejecuta la API en una sola imagen |
| Servido de estáticos | FastAPI `StaticFiles(html=True)` | SPA + `/api` mismo-origen con *fallback* de rutas; sin CORS |
| Driver de BD | psycopg3 (`postgresql+psycopg://`) | Coincide con `api/app/config.py` existente |
| Autenticación | argon2 + JWT existente (`api/`) | Ya implementada; no se adopta Supabase Auth |

Alternativas *free tier* documentadas por si el arranque en frío o los recursos de Render resultan limitantes:
Koyeb (sin tarjeta, 512 MB), Google Cloud Run (requiere billing habilitado) o una VM Oracle Cloud Always Free
(sin *sleep*, más RAM — relevante si el RAG luego necesita modelos de *embeddings* locales). El razonamiento
completo y las alternativas están en `openspec/changes/infraestructura-despliegue/design.md`.

### Comandos

```bash
# Construir la imagen única mismo-origen (frontend + API) desde la raíz del repo
docker build -t centro-ayuda .

# Ejecutar en local contra Supabase (las variables aportan DATABASE_URL, JWT_SECRET, ADMIN_*)
docker run -p 8000:8000 --env-file api/.env centro-ayuda   # http://localhost:8000

# Render: crear un web service desde el repo (Docker), definir las variables de entorno, desplegar
```
