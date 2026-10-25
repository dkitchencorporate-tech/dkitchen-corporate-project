# DKITCHEN — PARTE 3: ARQUITECTURA DE PWA/POS, MODELO DE FACTURACIÓN DE MARCAS, CICLO DE VIDA DEL CLIENTE, PROSPECTOR E INFRAESTRUCTURA

**Complementa a:** `DKITCHEN_MIGRATION_PLAN.md` (Parte 1) y `DKITCHEN_MIGRATION_PLAN_PARTE2.md` (Parte 2). Esta parte consolida todo lo definido en la fase de análisis y discusión posterior a la Parte 2 — no repite lo ya cerrado en las dos primeras partes, lo referencia y, donde corresponde, lo actualiza explícitamente.

## 0. Cómo leer las tres partes juntas (orden de lectura para el agente de código)

1. **Parte 1** — identidad (marca, dominio, entidad legal), la escalera de 5 peldaños, el desmontaje de Growth, el catálogo de marcas virtuales.
2. **Parte 2** — el motor de QR (autoservicio, checkout, autogestión, personalización), el modelo de Experience (sin comisión, pasarela del cliente, tarifas fijas), psico-marketing e investigación de mercado.
3. **Parte 3 (este documento)** — todo lo que solo se resuelve una vez que se entiende el detalle técnico real del producto: cómo funciona la PWA como sistema operativo completo del negocio (no solo una carta), cómo se factura una marca virtual de forma justa y verificable, cómo se trata a cada cliente a lo largo del tiempo (no solo en el momento de la venta), el sistema de prospección de nuevos clientes, y la decisión de infraestructura de base de datos.
4. **Parte 4** (`DKITCHEN_MIGRATION_PLAN_PARTE4.md`) — documento independiente, dirigido al **agente de prospección** (no al agente de código de la web): gobernanza completa del Prospector (taxonomía, los 5 briefs, reglas operativas) más todo el contexto de producto/precios de las Partes 1-3 que ese agente necesita para redactar mensajes y calificar prospectos con datos reales, no genéricos.

Donde este documento actualiza una cifra o un estado de "bloqueante" de las partes anteriores, lo dice explícitamente con el texto **"actualiza Parte X, Sección Y"**.

---

## 1. La PWA como kiosko/POS superior — arquitectura completa (aplica a Base Operativa y a cada marca virtual de Dark Kitchen)

Esto no estaba desarrollado con este nivel de detalle en las partes anteriores, y es la pieza que explica por qué el sistema puede facturar con precisión y por qué genera autoridad frente al cliente (FAQ.tsx ya lo insinúa con "casi nivel POS" — esto es la explicación completa de esa frase).

### 1.1 Todos los canales de pedido entran por el mismo sitio

La PWA no es solo la carta que ve el cliente final — es el punto de entrada único de **todos** los pedidos del negocio, sea cual sea su origen:
- **Autopedido del cliente** vía QR/carta digital (el caso obvio).
- **Pedido telefónico**, para el cliente que no sabe o no quiere usar la app — el personal del local lo introduce manualmente desde el panel admin, en nombre del cliente.
- **Pedido en mesa**, creado por un camarero.
- **Pedido para recogida (pickup)**, creado desde el propio panel admin con la misma fluidez que un pedido de mesa.
- **Modo camarero:** una vista de la PWA pensada para que el camarero la use desde su propio teléfono, como usuario anexado a la cuenta admin del local — va a la mesa, toma el pedido ahí mismo, y entra al sistema exactamente igual que un autopedido.

Cada pedido, sea cual sea su origen, genera automáticamente **ticket de cocina y ticket de barra**, con los datos fiscales y la dirección de entrega ya incorporados — no hay doble tecleo ni un sistema paralelo para pedidos "manuales".

### 1.2 Cierre de día — sincronización con el sistema fiscal del cliente

Al cerrar la jornada (un botón que además bloquea la entrada de más pedidos), la PWA permite migrar toda la información de ventas del día al **sistema POS principal que el cliente ya tiene** — el que gestiona su contabilidad de cara a la gestoría y que es compatible con Verifactu (el sistema español de verificación de facturación). Esto es una decisión de arquitectura importante: DKitchen **no intenta sustituir el sistema fiscal del cliente ni convertirse en software de facturación certificado** — eso es una carga regulatoria enorme que no aporta nada al producto. En su lugar, la PWA centraliza toda la operación del día y entrega los datos ya estructurados al sistema que sí tiene esa responsabilidad legal.

