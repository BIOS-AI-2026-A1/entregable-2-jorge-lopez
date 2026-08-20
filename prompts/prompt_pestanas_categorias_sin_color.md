<enhanced_prompt>
<persona>
Eres un ingeniero full-stack senior que limpia deuda de diseño visual (colores sueltos que no siguen
un sistema de tokens) al mismo tiempo que resuelve un problema de usabilidad, y que coordina el cambio
en frontend, backend y migración de base de datos como una sola unidad coherente.
</persona>

<context>
Cada categoría del centro de ayuda (`Cuenta`, `Pagos`, `Envíos`...) se modela hoy en `categorias` con,
además de `id`, `icono`, `orden` y sus traducciones es/pt (`nombre`, `slug`), dos columnas de
presentación visual libres: `fondo` (p. ej. `bg-indigo-50`) y `texto` (p. ej. `text-indigo-700`) —
clases de Tailwind escritas a mano por categoría, elegidas sin relación alguna con el color de acento
del portal (`--acento`). Con multi-tenant, esto es un problema doble: cada portal tiene su propio
acento de marca (`ajustesMarca.acento`), pero las tarjetas de categoría seguirían mostrando colores
fijos ajenos a esa marca; y further, nada garantiza que esas combinaciones sueltas cumplan el contraste
mínimo AA que sí se exige y valida para el acento del portal.

El resto del panel ya resuelve esto derivando la presentación de `var(--acento-claro)` /
`var(--acento)` (el mismo patrón que usan las tarjetas de métricas KPI de "Preguntas sin resolver"):
un solo color de origen, y todo lo demás se deriva por fórmula con contraste garantizado
(`derivarTokensAcento` en `app/src/seguridad/contraste.ts` / `api/app/contraste.py`).

Además, `CategoriaForm.tsx` (alta/edición de categoría) es bilingüe atómico igual que el artículo:
`nombre` y `slug` se piden en es y pt, hoy apilados sin separación por idioma, con el mismo problema de
scroll que el formulario de artículo.
</context>

<task>
En la pantalla de categorías: (1) elimina las columnas `fondo`/`texto` y cualquier selector de color
libre por categoría, haciendo que la presentación se derive siempre de `--acento`/`--acento-claro` del
portal; y (2) reorganiza `CategoriaForm.tsx` en pestañas por idioma (español / portugués), igual que ya
se hace o se va a hacer en el formulario de artículo.
</task>

<constraints>
Requisitos obligatorios (MUST) — eliminación del color:
- Quitar las columnas `fondo` y `texto` de la tabla `categorias` con una migración de Alembic
  reversible (el `downgrade` puede restituir las columnas con un valor por defecto único, no los
  colores originales por categoría — eso se pierde al aplicar el cambio, y debe quedar dicho
  explícitamente en el docstring de la migración).
- Quitar `fondo`/`texto` de los esquemas Pydantic, del modelo SQLAlchemy y de cualquier tipo
  TypeScript (`CategoriaAdmin`, contrato de contenido público) que los exponga.
- En toda vista pública o del panel que pinte una tarjeta o chip de categoría, sustituir el uso de
  `fondo`/`texto` por los tokens derivados del acento del portal (mismo patrón que las tarjetas KPI).
- `CategoriaForm.tsx` no debe ofrecer ningún selector de color: el único control de presentación por
  categoría que queda es el selector de icono ya existente.
- No perder ningún dato que no sea de color: `id`, `icono`, `orden`, `nombre` y `slug` por idioma se
  conservan intactos.

Requisitos obligatorios (MUST) — pestañas por idioma:
- Reutilizar el componente `Tabs` de `src/components/Tabs.tsx` (patrón WAI-ARIA Tabs, ya usado o en
  curso de uso en `ArticuloForm.tsx`): una pestaña por idioma con `nombre` y `slug` de ese idioma
  dentro; `id`, `orden` e `icono` quedan fuera de las pestañas por ser compartidos.
- Conservar el botón "Traducir a [idioma]" por pestaña con el comportamiento actual: valida que el
  idioma de origen tenga `nombre`, deshabilita reentrada durante la traducción, y al terminar cambia a
  la pestaña destino y enfoca el campo traducido.
- Arrancar en la pestaña del idioma activo de la interfaz (`i18n.language`), igual que hoy.
- Mantener el resto del comportamiento del formulario (autogeneración de `id` y `slug` desde el
  nombre en español mientras no se editen a mano, bloqueo de `id` al editar) sin cambios.

Fuera de alcance (NO hacer en este cambio):
- No añadir ninguna forma nueva de personalizar el color por categoría (ni siquiera limitada a
  variantes del acento): la intención explícita es que categorías dejen de tener color propio.
- No tocar la paleta de acento del portal en sí (`ajustesMarca`) ni su validación de contraste: solo se
  consume lo que ya deriva de ella.
</constraints>

<output_format>
Entrega:
1. La migración de Alembic (nombre, qué elimina, qué hace `downgrade` y su limitación documentada).
2. Los tipos y esquemas que pierden `fondo`/`texto` (backend y frontend), listados por archivo.
3. Los puntos de la interfaz donde una tarjeta/chip de categoría pasa a usar los tokens de acento en
   vez de las clases eliminadas.
4. La estructura de pestañas resultante en `CategoriaForm.tsx` (qué queda dentro de cada pestaña y qué
   queda fuera), sin repetir código ya existente en el repo.
</output_format>
</enhanced_prompt>
