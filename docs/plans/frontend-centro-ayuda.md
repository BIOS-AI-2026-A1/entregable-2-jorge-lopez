# Spec

Prototipo funcional del Centro de Ayuda.

## Problema

El repositorio tenía un brief de diseño y un prototipo visual, pero ningún código ni stack decidido. Antes
de invertir en la capa RAG —la parte cara y arriesgada— hacía falta validar en local que las tres piezas
del producto (base de conocimiento, chat con citas y panel interno KCS) encajan entre sí y que la
accesibilidad WCAG 2.2 AA se sostiene en código real, no solo en las anotaciones del diseño.

El `.zip` de `design/` no era una maqueta: contenía una aplicación React de 1.296 líneas con el ARIA ya
resuelto. Reescribirla en otro stack habría tirado ese trabajo.

## Criterios de aceptación (EARS)

### Base de conocimiento

1. El sistema DEBE ofrecer en el inicio un buscador con etiqueta visible que filtre en cliente por título y
   categoría del idioma activo.
2. CUANDO la persona usuaria escribe un término con coincidencias, el sistema DEBE mostrar solo los
   artículos coincidentes como enlaces navegables y anunciar el número por `aria-live="polite"`.
3. SI el término no tiene coincidencias, ENTONCES el sistema DEBE mostrar un estado vacío con texto
   explícito y escalamiento a soporte, nunca una zona en blanco.
4. CUANDO la persona usuaria vacía el campo, el sistema DEBE restaurar la vista por defecto.
5. El sistema DEBE mostrar seis categorías con un conteo de artículos **derivado de los datos**, no escrito
   a mano.
6. El sistema DEBE presentar cada artículo con breadcrumb, un único H1, fecha en `<time datetime>`, pasos
   HowTo y acordeón FAQ.
7. CUANDO se activa una pregunta del acordeón, el sistema DEBE actualizar `aria-expanded` en el botón, que
   apunta al panel por `aria-controls`, y el panel DEBE tener `role="region"`.
8. CUANDO la persona usuaria valora un artículo, el sistema DEBE acusar recibo con texto e icono dentro de
   `role="status"`, sin recargar y sin usar el color como único canal.
9. El sistema DEBE cerrar inicio y artículo con un bloque de escalamiento a soporte.

### Chat con citas

10. El sistema DEBE ofrecer un botón flotante de al menos 44×44 px que abra un panel como capa sobre la
    pantalla actual, sin cambiar la dirección.
11. CUANDO se abre el panel, el sistema DEBE renderizarlo con `role="dialog"`, `aria-modal="true"` y
    `aria-labelledby`, y mover el foco al botón de cierre.
12. MIENTRAS el panel está abierto, el sistema DEBE retener el foco dentro de él.
13. CUANDO se pulsa Escape o el botón de cierre, el sistema DEBE cerrar el panel y devolver el foco al
    botón flotante.
14. El sistema DEBE mostrar una conversación fija con referencias numeradas y un bloque de fuentes, donde
    **cada cita resuelve a un artículo que existe** en el idioma activo.
15. El contenedor de mensajes DEBE tener `aria-live="polite"` y `aria-atomic="false"`.
16. SI el asistente no encuentra la información, ENTONCES el sistema DEBE declararlo explícitamente y
    ofrecer contacto con soporte, en lugar de improvisar.
17. El campo de entrada DEBE tener etiqueta accesible y una nota visible sobre el origen de las respuestas.

### Panel interno (KCS)

18. El sistema DEBE mostrar tres métricas: preguntas sin resolver, % de respuestas con cita y artículos
    creados a partir de preguntas.
19. El sistema DEBE listar las preguntas en una `<table>` con `<th scope="col">` y nombre accesible.
20. El sistema DEBE representar el estado con chips en tres valores (Nueva, En revisión, Cubierta), siempre
    con icono **y** texto además del color.
21. El panel DEBE ser accesible por su propia dirección, sin autenticación en este prototipo.

### Contenido bilingüe

22. El sistema DEBE ofrecer interfaz y contenido completos en español y portugués, con paridad de artículos,
    FAQ, conversación y filas del panel.
23. El sistema DEBE reflejar el idioma en el primer segmento de la dirección (`/es/…`, `/pt/…`).
24. CUANDO se abre la raíz sin idioma, el sistema DEBE redirigir al idioma detectado, con español como
    recurso por defecto.
25. CUANDO cambia el idioma activo, el sistema DEBE sincronizar `document.documentElement.lang`.
26. CUANDO se cambia de idioma estando en un artículo, el sistema DEBE mostrar ese mismo artículo en el
    idioma nuevo, sin volver al inicio.
