# RAG — diseño preparado, no construido

La capa RAG **no se implementa** en este cambio. Aquí queda documentado el punto de extensión para
añadirla sin rehacer trabajo. La base ya está lista: la migración inicial ejecuta
`CREATE EXTENSION IF NOT EXISTS vector`, así que PostgreSQL puede almacenar vectores desde el día uno.

## Tabla futura: `articulo_chunks`

Cuando llegue el RAG, se añadirá (en una migración nueva) una tabla de fragmentos con su embedding:

| columna       | tipo                    | notas                                             |
| ------------- | ----------------------- | ------------------------------------------------- |
| `id`          | `integer` PK            | autoincremental                                   |
| `articulo_id` | `string` FK → articulos | fragmento de qué artículo                          |
| `idioma`      | `string`                | `es` / `pt` (los embeddings son por idioma)       |
| `orden`       | `integer`               | posición del fragmento dentro del artículo        |
| `contenido`   | `text`                  | el texto del fragmento (lo que se embebe)         |
| `embedding`   | `vector(N)`             | `pgvector`; `N` = dimensión del modelo de embedding |

Índice recomendado para búsqueda por similitud: HNSW o IVFFlat sobre `embedding`.

## Punto de extensión: re-embedding al escribir

El CRUD de artículos ya centraliza la escritura en `app/servicios.py::aplicar_datos_articulo`. Ese es el
único sitio donde un artículo cambia. Cuando exista el RAG, tras crear/editar/eliminar un artículo se
dispara la regeneración de sus chunks y embeddings (troceo del contenido + llamada al modelo de embeddings
+ upsert en `articulo_chunks`). Al estar la escritura en un único punto, añadir ese gancho no toca los
routers ni el frontend.

## Endpoint futuro: búsqueda semántica

`GET /api/{idioma}/buscar?q=...` embeberá la consulta y devolverá los artículos más cercanos por distancia
de vector, alimentando al chatbot con citas. No existe en este cambio.
