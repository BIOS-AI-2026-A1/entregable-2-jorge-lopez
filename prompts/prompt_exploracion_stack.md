<enhanced_prompt>
<persona>
Eres un arquitecto full-stack senior que asesora sobre un proyecto de portafolio. Razonas los tradeoffs de forma explícita y recomiendas el stack más simple que satisfaga las restricciones, evitando la sobreingeniería.
</persona>

<context> El proyecto es un "Centro de Ayuda" para un negocio genérico (marca de placeholder). Es un proyecto de portafolio/aprendizaje, no un producto de producción. El desarrollador se maneja por igual en Python y TypeScript/JavaScript. Ya existe un diseño visual de alta fidelidad que cubre cuatro pantallas: inicio del centro de ayuda (buscador + tarjetas de categoría + artículos populares), vista de artículo (breadcrumb, pasos HowTo, acordeón de FAQ), un widget de chat con IA con citas, y un panel interno de "preguntas sin resolver". La accesibilidad (WCAG 2.2 AA) es un requisito del diseño.

El sistema completo eventual incluirá un chatbot RAG que cita fuentes, pero eso está explícitamente fuera del alcance de esta exploración.
</context>

<task> Recomienda el stack tecnológico óptimo para construir un prototipo funcional de este Centro de Ayuda que corra localmente. </task> <constraints> Requisitos obligatorios (MUST): - El prototipo debe correr localmente en la máquina de un desarrollador con un único comando de arranque documentado. - Las cuatro pantallas deben ser navegables y funcionales como UI estática/interactiva (filtrado del buscador, acordeón, navegación por pestañas, renderizado de la tabla del panel con datos ficticios). - Las características de accesibilidad del diseño (navegación por teclado, estados de foco, marcado semántico, ARIA donde sea necesario) deben ser implementables en el stack elegido.

Fuera de alcance (NO incluir en la recomendación ni en la configuración):

Pipeline RAG: sin base de datos vectorial, sin embeddings, sin llamadas a LLM, sin scripts de ingesta.
El widget de chat debe estar presente solo como UI, poblado con mensajes y citas ficticias hardcodeadas.

Principio de diseño: favorecer el stack más simple que satisfaga lo anterior. Cada dependencia, servicio o lenguaje añadido debe justificar su existencia frente al objetivo de "corre localmente, proyecto de portafolio". Preferir archivos de datos ficticios sobre cualquier backend en ejecución, salvo que un backend sea genuinamente necesario.
</constraints>

<output_format>
Estructura la exploración de la siguiente forma:

Stack recomendado: una lista breve con viñetas de las tecnologías elegidas (framework de frontend, estilos, datos/estado, herramientas de ejecución local), una línea cada una indicando qué es y por qué gana aquí.
Alternativas descartadas: 2-3 opciones consideradas y una frase por cada una sobre por qué no fueron elegidas para este alcance.
Forma del proyecto: un esquema breve de carpetas/archivos que muestre dónde viven las cuatro pantallas, los datos ficticios y los componentes compartidos.
Ejecución local: los comandos exactos para instalar y arrancar el prototipo localmente.
Compatibilidad futura: 2-3 frases sobre cómo este stack acomoda la capa RAG más adelante sin retrabajo, de modo que ninguna decisión tomada ahora bloquee el trabajo futuro fuera de alcance.

Mantén la respuesta total enfocada y fácil de escanear. No escribas código más allá del esquema de carpetas y los comandos de ejecución.
</output_format>