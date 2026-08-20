# Spec

Configuración separada de proveedores de IA por rol — implementado (cambio OpenSpec
`separar-proveedores-ia`).

## Problema

`ConfigIA` tenía un único `proveedor_activo` que gobernaba a la vez el motor de chat y el de traducción,
mientras el embedder del RAG estaba fijo en el código. Esto forzaba al SuperAdmin a elecciones sin sentido
— por ejemplo, elegir "Voyage AI" como proveedor activo rompía el chat, porque Voyage no tiene motor de
chat, aunque su clave sí quedara guardada — e impedía combinaciones que el código ya soportaba, como chat
con DeepSeek y traducción con Anthropic a la vez. Hacía falta que cada rol de IA (chat, traducción,
embeddings) tuviera su propio proveedor configurable, sin que el panel permitiera nunca asignar un
proveedor sin motor real para ese rol.

## Criterios de aceptación (EARS)

### Modelo de datos

1. `ConfigIA` DEBE ser una fila única de instalación con tres campos de proveedor independientes:
   `proveedor_chat`, `proveedor_traduccion`, `proveedor_embeddings`; cada uno puede ser `NULL`.
2. SI un campo de proveedor es `NULL`, ENTONCES el sistema DEBE usar el default codificado de ese rol
   (`deepseek` para chat, `anthropic` para traducción, `voyage` para embeddings) sin exigir que el
   SuperAdmin lo fije explícitamente.
3. Las claves de proveedor DEBEN vivir en `config_ia_clave`, una fila por proveedor (`proveedor` como
   clave primaria), cifradas — nunca en texto plano ni embebidas en `ConfigIA`.

### Roles soportados y validación

4. El backend DEBE ser la única fuente de la verdad de qué proveedores soportan qué rol
   (`rolesSoportados`); el frontend NO DEBE mantener una copia independiente de esa relación para validar.
5. SI el `PUT` de configuración asigna a un rol un proveedor que no soporta ese rol, ENTONCES el sistema
   DEBE rechazarlo con 422 y NO DEBE persistir ningún cambio de esa petición.
6. El endpoint de configuración (`GET`/`PUT /api/admin/config-ia`) DEBE requerir nivel SuperAdmin; ni
   Administrador ni Editor de portal DEBEN poder leerlo ni modificarlo.
7. La configuración de proveedores DEBE ser global a la instalación, no por portal.

### Gestión de claves

8. El sistema DEBE cifrar cada clave con Fernet usando una master key fuera del repositorio
   (`CLAVE_CIFRADO_IA`); SI esa variable no está configurada, ENTONCES cualquier operación de guardado o
   lectura de clave DEBE fallar con un error explícito (409), no con un fallo silencioso.
9. El `GET` de configuración NUNCA DEBE devolver la clave completa; como mucho DEBE exponer una pista de
   sus últimos 4 caracteres, y solo SI la clave tiene al menos 8 caracteres.
10. Un `PUT` sin campo `clave` NO DEBE borrar la clave previamente guardada de ningún proveedor.
11. SI se pide borrar la clave de un proveedor que está en uso por algún rol (persistido o en el mismo
    cuerpo del `PUT`), ENTONCES el sistema DEBE rechazarlo con 409, nombrando el rol en conflicto.

### Instanciación en tiempo de ejecución

12. El sistema DEBE resolver el proveedor real de cada rol de forma independiente en el momento de la
    llamada (fábricas `crear_chat`, `crear_proveedor` para traducción, `crear_embedder`), sin que la
    elección de un rol condicione la de otro.
13. SI el rol resuelto no tiene clave configurada, ENTONCES la llamada DEBE fallar con un error mapeado a
    409, indicando que un Administrador debe configurarlo.

## Ejemplos

**GET inicial, instalación limpia:**

