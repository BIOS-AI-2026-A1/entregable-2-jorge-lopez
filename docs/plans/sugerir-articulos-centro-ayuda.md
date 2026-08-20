# Spec

Sugerencias de artículo asistidas por IA — implementado (cambio OpenSpec `sugerir-articulos-ia`).

## Problema

El centro de ayuda ya detectaba tres señales de dónde falla su base de conocimiento — chats escalados a
soporte, preguntas sin resolver y huecos de documentación indexada sin artículo que la cubra — pero cerrar
cada hueco era manual: alguien tenía que leer la señal, redactar el artículo en español, traducirlo al
portugués y publicarlo. Hacía falta que los proveedores de IA ya configurados redactaran el borrador
bilingüe a partir de esas señales, dejando a la persona editora solo revisar, corregir y aprobar —
ningún borrador debía llegar al público ni al índice RAG sin supervisión humana previa.

## Criterios de aceptación (EARS)

### Detección de candidatos

1. El sistema DEBE agregar candidatos de tres fuentes por portal: chats con `veredicto="escalar"` agrupados
   por consulta normalizada, preguntas sin resolver (`PreguntaSinResolver` no cubiertas + chats con
   `veredicto="sin_resultados"`), y documentos RAG cuyos fragmentos indexados no tienen artículo cercano.
2. Para la fuente de documentación, el sistema DEBE comparar cada fragmento del documento contra el
   artículo más cercano del portal por similitud coseno; un fragmento SIN cobertura es aquel cuya mejor
   similitud cae bajo `UMBRAL_SIMILITUD_COBERTURA` (0.35); un documento entero es candidato SOLO SI la
   mayoría de sus fragmentos están sin cobertura.
3. Cada candidato DEBE marcarse `ya_generada=true` SI ya existe una `SugerenciaArticulo` en estado
   `pendiente` para la misma `(fuente, referencia)`.
4. CUANDO se dispara la generación, el sistema DEBE reconstruir el candidato desde su fuente de origen (no
   confiar en título, idioma o prioridad que pudiera mandar el cliente); SI el candidato ya no existe en su
   fuente, ENTONCES la generación DEBE responder 404.

### Generación del borrador

5. La generación DEBE ser **bajo demanda por candidato**, disparada por la persona editora — nunca en lote
   ni programada.
6. El sistema DEBE redactar el borrador en español con `proveedor_chat` y completarlo en portugués con
   `proveedor_traduccion`, reutilizando la misma función de traducción bilingüe que el CRUD de artículos.
7. La generación DEBE reutilizar los guardarraíles del chat: separación instrucción/dato con delimitador de
   nonce aleatorio por petición, salida validada contra un esquema estricto (`extra="forbid"`), y saneo de
   cualquier etiqueta del delimitador embebida en el contenido recuperado.
8. A diferencia del chat, una cita inválida (fuera de rango o de otro portal) DEBE descartarse
   individualmente sin invalidar el resto del borrador, porque el resultado siempre pasa por revisión
   humana antes de publicarse.
9. SI la salida del proveedor no es JSON válido, tiene campos extra o le faltan campos, ENTONCES el sistema
   DEBE fallar la generación (error mapeado a 502) sin persistir ninguna fila.
10. SI el título generado no produce un slug válido (sin caracteres alfanuméricos), ENTONCES el sistema DEBE
    usar un slug de emergencia editable en vez de rechazar el borrador completo.

### Idempotencia

11. SI ya existe una `SugerenciaArticulo` en estado `pendiente` para el mismo `(portal_id, fuente,
    referencia)`, ENTONCES `POST /generar` DEBE devolverla tal cual, SIN invocar de nuevo a ningún
    proveedor de IA.

### Persistencia y estado

12. `SugerenciaArticulo` DEBE persistirse en estado `pendiente`, con el contenido bilingüe completo y sus
    citas, sin exponerse por ningún endpoint público ni indexarse en el RAG mientras esté en ese estado.
13. El sistema DEBE mantener solo tres estados: `pendiente`, `aceptada`, `descartada`; una vez resuelta
    (aceptada o descartada), una nueva acción de aceptar/descartar sobre la misma sugerencia DEBE
    rechazarse con 409.

### Endpoints y aislamiento

14. Los seis endpoints (`GET /candidatos`, `POST /generar`, `GET ""`, `GET /{id}`, `POST /{id}/aceptar`,
    `POST /{id}/descartar`) DEBEN requerir nivel ≥ Editor y filtrar siempre por el portal resuelto del host.
15. SI se pide el detalle de una sugerencia por id y pertenece a otro portal (o el id no es un UUID
    válido), ENTONCES el sistema DEBE responder 404.

