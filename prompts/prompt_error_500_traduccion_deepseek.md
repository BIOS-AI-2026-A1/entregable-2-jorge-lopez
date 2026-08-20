<enhanced_prompt>
<persona>
Eres un ingeniero backend senior en Python/FastAPI que depura errores de integración con proveedores
de LLM externos siguiendo evidencia (logs, respuestas reales del proveedor, tests que reproducen el
fallo) antes de tocar código, y que distingue con cuidado entre "el proveedor falló" (esperable, debe
mapearse a un HTTP controlado) y "nuestro código no contempló una forma de respuesta" (bug real).
</persona>

<context>
La traducción asistida de artículos y categorías (`api/app/servicios_ia.py`) permite que el
Administrador use DeepSeek o Anthropic como proveedor. Con DeepSeek (`ProveedorDeepSeek.traducir`), el
flujo es: se llama a la API compatible con OpenAI de DeepSeek con `response_format={"type":
"json_object"}`, se parsea el texto de respuesta como JSON, y ese resultado pasa por
`_validar_estructura` — que comprueba que el JSON traducido conserva exactamente las mismas claves,
el mismo número de párrafos/pasos/preguntas, y las mismas claves internas en cada ítem de lista (ya
existe una comprobación específica, `_validar_claves_items`, añadida porque en producción DeepSeek
llegó a traducir también las claves del JSON, p. ej. `descripcion` → `descricao`, lo que antes rompía
esta validación de una forma que se propagaba sin control).

Los errores esperables ya tienen mapeo HTTP centralizado en `api/app/main.py`:
`ProveedorNoConfigurado` → 409 (falta clave/proveedor) y `ErrorProveedor` → 502 (el proveedor falló,
devolvió algo no interpretable, o la validación de estructura lo rechazó). Pese a esta red de
seguridad, se está observando en producción un **error 500** (no 502, no 409) al traducir con DeepSeek
— es decir, una excepción que no está siendo capturada como `ErrorTraduccion` y se propaga sin control
hasta el manejador genérico de FastAPI.

Candidatos plausibles a investigar, ninguno confirmado todavía: (a) el `response_model` del endpoint de
traducción (`TraduccionArticuloIn` en el router de artículos, `TraduccionCategoriaIn` en el de
categorías) revalida el diccionario que devuelve `traducir_contenido` — si esa revalidación de
Pydantic falla por un campo con tipo inesperado (no solo claves, también tipos: p. ej. una lista donde
se esperaba un string, o `null` en un campo no opcional), FastAPI lanzaría un error de validación de
respuesta que no pasa por `ErrorTraduccion`; (b) una respuesta de DeepSeek con `content` vacío o
`None` que sí se parsea pero produce una forma que `_validar_estructura` no cubre en algún campo
concreto; (c) una excepción fuera del bloque `try/except` de `ProveedorDeepSeek.traducir` (por ejemplo,
al construir el cliente `OpenAI` o al leer `respuesta.choices[0]` si la lista viniera vacía).
</context>

<task>
Investiga la causa raíz del error 500 al traducir artículos o categorías con el proveedor DeepSeek, y
ciérrala para que cualquier fallo del proveedor o de la validación de su respuesta se traduzca siempre
en un `ErrorTraduccion` (409 o 502), nunca en un 500 sin controlar.
</task>

<constraints>
Requisitos obligatorios (MUST):
- Reproducir el fallo con un test que ejercite el camino real (router de traducción de artículo o de
  categoría) usando un doble de `ProveedorDeepSeek`/`ProveedorTraduccion` que devuelva la forma de
  respuesta sospechosa (según el candidato que se confirme como causa), en vez de solo probar
  `_validar_estructura` de forma aislada.
- Confirmar explícitamente, antes de corregir, cuál de los tres candidatos del contexto (o cuál otro
  no listado) es la causa real, con evidencia del test que falla con 500 antes del arreglo.
- Corregir en el punto que corresponda: si es revalidación de `response_model`, endurecer
  `_validar_estructura`/`_validar_claves_items` para que rechace también discrepancias de tipo (no
  solo de claves y longitud) antes de que el resultado llegue al `response_model`; si es una excepción
  fuera del `try/except` del proveedor, ampliar ese bloque para que cubra también ese camino; en
  cualquier caso, el resultado final debe ser siempre un `ErrorProveedor` (502) o
  `ProveedorNoConfigurado` (409), nunca una excepción sin capturar.
- Añadir un test de regresión que falle con el bug (antes del arreglo) y pase después, tanto para el
  router de artículos como para el de categorías si el bug afecta a ambos (`traducir_contenido` es
  compartido por los dos).
- No debilitar `_validar_estructura` en ningún otro sentido: sigue rechazando cualquier traducción que
  cambie el conjunto de claves, la cantidad de elementos en listas, o las claves internas de cada ítem.
- Verificar en el mismo cambio que el proveedor Anthropic no comparte el mismo hueco (mismo
  `_validar_estructura`, misma revalidación de `response_model`): si lo comparte, el arreglo ya lo
  cubre por construcción; si Anthropic tiene un camino de fallo propio, documentarlo aunque quede fuera
  de este cambio.

Fuera de alcance (NO hacer en este cambio):
- No cambiar el prompt de sistema de traducción (`_prompt_sistema`) salvo que la causa raíz esté
  específicamente en el formato que el prompt le pide al modelo.
- No introducir reintentos automáticos ante fallo del proveedor: el comportamiento esperado ante un
  fallo sigue siendo devolver el error controlado (502/409) para que la persona Administrador reintente
  manualmente.
</constraints>

<output_format>
Estructura la respuesta como:
1. Diagnóstico: qué candidato (de los listados u otro) es la causa confirmada, con el test que lo
   demuestra.
2. El arreglo: qué archivo y función cambian, y por qué ese es el punto correcto (no un parche
   colateral).
3. Los tests de regresión añadidos (nombres y qué caso cubre cada uno).
4. Confirmación explícita de si Anthropic comparte el mismo riesgo y, si no queda cubierto por este
   arreglo, qué haría falta para cerrarlo también.
</output_format>
</enhanced_prompt>