27. El sistema DEBE mantener las etiquetas de interfaz en archivos de traducción y el contenido en módulos
    tipados por idioma, sustituibles por una fuente remota sin tocar componentes.

### Accesibilidad (transversal, WCAG 2.2 AA)

28. Todas las pantallas DEBEN ser operables solo con teclado, en orden de lectura y sin trampas de foco
    fuera del diálogo.
29. CUANDO se pulsa el tabulador al cargar, el primer elemento enfocable DEBE ser "Saltar al contenido".
30. Todo elemento interactivo DEBE mostrar foco visible de 2 px, distinto del hover.
31. El sistema DEBE cumplir 4.5:1 en texto normal y 3:1 en texto grande y componentes de interfaz.
32. Los controles principales DEBEN tener objetivo táctil de al menos 44×44 px.
33. Todos los campos DEBEN tener etiqueta visible; los estados semánticos NO DEBEN comunicarse solo con
    color.
34. Cada pantalla DEBE tener un único H1 y jerarquía de encabezados sin saltos.
35. SI la persona usuaria tiene activada la reducción de movimiento, ENTONCES el sistema DEBE suprimir las
    transiciones no esenciales sin perder información.

## Ejemplos

| Entrada | Resultado esperado |
|---|---|
| `/` | Redirige a `/es` o `/pt` según el navegador |
| `/pt/articulo/prazos-de-devolucao` | Carga el artículo en portugués sin pasar por el inicio |
| Buscar `"devolu"` | 2 resultados; anuncio "2 resultados para «devolu»" |
| Buscar `"ENVÍOS"` | 3 resultados (insensible a mayúsculas y acentos) |
| Buscar `"zzz"` | Estado vacío con enlace a soporte |
| Cambiar a PT desde `/es/articulo/plazos-de-devolucion` | Va a `/pt/articulo/prazos-de-devolucao` |
| Cita `[1]` del chat | Enlaza a `/es/articulo/plazos-de-devolucion` |
| Tarjeta "Envíos" | Muestra "3 artículos", que es el conteo real en los datos |

## Edge Cases

- **Slug inexistente** (`/es/articulo/no-existe`) → pantalla de no encontrado, no error.
- **Ruta inventada dentro de un idioma válido** (`/es/lo-que-sea`) → pantalla de no encontrado.
- **Segmento de idioma no soportado** (`/fr/…`) → redirección al idioma detectado.
- **Cambio de idioma con slug distinto entre idiomas** → se traduce pasando por el identificador estable
  del artículo, que sí es común a ambos idiomas.
- **Artículo relacionado o cita apuntando a un identificador inexistente** → se omite en el render en lugar
  de romper la pantalla.
- **Envío de texto en el chat** → no genera respuesta; la limitación se comunica con texto.
- **Filtro del panel sin filas** → la tabla queda vacía y el contador refleja "0 de 6".

## Que NO hacer

- **Nada de RAG**: sin base vectorial, sin embeddings, sin llamadas a modelos, sin scripts de ingesta.
- **Sin backend ni base de datos.** El contenido son módulos TypeScript; el buscador filtra en cliente.
- **Sin autenticación** en el panel interno.
- **Sin tests automatizados** ni linter ni CI.
- **No generar respuestas nuevas** en el chat: la conversación es fija.
- **No editar ni descomprimir dentro del repo** el `.zip` de `design/`; se descomprime fuera para consultarlo.
- **No copiar el `vite.config.ts`, el `index.html` ni el `package.json` del zip**: arrastran complementos de
  Figma Make y el config importa `./.figma/make/site.json`, que no existe en el archivo.
- **No escribir texto visible directamente en los componentes**: va a traducciones o a módulos de datos.
- **No inventar conteos** de artículos: se derivan de los datos.
- **No hacer commit directo**: la integración va por Pull Request mediante `/crear-pr`.

## Stack permitido

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | React 19 + TypeScript | Es lo que ya era el prototipo; se porta en vez de reescribir el ARIA |
| Build | Vite 8 | Un solo comando de arranque, sin configuración |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`) | Sin archivo de configuración ni PostCSS; token `--acento` en `index.css` |
| Enrutado | react-router-dom 7 | Direcciones reales: sin ellas la interfaz de citas sería decorativa |
| Idiomas | i18next + react-i18next | Español y portugués son requisito, no fase posterior |
| Estado | `useState` | Nada se comparte lo bastante para justificar Zustand o TanStack Query |
| Gestor | npm | pnpm no está instalado en la máquina de desarrollo |

Cualquier dependencia adicional debe justificarse contra un requisito explícito. Alternativas descartadas
y su razón: Python con FastAPI, Next.js, HTML sin framework y Radix/shadcn — el detalle está en
`openspec/changes/prototipo-centro-ayuda/design.md`.

### Comandos

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit && vite build
```
