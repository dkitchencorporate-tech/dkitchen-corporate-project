# DKITCHEN — PARTE 11: AJUSTE COMPETITIVO DE QR, FUSIÓN CON ESCANDALLO, FLYWHEEL DE CASOS DE ÉXITO Y CIERRE DE LOS ÚLTIMOS PUNTOS DE MENSAJERÍA

**Complementa a:** Partes 1-10. Recoge las decisiones tomadas tras leer la Parte 10 ("Hora 0") — el ajuste de precio de QR frente al mercado real, la fusión de Auditoría con el Escandallo como segundo escalón de entrada agresiva, el giro de estrategia de ads hacia un bucle de reinversión, y el activo de casos de éxito (Néstor Pizza, Seven Food Fries) como palanca para escapar del techo geográfico de Granada+Baza. Cierra con los tres puntos que Alex dejó abiertos en su última respuesta y que sí necesitan su decisión antes de tocar código: la relación entre el nuevo Ampliado y la tarifa de reservas, el posible renombrado de Base Operativa, y el dispositivo de "salto cuántico" entre QR y Base Operativa.

**Ya aplicado directamente en los documentos correspondientes** (no hace falta repetirlo aquí, solo se referencia):
- QR Básico 19€→**9€/mes**, QR Ampliado 49€→**25€/mes** — Parte 2, Sección 2.3.
- Cifra "14h/semana recuperadas, ticket medio +15%" retirada del hero de QR hasta tener un dato real — Parte 6, Sección 3.
- Página nueva `/casos-de-exito` — Parte 6, Sección 7-bis.
- Auditoría (47€) absorbe una capa de Escandallo + order-bump en el checkout de QR — Parte 8, Sección 3.1.
- Filosofía de segmento "solo QR" como base recurrente válida, no fallo de funnel — Parte 3, Sección 4 (SOSTENER).

---

## 1. Por qué bajar QR no es "competir por precio" — es corregir un error de posicionamiento

La Parte 10 ya dejó el dato crudo: la banda real de mercado para carta QR con funciones comparables es **4-12€/mes**, y había competidores gratuitos con casi las mismas funciones que DKitchen cobraba aparte (QR estable, alérgenos, reservas básicas). A 19€/49€, DKitchen no competía "por valor superior justificado" — competía **fuera de rango**, lo que obligaba a cada venta a depender de que el prospecto entendiera todo el ecosistema detrás antes de decidir, un nivel de explicación que un producto de entrada de bajo ticket no debería necesitar.

Bajar a 9€/25€ no es igualar el precio de la competencia gratuita (eso es imposible y no es el objetivo) — es **entrar dentro de la banda de precio de las opciones de pago reales** (qrcarta.com 3,95€, tucartadigital.com 7,95-11,95€ sin anuncios, menuaqui.com ~10€, comealacarta.com ~24,6€), de forma que el argumento de venta pase de "por qué pagar por esto si hay gratis" a "por qué elegir DKitchen entre las opciones de pago" — una pregunta mucho más fácil de ganar, porque ahí sí hay diferenciación real (ecosistema completo, trato humano, sin publicidad ajena, ruta de crecimiento).

**Efecto secundario deseado, no accidental:** un precio de entrada más bajo reduce el CAC efectivo (Parte 10, Sección 3) y aumenta el volumen de clientes que entran al embudo — más gente pagando 9€ es más gente expuesta al order-bump de Auditoría (Parte 8, Sección 3.1) y más gente clasificable en Evolucionar/Sostener (Parte 3, Sección 4). El ingreso de QR en sí mismo deja de ser el objetivo (nunca lo fue, Parte 2 Sección 3.1) — ahora, con precio más bajo, ese hecho es todavía más cierto.

---

## 2. El mecanismo de escalera 1€ → Experience → Base Operativa — qué ya existe y qué es nuevo

Alex pidió pensar cómo mover a los clientes de 1€ hacia arriba de forma sistemática. La respuesta honesta es que **la mayoría de las piezas ya estaban construidas en partes anteriores** — lo que faltaba era verlas como un solo mecanismo:

1. **Entrada (Parte 2, Sección 3.3):** QR a 1€ el primer mes, tarjeta ya registrada. El momento justo antes del primer cobro completo es la ventana de venta cruzada más caliente — ahí se presenta Experience.
2. **Ahora, además (Parte 8, Sección 3.1):** en el mismo checkout de QR, antes incluso de ese primer mes, se ofrece el order-bump de Auditoría+Escandallo (47€) — un segundo punto de entrada agresiva, no solo uno.
3. **Clasificación automática (Parte 3, Sección 4):** escaneos sostenidos + comportamiento de pago clasifican a cada cliente en Evolucionar/Sostener/Soltar sin que Alex tenga que revisarlo a mano.
4. **Puente de precio (Parte 3, Sección 4):** el cliente QR activo que da el salto a Experience paga 199€, no 299€ — fricción de precio reducida específicamente para este tramo de la escalera.
5. **Lo nuevo de esta parte:** el flywheel de casos de éxito (Sección 3, abajo) es lo que le da a ese cliente ya evolucionado una prueba visual y verificable de qué hay al final del camino (Base Operativa) antes de que tenga que decidir — el eslabón que faltaba entre "confío en DKitchen" y "puedo verlo funcionando en un negocio como el mío".

