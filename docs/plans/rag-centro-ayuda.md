# RAG — implementado

La capa RAG **está implementada**. Este documento, que originalmente describía el punto de extensión
antes de construirla, ahora deja constancia de cómo quedó: la migración inicial ya ejecutaba
`CREATE EXTENSION IF NOT EXISTS vector`, y sobre esa base se construyeron el índice de fragmentos, la
recuperación vectorial, el chat con citas (`chat-rag-portal`) y las sugerencias de artículo asistidas por
IA (`sugerir-articulos-ia`).

## Tablas: `articulo_chunks`, `documento_chunks` y `documentos`

Migración `api/alembic/versions/0008_rag_chunks.py`. El fragmento no vive en una sola tabla como preveía
el diseño original: son **dos tablas de chunks**, una por artículo (bilingüe, un fragmento por idioma) y
otra por documento subido, más la tabla de metadatos del documento.

`articulo_chunks` (`api/app/models.py`, clase `ArticuloChunk`):

| columna       | tipo                    | notas                                                          |
| ------------- | ----------------------- | --------------------------------------------------------------- |
| `id`          | `integer` PK            | autoincremental                                                 |
| `portal_id`   | `string` FK → portales  | denormalizado, indexado, para acotar toda recuperación al tenant |
| `articulo_id` | `string`                | FK compuesta `(portal_id, articulo_id)` → `articulos`, `ON DELETE CASCADE` |
| `idioma`      | `string`                | `es` / `pt`; cada traducción se trocea e indexa por separado    |
| `orden`       | `integer`               | posición del fragmento dentro del artículo                      |
| `contenido`   | `text`                  | el texto del fragmento (lo que se embebe)                       |
| `embedding`   | `vector(1024)`          | `pgvector`; `EMBEDDING_DIM` en `api/app/rag.py`                 |

`documento_chunks` (clase `DocumentoChunk`) tiene la misma forma pero cuelga de `documento_id` (FK →
`documentos.id`, `ON DELETE CASCADE`) en lugar de `articulo_id`/`idioma`: los documentos subidos no se
trocean por idioma, solo `Documento.idioma` registra `es` / `pt` / `ambos` a nivel de archivo.

`documentos` (clase `Documento`) guarda los metadatos del archivo subido para RAG por portal: `id`,
`portal_id`, `nombre`, `mime`, `idioma`, `estado` (`pendiente → procesando → listo | error`),
`error_detalle`, `bytes`. El binario **no se persiste**: se descarta tras extraer el texto.

`VectorType` (`api/app/models.py`) resuelve a `pgvector.sqlalchemy.Vector(EMBEDDING_DIM)` en PostgreSQL,
con `.with_variant(JSON(), "sqlite")` como fallback para que los tests no necesiten la extensión
instalada.

**Dimensión y proveedor:** `EMBEDDING_DIM = 1024` (`api/app/rag.py`), dimensionado para `voyage-3` de
Voyage AI por su buen desempeño multilingüe es/pt y menor huella que los 1536 de OpenAI. El docstring de
la propia migración `0008_rag_chunks.py` quedó desactualizado (dice que la dimensión corresponde a
`text-embedding-3-small` de OpenAI); el esquema real que se crea hoy usa la constante viva de `app.rag`,
es decir 1024, no 1536.

**Índices de similitud:** `ix_articulo_chunks_embedding_hnsw` e `ix_documento_chunks_embedding_hnsw`,
ambos `USING hnsw (embedding vector_cosine_ops)`, elegido sobre IVFFlat por no requerir `ANALYZE` ni
reentreno de listas. Más índices `btree` por `portal_id` en las tres tablas y por
`(portal_id, articulo_id)` en `articulo_chunks`.

## Re-embedding al escribir (ingesta)

El punto de extensión ya no está en `app/servicios.py::aplicar_datos_articulo` (que sigue siendo solo el
volcado de campos del artículo, sin disparar nada) sino en el módulo dedicado **`api/app/ingesta.py`**:

- `reindexar_articulo(portal_id, articulo_id)` — borra los `ArticuloChunk` existentes y los reemplaza en
  una sola transacción: extrae texto, trocea (`api/app/troceo.py`) y embebe en batch con el
  `ProveedorEmbeddings` configurado. Si el proveedor falla, hace `rollback` y deja el índice previo
  intacto; no rompe el guardado del artículo.
- `borrar_fragmentos_articulo(portal_id, articulo_id)` — delete explícito de `ArticuloChunk` (no depende
  solo del `ON DELETE CASCADE`, para que la ausencia de huérfanos sea observable en tests bajo SQLite).
- `ingerir_documento(documento_id, contenido: bytes)` — pipeline de documentos subidos: extraer → trocear
  → embeber → persistir `DocumentoChunk`, transicionando `Documento.estado`.

Se dispara con `BackgroundTasks` de FastAPI desde los routers, no de forma síncrona en el CRUD:

- `api/app/routers/admin_articulos.py` — crear y actualizar artículo encolan `reindexar_articulo`; borrar
  llama a `borrar_fragmentos_articulo` de forma síncrona (es rápida) antes del delete.
- `api/app/routers/admin_sugerencias.py` — aceptar una sugerencia crea el artículo y encola
  `reindexar_articulo` igual que el alta normal.
- `api/app/routers/admin_documentos.py` — subir documento encola `ingerir_documento`; eliminar borra
  `DocumentoChunk` explícitamente además del `Documento`.

**Hueco conocido:** `crear_articulo_desde_pregunta` en `api/app/routers/admin_panel.py` (alta de artículo
desde el ciclo de preguntas sin resolver) llama a `aplicar_datos_articulo` pero no encola
`reindexar_articulo`. Un artículo creado por esa ruta queda publicado sin fragmentos RAG hasta que se
edite por el CRUD normal, que sí re-indexa.

