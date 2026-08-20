# Spec

Control de acceso jerárquico en cuatro niveles (Anonymous / Editor / Administrador / SuperAdmin) —
implementado (cambios OpenSpec `backend-cms-autenticacion` y `renombrar-niveles-administrador-editor`).

## Problema

El centro de ayuda servía contenido estático sin backend ni autenticación: el botón "Crear artículo" del
panel era decorativo. Hacía falta un login que restringiera el Panel Interno y una jerarquía de permisos
capaz de distinguir quién solo produce contenido de quién administra usuarios, marca y RAG de un portal, de
quién administra la plataforma entera. Los niveles de administración se llamaban originalmente **Root** y
**Standard** — jerga técnica que no comunicaba qué podía hacer cada usuario — y se renombraron a
**Administrador** y **Editor** para alinear el vocabulario del código con el del producto; fue un rename
puro, sin tocar valores numéricos ni lógica de autorización. **SuperAdmin** es posterior, introducido junto
con el multi-tenant (ver `docs/plans/multi-portal-centro-ayuda.md`) como la única identidad transversal a la
plataforma.

## Criterios de aceptación (EARS)

### Los cuatro niveles

1. El sistema DEBE mantener un enum de niveles estrictamente jerárquico y aditivo por comparación entera:
   `ANONIMO=1 < EDITOR=2 < ADMINISTRADOR=3 < SUPERADMIN=4`.
2. **Anonymous (1)** DEBE ser la ausencia de sesión — nunca se persiste como usuario — y DEBE alcanzar solo
   el centro de ayuda público y el chat con RAG del portal resuelto por host.
3. **Editor (2)** DEBE alcanzar, dentro de su propio portal, el CRUD de artículos y categorías, el panel de
   preguntas sin resolver, la supervisión de chats y la generación de sugerencias de artículo con IA; NO
   DEBE alcanzar gestión de usuarios, ajustes de marca/empresa ni gestión de documentos del índice RAG.
4. **Administrador (3)** DEBE alcanzar todo lo de Editor, más gestión de usuarios administradores de su
   portal, ajustes de marca/empresa de su portal y gestión de documentos del índice RAG; DEBE permanecer
   acotado a su propio portal.
5. **SuperAdmin (4)** DEBE ser la única identidad transversal a la plataforma (no atada al contenido de un
   portal de cliente), y DEBE ser el único nivel que gestiona el ciclo de vida de los portales y la
   configuración global de proveedores de IA.
6. Un nivel superior DEBE satisfacer cualquier requisito de un nivel inferior sin necesidad de una
   asignación explícita adicional (Administrador cubre cualquier ruta que exija Editor; SuperAdmin cubre
   cualquiera).

### Autenticación

7. El login (`POST /api/auth/login`) DEBE recibir correo y contraseña, y DEBE resolver al usuario por
   `(portal_id, email)` — el correo es único **por portal**, no globalmente.
8. Las contraseñas DEBEN almacenarse solo con hash argon2; un login válido DEBE devolver un access token
   JWT y un refresh token opaco.
9. SI las credenciales son incorrectas, el correo no existe, o el usuario existe pero está inactivo,
   ENTONCES el sistema DEBE responder el mismo 401 genérico, en tiempo comparable, sin revelar cuál de los
   tres casos ocurrió.
10. El access token JWT DEBE incluir el portal en su payload (porque el correo no es único global) y DEBE
    expirar en un plazo corto configurable.
11. El refresh token DEBE ser opaco (no JWT), guardarse solo hasheado en la base, rotar en cada uso (un
    solo uso por token) y DEBE cerrarse su portal de origen — no debe servir para renovar sesión en un
    portal distinto de aquel en el que se emitió.
12. SI un refresh token ya consumido se reutiliza, ENTONCES el sistema DEBE asumir robo y revocar toda la
    familia de tokens derivada de esa sesión.
13. El secreto de firma del JWT DEBE vivir en variable de entorno sin valor por defecto; la aplicación NO
    DEBE arrancar sin él.

### Autorización en cada petición

14. La dependencia que resuelve la sesión DEBE releer nivel y estado `activo` del usuario **desde la base
    de datos en cada petición**, nunca confiar únicamente en el payload del JWT, para poder revocar acceso
    al instante.
15. SI no hay credencial o es inválida/expirada, ENTONCES el sistema DEBE responder 401; SI hay sesión
    válida pero el nivel del usuario es insuficiente para el recurso, ENTONCES DEBE responder 403 — ambos
    casos DEBEN distinguirse.
16. SI el usuario autenticado por el JWT está desactivado (`activo=False`), ENTONCES el sistema DEBE
    tratarlo igual que una petición sin sesión (401), aunque el JWT siga siendo válido por firma y no haya
    expirado.
17. SI el `portal_id` del JWT no coincide con el portal resuelto del host de la petición actual, ENTONCES
    el sistema DEBE rechazar la sesión con 401.

### Guardias en el frontend

18. El borde (middleware de Next) DEBE verificar solo presencia de sesión en las rutas del panel, sin
    decodificar el nivel del JWT ahí; DEBE intentar renovar con el refresh token si falta el access token, y
    redirigir a login si ninguno es válido.