No hace falta construir un mecanismo nuevo de escalera — hace falta que el agente de código conecte estas piezas (ya especificadas, cada una en su parte) como un embudo continuo, y que la página de casos de éxito quede enlazada desde los puntos de decisión correctos (ya especificado en Parte 6, Sección 7-bis).

---

## 3. Casos de éxito como activo de escalado — por qué es la pieza de mayor apalancamiento

Esto conecta directamente con la pregunta de fondo que Alex planteó tras la Parte 10 ("qué hace falta para que esto cambie mi vida"). El techo estructural identificado ahí era geográfico: Granada capital + Baza tienen un TAM estimado de 2.000-3.500 negocios de hostelería, y la venta actual depende de que Alex esté físicamente presente. Néstor Pizza (verificado como PWA real y activa) y Seven Food Fries son la prueba de que el producto funciona fuera de una demo — documentar ~10 casos con vídeo es lo que permite que un prospecto en cualquier ciudad, no solo Granada/Baza, evalúe el producto sin que Alex tenga que estar delante. Es, literalmente, el mecanismo que sustituye la presencia física de Alex por prueba social verificable, que es la única forma de escalar Base Operativa/Dark Kitchen más allá del límite de agenda de una sola persona.

La disciplina de "solo cifras reales, nunca estimadas" (Parte 6, Sección 7-bis) no es solo ética de venta — es lo que hace que cada caso funcione como prueba en vez de como marketing genérico, coherente con la investigación de venta por ROI de SaaS de restauración (Parte 10, Sección 7): el hostelero compra por euros reales demostrados, no por una promesa.

---

## 4. Plantillas de creatividad por formato de Experience — RESUELTO: sí, formalizado (aplicado en Parte 2, Sección 5.2-bis)

Pre-construir una plantilla de creatividad (2 estáticas + 1 vídeo) por cada uno de los 7 formatos fijos de Experience, de forma que un evento nuevo solo cambie fecha/precio/ubicación sobre una base ya lista, en vez de crear creatividad desde cero cada vez. Mantiene la campaña pequeña y controlada (25-50 personas, hipergeolocalizada) pero reduce el coste marginal de cada evento nuevo.

---

## 5. Verificación pendiente de las cifras de mercado de la Parte 10

Aviso honesto que quedó pendiente: la población de Baza y el número estimado de negocios de hostelería en Granada capital que usé en la Parte 10 son estimaciones de conocimiento general, no cifras verificadas en vivo esa sesión (las herramientas de verificación externa fallaron por límite de sesión). Antes de comprometer presupuesto real de ads sobre esas cifras de TAM, recomiendo verificarlas con una fuente oficial (INE para población, SIMA o el propio Ayuntamiento/Cámara de Comercio para censo de hostelería) — es una tarea de 15-20 minutos en una sesión futura, y no bloquea nada de lo que se ha decidido hasta ahora, porque ninguna decisión de precio o producto depende del número exacto.

---

## 6. Los tres puntos que necesitaban tu decisión — RESUELTOS

> **Actualización:** los tres puntos de esta sección, más la plantilla de creatividad de la Sección 4, ya fueron decididos por Alex. Se deja el razonamiento original como referencia; el resultado aplicado está en las Partes 2, 3, 6 y 7 directamente.

### 6.1 Relación entre el nuevo Ampliado (25€/mes) y la tarifa de reservas (+10€/mes, hoy 59€ total) — RESUELTO: absorción total (aplicado en Parte 2 y Parte 3)

Aquí hay una tensión real que prefiero mostrarte en crudo en vez de decidir por ti: **si el motor de reservas pasa a estar incluido dentro de Ampliado sin coste adicional, el paquete total baja de 59€/mes (49+10) a 25€/mes** — una caída del 58% en lo que un cliente Ampliado+reservas paga, no solo el ajuste competitivo de la Sección 1. Puede ser correcto (es coherente con "entrar en la banda real de mercado"), pero es una cifra lo bastante grande como para que la confirmes con los ojos abiertos, no como efecto colateral de otra decisión.

Tres formas de resolverlo, de más a menos generosa con el cliente:

1. **Absorción total:** Google Business + reservas + reseñas quedan incluidos en Ampliado a 25€/mes, sin tarifa aparte. Máxima competitividad, pero es la caída de precio más fuerte y elimina un upsell que hoy existe.
2. **Reservas básicas incluidas, reservas "Pro" aparte:** Ampliado incluye una versión de reservas con el mismo tope bajo que ya se diseñó (sin gestión de mesas ni multiusuario), y se mantiene una tarifa superior (a definir, ya no +10€ sobre 49€ sino sobre la nueva base) para el negocio que necesita algo más serio — mantiene el upsell como señal de que el negocio necesita Base Operativa.
3. **Todo incluido salvo Google Business:** reservas y reseñas entran en Ampliado (son funciones de coste marginal bajo para DKitchen), pero la sincronización con Google Business Profile se mantiene como tarifa aparte, porque es la función más cercana a "gestión activa" y la que más se parece a un servicio recurrente de mantenimiento, no solo una función del panel.

### 6.2 Renombrar "Base Operativa" — RESUELTO: "Núcleo Operativo" (aplicado en Parte 6)

Quieres que el nombre comunique de un vistazo que es un sistema real y propio, no "una web" — que conecta con el POS/TPV que ya tiene el negocio y puede sincronizarse con la gestoría/Verifactu. Antes de proponer nombres, el coste real: "Base Operativa" ya aparece en las Partes 1, 2, 3, 6, 7 y 8, en rutas de página (`/base-operativa`) y previsiblemente en el propio código. Un rename público no es gratis, aunque sea solo de cara al cliente.

Dos caminos, y dentro del segundo, tres nombres candidatos:

- **A) No renombrar — reforzar el mensaje.** Mantener "Base Operativa" como nombre (cero coste de cambio en documentos/código/rutas ya escritos) y resolver el problema real, que es de mensaje, no de etiqueta: en el HERO de la página (Parte 6, Sección 6) añadir una línea explícita tipo "No es una web. Es tu sistema, conectado a tu TPV y a tu gestoría — y es tuyo, no de DKitchen" — ya hay precedente de esta idea en la Parte 8, Sección 7 (reframe "infraestructura y mantenimiento", nunca "suscripción"). Es la opción que recomendaría si el objetivo es resolver esto ya, sin arrastrar un rename a mitad de la Parte 7/8.
- **B) Renombrar de cara al público** (el nombre técnico interno puede seguir siendo "Base Operativa" en el código si eso reduce fricción de refactor):
  - **"Núcleo Operativo"** — mi favorito de los tres: "núcleo" comunica centro/motor del negocio, no una página más, y encaja directamente con el posicionamiento "casi nivel POS" que ya está escrito en la Parte 6.
  - **"Sistema Propio"** — el más directo en comunicar propiedad ("tu Sistema Propio DKitchen"), fácil de decir en una conversación de venta presencial, pero más genérico como nombre de producto.
  - **"Infraestructura DKitchen"** — el más coherente con el lenguaje contractual ya definido (Parte 8, "infraestructura y mantenimiento"), pero suena más a servicio técnico que a producto que un hostelero recuerde por nombre.

### 6.3 El "salto cuántico" QR → Núcleo Operativo — RESUELTO: se construye (aplicado en Parte 6 y Parte 7)

Propuesta concreta (no una lista de opciones sin dirección — aquí sí tengo una recomendación clara): usar los propios elementos 3D que la Parte 7 ya define para ambas páginas. La Parte 7 ya especifica un QR/carta flotante reactivo al cursor en `/qr`, y un dispositivo/pantalla flotante con animación de flujo de pedido en `/base-operativa`. Proceso recomendado:

- Un bloque nuevo de tipo **SALTO-CUÁNTICO** (se añade al vocabulario de bloques de la Parte 6, Sección 1), que aparece **una sola vez**, justo debajo del PRICING-BLOCK de la página de QR (ya señalado como pendiente en Parte 6, Sección 3) — el mismo elemento 3D de la tarjeta QR se transforma, en scroll, en el dispositivo/pantalla de Base Operativa: literalmente la misma pieza visual "creciendo" de un producto al siguiente, sin necesitar un activo 3D nuevo.
- Copy corto, en la misma línea que el resto del sistema de bloques (frase corta, sin explicación larga): algo del tipo "Esto es una carta." → "Esto es tu negocio entero." — el texto exacto se cierra en la fase de copywriting de la Parte 6, no hace falta fijarlo ahora.
- Reutiliza infraestructura ya presupuestada en la Parte 7 (React Three Fiber/Spline, ya previsto para ambas páginas) — coste de desarrollo incremental bajo frente a construir una animación nueva desde cero.

---

## 7. Cómo esto se conecta con la pregunta de fondo

Cada decisión de esta parte empuja en la misma dirección que ya se identificó como la palanca real para escapar del techo de "esto no cambia tu vida en 3 meses": precio de entrada realista → más volumen entrando al embudo → más gente expuesta al order-bump y a la escalera → casos de éxito reales que venden sin que tengas que estar delante → capacidad de vender fuera de Granada/Baza sin presencia física. Ninguna pieza suelta cambia el negocio — la combinación de las tres sí es, con diferencia, el mayor movimiento estructural que se ha tomado desde la Parte 10.