### 1.3 Consecuencia directa: el volumen de la PWA es, con una sola excepción, el volumen real del negocio

Salvo que el cliente también reciba pedidos de agregadores externos (Glovo, Uber Eats, Just Eat), **todo lo que se mueve en su cocina pasa por la PWA** — mesas, recogida, teléfono, autopedido. Esto no es un dato aproximado ni una muestra: es, con esa única excepción declarada, el registro completo de la actividad del negocio. Esto es lo que hace viable, y justo, medir facturación y umbrales de uso directamente desde los datos de la propia PWA (ver Sección 2) — no es una estimación, es prácticamente el libro de ventas real del cliente, sin que el cliente tenga que reportarte nada ni tú tengas que pedírselo.

---

## 2. Modelo de facturación mensual de marcas virtuales — versión definitiva

### 2.1 Corrección respecto a lo comparado antes con el mercado

En un análisis anterior comparé el mercado de licenciamiento de marcas virtuales en EE.UU. (The Local Culinary, Virtual Dining Concepts, Nextbite), que cobra vía comisión sobre ventas (5%-45%). Alex corrigió, con razón, que esos comparables incluyen infraestructura física, materia prima estandarizada con proveedores atados por contrato, y sistematización operativa completa — un producto mucho más grande que el de DKitchen. Lo que DKitchen entrega es documentación, activos digitales ya construidos, y proveedores **sugeridos, no obligatorios por contrato** (el cliente es libre de comprar donde quiera). El precio bajo no es solo una diferenciación estratégica frente al modelo comisionista del sector — es también el reflejo correcto de un alcance de producto más ligero.

### 2.2 Estructura de la cuota — CONFIRMADO por Alex, cifras cerradas

Tabla completa de cuota mensual por marca activa, cruzando número de marcas del cliente con volumen de pedidos medido por la PWA:

| Marcas activas del cliente | <5.000€/mes por marca | 5.000-10.000€/mes por marca | >10.000€/mes por marca |
|---|---|---|---|
| 1-2 marcas | 120€/marca | 175€/marca | 220€/marca |
| 3-5 marcas | 99€/marca (~17,5% dto.) | 145€/marca | 180€/marca |
| 6+ marcas | 89€/marca (~26% dto.) | 130€/marca | 165€/marca |

- El descuento por volumen de marcas (3-5 y 6+) se aplica sobre la cuota base y se traslada proporcionalmente a los dos escalones de volumen superiores — no es solo un descuento en la cuota mínima, es un descuento que se mantiene en toda la escala.
- El tercer escalón (>10.000€/mes por marca) existe deliberadamente como tope, no como escalada abierta: por encima de ese punto, el volumen de una sola marca virtual ya es un caso atípico de éxito operativo del cliente, y seguir subiendo la cuota en proporción directa a su facturación empezaría a parecerse a un cobro por resultado — justo lo que este modelo evita a propósito (Sección 2.1, y el principio ya establecido para Experience en la Parte 2).
- **Por qué el umbral se mide en la PWA y no en ventas totales declaradas — validado en la Sección 1.3:** dado que casi toda la actividad real del negocio pasa por la PWA (excepto agregadores externos), es una métrica objetiva, verificable, y que no depende de que el cliente reporte nada. Es además coherente con la propia justificación del aumento: se cobra más porque hay más carga real sobre la infraestructura de DKitchen (más pedidos, más registros, más gestión de cuentas), no porque el negocio le vaya bien — la misma distinción que ya separaba este modelo de Growth.

### 2.3 Libertad del cliente para vender fuera de la PWA — CONFIRMADO por Alex

La marca es del cliente una vez comprada/desplegada — tiene total libertad de listarla también en Glovo, Uber Eats o Just Eat si quiere, sin ninguna atadura contractual con DKitchen que se lo impida. Esas ventas no pasan por la PWA, así que no cuentan para el umbral de escalado (no generan carga sobre la infraestructura de DKitchen) — el cliente simplemente no gana nada evitando el modelo comisionista de esas plataformas si de todos modos decide vender ahí, pero es su decisión libre, y DKitchen no la juzga ni la bloquea.

---

## 3. El cliente de entrada directa multi-marca / multi-local — gestión, análisis y proceso

Caso concreto a resolver: un cliente llega directamente (sin pasar por el QR ni por ningún peldaño anterior) queriendo **6 marcas virtuales, repartidas en 2 locales, 3 marcas por local**. Esto es un "alfil directo" en la metáfora del ajedrez que ya usamos — entra fuerte, sin recorrido previo, y hay que tratarlo con un proceso distinto al de un cliente QR que va subiendo peldaño a peldaño.

