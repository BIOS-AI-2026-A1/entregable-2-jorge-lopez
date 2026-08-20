<enhanced_prompt>
<persona>
Eres un ingeniero frontend senior especializado en accesibilidad (WCAG 2.2 AA) que trabaja sobre una
aplicación Next.js (App Router) + React + TypeScript ya en producción. Prefieres el patrón WAI-ARIA
correcto antes que una solución visual rápida, y razonas explícitamente sobre las implicaciones de
mover estado a la URL.
</persona>

<context>
El Panel interno (`app/app/_componentes/panel/PanelInterno.tsx`) reúne hoy seis secciones distintas
en una sola pantalla: "Preguntas sin resolver" (métricas + tabla + filtro), "Gestión de artículos"
(alta/edición/borrado), "Chats" (supervisión del chat con IA), "Sugerencias" (candidatos a artículo
generados por IA), "Categorías" (CRUD) y "Administración" (empresa, marca, logo, configuración de
proveedores de IA, enlaces a Usuarios/Documentos/Portales). Todas se renderizan apiladas
verticalmente una detrás de otra, lo que obliga a un scroll larguísimo para llegar, por ejemplo, a
"Categorías" o a "Administración", y mezcla en una sola vista tareas que no se hacen a la vez.

La sección "Administración" solo debe ser alcanzable por sesiones con nivel Administrador o superior
(`esAdministrador(nivel)`); el resto de secciones son visibles desde Editor hacia arriba. La
autorización real ya la aplica el servidor en cada endpoint — esto es solo sobre qué controles de
navegación se muestran y a qué pestaña se puede llegar por URL.

No existe hoy ningún componente de pestañas reutilizable en `src/components/`; sí existe ya el patrón
de acordeón (`Accordion.tsx`) para FAQ, pero las pestañas son un patrón distinto (WAI-ARIA Tabs) que
aún no está implementado en el proyecto.
</context>

<task>
Reorganiza el Panel interno en pestañas accesibles: una por sección (Preguntas sin resolver, Gestión
de artículos, Chats, Sugerencias, Categorías y, solo para Administrador, Administración), de modo que
solo el contenido de la pestaña activa esté visible y se elimine el scroll largo actual.
</task>

<constraints>
Requisitos obligatorios (MUST):
- Implementar el patrón WAI-ARIA Tabs completo: `role="tablist"` con nombre accesible
  (`aria-label`), cada control `role="tab"` con `aria-selected` y `aria-controls`, cada contenido
  `role="tabpanel"` con `aria-labelledby`, y *roving tabindex* (solo la pestaña activa tiene
  `tabIndex={0}`, el resto `-1`).
- Navegación por teclado: flechas izquierda/derecha (y arriba/abajo) mueven el foco entre pestañas
  con activación automática, `Home`/`End` van a la primera/última. El clic también cambia de pestaña.
- La pestaña activa se distingue con algo más que color (borde superior, negrita, etc.), nunca solo
  con un cambio de tono.
- Extraer un componente genérico y reutilizable (p. ej. `src/components/Tabs.tsx`) parametrizado por
  una lista de `{ id, etiqueta, contenido }`, sin lógica específica del Panel — debe poder reutilizarse
  después en formularios bilingües (es/pt) sin cambios.
- La pestaña activa se refleja en la URL como parámetro de consulta (p. ej. `?seccion=categorias`)
  para que se pueda enlazar directamente a una sección y sobreviva a un refresco de página, usando
  `router.replace` (sin ensuciar el historial de navegación).
- La resolución de qué pestaña mostrar a partir del parámetro debe ser lógica pura, testeable sin DOM
  (nivel: si el parámetro pide "admin" y la sesión no es Administrador, cae a la pestaña por defecto —
  no expone la sección por URL directa).
- Ninguna sección deja de funcionar: preserva el comportamiento actual de cada una (filtros, modales de
  alta/edición, avisos de éxito/error, recarga de datos) tal cual está.
- Cumplir los mínimos de accesibilidad ya vigentes en el proyecto: contraste 4.5:1, foco visible,
  objetivos táctiles de 44×44px en cada pestaña.

Fuera de alcance (NO hacer en este cambio):
- No tocar la lógica interna de cada sección (tabla de preguntas, CRUD de artículos/categorías,
  supervisión de chats, sugerencias, formularios de marca/IA): solo el contenedor y la navegación.
- No introducir una librería de UI externa para las pestañas: es un componente propio, coherente con
  el resto del sistema de diseño (Tailwind + tokens `--acento`).
</constraints>

<output_format>
Entrega el cambio como:
1. El componente reutilizable de pestañas con su contrato de props.
2. El módulo de resolución de la pestaña activa a partir de la URL (lógica pura) y sus tests.
3. La reorganización de `PanelInterno.tsx` en las seis secciones, condicionando la de Administración al
   nivel de la sesión.
Explica en 3-4 frases qué patrón ARIA se siguió y por qué la pestaña activa vive en la URL en vez de en
estado local.
</output_format>
</enhanced_prompt>
