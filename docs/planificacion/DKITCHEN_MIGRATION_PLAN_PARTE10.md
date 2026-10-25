# DKITCHEN — PARTE 10: SIMULACIÓN "HORA 0" — TODO CONSTRUIDO, ADS ACTIVOS, PROSPECCIÓN EN MARCHA

**Complementa a:** Partes 1-9. Es la simulación que pidió Alex explícitamente partiendo de que todo (web, checkout, migraciones, dashboards, flyers, tarjetas, redes, campaña de Meta Ads) ya está terminado y activo, no de que falta construirlo. Escenario exacto simulado: web completa en producción; ads activos a 5€/día por grupo de adsets (2 estáticas + 1 vídeo) promocionando QR 1€, Auditoría 47€, Base Operativa 700€ y Dark Kitchen desde 1.200€ — **asumo un grupo de adsets por producto, 4 grupos, 20€/día = ~600€/mes en total; si el reparto real es otro, los números de la Sección 4 se ajustan proporcionalmente, dímelo y los recalculo**; Google Business Profile optimizado; 1 flyer a doble cara en campaña por Granada capital, pueblos cercanos y Baza, repartido personalmente por Alex.

**Nota de honestidad sobre las fuentes de esta parte:** intenté verificar en vivo el número exacto de bares/restaurantes de Granada capital y la población exacta de Baza — las herramientas de verificación externa tuvieron una limitación técnica puntual durante esta sesión y no pude confirmar cifra oficial fresca para esos dos datos concretos. Uso para esos dos puntos cifras de conocimiento general bien establecido (marcadas como tal más abajo), no una fuente recién verificada — si quieres, en la próxima sesión las confirmo con una fuente oficial (INE/SIMA) antes de que se tomen como definitivas para presupuesto de medios.

---

## 1. Tamaño real del mercado que estás golpeando primero

- **Granada capital:** ≈230.000 habitantes (conocimiento general bien establecido, no verificado en vivo esta sesión), área metropolitana bastante mayor. Andalucía y Granada en particular están entre las zonas de España con mayor densidad de bares/restaurantes por habitante del país (cultura de tapeo) — una estimación razonable del sector hostelería de la capital (bares + restaurantes + cafeterías, categoría CNAE completa) está en el orden de **2.000-3.500 establecimientos**, no una cifra exacta, es un rango de estimación por densidad poblacional típica de ciudad andaluza media-grande, no un conteo oficial fresco.
- **Baza:** población en el orden de **~20.000 habitantes** (conocimiento general, comarca capital del interior de Granada) — un pueblo de este tamaño suele tener entre **40 y 80 negocios de hostelería**, orden de magnitud razonable, no cifra oficial verificada esta sesión.
- **Lectura honesta:** el universo direccionable real de tu lanzamiento (Granada capital + comarca cercana + Baza) es de **miles, no decenas de miles** de negocios — es un mercado local perfectamente abarcable para una operación de una sola persona en los primeros meses, y es exactamente el tamaño correcto para validar el modelo antes de pensar en otras ciudades (Sección 7).

---

## 2. Posicionamiento frente a competencia — con precios reales, no intuición

Verifiqué los competidores de carta digital QR que ya estaban señalados en la Parte 2 y añadí los que encontré en la búsqueda de mercado actual:

| Competidor | Precio | Qué ofrece |
|---|---|---|
| tucartadigital.com | **Gratis** (plan base) | Carta QR básica |
| qrcarta.com | **"Gratis para siempre"** | Carta QR básica |
| hosteleria.app | **Gratis** | Carta QR básica |
| comealacarta.com (plan premium) | **295€/año** (≈24,6€/mes) | Carta QR con diseño personalizado |
| **DKitchen QR Básico/Ampliado** | **19-49€/mes (228-588€/año)** | Carta QR + URL estable + autogestión real + escalera hacia PWA/POS completo |

**Verdad incómoda que hay que decir con claridad, tal como pediste "cruda y dura":** en precio puro de "carta QR", **DKitchen no es la opción barata — está por encima de todos los comparables que encontré**, incluido el de pago (295€/año vs tus 228-588€/año). Esto no es un error de pricing — es una consecuencia directa de que QR no es realmente lo que vendes, es la puerta de entrada a algo que ningún competidor de esa tabla tiene ninguna respuesta para ofrecer: una escalera real hacia un sistema operativo completo (PWA/POS), cero comisión, y ahora portabilidad del activo. **Pero eso significa que tu copy y tu prospección tienen que justificar la diferencia de precio desde el primer contacto, no asumir que se explica sola** — si un dueño de bar compara solo "carta QR: gratis vs 49€/mes" sin ver el resto de la escalera, pierdes esa comparación. Es la razón exacta por la que la Parte 6 (refactor de copy) y el propio flyer tienen que mostrar la escalera completa, nunca solo el precio de QR aislado — ya está resuelto así en el diseño del flyer (Parte 9, Sección 4), pero vale la pena que lo tengas presente al hablar en persona en Granada/Baza: nunca vendas "carta QR a 19€", vende "sistema completo que empieza por 1€".