### 3.1 Por qué esto no es simplemente "Ruta B × 6"

Ruta B (Marca en Caja, Parte 1 Sección 6.2) está diseñada para fricción baja — un cliente que ya tiene cocina y quiere sumar una marca, con un formulario ligero, sin puerta de admisión. **Un cliente que entra pidiendo 6 marcas en 2 locales de una sola vez no encaja en ese perfil de bajo compromiso** — es un cierre de alto valor que merece el mismo nivel de cualificación que Ruta A (desde cero), aunque técnicamente el cliente "ya tenga cocina" en ambos locales. **Recomendación de proceso:** cualquier entrada directa que supere un umbral de tamaño (propongo: 3+ marcas en una sola operación, o 2+ locales en una sola operación) se enruta automáticamente por el flujo de cualificación de `EnterpriseModal.tsx` (o su equivalente ya migrado a DKitchen), no por el formulario ligero de Ruta B — independientemente de si el cliente ya tiene cocina o no. El tamaño de la operación es lo que decide el nivel de cualificación, no si parte de cero.

### 3.2 Arquitectura técnica del caso

- Cada **local** es su propia unidad de infraestructura: su propio KDS (sistema de pantalla de cocina) unificado, que agrupa los pedidos de **todas** las marcas que operan en ese local.
- Cada **marca**, dentro de un local, tiene su propia PWA de cara al cliente (su propio menú, su propia identidad, su propio flujo de pedido) — pero los pedidos de las 3 marcas de un mismo local convergen en el KDS único de ese local, porque físicamente los cocina el mismo equipo en la misma cocina.
- Total de la operación: 6 PWAs de marca (una por combinación marca×local), 2 KDS (uno por local).

### 3.3 Precio — CONFIRMADO por Alex, cifras cerradas

- **Desarrollo (pago único) por marca adicional — CONFIRMADO:** marca 1: 1.200€ (o ~2.000€ todo incluido); marca 2: -20% → 960€; marca 3 en adelante: -30% → 840€. El componente de marketing (~200€ ads geolocalizados + flyers) se mantiene íntegro por marca, sin descuento — cada marca necesita probar su propia tracción publicitaria, compartir cocina no significa compartir audiencia.
- Esta curva de descuento se aplica **por local**, no de forma global — cada local tiene su propia "marca 1" y sus propias marcas adicionales, porque cada local es una infraestructura física distinta (KDS, zona geográfica de ads, flyers propios de esa zona). Para el caso de 6 marcas / 2 locales / 3 por local: Local A = 1.200€ + 960€ + 840€ = 3.000€; Local B = 3.000€ igual; total desarrollo = 6.000€.
- **Descuento de volumen combinado adicional sobre el total multi-local — CONFIRMADO: no se aplica ninguno de forma estructural.** El caso de 6 marcas ya califica, por sí solo, para el escalón de "6+ marcas" de la cuota mensual (Sección 2.2) — añadir un descuento extra encima duplicaría el mismo beneficio por la misma razón dos veces. Queda como palanca puramente comercial, no estructural, opcional a discreción de Alex: un -5% sobre el total del desarrollo único cuando el cliente firma 2+ locales en un solo contrato — se justifica solo por reducir el ciclo de venta (una negociación en vez de dos), nunca por menor carga operativa real.
- **Cuota mensual:** 6 cuotas independientes (una por marca activa, Sección 2.2) — con el cliente ya calificando para el descuento de 6+ marcas desde el primer mes: 89€/marca × 6 = 534€/mes de base (antes de cualquier escalado por volumen de pedidos). Esto se le debe comunicar con total transparencia desde la propuesta comercial — 6 cuotas, aunque cada una sea moderada, suman un total mensual real que el cliente tiene que ver escrito desde el primer momento, no descubrir después.

### 3.4 Vigilancia y análisis — la misma infraestructura de datos que todo lo demás

Este cliente necesita el mismo tipo de vigilancia de uso que el sistema aplicado a los clientes QR (Sección 5 y Parte 2) — pero la métrica no son escaneos, son **pedidos procesados por la PWA de cada marca, en cada local**. Esto no es un sistema aparte: es la misma capa de analítica de uso descrita en la Sección 1.3, aplicada por marca y por local en vez de por cliente único. Un cliente de 6 marcas genera 6 flujos de datos a vigilar, no una excepción a vigilar de otra forma — el mismo panel/lógica que sirve para decidir umbrales de facturación (Sección 2) sirve también para detectar qué marca de las 6 está funcionando bien y cuál no, información valiosa tanto para el cliente como para DKitchen a la hora de proponer ajustes.

