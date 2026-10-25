# DKITCHEN — PARTE 5: ALÉRGENOS, MONETIZACIÓN DE IDIOMAS, Y NUEVO PRODUCTO — ANALIZADOR DE RENTABILIDAD/ESCANDALLOS COMO HERRAMIENTA DE PROSPECCIÓN

**Complementa a:** Partes 1-4. Nace de la comparación con Food&Service (auditoría del 2026-09-20) y de la decisión de Alex de incorporar dos factores que faltaban (alérgenos, profundidad de idioma) y de construir un producto nuevo — el Analizador de Rentabilidad/Escandallos — usado como herramienta de captación, no solo como función interna.

**Secuencia de entrega — CONFIRMADO por Alex:** este documento se entrega al agente de código como un encargo **separado y posterior** a las Partes 1-4. El agente completa primero todas las fases de la migración/motor de QR/prospector ya definidas; solo cuando esa implementación esté terminada, Alex entrega la Parte 5 como el siguiente encargo independiente. Ningún punto de este documento bloquea ni depende de las Partes 1-4 en curso — es intencionalmente una fase aparte.

---

## 1. Alérgenos — obligatorio, sin coste, en todo el producto

**CONFIRMADO por Alex:** se añade como campo obligado del catálogo de productos, sin cobrar extra y sin venderse como diferencial de pago — aparece tanto en las cartas generadas por el motor de QR (Parte 2) como en las PWA de Base Operativa y de cada marca de Dark Kitchen (Parte 3, Sección 1).

- **Alcance técnico:** un campo más por producto en el catálogo (`alergenos: string[]` o equivalente, con la lista estándar de los 14 alérgenos de declaración obligatoria en la UE — Reglamento 1169/2011: gluten, crustáceos, huevos, pescado, cacahuetes, soja, lácteos, frutos de cáscara, apio, mostaza, sésamo, sulfitos, altramuces, moluscos). No es un subsistema nuevo, es una extensión del modelo de datos de producto ya existente (Sección 2.3 de la Parte 2, "desglose exacto por plan").
- **Por qué no se cobra:** no es una función diferencial de venta, es una casilla de cumplimiento — cobrar por algo que legalmente ya deberían tener resta credibilidad al resto de la propuesta de valor. Se presenta como algo que "ya viene incluido", reforzando el argumento de producto completo sin sorpresas de la Sección 2.1 de este documento.
- **Aplica a ambos planes de QR (Básico y Ampliado)** y a toda PWA de Base Operativa/Dark Kitchen, sin distinción de nivel.

---

## 2. Multiidioma — tratamiento distinto entre PWA y carta QR, CONFIRMADO por Alex

### 2.1 En la PWA (Base Operativa y Dark Kitchen): capa de expansión de pago

- Base incluida: español + inglés, fijo, sin coste adicional (ya estandarizado).
- **Cargo por idioma adicional — CONFIRMADO, recurrente mensual, no pago único:** se cobra por mes, no como pago único, porque el trabajo real que justifica el cargo (mantener la traducción sincronizada ante cada cambio de producto) es continuo, no puntual — el mismo razonamiento detrás de por qué plataformas de localización comparables (Weglot, referencia de mercado) cobran siempre de forma recurrente, nunca como pago único.
- **Criterio de tamaño — CONFIRMADO:** se reutiliza el mismo umbral de tamaño de catálogo ya usado en los planes de QR (Parte 2, Sección 2.3):
  - Catálogo de **menos de 50 productos activos**: 20€/mes por idioma adicional.
  - Catálogo de **50+ productos activos, o cliente Dark Kitchen multimarca** (cualquier marca con 50+ o el conjunto agregado del cliente): 50€/mes por idioma adicional.
- **Justificación técnica real, no arbitraria:** la traducción en la PWA se gestiona desde base de datos vía i18n-translate — cada traducción es atómica y persistente frente a cambios de producto (nombre, texto, precio), es decir, cuando se edita un plato en español, la capa de traducción no se rompe ni hay que re-traducir todo el catálogo a mano. Eso es trabajo de estructura de datos real por cada idioma nuevo, no una plantilla estática — el cargo está justificado por carga técnica real, coherente con el mismo principio que ya rige la cuota de Dark Kitchen (Parte 3, Sección 2.2): se cobra por carga real de infraestructura, no por valor percibido.