**Dónde sí estás claramente por encima, sin ambigüedad:** frente a agencias de marketing para hostelería (Food&Service, ya auditado) — ahí no compites en precio de entrada, compites en que el dinero nunca pasa por ti y en que entregas activos reales, no gestión — posicionamiento ya validado en el análisis anterior.

**Conclusión de la pregunta directa — ¿por encima, por debajo o en medio?** En el producto de entrada aislado (QR), estás por encima en precio. En la propuesta completa (escalera + cero comisión + portabilidad), no hay comparable directo en el mercado que audité — no es "por encima o por debajo", es una categoría distinta, con el riesgo de que eso mismo obliga a explicar mejor, no a competir en la misma tabla.

---

## 3. La advertencia técnica real sobre 5€/día — esto sí es crudo y hay que decirlo

**Con la configuración que describes (4 grupos de anuncios a 5€/día cada uno, audiencia local muy estrecha — dueños de hostelería en Granada capital + pueblos + Baza) hay una limitación técnica real de Meta que probablemente vas a sentir:**

Meta necesita un volumen mínimo de eventos de conversión por semana (la cifra de referencia habitual de la propia plataforma ronda las 50 conversiones/semana por conjunto de anuncios) para que el algoritmo salga de la "fase de aprendizaje" y entregue resultados estables. Con 5€/día y una audiencia tan estrecha como "dueños de bares en Granada y Baza", especialmente en los grupos de Base Operativa (700€) y Dark Kitchen (1.200€+) — es **muy improbable** que alcances ese volumen de conversión, lo que significa que esos dos grupos de anuncios probablemente van a quedarse en "aprendizaje limitado" de forma indefinida: entrega inconsistente, coste por resultado errático, sin que sea un fallo de tu creatividad o tu oferta — es una limitación estructural del presupuesto frente al tamaño de la audiencia.

**Lo que sí puede funcionar a ese presupuesto:** el grupo de QR (1€, barrera de entrada casi nula) es el que tiene más probabilidad real de generar suficiente volumen para salir de aprendizaje, porque el "evento de conversión" es barato y fácil de completar. **Recomendación concreta:** no repartas 5€/día equitativamente entre los 4 productos — concentra el grueso del presupuesto (ej. 12-15€/día) en el grupo de QR, y deja Auditoría con un presupuesto menor (5€/día) como segundo canal; **Base Operativa y Dark Kitchen prácticamente no deberían tener presupuesto de ads en frío en esta fase** — esos dos productos llegan mejor por upsell sobre tu base de QR/Auditoría ya activa (Brief D del Prospectador) que por clic directo de un desconocido a un ticket de 700-1.200€. Esto no es una opinión — es coherente con la propia estructura de la escalera que ya construiste: nadie compra el peldaño 4 sin pasar antes por el 1 o el 3.

---

## 4. Simulación numérica — peor, realista y mejor escenario

**Supuestos explícitos (para que puedas corregir cualquiera y recalculo):** CPC estimado 1-3€ (audiencia local muy estrecha, sin comparable de mercado exacto para este caso concreto — puede ser más barato por poca competencia local, o más caro por poco volumen de subasta); conversión de landing QR (1€, checkout instantáneo) 4-8%; conversión de landing Auditoría (47€, con formulario+cita) 1-3%; tasa de respuesta de flyer entregado en mano con pitch personal 5-10% (por encima del 1-5% de flyer pasivo genérico, por el contacto humano directo) — repartiendo un volumen realista para una sola persona de ~15-25 negocios visitados por día de prospección activa.

### 30 días

| Escenario | QR nuevos (ads+flyer) | Auditorías vendidas | Experience/Base Op./Dark Kitchen | Facturación real del mes 1 |
|---|---|---|---|---|
| **Peor** | 8-12 | 0-1 | 0 | ~40-90€ (casi todo son los 1€ simbólicos de QR, el mes 1 de QR nunca factura el plan completo) |
| **Realista** | 15-25 | 1-3 | 0 (posible primera conversación iniciada) | ~70-200€ |
| **Mejor** | 30-45 | 3-5 | 0-1 (un QR activo salta directo a Experience puente, 199€) | ~350-900€ |