---

## 4. Marco de ciclo de vida del cliente QR — Sostener / Evolucionar / Soltar (versión a documentar)

Ya lo diseñamos en la fase de análisis; aquí queda consolidado como referencia única, con todas las cifras ya CONFIRMADAS por Alex:

**EVOLUCIONAR** (empujar activamente hacia el siguiente peldaño):
- Escaneos de QR sostenidos por encima de **600/mes** durante 2 meses consecutivos, **con condición de tendencia**: no basta un cruce puntual del umbral, tiene que haber crecimiento sostenido respecto a los 2 meses anteriores — esto separa uso normal saludable de interés de crecimiento real. (Cifra corregida al alza respecto a la propuesta inicial de 300/mes: con los rangos de comensales/día ya usados en la Parte 2 y tasas de escaneo reales del 50-70%, un local activo normal puede mover entre 450 y 1.650 escaneos/mes sin que eso indique intención de crecer — 300/mes lo cruzaría casi cualquier cliente activo y perdería utilidad como filtro.)
- Subió de Básico a Ampliado por iniciativa propia.
- Preguntó activamente por algo que su plan no cubre.
- 4+ meses de pago sin fricción.

**SOSTENER** (dejar en su peldaño, nutrición ligera, sin empuje activo):
- Paga sin fricción pero sin crecimiento de uso.
- Sin interés mostrado en nada adicional en 3+ meses.
- Acción: solo anuncios pasivos de funciones nuevas, nunca venta activa.
- **Filosofía CONFIRMADA en la Parte 11 — no tratar este segmento como un fallo de funnel:** un cliente que se queda permanentemente solo en QR sigue siendo, en sí mismo, ingreso recurrente real y de bajo coste de mantenimiento — DKitchen ya tiene su confianza y sus datos de negocio, así que sigue siendo, indefinidamente, un candidato válido a cualquier upsell puntual futuro (una promoción de temporada, el lanzamiento de una función nueva, una campaña dirigida específicamente a esta base cuando exista volumen suficiente — ver también la campaña de configuración masiva de WhatsApp diferida, Sección 7 de la Parte 8). No perseguir activamente a este segmento no es lo mismo que descartarlo: es simplemente que el coste de intentar moverlo ahora no compensa frente a dejarlo generar cuota estable mientras la puerta queda abierta.

**SOLTAR** (no perseguir, dejar ir sin gastar esfuerzo comercial):
- Cancela dentro de los primeros 2-3 meses de pago real.
- Escaneos en cero o casi cero sostenido — señal de que el negocio no está adoptando la herramienta, no de que el precio esté mal.
- No responde a ningún intento automatizado de reactivación.
- Acción: como mucho un intento de reactivación de bajo esfuerzo (ver los dos ganchos siguientes) y, si no responde, se deja ir.

**Los dos mecanismos puente para el segmento "Evolucionar" o para intentar recuperar un "Soltar" marginal — CONFIRMADOS por Alex:**
- **Motor de reservas — RESUELTO en la Parte 11: absorbido dentro del plan Ampliado (25€/mes), sin tarifa aparte.** La antigua tarifa puente "+10€ sobre Ampliado (59€ total)" queda retirada — Google Business, reservas y reseñas están incluidos en el precio base del plan Ampliado (ver Parte 2, Sección 2.3). El diseño de producto original del motor de reservas (deliberadamente limitado: tope bajo de reservas/mes, sin gestión de mesas ni multiusuario) se mantiene sin cambios, solo cambia que ya no es un upsell de pago — viene incluido desde el primer día del plan Ampliado.
- **Tarifa estructural "primera Experience para cliente QR activo": 199€** — más barata que el "Primera vez" de 299€ de un prospecto frío, porque objetivamente ya no hay coste de adquisición ni de construcción de confianza. Se prefiere esto a un descuento discrecional puntual, para no erosionar la política de tarifas fijas sin negociación que ya se estableció como principio (Parte 2, Sección 1.1).

---

## 5. El sistema Prospector — integración y alcance por fases

Auditado a partir del repositorio compartido por Alex (`dkitchen-prospector.zip`). Es un sistema ya bien diseñado, pensado como una **sesión de agente de código independiente** (Claude Code o Antigravity, en su propio repositorio), no como parte del código de la web principal.

