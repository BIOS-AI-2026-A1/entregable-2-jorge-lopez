# Spec

Multi-tenant por portal — implementado (cambio OpenSpec `multi-tenant-portales`).

## Problema

La instalación era single-tenant: contenido, usuarios y marca vivían en una única base sin discriminar
cliente, lo que exigía desplegar y mantener una copia completa por cada cliente nuevo. Hacía falta atender
a varios clientes con **una sola instalación y una sola base de datos**, cada uno con su propia URL
(subdominio, con dominios propios preparados en el modelo), sin que un cliente pueda ver ni alcanzar nunca
los datos de otro y sin renunciar a un nivel transversal (SuperAdmin) que administre la plataforma entera.

## Criterios de aceptación (EARS)

### Modelo de datos y resolución por host

1. Cada portal DEBE tener un identificador opaco (`Portal.id`, UUID) independiente de su `slug`, para que el
   slug pueda cambiar de nombre sin cascadear sobre las FKs que lo referencian.
2. Toda tabla de contenido, usuarios, marca, RAG y chat DEBE llevar `portal_id` como parte de su clave o
   como FK obligatoria; las combinaciones que antes eran únicas de forma global (id de artículo, slug de
   artículo, correo de administrador) DEBEN ser únicas solo **dentro del portal**, mediante claves y
   `UniqueConstraint` compuestas por `portal_id`.
3. El sistema DEBE resolver el portal de cada petición **del host** (subdominio bajo `BASE_DOMAIN`, o
   coincidencia exacta en la tabla `dominios` para dominios propios), nunca del cuerpo, la ruta o una
   cabecera que el cliente pueda fijar libremente.
4. SI el host no coincide con ningún portal, ENTONCES el sistema DEBE responder 404 sin caer a un portal
   por defecto.
5. SI el portal resuelto tiene `estado="suspendido"`, ENTONCES el sistema DEBE responder 503 sin borrar
   sus datos.
6. El sistema DEBE reservar un conjunto de slugs (`www`, `api`, `admin`, `app`, `static`, `assets`, `cdn`,
   `mail`, `ftp`, `platform`) que ningún cliente puede reclamar al crear un portal.
7. El backend DEBE confiar en `X-Forwarded-Host` / `X-Forwarded-For` solo cuando el peer inmediato de la
   conexión está en la allow-list `PROXIES_CONFIABLES`; en caso contrario DEBE usar el `Host` / la IP de la
   conexión directa.

### Niveles de acceso y alcance por portal

8. El sistema DEBE mantener cuatro niveles jerárquicos (`ANONIMO=1 < EDITOR=2 < ADMINISTRADOR=3 <
   SUPERADMIN=4`); Administrador y Editor DEBEN quedar acotados al portal de su `AdminUser.portal_id`.
9. SuperAdmin DEBE ser la única identidad transversal a la plataforma: vive en un portal reservado
   (`slug="platform"`) que resuelve por su propio host de gestión (`admin.<BASE_DOMAIN>`) y que NO aparece
   en el listado de portales gestionables.
10. CUANDO un token de sesión (access o refresh) se presenta contra un host cuyo portal no coincide con el
    `portal_id` codificado en el token, el sistema DEBE rechazarlo con 401 — aunque exista un usuario con el
    mismo correo en el portal destino — y el refresh token NO DEBE quemarse en ese intento.

### Aislamiento estricto

11. Toda ruta de contenido o de administración DEBE filtrar por el `portal_id` resuelto del host antes de
    cualquier otra condición de negocio.
12. SI se solicita un recurso (artículo, usuario, pregunta sin resolver, logo, chat, sugerencia) por id
    directo y ese recurso pertenece a otro portal, ENTONCES el sistema DEBE responder 404, nunca 403, para
    no revelar su existencia.
13. Dos portales DEBEN poder reutilizar el mismo id de artículo, el mismo slug o el mismo correo de
    administrador sin colisionar entre sí ni filtrar información por la diferencia de código de estado.
14. La salvaguarda de "no dejar un portal sin ningún Administrador activo" DEBE contarse solo entre los
    Administradores activos de ese mismo portal.

### Gestión de portales (SuperAdmin)

15. El sistema DEBE ofrecer alta de portal (`POST /api/admin/portales`, nivel SuperAdmin) que cree en una
    sola transacción el `Portal`, su `Dominio` principal (`<slug>.<BASE_DOMAIN>`), sus `Ajustes` de marca por
    defecto y su primer `AdminUser` de nivel Administrador.
