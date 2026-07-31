# Spec

Backend, CMS de artículos y autenticación del Panel Interno.

## Problema

El centro de ayuda servía **contenido estático** desde módulos TypeScript (`app/src/data/{es,pt}/`) y su
Panel Interno no tenía autenticación: nadie podía editar el contenido sin tocar el código y el botón
"Crear artículo" era decorativo. `app/src/types.ts` se diseñó desde el inicio como *"el contrato de esa
API"*, y el diseño del prototipo ya anticipaba un backend FastAPI detrás de `/api` y la futura capa RAG.

Hacía falta ese backend: una base de datos para los artículos, su CRUD administrable desde el panel, y un
login que restrinja el panel a administradores —sin perder el contenido existente ni romper el contrato que
ya consumen los componentes—, dejando la base preparada (pgvector) para el RAG **sin construirlo todavía**.

## Criterios de aceptación (EARS)

### API de contenido

1. El sistema DEBE exponer `GET /api/{idioma}/contenido` que devuelve el contenido del idioma con la misma
   forma que el contrato `ContenidoIdioma` (categorías, artículos, conversación, preguntas y métricas).
2. SI el segmento de idioma no es `es` ni `pt`, ENTONCES el sistema DEBE responder 404 sin devolver
   contenido de ningún idioma.
3. El JSON de la API DEBE coincidir campo a campo con el contrato, de modo que los componentes que hoy
   consumen `obtenerContenido(idioma)` funcionen **sin cambios** en su forma de leer datos.
4. El frontend DEBE obtener el contenido mediante **loaders de ruta** que lo cargan antes de renderizar; los
   componentes lo leen de forma síncrona y conservan su estructura y su accesibilidad.
5. SI la carga del contenido falla, ENTONCES el sistema DEBE mostrar un estado de error accesible con texto
   e icono, nunca una pantalla en blanco ni el color como único canal.

### CMS de artículos

6. El sistema DEBE almacenar los artículos con un identificador estable entre idiomas y una traducción por
   idioma (patrón entidad + traducciones), reproduciendo la forma de `types.ts`.
7. El contenido inicial existente DEBE migrarse a la base de datos **sin pérdida de campos** (párrafos,
   pasos HowTo, FAQ, relacionados, ambos idiomas).
8. CUANDO un administrador crea un artículo, el sistema DEBE exigir su contenido en español y portugués en
   la misma operación.
9. SI se intenta crear o editar un artículo con un solo idioma, ENTONCES el sistema DEBE rechazar la
   operación y no persistir nada.
10. CUANDO un administrador edita un artículo, el sistema DEBE mantener la paridad de idiomas y reflejar los
    cambios en las siguientes lecturas de la API.
11. CUANDO un administrador elimina un artículo, este DEBE dejar de aparecer en el contenido servido en
    ambos idiomas.
12. Toda operación de creación, edición o eliminación DEBE exigir sesión de administrador válida; sin ella
    el sistema DEBE rechazarla sin alterar los datos.
13. Los formularios de crear/editar DEBEN cumplir WCAG 2.2 AA: etiquetas visibles, foco visible, objetivo
    táctil de 44×44 px y errores con texto e icono, no solo color.

### Autenticación del panel

14. El sistema DEBE ofrecer login por correo y contraseña; las contraseñas DEBEN guardarse con hash argon2 y
    un login válido DEBE devolver un JWT.
15. SI las credenciales son incorrectas, ENTONCES el sistema DEBE rechazar el login con un mensaje genérico
    que no revele si falló el correo o la contraseña, y sin emitir token.
16. El Panel Interno DEBE ser accesible solo con sesión válida; CUANDO se accede sin sesión, el sistema DEBE
    redirigir al inicio de sesión.
17. SI una operación de escritura llega con credencial ausente o expirada, ENTONCES el sistema DEBE
    rechazarla con un error de autorización.
18. El sistema DEBE permitir cerrar la sesión, tras lo cual el acceso al panel vuelve a requerir login.
19. La pantalla de login DEBE cumplir WCAG 2.2 AA y anunciar el error a lectores de pantalla.

### Panel interno (KCS)

20. El sistema DEBE mostrar tres métricas: preguntas sin resolver, % de respuestas con cita y artículos
    creados a partir de preguntas.
21. El sistema DEBE listar las preguntas en una `<table>` con `<th scope="col">` y nombre accesible.
22. El sistema DEBE representar el estado con chips en tres valores (Nueva, En revisión, Cubierta), siempre
    con icono **y** texto además del color.
23. CUANDO un administrador activa "Crear artículo" sobre una pregunta, el sistema DEBE crear un artículo
    real y transicionar esa pregunta a estado **Cubierta**, incrementando la métrica de artículos creados.

### RAG (preparado, no construido)

