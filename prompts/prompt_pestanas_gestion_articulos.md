<enhanced_prompt>
<persona>
Eres un ingeniero frontend senior que diseña formularios bilingües complejos priorizando que la
persona editora nunca pierda de vista en qué idioma está escribiendo, y que reutiliza componentes de
accesibilidad ya validados en el proyecto en vez de reinventarlos.
</persona>

<context>
El alta y edición de artículo (`src/components/ArticuloForm.tsx`) es bilingüe atómica por regla del
proyecto: español y portugués se crean y editan juntos, nunca se persiste un artículo en un solo
idioma. El formulario de un artículo, por idioma, incluye: título, slug, dos párrafos de cuerpo, un
bloque HowTo con título y una lista de pasos (título + descripción cada uno), una nota opcional y una
lista de preguntas frecuentes (pregunta + respuesta cada una). Multiplicado por dos idiomas y sumado a
los campos compartidos (categoría, artículos relacionados), el formulario completo es largo: hoy todos
los campos de ambos idiomas se muestran uno detrás de otro en la misma pantalla, lo que exige mucho
scroll para pasar de revisar el español al portugués (o viceversa) y dificulta comparar ambas versiones
sección por sección.

El proyecto ya resuelve este mismo problema en `src/components/CategoriaForm.tsx`: usa el componente
reutilizable de pestañas (`src/components/Tabs.tsx`, patrón WAI-ARIA Tabs) para separar los campos de
cada idioma en su propia pestaña (`nombre` + `slug` por idioma), mantiene los campos compartidos
(id, orden, icono) fuera de las pestañas, arranca en el idioma de la interfaz del usuario
(`i18n.language`), y ofrece un botón "Traducir a [idioma]" por pestaña que llama al backend
(`traducirCategoria`) y, al terminar, cambia automáticamente a la pestaña del idioma destino y mueve el
foco al primer campo traducido. Cuando el envío falla por un campo vacío en el idioma de origen de la
traducción, el formulario cambia a esa pestaña y enfoca el campo con el error.

`ArticuloForm.tsx` no sigue aún este patrón: sus campos de es/pt están apilados sin pestañas.
</context>

<task>
Reorganiza `ArticuloForm.tsx` en pestañas por idioma (español / portugués), replicando el patrón ya
validado en `CategoriaForm.tsx`, para minimizar el scroll y dejar claro en todo momento qué idioma se
está editando.
</task>

<constraints>
Requisitos obligatorios (MUST):
- Reutilizar el componente `Tabs` de `src/components/Tabs.tsx` tal cual existe (no crear una segunda
  implementación de pestañas): una pestaña por idioma, con dentro título, slug, párrafos, HowTo
  (título + pasos), nota y FAQ de ese idioma.
- Mantener fuera de las pestañas los campos que no son bilingües: categoría y artículos relacionados
  (se aplican al artículo entero, no a un idioma).
- Conservar el botón "Traducir a [idioma]" por pestaña con el mismo comportamiento que en
  `CategoriaForm`: valida que el idioma de origen tenga contenido antes de traducir, deshabilita
  reentrada mientras hay una traducción en curso, y al completarse cambia a la pestaña destino y mueve
  el foco al primer campo traducido de esa pestaña.
- Al fallar el guardado por un campo obligatorio vacío en un idioma, cambiar automáticamente a la
  pestaña de ese idioma y enfocar el campo en falta (igual que hoy hace el formulario, adaptado al
  nuevo layout con pestañas).
- La pestaña que se muestra al abrir el formulario es la del idioma activo de la interfaz
  (`i18n.language`), igual que en `CategoriaForm`.
- Cumplir accesibilidad: cada pestaña con `role="tab"`/`role="tabpanel"` correctos (los ya provee
  `Tabs`), foco visible, objetivos táctiles de 44×44px, y las validaciones de campo obligatorio siguen
  anunciándose igual que hoy (mensaje de error visible, no solo color).
- No cambiar el contrato de datos que envía el formulario al guardar (`guardarArticulo`/payload): la
  reorganización es solo de presentación.

Fuera de alcance (NO hacer en este cambio):
- No tocar `CategoriaForm.tsx` ni el componente `Tabs.tsx` salvo que la reutilización exponga una
  limitación real (documentarla si aparece, no ampliar el alcance sin decirlo).
- No cambiar las reglas de traducción del backend (`app/servicios_ia.py`, prompts, validación de
  estructura): el cambio es solo de presentación del formulario en el cliente.
</constraints>

<output_format>
Entrega:
1. La estructura de pestañas resultante (qué campos van dentro de cada una y cuáles quedan fuera),
   como lista breve.
2. El manejo del botón "Traducir a [idioma]" y del error de campo obligatorio, describiendo en qué
   difiere (si en algo) de `CategoriaForm` por tener más campos (HowTo, FAQ) que nombre/slug.
3. Confirmación explícita de que el payload enviado al guardar no cambia respecto al formulario actual.
No repitas código de `CategoriaForm.tsx` que ya existe en el repo: referencia el patrón por nombre de
archivo y función.
</output_format>
</enhanced_prompt>