### 2.2 En la carta QR: valor añadido gratuito

- La traducción de la carta QR es más superficial — se aplica solo a la carta (nombres y descripciones de producto), no a la profundidad estructural de la PWA completa (flujos de pedido, paneles, confirmaciones, etc.).
- **CONFIRMADO: se ofrece sin coste**, como valor añadido vendible junto a los alérgenos — mismo tratamiento, mismo argumento de venta ("esto ya viene incluido"), sin convertirlo en upsell.
- Esto mantiene la promesa del QR como el producto de menor fricción y menor coste de la escalera (Parte 2), mientras la monetización de idiomas se reserva para el producto que sí tiene la carga técnica real que la justifica.

---

## 3. Analizador de Rentabilidad / Escandallos — nuevo producto, doble función (herramienta interna + instrumento de captación)

Esto es lo más nuevo de esta parte: no es solo una función más del catálogo, es un producto en sí mismo, con el mismo rol que hoy cumple el motor de QR — puerta de entrada de fricción mínima — pero apuntando a un dolor distinto y más afilado: **rentabilidad real**, no gestión ni digitalización.

### 3.1 Por qué esto encaja con la tesis de posicionamiento de Alex

Alex definió el eje de diferenciación frente a la competencia como "tracción real, no gestión interna más bonita" — funcionalidad creada para fidelizar, vender más y aumentar exposición, no paneles de control. El Analizador de Rentabilidad es el ejemplo más claro de ese eje: no organiza el negocio, le dice al dueño si su hamburguesa a 12€ le hace ganar o perder dinero — el mismo gancho de dolor que usa el propio Food&Service en su publicidad ("¿Realmente es rentable 12€ por hamburguesa?"), pero aquí no es solo un anuncio, es una herramienta real que entrega una respuesta con datos.

### 3.2 Mecánica del embudo — CONFIRMADO por Alex, estructura general

1. **Puerta de entrada:** formulario analítico — nombre, dirección, correo, teléfono, tipo de restaurante, situación actual (si ya opera o quiere abrir uno nuevo), tipo de gastronomía, tipo de menú, y el menú en sí (imagen del menú físico, o texto con cada plato y precio).
2. **Entrega automática:** un PDF generado automáticamente con el análisis de rentabilidad/escandallo por plato — coste estimado, margen, errores habituales de pricing, recomendaciones de mejora.
3. **Regla de negocio:** el primer informe siempre es gratuito, se ofrezca antes o después de que el prospecto haya tocado cualquier otro servicio de DKitchen — no es exclusivo de un momento del embudo, es una puerta de entrada permanente.
4. **Upsell — CONFIRMADO:** si el cliente quiere profundizar (datos reales de proveedor, porciones exactas, actualización continua conforme cambian precios de insumos), eso requiere la versión completa — que **viene incluida dentro de Base Operativa y Dark Kitchen**, no se vende como suscripción aparte por defecto (ver Sección 3.3-bis para el razonamiento completo).
5. **Captación de datos:** todos los datos del formulario quedan registrados para DKitchen — esto convierte la herramienta en la puerta de entrada más rica en datos de todo el embudo, más incluso que el QR, porque además de contacto captura tipo de cocina, situación del negocio y el menú completo con precios — información de calificación directamente útil para el Prospector (ver Sección 3.6).
6. **Control de uso de la capa gratuita — CONFIRMADO, obligatorio construirlo desde la v1:**
   - **Un informe gratuito por negocio, no ilimitado.** La clave de control es la combinación correo + teléfono del formulario — un mismo correo o teléfono no puede generar un segundo informe gratuito. Si lo intenta, no se le niega la interacción: se le informa de que ya recibió su informe gratuito y se le ofrece directamente la versión completa (Sección 3.3-bis) o el contacto con Alex — un segundo intento es, de hecho, una señal de interés fuerte, y debe registrarse como tal para el Prospector (Sección 3.6), no descartarse.
   - **Verificación de correo antes de ejecutar el análisis (recomendado):** dado que cada informe gratuito tiene un coste real de IA, conviene exigir confirmación del correo (enlace o código) antes de lanzar el análisis — evita gastar presupuesto de IA en correos falsos o inexistentes, y de paso mejora la calidad del dato de contacto capturado.
   - **Límite global diario/mensual de informes gratuitos (recomendado, no solo por negocio):** un tope agregado (a definir el número exacto según presupuesto que Alex quiera destinar) protege contra un pico de solicitudes — por bots, por viralización de un anuncio, o por abuso coordinado — que dispare el gasto de IA sin control. Al alcanzar el tope, la herramienta no se cierra, cambia a un mensaje de "alta demanda ahora mismo, te lo enviamos en las próximas horas" y encola la solicitud, en vez de negar el servicio.