16. SI el slug pedido está reservado, ya existe, el host resultante ya existe, o la contraseña del
    Administrador inicial no cumple la política, ENTONCES el alta DEBE rechazarse (409 o 422 según el caso)
    sin crear nada.
17. El sistema DEBE permitir suspender y reactivar un portal (`POST .../suspender`, `POST .../reactivar`,
    SuperAdmin); el portal de plataforma NO DEBE poder suspenderse (404 si se intenta, como autoprotección).
18. El listado de portales (`GET /api/admin/portales`) DEBE excluir siempre el portal de plataforma.

## Ejemplos

| Entrada | Resultado esperado |
|---|---|
| `Host: cliente1.tuapp.com` | Resuelve a `Portal.slug="cliente1"`; todo el contenido servido es el de ese portal |
| `POST /api/admin/portales` (SuperAdmin) con slug nuevo | 201, `Portal` + `Dominio` + `Ajustes` + `AdminUser` creados; el nuevo Administrador puede iniciar sesión de inmediato en `<slug>.tuapp.com` |
| `GET /api/admin/articulos/solo-de-a` con sesión de un Administrador del portal B | 404 "Artículo no encontrado" (no revela que existe en A) |
| Access token emitido en `localhost` presentado contra `Host: otra-marca.test` | 401 "Sesión inválida", aunque exista un usuario homónimo en el portal destino |
| `POST /api/admin/portales/{id}/suspender` | `estado="suspendido"`; cualquier petición posterior de ese portal responde 503 sin perder datos; `reactivar` restaura 200 al instante |
| `Host: tuapp.com` (dominio base a secas, sin subdominio) | No resuelve a ningún portal → 404 |

## Edge Cases

- **Host desconocido o subdominio multinivel** (`a.b.tuapp.com`) → no resuelve a ningún portal, 404.
- **Slug reservado** (`admin`, `api`, `www`, …) → 409 al intentar crearlo como portal de cliente.
- **Dos portales con el mismo id/slug de artículo o el mismo correo de administrador** → conviven sin
  colisión gracias a las claves compuestas por `portal_id`.
- **Token robado de un portal presentado en otro** → 401, y el refresh token no se consume en el intento
  fallido (sigue disponible para su portal legítimo).
- **`TestClient`/entorno sin `request.client`** → se trata como peer confiable (solo relevante en tests).
- **Portal suspendido y luego reactivado** → los datos nunca se borraron; el servicio vuelve a responder
  200 de inmediato.

## Que NO hacer

- **No usar RLS de Postgres** como mecanismo de aislamiento primario: la decisión fue filtrado explícito por
  `portal_id` en cada consulta más tests de aislamiento, con el riesgo aceptado y documentado de que "olvidar
  el filtro en una consulta nueva = fuga" — cualquier ruta nueva que toque datos por portal debe filtrar
  explícitamente, no confiar en una política de base de datos.
- **No automatizar emisión de certificados ni alta de DNS** para dominios propios: el modelo ya admite filas
  adicionales en `dominios`, pero no existe endpoint ni UI para que un cliente añada su propio dominio; solo
  se crea el subdominio principal en el alta.
- **No permitir migrar datos de un portal a otro.**
- **No implementar SSO entre portales**: un mismo humano administrando dos portales inicia sesión por
  separado en cada host.
- **No resolver nunca `portal_id` del cuerpo, la ruta o una cabecera que el cliente pueda fijar** — siempre
  del host, vía la dependencia `portal_actual`.
- **No exponer 403 en accesos cruzados por id directo** — siempre 404, para no revelar existencia.
- **No hacer commit directo**: cualquier cambio futuro sobre esta capa se integra por Pull Request mediante
  `/crear-pr`.

## Notas de implementación

- El diseño original (`openspec/changes/archive/2026-08-17-multi-tenant-portales/design.md`) dejaba como
  pregunta abierta un mecanismo para que SuperAdmin "asuma el contexto" de un portal cliente y edite su
  contenido directamente desde su propia sesión; no se encontró ese mecanismo implementado — SuperAdmin hoy
  gestiona el ciclo de vida del portal (alta, suspensión, reactivación) pero no entra a su contenido sin ser
  su Administrador.
- El RAG y el chat, marcados como *non-goal* en el diseño original de multi-tenant, se construyeron después
  (cambios `chat-rag-portal` y `sugerir-articulos-ia`) ya con `portal_id` obligatorio desde su primera
  migración — ver `docs/plans/chat-centro-ayuda.md` y `docs/plans/sugerir-articulos-centro-ayuda.md`.
