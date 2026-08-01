# ADR-0001: PostgreSQL con pgvector como base de datos única

**Estado:** Aceptada

## Contexto

El backend del Centro de Ayuda (`api/`) necesita persistir dos cosas de naturaleza muy distinta: el
contenido relacional bilingüe del centro de ayuda (categorías, artículos, traducciones, preguntas sin
resolver, métricas, usuarios administradores) y, en el futuro cercano, los vectores de un sistema de
recuperación aumentada por generación (RAG) sobre ese mismo contenido. El alcance actual del backend es
explícitamente "API de contenido + CRUD de artículos + auth ahora; RAG solo diseñado, no construido"
(`CLAUDE.md`).

Restricción de negocio: el RAG es la siguiente pieza del roadmap, no una hipótesis lejana — el propio
`CLAUDE.md` documenta que se eligió Python para el backend "por el RAG futuro". Introducir un motor de
datos distinto cuando llegue esa fase implicaría reescribir el modelo de persistencia y migrar todo el
contenido ya sembrado.

La evidencia en código confirma que la decisión ya está tomada, no solo planeada: `docker-compose.yml`
levanta un único servicio de base de datos con la imagen `pgvector/pgvector:pg16`; la primera migración
de Alembic ejecuta `CREATE EXTENSION IF NOT EXISTS vector` con el comentario explícito "RAG-ready: la
extensión queda disponible desde el inicio (aún no se usa)" (`api/alembic/versions/0001_inicial.py:23`);
y `api/app/config.py` fija por defecto la cadena de conexión `postgresql+psycopg://...`. Hoy, sin
embargo, ninguna tabla de `api/app/models.py` usa el tipo `vector`: la extensión está activa sin un solo
caso de uso real todavía.

## Decisión

Adoptamos PostgreSQL con la extensión `pgvector` como única base de datos del sistema, habilitada desde
la primera migración, antes de que exista ningún caso de uso de RAG. Todo el contenido relacional y, más
adelante, los embeddings de artículos vivirán en el mismo motor, sin una base de datos vectorial
separada.

## Alternativas consideradas

- **SQLite.** Descartada explícitamente en el diseño del cambio `backend-cms-autenticacion`: su soporte
  vectorial (`sqlite-vec`) es menos estándar que `pgvector`, y probablemente forzaría una migración a
  Postgres justo cuando llegue el RAG — el motivo documentado es evitar pagar dos veces el coste de
  migración (`openspec/changes/backend-cms-autenticacion/design.md`, referenciado desde `CLAUDE.md`).
  SQLite sí se usa hoy, pero solo en los tests (`api/tests/conftest.py`), nunca como base de producción.
- **Base de datos vectorial separada** (p. ej. un servicio dedicado de embeddings, desacoplado del
  almacén relacional). Es la alternativa habitual en arquitecturas RAG que no colocan los vectores en el
  mismo motor que el resto de los datos. TODO: confirmar — no hay ningún documento ni commit en el
  repositorio que registre por qué se descartó esta opción frente a pgvector; la razón más probable es
  evitar un segundo sistema que sincronizar y operar, pero no está documentada.

## Consecuencias

**Positivas:** no habrá una migración de motor de base de datos cuando se construya el RAG — el esquema
ya está preparado. Un solo sistema que desplegar, respaldar y operar, en vez de dos. El modelo de datos
ya usa `JSON().with_variant(JSONB(), "postgresql")` (`api/app/models.py:27-28`), aprovechando JSONB de
Postgres en producción sin perder la compatibilidad con SQLite en los tests.

**Negativas / deuda técnica:** la extensión `vector` está activa en producción sin ningún beneficio
actual, lo que añade superficie de complejidad anticipada. Los tests del backend corren contra SQLite en
memoria (`api/tests/conftest.py`), nunca contra Postgres real, así que ni `pgvector` ni el comportamiento
específico de `JSONB` se ejercitan en la suite de pruebas — la primera prueba real de esta decisión
ocurrirá cuando se implemente el RAG. La función `downgrade()` de la migración inicial no revierte la
extensión `vector` (`api/alembic/versions/0001_inicial.py`), así que revertir esta decisión por completo
exigiría una migración manual adicional.