19. Cada página del panel que exige un nivel superior a "cualquier sesión" (gestión de usuarios, gestión de
    portales) DEBE resolver la sesión en el servidor consultando al backend (no decodificando el JWT
    localmente) antes de renderizar, para que un usuario desactivado o degradado se detecte de inmediato.
20. La ocultación de controles en la interfaz según el nivel es solo UX; la autoridad de autorización SIEMPRE
    DEBE residir en el backend, nunca en el cliente.

### Gestión de usuarios administradores

21. Solo Administrador DEBE poder crear, editar, activar o desactivar usuarios administradores; Editor NO
    DEBE alcanzar ese endpoint (403).
22. Un Administrador DEBE poder asignar nivel Editor o Administrador a un usuario nuevo o existente de su
    portal; NO DEBE poder asignar nivel Anonymous ni SuperAdmin por esta vía.
23. Nadie DEBE poder autodesactivarse ni autodegradarse de Administrador a Editor.
24. SI la operación (degradar o desactivar) dejaría al portal sin ningún Administrador activo, ENTONCES el
    sistema DEBE rechazarla — contando solo los Administradores activos de ese mismo portal.
25. El acceso a un usuario administrador de otro portal por id directo DEBE responder 404, no 403.

## Ejemplos

| Entrada | Resultado esperado |
|---|---|
| `POST /api/auth/login` con correo inexistente o contraseña incorrecta | 401 `{"detail":"Correo o contraseña incorrectos"}` (mismo mensaje en ambos casos) |
| `POST /api/auth/login` válido | 200 `{"access_token","refresh_token","token_type":"bearer"}` |
| `GET /api/admin/usuarios` con Bearer de Editor | 403 `{"detail":"No autorizado para este recurso"}` |
| `GET /api/admin/usuarios` sin cabecera Authorization | 401 `{"detail":"No autenticado"}` |
| Administrador desactiva a un Editor con sesión activa; el Editor reintenta con su mismo token | 401 `{"detail":"Sesión inválida"}` en la siguiente petición, sin esperar a que expire el JWT |
| Refresh token ya usado se presenta de nuevo | Se revoca toda la familia de tokens de esa sesión |

## Edge Cases

- **Usuario desactivado con JWT aún vigente por tiempo** → pierde acceso en la siguiente petición porque la
  autorización relee `activo` de la base, no del token.
- **Token de un portal presentado contra el host de otro portal** → 401, aunque exista un usuario homónimo
  en el portal destino.
- **Refresh token reutilizado tras haber sido rotado** → se asume robo, se revoca toda la familia derivada
  de esa sesión (no solo el token reutilizado).
- **Refresh de un usuario ya desactivado** → rechazado, cierra también la vía de renovación silenciosa.
- **Último Administrador activo de un portal** intentando degradarse o desactivarse a sí mismo, o siendo
  degradado/desactivado por otro Administrador → rechazado (409); si hay un segundo Administrador activo, sí
  se permite.
- **Intento de asignar nivel 1 (Anonymous) o 4 (SuperAdmin)** al crear/editar un usuario vía
  `POST/PUT /api/admin/usuarios` → 422, esos valores no son asignables por esta vía.
- **Listado de usuarios** nunca expone `password_hash` en la respuesta.

## Que NO hacer

- **No confiar en el JWT para el estado de la cuenta o el nivel en cada petición** — siempre releer de la
  base (`activo`, `nivel`) para que la revocación sea instantánea.
- **No exponer si falló el correo o la contraseña** en un login fallido — mensaje genérico único, con tiempo
  de respuesta comparable al de un login válido.
- **No permitir asignar SuperAdmin desde el endpoint de gestión de usuarios** — solo se crea vía seed o al
  dar de alta un portal nuevo (que siempre siembra un Administrador, nunca un SuperAdmin).
- **No decodificar el nivel del JWT en el borde (middleware)** para decidir acceso a páginas de nivel
  Administrador/SuperAdmin — esas guardias se resuelven en servidor contra el backend.
- **No permitir autodesactivación ni autodegradación**, ni dejar un portal sin ningún Administrador activo.
- **No devolver 403 en accesos cruzados de portal por id directo** — siempre 404, para no revelar
  existencia (consistente con el resto del sistema multi-tenant).
- **No hacer commit directo**: cualquier cambio futuro sobre esta capa se integra por Pull Request mediante
  `/crear-pr`.

## Limitaciones conocidas

- **`admin_documentos.py` (gestión de documentos del índice RAG) exige nivel Administrador, no Editor** — una
  asimetría respecto al resto de "funciones de producto" (Editor sí cubre artículos, categorías, chats y
  sugerencias, pero no documentos RAG); el código no documenta explícitamente por qué.
- **No existe endpoint para promover a alguien a SuperAdmin**: solo se crea vía `seed.py` con la variable de
  entorno opcional `SUPERADMIN_PASSWORD`.
- No se encontró ningún hueco de seguridad pendiente declarado explícitamente en el código de esta capa (a
  diferencia de otras áreas del proyecto que sí documentan límites conocidos).