### Aceptar y descartar

16. **Aceptar** DEBE crear el artículo real por la misma alta que "Nuevo artículo" (bilingüe atómico:
    SI el cuerpo no trae español y portugués completos, DEBE rechazarse con 422 y la sugerencia DEBE
    permanecer `pendiente`), marcar la sugerencia `aceptada` con su `articulo_id`, y encolar el
    reindexado RAG del artículo en segundo plano.
17. **Descartar** DEBE marcar la sugerencia `descartada` sin crear ni publicar ningún artículo.

## Ejemplos

| Entrada | Resultado esperado |
|---|---|
| `GET /api/admin/sugerencias/candidatos?fuente=pregunta_sin_resolver` | Lista de candidatos con `titulo_sugerido`, `prioridad` y `ya_generada`, ordenados por prioridad descendente |
| `POST /generar {"fuente":"pregunta_sin_resolver","referencia":"pregunta:42"}` (primera vez) | 201, `SugerenciaArticulo` nueva en `pendiente` con `es`/`pt` completos |
| Mismo `POST /generar` repetido | 201 con el **mismo id**; el proveedor de IA no se vuelve a invocar |
| `POST /{id}/aceptar` con `pt` incompleto | 422; la sugerencia sigue `pendiente`; no se crea artículo |
| `POST /{id}/aceptar` válido | 201 con el artículo creado; reindexado RAG encolado en background |
| `POST /{id}/descartar` sobre una sugerencia ya aceptada | 409 "La sugerencia ya fue resuelta" |

## Edge Cases

- **Cita fuera de rango o de otro portal en el borrador generado** → se descarta esa cita puntual, el resto
  del borrador se genera igual (a diferencia del chat público).
- **Sin fragmentos recuperados para la señal** → el borrador se genera igual, con `citas: []`.
- **Portal sin ningún artículo indexado** → todo documento RAG del portal cuenta como candidato de
  documentación, porque la similitud contra "el artículo más cercano" es 0.0 para todos sus fragmentos.
- **Pregunta o consulta de origen borrada entre listar candidatos y generar** → `resolver_candidato` no la
  encuentra al reconstruir desde la fuente → 404, sin persistir nada.
- **Título generado sin caracteres alfanuméricos** → slug de emergencia `"borrador-sugerido"`, editable
  antes de aceptar.
- **Regenerar sobre un candidato cuya sugerencia previa ya fue aceptada o descartada** → la comprobación de
  idempotencia solo filtra `estado="pendiente"`, así que un nuevo `POST /generar` generaría una sugerencia
  adicional; este caso no está cubierto por test y su comportamiento exacto no está verificado.

## Que NO hacer

- **No generar en lote ni de forma programada** — siempre bajo demanda, un candidato a la vez, disparado
  por la persona editora.
- **No publicar ni indexar automáticamente ningún borrador** — `SugerenciaArticulo` en `pendiente` nunca es
  pública ni aparece en el RAG; solo "Aceptar" (con revisión humana) crea el artículo real.
- **No invalidar el borrador completo por una sola cita inválida** — se descarta la cita, no la sugerencia
  (comportamiento deliberadamente distinto del chat público).
- **No introducir un cuarto rol de IA para generación** — se reutilizan `proveedor_chat` y
  `proveedor_traduccion` ya existentes en `ConfigIA`.
- **No mezclar el estado "publicado/borrador" dentro del modelo `Articulo`** — la sugerencia es una entidad
  aparte; el artículo nace público en el momento de aceptarse.
- **No confiar en título, idioma o prioridad que mande el cliente en `POST /generar`** — siempre se
  reconstruye el candidato desde su fuente de origen en el servidor.
- **No hacer commit directo**: cualquier cambio futuro se integra por Pull Request mediante `/crear-pr`.

## Limitaciones conocidas

- El umbral `UMBRAL_SIMILITUD_COBERTURA = 0.35` es un valor de partida documentado como pendiente de ajustar
  con datos reales de un portal sembrado, no un valor definitivo validado en producción.
- El idioma de redacción es siempre español → portugués, incluso si la señal de origen (p. ej. un documento
  en portugués) sugiere lo contrario; queda como pregunta abierta sin resolver en el diseño original.
- Aceptar un artículo que cubre una pregunta o consulta no marca automáticamente esa pregunta como
  "cubierta" — queda pendiente de una fase posterior que lo derive del reindexado.
- El comportamiento de `POST /generar` sobre un candidato cuya sugerencia previa ya fue resuelta (aceptada o
  descartada) no está cubierto por test; probablemente genera una sugerencia nueva, pero no está verificado.