```json
{
  "proveedorChat": null,
  "proveedorTraduccion": null,
  "proveedorEmbeddings": null,
  "proveedores": [
    {"id": "anthropic", "configurada": false, "pista": null},
    {"id": "deepseek",  "configurada": false, "pista": null},
    {"id": "openai",    "configurada": false, "pista": null},
    {"id": "voyage",    "configurada": false, "pista": null}
  ],
  "rolesSoportados": {
    "chat": ["deepseek"],
    "traduccion": ["anthropic", "deepseek"],
    "embeddings": ["voyage", "openai"]
  }
}
```

| Entrada | Resultado esperado |
|---|---|
| `PUT {"proveedorChat":"deepseek","proveedor":"deepseek","clave":"sk-..."}` | 200; `proveedorChat` queda `"deepseek"`; la clave nunca aparece en la respuesta |
| `PUT {"proveedorChat":"voyage"}` | 422 `"El proveedor 'voyage' no soporta el rol 'chat'."`; no persiste nada |
| `PUT {"proveedor":"deepseek","borrarClave":true}` con `proveedorChat="deepseek"` ya guardado | 409 `"El proveedor 'deepseek' está en uso por el rol 'chat'."` |
| Configurar chat=DeepSeek y traducción=Anthropic en la misma instalación | Ambos roles funcionan de forma simultánea e independiente |

## Edge Cases

- **Clave de menos de 8 caracteres** → `configurada: true` pero `pista: null` (no revelar casi toda la
  clave).
- **`PUT` que solo trae `borrarClave` y `proveedor`, sin `clave`** → borra la fila si el proveedor no está en
  uso; rechaza con 400 si `clave` y `borrarClave` llegan juntos, o si falta `proveedor`.
- **Instalación sin `CLAVE_CIFRADO_IA`** → cualquier guardado o lectura de clave falla con 409, no con un
  500 ni con datos corruptos.
- **Migración desde el `proveedor_activo` único**: una instalación previa con clave de Voyage guardada bajo
  el esquema antiguo activa `proveedor_embeddings="voyage"` automáticamente al migrar, aunque el operador
  quisiera ese rol apagado — mitigado solo por documentación; el operador puede desactivarlo con un `PUT`
  posterior.
- **Cambiar de proveedor a mitad de una operación en curso**: la instancia ya creada por la fábrica al
  inicio de la petición sigue usando el proveedor vigente en ese momento; no hay invalidación a mitad de
  vuelo.
- **`google` como proveedor**: se retiró explícitamente del `Literal` de proveedores por no tener motor real
  en ningún rol; no aparece en `rolesSoportados` ni es aceptado por el `PUT`.

## Que NO hacer

- **No mantener un `proveedor_activo` único compartido entre chat y traducción** — cada rol tiene su propio
  campo y su propia clave.
- **No confiar en el frontend para validar qué proveedor sirve qué rol** — el filtrado de los selectores en
  el panel es solo UX; la validación real y única ocurre en el `PUT` del backend.
- **No devolver nunca la clave completa al cliente**, ni siquiera a SuperAdmin — como mucho una pista de 4
  caracteres, condicionada a longitud mínima.
- **No permitir borrar una clave que un rol sigue usando** sin antes reasignar ese rol a otro proveedor.
- **No exponer configuración de proveedores de IA por portal** — es una decisión de producto explícita
  (ámbito global de instalación); si se necesitara per-portal requeriría un cambio OpenSpec nuevo.
- **No añadir UI de panel para `modelo_chat` ni `temperatura_chat`** — siguen gestionándose por seed o SQL
  directo, fuera del alcance de este cambio.
- **No hacer commit directo**: cualquier cambio futuro se integra por Pull Request mediante `/crear-pr`.

## Limitaciones conocidas

- El seed (`api/seed.py`) no crea filas de `ConfigIA` ni de `config_ia_clave`: la fila de configuración nace
  recién en el primer `PUT` que recibe la instalación.
- El mensaje de error cuando falta la clave de un rol configurado es genérico (409, "Un usuario
  Administrador debe configurarlo") y no nombra el rol específico en el cuerpo de la respuesta HTTP, aunque
  internamente la excepción sí lo sabe.
- El umbral de "clave demasiado corta para mostrar pista" (8 caracteres) es un valor fijo en código, no
  configurable desde el panel.
