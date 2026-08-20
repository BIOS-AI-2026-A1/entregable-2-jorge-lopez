<enhanced_prompt>
<persona>
Eres un ingeniero frontend/backend senior especializado en accesibilidad de color (WCAG 2.2 AA), que
audita fórmulas de contraste existentes antes de tocarlas y prefiere corregir la raíz del cálculo a
parchear casos sueltos.
</persona>

<context>
La aplicación permite a cada portal (multi-tenant) elegir un color de acento libre desde el panel
(`ajustesMarca.acento`, un `<input type="color">`). De ese único acento se derivan por fórmula: el
estado hover del botón, un "acento claro" para fondos tenues, un color de foco para el anillo de
accesibilidad y las tres paradas del degradado del banner de inicio — todo en
`app/src/seguridad/contraste.ts` (cliente, vista previa) con su espejo exacto en `api/app/contraste.py`
(servidor, autoridad). El servidor valida antes de guardar (`PUT` de marca → 422 con el par que falla)
y el cliente adelanta el mismo aviso en vivo mientras el Administrador mueve el selector de color.

`validarPaleta`/`validar_paleta` hoy solo comprueban un conjunto fijo de siete pares: texto blanco
sobre el botón de acento, texto blanco sobre el hover, texto de acento sobre el "acento claro", el
anillo de foco sobre fondo blanco, y texto blanco sobre cada una de las tres paradas del banner. Ese
conjunto se fijó cuando solo existían esos usos del acento; desde entonces se han añadido más lugares
que pintan texto u otros elementos directamente sobre variantes derivadas del acento (por ejemplo,
chips y tarjetas que usan `--acento-claro` como fondo con texto `--acento` encima, o estados
`aria-pressed` de filtros) sin que necesariamente estén cubiertos por los pares ya validados.

Además, hoy la única salida ante una paleta que no cumple AA es rechazar el guardado con un mensaje de
error nombrando el par que falla (`ajustesMarca.errorContrastePar`): el Administrador debe adivinar por
prueba y error qué otro color sí cumpliría, sin ninguna ayuda para corregirlo.
</context>

<task>
Revisa y mejora el manejo del contraste de la paleta de colores derivada del acento por portal: cierra
los huecos de cobertura de `validarPaleta`/`validar_paleta` frente a los usos reales del acento en la
interfaz, y mejora la experiencia de quien configura la marca cuando el color elegido no cumple AA.
</task>

<constraints>
Requisitos obligatorios (MUST):
- Auditar cada lugar de `app/` donde se use `var(--acento)`, `var(--acento-claro)`,
  `var(--acento-foco)` o `var(--acento-hover)` como color de texto, fondo o borde con texto encima, y
  confirmar que el par correspondiente está cubierto por `validarPaleta`. Añadir los pares que falten.
- Mantener la paridad exacta entre `app/src/seguridad/contraste.ts` (cliente) y `api/app/contraste.py`
  (servidor): misma fórmula, mismos pares, mismos umbrales. El servidor sigue siendo la única
  autoridad que decide si se guarda; el cliente solo adelanta el aviso.
- Umbrales WCAG 2.2 AA: 4.5:1 para texto normal, 3:1 para texto grande y componentes de interfaz/foco
  — no relajar ni endurecer estos mínimos.
- Cuando la paleta propuesta no cumpla AA, ofrecer algo más útil que solo nombrar el par que falla:
  evalúa proponer un color de acento corregido más cercano (mismo tono, luminosidad ajustada al mínimo
  necesario) que sí cumpla todos los pares, y ofrecerlo como sugerencia con un solo clic en el panel.
- Cubrir con test tanto el caso de una paleta que hoy pasa por casualidad (par no comprobado) como el
  caso general de corrección/sugerencia, en ambos lados (Vitest para `contraste.ts`, pytest para
  `contraste.py`).
- No romper paletas ya guardadas por portales existentes: si algún acento vigente deja de cumplir por
  un par nuevo que antes no se comprobaba, decide y documenta explícitamente qué pasa (se seguirá
  sirviendo tal cual hasta que se guarde de nuevo, o se fuerza una revalidación) — no lo dejes implícito.

Fuera de alcance (NO hacer en este cambio):
- No añadir soporte de tema oscuro ni paletas múltiples por portal: sigue siendo un único acento por
  portal, tal como existe hoy.
- No cambiar el flujo de guardado (sigue siendo un formulario síncrono con aviso de éxito/error), solo
  su capacidad de detectar problemas y ayudar a resolverlos.
</constraints>

<output_format>
Estructura la respuesta como:
1. Tabla de auditoría: lugar de la UI → variable de color usada → ¿el par está cubierto hoy? → acción.
2. Los pares nuevos añadidos a `validarPaleta`/`validar_paleta`, con el mismo orden y forma que los
   existentes.
3. El mecanismo de sugerencia de color corregido (algoritmo en 3-5 frases) y cómo se expone en el
   panel de marca.
4. Lista de tests añadidos, en Vitest y pytest, sin código más allá de los nombres de los casos.
</output_format>
</enhanced_prompt>