## Recuperación vectorial

`api/app/recuperador.py`, función pública `recuperar(consulta, idioma, portal_id, db)`:

- Embebe la consulta con el mismo proveedor configurado que la ingesta.
- Bifurca por dialecto: en PostgreSQL usa `embedding.cosine_distance(vector)` de pgvector (operador
  `<=>`, con dos consultas separadas —una por tabla— para aprovechar cada índice HNSW, fusionadas y
  ordenadas en Python); en SQLite (tests) cae a un fallback en Python que calcula coseno a mano con la
  misma firma pública.
- **Acotado por `portal_id`** en ambas ramas: el `portal_id` llega solo del router, nunca del cliente, y
  se filtra en el `WHERE` de cada tabla. `articulo_chunks` se filtra además por `idioma`; `documento_chunks`
  no lleva ese filtro (el idioma vive en `Documento`, no en el chunk).
- Umbral de similitud (`settings.rag_umbral_similitud`, default `0.28`) y top-k
  (`settings.rag_top_k`, default `6`) en `api/app/config.py`. Sin resultados por encima del umbral →
  veredicto `sin_resultados`; fallo del embedder → veredicto `error_proveedor` (nunca se expone el
  detalle del proveedor al cliente).
- Cada `FragmentoRecuperado` guarda su `portal_id` para que el consumidor (chat o sugerencias) pueda
  revalidar que ninguna cita cruzó de tenant, en defensa en profundidad sobre el filtro de la consulta.

## Endpoint: chat con RAG por portal

No existe el `GET /api/{idioma}/buscar` que preveía el diseño original. La recuperación semántica se
consume desde dos flujos, no desde una ruta de búsqueda independiente:

**`POST /api/{idioma}/chat/consultar`** (`api/app/routers/chat.py`, Anonymous, portal resuelto por host).
El pipeline (`api/app/chat.py`, función `responder` → `_ejecutar_pipeline`):

1. Corto-circuito a `escalar` si `solicitar_soporte: true`, sin llamar al proveedor.
2. Clasificador de scope (LLM, `temperature=0`, `max_tokens=5`); ante fallo del proveedor se asume
   `en_scope` (política conservadora).
3. Caché de aplicación (`api/app/cache_chat.py`, LRU + TTL) consultada tras el clasificador; solo cachea
   `respondida` y revalida la existencia de cada recurso citado antes de servir el hit.
4. Recuperación vía `recuperar(...)`. `sin_resultados` alimenta una política de escalamiento por turnos
   consecutivos vacíos.
5. Generación con JSON estricto (prompt de sistema con reglas de brevedad, `MAX_TOKENS_CHAT=512`),
   validada con Pydantic `extra="forbid"`.
6. Validación de citas: cada índice citado debe apuntar a un fragmento entregado en el turno **y** su
   `portal_id` debe coincidir con el del host; cualquier cita fantasma o cruzada de portal invalida la
   respuesta entera → `sin_resultados`.
7. Recorte suave por caracteres (`settings.chat_longitud_max_chars`) solo si el veredicto es
   `respondida`.
8. Persistencia de la traza en `chat_interaccion` (`api/app/persistencia_chat.py`).

Separación instrucción/dato con delimitador de nonce aleatorio por petición
(`secrets.token_urlsafe(9)`), saneado para que el texto del usuario no pueda cerrar la etiqueta.

## Sugerencias de artículo asistidas por IA

**`POST /api/admin/sugerencias/generar`** (nivel ≥ Editor, `api/app/routers/admin_sugerencias.py`) es el
segundo consumidor del recuperador. `api/app/sugerencias.py` define tres agregadores por portal:

- Chats escalados (`veredicto="escalar"`), agrupados por consulta normalizada.
- Preguntas sin resolver, cruzadas con interacciones de chat en `sin_resultados`.
- Huecos de documentación RAG: para cada `Documento` en estado `listo`, compara cada `DocumentoChunk`
  contra el `ArticuloChunk` más cercano del portal; si la mayoría de fragmentos del documento no tiene
  artículo cercano (umbral `0.35`), el documento entero es candidato.

`generar_borrador` reutiliza `recuperar(...)` del chat, redacta el borrador en español con
`proveedor_chat` (JSON estricto, `MAX_TOKENS_SUGERENCIA=2048`), valida y cruza las citas contra
fragmentos + `portal_id` —a diferencia del chat, aquí una cita inválida solo se descarta, no invalida el
borrador entero—, traduce a portugués con `proveedor_traduccion`, y persiste `SugerenciaArticulo` en
estado `pendiente`. Mismo patrón de delimitador con nonce que el chat. Al **aceptar** una sugerencia se
crea el artículo real por el alta ya existente y se encola `reindexar_articulo`; al **descartar**, no se
publica ni indexa nada.

## Configuración de proveedores de IA

`ConfigIA` (tabla `config_ia`, fila única) separa tres roles independientes: `proveedor_chat`,
`proveedor_traduccion`, `proveedor_embeddings`. Las claves viven cifradas (Fernet) en `config_ia_clave`,
una fila por proveedor. Motores reales hoy (`api/app/servicios_ia.py`):

- **Chat:** DeepSeek (único).
- **Traducción:** Anthropic o DeepSeek.
- **Embeddings:** Voyage AI (default) o cualquier proveedor OpenAI-compatible (p. ej. OpenAI), mismo
  cliente reutilizado cambiando solo `base_url`/modelo/clave.

SuperAdmin configura cada rol por separado en el panel; el `PUT` de administración rechaza con 422
cualquier asignación de rol → proveedor sin motor real.