24. La migración inicial DEBE habilitar la extensión **pgvector** desde el primer despliegue.
25. El sistema NO DEBE construir el RAG en este cambio: solo queda documentada la tabla futura
    `articulo_chunks` y el punto de re-embedding, sin tabla ni endpoints de embeddings/búsqueda.

### Transversal (seguridad y accesibilidad)

26. Todo el frontend nuevo (login, formularios, estados) DEBE cumplir WCAG 2.2 AA: teclado, foco visible de
    2 px, contraste 4.5:1 / 3:1, objetivos 44×44 px y estados nunca solo por color.
27. Los secretos (cadena de conexión, secreto JWT, credenciales de admin) DEBEN vivir en el entorno
    (`.env` ignorado), nunca en el repositorio.

## Ejemplos

| Entrada | Resultado esperado |
|---|---|
| `GET /api/es/contenido` | `ContenidoIdioma` completo del español |
| `GET /api/fr/contenido` | 404 (idioma no admitido) |
| `POST /api/auth/login` con credenciales válidas | `{ access_token, token_type: "bearer" }` |
| `POST /api/auth/login` con contraseña incorrecta | 401 con mensaje genérico |
| `POST /api/admin/articulos` sin token | 401 |
| `POST /api/admin/articulos` con solo `es` | 422 (falta el otro idioma) |
| `POST /api/admin/preguntas-sin-resolver/{id}/crear-articulo` | 201 y la pregunta pasa a `cubierta` |
| Navegar a `/es/panel` sin sesión | Redirige a `/es/login` |
| Crear un artículo es+pt desde el panel | Aparece en inicio y en su categoría, en ambos idiomas |

## Edge Cases

- **Token expirado o inválido** → 401; el cliente borra el token local y el panel vuelve a pedir login.
- **Identificador de artículo duplicado al crear** → 409, no se sobreescribe.
- **`id` enviado en el cuerpo de un PUT** → se rechaza (el `id` va en la dirección; el esquema de
  actualización prohíbe campos extra).
- **Editar o eliminar un artículo inexistente** → 404, no error de servidor.
- **Métricas `conCita` y `creados` no derivables** (no hay registro de actividad del chat) → se **guardan
  sembradas** con los valores actuales, en vez de derivarlas por consulta.
- **Seed repetido** → es idempotente: vacía y repuebla el contenido; el admin se crea solo si no existe.
- **Artículo relacionado o cita apuntando a un identificador inexistente** → se omite en el render (igual
  que en el prototipo), no rompe la pantalla.

## Que NO hacer

- **Nada de RAG construido**: solo habilitar `pgvector` y documentar el punto de extensión. Sin embeddings,
  base vectorial poblada, búsqueda semántica ni ingesta.
- **No permitir artículos en un solo idioma**: crear/editar exige es+pt juntos.
- **No revelar** en el login si falló el correo o la contraseña.
- **No guardar contraseñas en claro** ni secretos en el repositorio.
- **No romper el contrato `ContenidoIdioma`**: el JSON de la API debe seguir encajando con `types.ts`.
- **No dejar el panel accesible sin sesión** ni las escrituras sin protección.
- **No perder contenido** al migrar: el seed parte del contenido actual de `app/src/data`.
- **No ejecutar comandos sin aprobación** ni hacer commit directo: la integración va por `/crear-pr`.

## Stack permitido

| Pieza | Elección | Por qué |
|---|---|---|
| Backend | FastAPI + Python | Ecosistema RAG maduro para el futuro; Pydantic reproduce `types.ts` y Vite proxya `/api` |
| ORM / migraciones | SQLAlchemy 2 + Alembic | Modelo bilingüe entidad + traducciones; migración con `CREATE EXTENSION vector` |
| Esquemas / validación | Pydantic 2 + pydantic-settings | Contrato campo a campo con el frontend; configuración por entorno |
| Base de datos | PostgreSQL + pgvector | Una sola base para lo relacional y, más adelante, los vectores del RAG |
| Driver | psycopg 3 | Conector recomendado para SQLAlchemy 2 con PostgreSQL |
| Auth | argon2-cffi + PyJWT | Hash de contraseñas robusto y JWT de vida corta para el panel |
| Tests | pytest (SQLite en memoria) | Prueban login, protección de `/api/admin/*` y CRUD sin depender de Postgres |
| Frontend (datos) | Loaders de react-router-dom 7 | Absorben el paso síncrono→asíncrono sin tocar componentes ni su ARIA |
| Infra local | Docker Compose | Levanta Postgres+pgvector en un comando |

### Comandos

Arranque diario (detalle en `api/README.md`):

```powershell
docker compose up -d                    # Postgres + pgvector (los datos persisten)
cd api
.venv\Scripts\Activate.ps1              # entorno virtual
uvicorn app.main:app --reload           # API en http://localhost:8000
```

```powershell
cd app
npm run dev                             # frontend en http://localhost:5173 (proxya /api)
```

Pruebas del backend: `cd api && pytest` (SQLite en memoria, no requiere Postgres).