**Punto crudo importante:** el mes 1 casi nunca va a parecer rentable en caja, aunque el funnel esté funcionando bien — es matemático, no una señal de alarma: todo QR nuevo entra a 1€, la facturación real de ese cliente no llega hasta el mes 2. Si juzgas el éxito del mes 1 por la caja, vas a subestimar lo que realmente está pasando.

### 60 días

Aquí ya factura el plan completo la cohorte de QR del mes 1 — la variable que más pesa es cuántos de ellos se quedan (tu propio hito ya fijado: **≥50% de conversión de regalo a pago**).

| Escenario | QR pagando el plan completo | MRR de QR | Auditorías acumuladas | Ruta B / Base Operativa | Facturación real del mes 2 |
|---|---|---|---|---|---|
| **Peor** | <50% retenido (4-6 clientes) | ~100-200€/mes | 1-2 | 0 | ~150-350€ |
| **Realista** | ≈50% retenido (8-13 clientes) | ~200-450€/mes | 3-6 | 0-1 (primer Ruta B si llega al hito de 60 días) | ~400-1.800€ (si cae el primer Ruta B, salta el rango por el fee de desarrollo) |
| **Mejor** | >50% retenido (15-22 clientes) | ~450-800€/mes | 6-9 | 1 confirmado + Base Operativa en curso | ~1.200-2.500€ |

### 90 días

Ya hay 3 cohortes de QR acumulándose, más margen para que la escalera empiece a compensar el coste de ads.

| Escenario | MRR acumulado (QR + Dark Kitchen si aplica) | Deals de una sola vez acumulados (Experience/Base Op./Dark Kitchen) | Facturación real del mes 3 |
|---|---|---|---|
| **Peor** | ~300-600€/mes | 0-1 | ~400-900€ |
| **Realista** | ~800-1.500€/mes | 2-4 | ~1.800-4.500€ |
| **Mejor** | ~1.500-3.000€/mes | 4-7 | ~4.000-9.000€ |

**Lectura honesta de estas tres tablas:** el escenario peor no es "el negocio no funciona" — es "el funnel es más lento de lo esperado y hay que ajustar reparto de presupuesto o ritmo de prospección física". El riesgo real de fracaso completo de este modelo es bajo dado que la economía unitaria ya cierra (Parte 9, Sección 5) — el riesgo real es de **ritmo**, no de viabilidad.

---

## 5. Cómo cambia la percepción del cliente frente al modelo anterior — honesto, sin adornar

**Antes (Growth, 299€/mes + 20% variable, garantía de resultado, venta con reunión y negociación):** el cliente entraba con una promesa grande y una fricción grande — tenía que confiar en una garantía antes de ver nada tangible, y el precio de entrada (299€/mes) es una barrera real para un bar/restaurante pequeño de Granada o Baza, donde los márgenes suelen ser ajustados.

**Ahora:** la barrera de entrada es literalmente 1€. Eso cambia la naturaleza de la primera decisión del cliente de "¿confío en esta promesa?" a "¿por qué no probarlo?" — es un cambio de categoría de decisión, no solo de precio. **Es mejor, sin ambigüedad, para conseguir el primer sí.** Lo que es más difícil ahora que antes: convertir ese "sí" de 1€ en un cliente que sube peldaños — con Growth, quien entraba ya había aceptado pagar 299€/mes, así que la conversación de "sube de nivel" partía de un compromiso más alto. Ahora partes de un compromiso mínimo, así que la escalera y el Prospectador (Brief D) tienen que hacer más trabajo real para llevar a alguien de 1€ a 700€ que el que hacía falta antes para subir de 299€ a algo mayor. **No es peor — es un problema distinto: antes el reto era conseguir el primer sí, ahora el reto se traslada a la mitad del embudo.**

---

## 6. Ampliar prospección física más allá de Granada/Baza — cuándo y cómo

- **No expandas físicamente a otra ciudad hasta tener un patrón de conversión real medido en Granada/Baza** (mínimo 30-45 días de datos propios, no proyectados) — expandir presencia física antes de validar el patrón es repetir el mismo riesgo de "construir antes de confirmar" que ya se señaló para el resto del proyecto (Parte 8, Sección C).
- **La prospección física es, por definición, un cuello de botella de tu propio tiempo** — mismo problema estructural del que quieres escapar en ventas, ahora aplicado a captación. A un ritmo realista de 15-25 negocios/día visitados en persona, y asumiendo que dediques 3-4 días/semana a esto (el resto lo necesitas para gestión, desarrollo, atención a clientes ya activos), cubres el universo de Granada capital + Baza (estimado en la Sección 1) en un plazo de **varios meses, no semanas** — es información real para planificar expectativas, no un límite que haya que forzar.
- **El canal que sí puede escalar sin tu presencia física es la prospección digital en frío** (escribir directamente a negocios por Instagram/WhatsApp — ya gobernado por el Brief A/C del Prospectador, Parte 4) — ahí no hay límite geográfico ni de tu tiempo físico, es el lugar natural para empezar a cubrir otras ciudades **antes** de plantearte ir en persona a ninguna.
- **Cuando decidas ir a una ciudad nueva en persona**, el criterio más simple y honesto: prioriza por densidad de hostelería + facilidad de desplazamiento desde Granada, no por tamaño de la ciudad — una ciudad grande lejana no vale más que una comarca cercana con alta densidad de bares.