### 3.3 Matiz honesto que hay que fijar antes de construir nada: qué puede prometer la versión gratuita y qué no

Esto es importante y hay que decidirlo con Alex antes de escribir el copy de venta de la herramienta: el formulario solo pide **nombre de plato + precio** (más contexto de tipo de cocina), no el desglose real de ingredientes ni el coste real de cada insumo que compra ese restaurante en concreto. Con esa información, el informe gratuito **no puede calcular un coste exacto real** — solo puede producir una **estimación inferida**: a partir del nombre del plato, el tipo de cocina y benchmarks de la industria, la IA infiere una composición de ingredientes probable y estima su coste contra el precio de venta, comparándolo con el % de food cost objetivo del sector (el estándar de la industria es 28-35% del precio de venta — fuente: VantaInsights, coincide con Toast POS y TouchBistro). Esto es exactamente lo que hay que decirle al usuario en el propio informe, con transparencia ("estimación basada en benchmarks del sector, no en tus costes reales de proveedor") — no por transparencia legal solamente, sino porque es lo que hace que el upsell a la versión profunda tenga sentido: **la versión gratuita vende la pregunta, la versión de pago vende la respuesta exacta** (ahí sí se piden costes reales de proveedor y porciones). Esto encaja de forma natural con la regla que ya puso Alex ("el primer documento es gratis, si quieres profundizar hay que aumentar la capacidad de la herramienta") — la razón de por qué hay que aumentar la capacidad no es solo comercial, es literalmente que se necesitan más datos de entrada para que el cálculo sea preciso.

### 3.3-bis Monetización de la versión completa — CONFIRMADO por Alex

- **La versión completa (v2) del Analizador se incluye dentro de Base Operativa y Dark Kitchen, sin venderse como suscripción aparte por defecto.** Refuerza la posición "casi nivel POS" de Base Operativa (Parte 3, Sección 1) en vez de sumar un SKU nuevo que explicar, y puede alimentarse con los mismos datos de pedidos de la PWA que ya sostienen el resto del modelo de facturación (Parte 3, Sección 1.3), sin pedirle nada adicional al cliente.
- Referencia de mercado que sostiene esta decisión: herramientas dedicadas de costeo de recetas (meez, la única con precio público entre las revisadas) van de ~19-24€/mes en su plan más básico hasta 179-199€/mes en el más completo — venderla aparte pondría a DKitchen a competir en ese rango por una sola función, en vez de usarla para reforzar el peldaño que ya vende la sofisticación operativa completa. Mantiene además el patrón de precio ya establecido en toda la escalera: siempre por debajo del equivalente de mercado, nunca un SKU aislado que hay que justificar por separado.

### 3.4 Aviso de cumplimiento — RGPD/LOPDGDD

El formulario captura datos personales identificables (nombre, dirección, correo, teléfono) más datos de negocio. Igual que se dejó establecido para el Prospector (Parte 4, coherente con la investigación legal ya hecha sobre LSSI/RGPD y cold email en España), el formulario necesita: aviso de privacidad claro sobre qué se hace con los datos, casilla de consentimiento separada para recibir comunicaciones comerciales (no se puede asumir que rellenar el formulario = aceptar marketing, tienen que ser dos consentimientos distintos), y base legal clara para el envío del PDF en sí (interés legítimo/ejecución de la solicitud) frente al envío de comunicaciones comerciales posteriores (consentimiento explícito). Esto no bloquea nada, es una nota para quien construya el formulario.

### 3.5 Enfoque técnico — qué existe ya y cómo construirlo

**Investigación de repositorios públicos — auditoría en profundidad, no solo revisión superficial:**

