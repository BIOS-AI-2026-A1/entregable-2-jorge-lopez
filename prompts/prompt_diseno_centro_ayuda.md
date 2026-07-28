Diseña un prototipo visual navegable de alta fidelidad de un centro de ayuda para una empresa genérica. Es una referencia de diseño: sin lógica real, la única interacción es navegar entre pantallas. El proyecto final será una base de conocimiento con un chatbot RAG que cita fuentes y un panel interno de preguntas sin resolver; este diseño debe visualizar esas tres piezas.

<contexto>
- Marca genérica: "[EMPRESA]" como nombre, logo de cuadrado con iniciales. Todo el texto en español con contenido placeholder realista (no "lorem ipsum").
- El diseño se apoya en tres referencias, y debe notarse: el patrón de facto de centros de ayuda (Zendesk/Intercom: buscador protagonista, categorías, artículos populares, contacto como último recurso), el ciclo KCS para el panel interno (toda pregunta sin respuesta es candidata a convertirse en artículo) y contenido estructurado al estilo schema.org (FAQ y pasos HowTo como bloques visualmente diferenciados dentro del artículo).
- La accesibilidad no es opcional: el centro debe ser usable por personas con discapacidades visuales, motrices y cognitivas, cumpliendo WCAG 2.2 nivel AA.
</contexto>

<sistema_de_diseno>
- Estética SaaS limpia, fondo claro, un solo color de acento definido como token (--acento) para poder cambiarlo cuando se elija la marca real.
- Tipografía: cuerpo mínimo 16px, interlineado 1.5, líneas de máximo ~80 caracteres, jerarquía clara con un solo H1 por pantalla.
- Estados semánticos (éxito, advertencia, error, información) siempre con ícono o texto de apoyo, nunca comunicados solo con color.
</sistema_de_diseno>

<pantallas>
Pantalla 1 — Inicio del centro de ayuda:
- Enlace "Saltar al contenido" visible al recibir foco, encabezado con logo y título "[EMPRESA] Ayuda".
- Buscador grande con etiqueta visible (el placeholder no sustituye la etiqueta).
- Grilla de 6 tarjetas de categoría (Cuenta, Pagos, Envíos, Devoluciones, Seguridad, Facturación) con ícono y conteo ficticio de artículos.
- Sección "Artículos populares" con 5 enlaces.
- Al pie, bloque de escalamiento: "¿No encontraste lo que buscabas? Contactar soporte".
- Botón flotante de chat de al menos 44×44px con etiqueta accesible.

Pantalla 2 — Artículo:
- Breadcrumb (Ayuda > Categoría > Artículo), H1 y fecha de última actualización.
- Cuerpo que combine: 2 párrafos, un componente de pasos numerados (estructura HowTo) y un acordeón con 2 preguntas frecuentes (estructura FAQ).
- Bloque "¿Te resultó útil?" con botones Sí/No y sección "Artículos relacionados" con 3 enlaces.
- Cierre con el mismo bloque de escalamiento a soporte.

Pantalla 3 — Chatbot con citas:
- Panel tipo widget (~400px) sobre el inicio atenuado, con botón de cierre etiquetado.
- Conversación de ejemplo: pregunta del usuario y respuesta del bot con referencias numeradas [1] [2]; debajo, bloque "Fuentes" con título de artículo + URL ficticia por cita.
- Segundo intercambio donde el bot responde "No encontré esta información en la base de conocimiento" con botón "Contactar soporte".
- Campo de entrada con etiqueta accesible y nota: "Las respuestas se generan a partir de la base de conocimiento".
- Anotaciones de accesibilidad: el foco pasa al panel al abrirlo, los mensajes nuevos se anuncian a lectores de pantalla (aria-live), todo operable por teclado.

Pantalla 4 — Panel interno de preguntas sin resolver:
- Encabezado "Panel interno" con 3 métricas: preguntas sin resolver, % de respuestas con cita, artículos creados a partir de preguntas.
- Tabla con columnas: Pregunta, Veces preguntada, Similitud máx., Fecha, Estado y Acción ("Crear artículo").
- Estado como chips con ícono + texto en tres valores del ciclo KCS: Nueva, En revisión, Cubierta.
- 6 filas de ejemplo con preguntas plausibles de un centro de ayuda.
</pantallas>

<accesibilidad>
Aplicar en todas las pantallas y dejar anotado en el diseño:
- Contraste mínimo 4.5:1 en texto normal y 3:1 en texto grande y componentes de interfaz.
- Estado de foco visible diseñado para cada elemento interactivo (anillo de 2px con contraste suficiente), distinto del hover.
- Objetivos táctiles de al menos 44×44px en controles principales.
- Etiquetas visibles en todos los campos; errores de formulario con texto e ícono, no solo color.
- Orden de lectura lógico y jerarquía de encabezados anotada por pantalla.
- Íconos con texto alternativo; sin animaciones imprescindibles (respetar reducción de movimiento).
</accesibilidad>

<entregable>
- Diseño de alta fidelidad con las 4 pantallas conectadas por navegación.
- Estados diseñados: botón (normal, hover, foco, deshabilitado), chip en sus 3 valores y un campo con error.
- Capa o notas de anotaciones de accesibilidad por pantalla.
- Nada más debe ser funcional: buscador, chat y botones son decorativos.
</entregable>