---

## 7. Alcances que no mencionaste — los añado porque son relevantes para lo que estás montando

- **El Google Business Profile de DKitchen mismo es tu primer caso de Auditoría.** Ya lo tienes optimizado (lo mencionas como parte del "hora 0") — úsalo literalmente como ejemplo en la conversación de venta de Auditoría ("esto es lo que hicimos con el nuestro, esto te ofrecemos hacer con el tuyo") — coste cero, prueba social directa.
- **Estacionalidad de Granada:** es una ciudad con turismo fuerte (Alhambra) — la demanda/urgencia del hostelero varía con la temporada. Estás lanzando en septiembre-octubre, temporada media — no es la peor época (evitas el caos de un dueño en pico de verano sin tiempo de hablar contigo) ni la mejor (menos urgencia que en primavera). Es un dato a tener en cuenta al medir resultados de los primeros 60 días, no algo que cambiar ahora.
- **Efecto de concentración geográfica — ventaja real, no mencionada:** al lanzar concentrado en Granada+Baza (en vez de disperso a nivel nacional), cada cliente que consigues se convierte en prueba social visible para el siguiente en la misma zona ("el bar de la esquina ya lo tiene") — esto compensa parte de la fricción de precio de la Sección 2, y es una ventaja estructural de tu enfoque local-primero que no tendrías lanzando disperso.
- **Riesgo simétrico del mismo efecto:** en una comarca pequeña como Baza, la reputación corre igual de rápido en sentido contrario — un cliente con mala experiencia (soporte lento, bug visible) se sabe en todo el pueblo casi tan rápido como uno bueno. No es una razón para frenar, es una razón para que el soporte a los primeros clientes de Baza sea impecable, porque el coste de un fallo ahí es proporcionalmente mayor que en un lanzamiento disperso.

---

## 8. Veredicto — impacto real esperado, con números, no "vamos bien"

- **La economía unitaria cierra** (ya establecido, Parte 9) — el riesgo de que "esto no funcione en absoluto" es bajo.
- **El precio de QR está por encima de la competencia de entrada** — no es un error, pero exige que la escalera completa se explique siempre, nunca el precio aislado.
- **5€/día por producto es un presupuesto de validación, no de escala** — especialmente en Base Operativa/Dark Kitchen, donde lo correcto es esperar cero o casi cero ventas directas de ese canal y dejar que lleguen por escalera.
- **El mes 1 va a parecer flojo en caja aunque el funnel funcione** — es aritmética del modelo 1€, no una señal de fallo.
- **El cuello de botella real de los primeros 90 días no es de mercado ni de producto — es tu propio tiempo físico de prospección**, exactamente el mismo tipo de limitación de la que quieres escapar con toda esta reestructuración, ahora trasladada de "negociar ventas" a "repartir flyers". Vale la pena que lo tengas en el radar desde ahora, no cuando ya sea un cuello de botella evidente.
- **Con el escenario realista (Sección 4), a 90 días estás hablando de un rango de ~800-1.500€/mes de recurrente más 2-4 cierres de una sola vez** — no es una cifra que cambie tu vida en 90 días, pero es una base real y creciente, construida sobre una economía que ya cierra por unidad, no sobre una promesa de garantía como el modelo anterior. El cambio real de fondo no es cuánto factura el mes 3 — es que por primera vez el negocio tiene un embudo medible, con un coste de adquisición conocido, que se puede optimizar con datos reales en vez de con tu intuición y tu tiempo de negociación.

Sources:
- [Las 15 ciudades españolas con más bares por habitante — Euribor.com.es](https://www.euribor.com.es/2026/05/08/las-15-ciudades-espanolas-con-mas-bares-por-habitante-segun-datos-del-ine/)
- [Carta digital QR gratis — hosteleria.app](https://hosteleria.app/)
- [Precios — QrCarta](https://www.qrcarta.com/precios.php)
- [Carta digital premium 295€/año — comealacarta.com](https://comealacarta.com/producto/carta-digital-premium/)