Se clonó y se revisó el código real de [`clawnify/OpenKitchen`](https://github.com/clawnify/OpenKitchen), no solo su descripción. Confirmado tras la auditoría:

1. **Licencia AGPL-3.0, confirmada directamente en el código** (`README.md` tiene una sección "## License" con el texto "AGPL-3.0.", aunque de forma descuidada no hay un archivo `LICENSE` aparte). Es una licencia con cláusula de "uso en red": si se modifica y se ejecuta como servicio online (exactamente el caso de esta herramienta), la obligación legal es ofrecer el código fuente modificado a quien use el servicio — incompatible con mantener esto como herramienta propietaria de DKitchen.
2. **Hallazgo adicional, más allá de la licencia: OpenKitchen no es una app autocontenida.** Depende de paquetes propietarios de una plataforma de terceros llamada "Clawnify" (`@clawnify/app`, `@clawnify/db`) y se despliega con su propio CLI a su infraestructura hosted — pese a llamarse a sí mismo "self-hostable". Adoptarlo ataría el producto a la infraestructura de otra empresa, no solo a su código.
3. **La parte de IA (lectura de fotos de factura) ni siquiera está en este repositorio** — la hace "tu agente Clawnify", un servicio externo de esa misma empresa. Clonar el repo no da acceso a esa función.
4. **Proyecto inmaduro** — 2 estrellas, 0 forks, 7 commits.
5. **El algoritmo de coste en sí, revisado línea por línea (`food-cost.ts`, 112 líneas), es correcto y simple** — recorre la lista de materiales de forma recursiva (receta hecha de ingredientes y sub-recetas anidadas), protegido contra ciclos, con aritmética en céntimos para evitar errores de redondeo. Es matemática estándar del sector, bien escrita, fácil de replicar desde cero sin heredar código ni licencia.

**Búsqueda de alternativas adicionales, con licencia permisiva:** se encontraron [`tgbtom/Laravel-Recipes-and-Costing`](https://github.com/tgbtom/Laravel-Recipes-and-Costing) (MIT, PHP/Laravel, 3 estrellas, 15 commits) y [`MohNamdar/RecipeCost`](https://github.com/MohNamdar/RecipeCost) (MIT, Python/Flask, 0 estrellas, 9 commits) — ambos con licencia sin conflicto legal, pero proyectos de juguete prácticamente abandonados, en un stack ajeno al de DKitchen, y sin ninguna capacidad de IA/imagen. **No existe hoy una base open source seria que valga la pena forkear para esta herramienta** — confirma que construirla desde cero es la única ruta razonable, con bajo riesgo porque la parte de cálculo (lo único que parecía complejo) es simple y ya está bien documentada como referencia.

**Recomendación confirmada:** usar OpenKitchen únicamente como **referencia conceptual** de la lógica de cálculo (coste de receta = suma de coste de ingrediente × cantidad; % food cost = coste receta / precio de venta; margen = precio − coste) y construir una versión propia, ligera, sin heredar código ni licencia de ningún repositorio revisado.

**Enfoque de construcción — CONFIRMADO, versión ligera con IA multimodal:**
- El formulario acepta imagen del menú **o** texto — esto encaja de forma natural con un modelo de IA multimodal (familia "flash"/ligera de Gemini vía Google AI Studio, u otro proveedor equivalente) que en una sola llamada puede: (1) leer la imagen del menú y extraer plato + precio de forma estructurada (OCR + comprensión, no hace falta un pipeline de OCR aparte), (2) inferir una composición de ingredientes probable por plato según el tipo de cocina indicado en el formulario, (3) estimar el coste contra el benchmark de food cost del sector (28-35%), (4) generar el texto de recomendaciones/errores habituales, todo en una respuesta estructurada (JSON) que luego se vuelca a una plantilla de PDF.
- **Proveedor de IA:** se empieza con un modelo de la familia "flash"/ligera (Gemini u otro), por su coste muy bajo por imagen procesada y capa gratuita para prototipar — coherente con que esta herramienta regala el informe y DKitchen absorbe el coste de inferencia (de ahí la importancia del control de uso de la Sección 3.2, punto 6). **El proveedor no se acopla al resto del producto** — se implementa como un módulo de llamada a IA intercambiable, no código específico de un proveedor esparcido por la aplicación, para poder cambiarlo en la v2 si hace falta más precisión. Los precios exactos de estas APIs cambian con frecuencia y deben verificarse otra vez en el momento de construir, no darse por buenos desde este documento.
- Esto es deliberadamente más simple que OpenKitchen (que gestiona inventario, facturas de proveedor y recetas recursivas) porque la versión gratuita de esta herramienta no necesita nada de eso — es una estimación de entrada, no un sistema de costeo operativo. La versión completa (Sección 3.3-bis) es la que eventualmente sí necesitaría algo más parecido a un motor de costeo real con datos de proveedor.

**Otros repositorios de referencia para la lógica de cálculo, menos completos pero simples de leer:**
- [`Korgusha/price-calculator`](https://github.com/Korgusha/price-calculator) — plantilla de Excel/Sheets con base de 500 ingredientes y 55 fichas de receta, útil como referencia de qué campos de coste se necesitan (depreciación de equipo, markup de mano de obra, etc.) aunque no es una app.
- [`petritz/food-calculator-api`](https://github.com/petritz/food-calculator-api) — API pequeña de cálculo de coste/calorías de receta, útil como referencia de estructura de API, no como base a forkear (proyecto muy pequeño, sin licencia clara verificada).

### 3.6 Integración con el Prospector — Brief F, nuevo y a la vez independiente

**CONFIRMADO: el Analizador se documenta como un Brief F nuevo e independiente en la Parte 4**, no como extensión de los Briefs A o C — su señal de calificación es distinta (cualquiera con un menú, no "sin carta digital"), captura más datos de calificación que los otros 5 briefs juntos, y su salida no es un mensaje a aprobar sino un PDF entregado automáticamente, un flujo distinto al del resto de la taxonomía de `leads.csv` (Parte 4, Sección 1.1). Los Briefs A (Outbound QR) y C (Colocación orgánica) sí pueden **usarlo como su CTA preferido** — "te hago un análisis de rentabilidad gratis de tu carta" es una oferta más fácil de aceptar que "hablemos de digitalizar tu menú" — sin que eso signifique fusionar la definición de los briefs. Un segundo intento del mismo negocio de generar el informe gratuito (bloqueado por el control de uso de la Sección 3.2) se registra como señal de interés fuerte para el Brief F, con la misma lógica de calificación que ya usa el Brief D para clientes QR activos (Parte 4, Sección 1.3).

---

## 4. Fases de desarrollo — CONFIRMADO, todas ejecutables solo después de que el agente termine las Partes 1-4

**Fase A (rápida, sin dependencias técnicas nuevas):** alérgenos en el modelo de datos de producto (Sección 1) — aplica a QR y PWA por igual.

**Fase B:** capa de expansión de idioma en PWA con cobro recurrente (Sección 2.1), con la tabla de tamaño de catálogo ya cerrada (20€/mes por debajo de 50 productos, 50€/mes por encima o Dark Kitchen multimarca) — depende de que la capa i18n de base de datos ya esté construida según lo que describe Alex.

**Fase C — v1 del Analizador de Rentabilidad (versión gratuita/estimada):** formulario + control de uso (Sección 3.2, punto 6) + generación de PDF vía IA multimodal, sin motor de costeo propio, apoyado en benchmarks de industria (Sección 3.3). Incluye el Brief F en la Parte 4 (Sección 3.6). Es la fase que se puede lanzar más rápido porque no depende de tener clientes reales ni datos de proveedor.

**Fase D — v2 del Analizador (versión completa, incluida en Base Operativa/Dark Kitchen):** motor de costeo con datos reales de proveedor/porciones (Sección 3.3-bis) — aquí sí conviene revisar si se justifica una arquitectura más completa, sin heredar código de OpenKitchen por la licencia.

---

## 5. Estado de las preguntas de esta parte

Las 4 preguntas originales de esta sección ya están CONFIRMADAS y cerradas en el cuerpo del documento (idioma: Sección 2.1; monetización v2: Sección 3.3-bis; Brief F: Sección 3.6; proveedor de IA: Sección 3.5) — junto con el control de uso de la capa gratuita (Sección 3.2, punto 6), que no era una pregunta original pero Alex pidió incorporar y dejar establecido antes de construir nada. No queda ninguna cifra abierta en esta parte. El único punto que sigue sin cerrar, y que no depende de Claude sino de un dato externo real, es el tope numérico exacto del límite global diario/mensual de informes gratuitos (Sección 3.2, punto 6) — depende del presupuesto de IA que Alex quiera destinar, a fijar en el momento de construcción, no antes.