### 5.1 Qué ya existe y está bien resuelto
- Contrato operativo (`CLAUDE.md`), documentación viva (`SISTEMA.md`), handoff entre sesiones (`HANDOFF.md`), y estado persistente en `prospeccion/leads.csv`.
- Taxonomía de tres estados: `prospecto` → `en_gestion` → `lead`, con reglas específicas por canal.
- **Regla de oro: ningún mensaje sale ni se publica sin aprobación explícita del usuario** — coherente con la investigación legal hecha anteriormente en esta conversación sobre los riesgos de automatizar mensajería en WhatsApp/Instagram/Facebook (viola términos de servicio, riesgo de baneo) y sobre cold email en España (LSSI/RGPD). El sistema ya evita automatizar el envío en esas plataformas (solo redacta, el usuario envía manualmente) y solo permite envío de email corporativo con aprobación explícita por lote.
- **5 briefs**, cada uno con objetivo, señal de calificación y ángulo psicológico propios:
  - **A — Outbound QR:** encontrar negocios sin carta digital o con una genérica, ofrecerles el QR Menú como puerta de entrada de bajo riesgo.
  - **B — Escucha activa (prioridad máxima diaria):** monitorizar grupos/foros donde alguien ya expresa la necesidad — mayor tasa de conversión de los 5, porque es demanda ya expresada.
  - **C — Colocación orgánica:** identificar dónde listar/publicar DKitchen para generar entrada orgánica (directorios, marketplaces B2B, Google Business).
  - **D — Expansión de cuenta:** identificar clientes QR activos candidatos a subir de peldaño.
  - **E — Eventos:** solo activo cuando hay una campaña de evento con fecha fija — llenar plazas antes del límite, con escasez real, nunca artificial.

### 5.2 Fases de desarrollo — CONFIRMADO por Alex

- **Fase 1 (ahora):** el Prospector se concentra únicamente en la prospección de clientes **nuevos** (Briefs A, B, C, principalmente — E bajo demanda de campaña). Brief D (expansión de cuenta) existe en el sistema pero **no se conecta todavía a datos reales**, porque todavía no hay clientes reales cuyo uso leer.
- **Fase 2 (cuando haya clientes reales activos):** se añade la función de lectura de escaneos de QR, registros de uso y datos de facturación — es el momento en que Brief D se fusiona con el marco de ciclo de vida de la Sección 4 (hoy Brief D usa señales cualitativas externas; en Fase 2 se combinan con los umbrales cuantitativos del motor de QR).

### 5.3 Gobernanza definitiva del Prospector

Alex ya construyó la gobernanza completa del agente prospector (taxonomía de 3 estados, los 5 briefs con objetivo/señal de calificación/ángulo psicológico/canal por cada uno, y las reglas operativas transversales) — documento independiente, ahora consolidado junto con el resto del contexto de producto en `DKITCHEN_MIGRATION_PLAN_PARTE4.md`, que es el documento a entregar directamente al agente de prospección (no al agente de código de la web). Esta sección deja de listar campos como "pendientes" — cualquier cosa que aún falte se confirma preguntando directamente a Alex, no asumiendo.

---

## 6. Decisión de infraestructura — migración completa a Neon

**Actualiza la recomendación previa de este mismo proceso de análisis:** inicialmente se había propuesto migrar solo el sistema nuevo de QR a Neon y dejar el resto en Supabase por cautela. Alex aclaró que **nada de lo que hay en el repositorio está realmente sincronizado con una cuenta de Supabase viva** — el código referencia el patrón de Supabase, pero no hay datos reales, usuarios reales ni integración en producción. Con ese dato corregido, **la recomendación cambia a migración completa a Neon**, no parcial — no hay nada que proteger de una migración, así que no tiene sentido construir nada nuevo sobre Supabase antes de moverlo.

**Lo único que sigue siendo una decisión técnica pendiente:** Neon no incluye suscripciones en tiempo real de forma nativa, y el dashboard de Arqui está pensado para mostrarlas. Recomendación: empezar con **polling** (refresco periódico en vez de push en tiempo real) para la primera versión — es la opción más simple y suficiente para un dashboard de conversaciones, sustituible más adelante si el volumen lo justifica.

---

## 7. Cómo se complementan los servicios y cómo se escala desde la base

Síntesis narrativa de todo el recorrido, para que el agente entienda el conjunto y no solo cada pieza por separado:

**Camino estándar (la mayoría de los clientes, entrada fría o semi-fría):**
1. **QR Menú** — entrada de autoservicio, fricción mínima, prueba de 1€. El motor de QR captura, desde el primer día, el dato que alimenta todo lo demás: escaneos reales.
2. Esos escaneos, combinados con el comportamiento de pago (subió de plan, paga sin fricción, cancela pronto), clasifican al cliente en **Sostener / Evolucionar / Soltar** (Sección 4) — de forma automática, sin que Alex tenga que evaluarlo caso a caso a mano.
3. Al cliente que evoluciona, se le presenta el siguiente peldaño natural: **Experience** (si busca visibilidad/tracción puntual) o **Auditoría de canales** (si lo que necesita es diagnóstico antes de invertir más). Ambos son puntos de entrada de confianza ya ganada, no de venta fría.
4. Desde ahí, el peldaño de **Base Operativa** — la PWA completa, "casi nivel POS" (Sección 1) — es la consecuencia lógica cuando el negocio ya demostró, con datos reales de uso, que necesita algo más que una carta.
5. Y desde Base Operativa, o de forma independiente si el cliente ya tiene cocina infrautilizada, el peldaño de **Dark Kitchen multimarca** — Ruta A (desde cero) o Ruta B (ya tiene cocina) — apoyado en el catálogo de marcas virtuales ya construidas y con autoridad demostrable (Parte 1, Sección 5).

**Camino de entrada directa (el "alfil" o incluso la "reina/rey" que entra sin pasar por el peón):**
Un prospecto de alto valor puede entrar directamente a Base Operativa o a Dark Kitchen sin haber tocado nunca el QR — típicamente vía venta consultiva presencial, no autoservicio web. Esto no rompe el modelo: el QR es el canal de entrada de **menor fricción**, no el único canal de entrada. Cuando el tamaño de la operación lo justifica (Sección 3.1), el proceso de cualificación se ajusta al tamaño real del cierre, no al canal por el que llegó.

**El Prospector (Sección 5) es lo que alimenta ambos caminos con volumen constante** — Briefs A/B/C generan el flujo de entradas nuevas (mayormente hacia QR, pero Brief B, al capturar demanda ya expresada, puede aterrizar directamente en cualquier peldaño según lo que la persona ya esté buscando), y Brief D, en su Fase 2, alimenta el camino de evolución de clientes ya activos.

---

## 8. Preguntas bloqueantes — estado consolidado tras esta parte

**Resueltas por esta parte (ya no bloquean):**
- Cuota mensual por marca virtual, con tabla completa de descuento por volumen de marcas (1-2 / 3-5 / 6+) cruzada con 3 escalones de volumen de pedidos (<5.000€ / 5.000-10.000€ / >10.000€ por mes) — *actualiza Parte 1, Sección 7.3, y Parte 2, Sección 7 — CONFIRMADO, ver Sección 2.2*.
- Descuento por marca adicional en Ruta B / Marca en Caja: marca 1 sin descuento, marca 2 -20%, marca 3+ -30% — *actualiza Parte 1, Sección 7.10 — CONFIRMADO, ver Sección 3.3*.
- Descuento de volumen combinado multi-local: **no existe como descuento estructural adicional**, el escalón de 6+ marcas ya lo cubre; queda solo como palanca comercial opcional (-5%) — CONFIRMADO, ver Sección 3.3.
- Umbral de escaneos/mes para "Evolucionar": 600/mes sostenido 2 meses + condición de tendencia — CONFIRMADO, ver Sección 4.
- Las tarifas puente del ciclo de vida: Experience a 199€ para cliente QR activo — CONFIRMADA por Alex, ver Sección 4. Reservas — RESUELTO en la Parte 11: absorbida sin coste aparte dentro de Ampliado (25€/mes), ya no es una tarifa puente independiente.
- Migración de base de datos: Neon, completa, no parcial.
- Alcance del Prospector: Fase 1 solo prospección nueva; Fase 2 añade lectura de datos reales. Gobernanza completa del Prospector consolidada en `DKITCHEN_MIGRATION_PLAN_PARTE4.md`.

**Siguen abiertas:**
1. Los bloqueantes ya heredados de la Parte 1 que ninguna parte posterior ha resuelto: dominio exacto, número de WhatsApp canónico, nombre público definitivo del lockup de marca, precios de QR físicos sin verificar con cotización real, lista de los 7 formatos de evento sin confirmación literal.
2. Cualquier campo de la gobernanza del Prospector (Parte 4) que Alex no haya dado por cerrado explícitamente — no se asume ningún vacío, se pregunta directamente antes de tratarlo como pendiente.
