# Fase 1 · Web pública, venta, precios, SEO y competencia

> 17/10/2026. Barrido HTTP de 33 rutas, lectura del texto de las 19 páginas de venta, contraste con el código de producción (48ac325) y búsquedas reales en Google España desde el Chrome de karc0. Veredicto: la web es técnicamente sólida y bien escrita, pero promete 5 cosas que hoy no se entregan tal cual, no posiciona en ninguna palabra clave y compite contra un mercado donde la carta QR es gratis.

## 0. Resumen para decidir (lo más importante primero)
| # | Hallazgo | Gravedad | Qué propongo |
|---|---|---|---|
| 1 | **«Conexión con tu TPV: lo que anota el camarero llega solo a tu TPV»** (en /qr, /precios, /fundador, FAQ y en los 3 planes con «150/600/1800 comandas»). En el código es un envío genérico JSON a una URL (`src/lib/envio-tpv.ts`): solo funciona si el fabricante del TPV acepta ese formato. **No hay integración con ningún TPV real** (SumUp, Ágora, Revo, ICG, Glop…). Lo mismo con «las comandas salen por las impresoras de tu TPV» | 🔴 Crítica (promesa que un cliente puede reclamar) | Reescribir a «preparado para conectar con tu TPV si acepta pedidos externos; te lo comprobamos antes de contratar» y quitar «llega solo» hasta tener 1 integración real (SumUp es la candidata) |
| 2 | **«Asistente con IA 24/7»** en los 3 planes y en la FAQ. Hoy la IA de soporte está en modo agente (Claude responde solo en ventanas de prueba) hasta tu recarga del lunes | 🔴 Crítica hasta el lunes | Se arregla solo con la recarga + `agentes.cjs mando gateway`. Si se retrasa, cambiar el texto |
| 3 | **Montaje contradictorio:** la FAQ dice «a los 20 primeros te la montamos nosotros» y la misma página vende la «Puesta a punto» a **49 € (29 € al darte de alta)** con lo mismo dentro | 🔴 Alta (confunde y frena el pago) | Una sola regla visible: «Montaje gratis para los 20 primeros (quedan X); después, 49 €» |
| 4 | **Signature promete «cierre fiscal conectado (Verifactu) con tu TPV y tu gestoría»** y en /pagar/signature «recibes el contrato en tu correo». El contrato está pendiente (PLAN_SALIDA §3 #5) y el cierre fiscal se verifica en la fase 2 | 🔴 Alta | Hasta tenerlo: «exportación del cierre para tu gestoría» y contrato enviado a mano |
| 5 | **«El más elegido»** en el plan Local y **«Quedan 100 de 100»** en Fundador, con 0 clientes reales | 🟡 Media (prueba social falsa + escasez que dice «nadie ha comprado») | «Recomendado» en lugar de «El más elegido»; ocultar el contador hasta tener 5 plazas cogidas («plazas limitadas») |
| 6 | **SEO: no salimos en el top 20** de «carta digital qr restaurante», ni en el top 10 de «app propia pedidos restaurante sin comisiones» ni de «carta digital qr bares granada». Google solo tiene 7 páginas y con textos viejos | 🔴 Alta (canal gratis perdido) | Páginas por ciudad + blog + reenviar el sitemap (ver §6) |
| 7 | **El mercado regala la carta QR** (BuenaCarta, HappyMenu, Kalyra, QR Carta, Comandero-IA) y **FlexFood da pedido desde la mesa por 29 €/mes**, lo mismo que nuestro Local sin pedidos | 🟡 Estratégica | Vender lo que ellos no tienen: diseño de autor, montaje hecho, Sala (plano, camareros, llamada), reservas, presencia local y la escalera a Signature/Experience |

## 1. Mapa de la web (33 rutas comprobadas en vivo)
| Ruta | Estado | Tiempo | Indexable | Notas |
|---|---|---|---|---|
| `/` | 200 | 0,45 s | Sí | H1 «Tu restaurante, con marca propia.» · 785 palabras · JSON-LD Organization + WebSite |
| `/qr` | 200 | 0,08 s | Sí | 1.914 palabras · SoftwareApplication + Offer + FAQPage + Breadcrumb |
| `/precios` | 200 | 0,29 s | Sí | OfferCatalog + Product + FAQPage |
| `/signature` | 200 | 0,31 s | Sí | Product + FAQPage · calculadora de comisiones |
| `/experience` + 7 formatos | 200 | 0,28 s | Sí | FAQPage · sin imágenes (0 `<img>`) |
| `/auditoria` | 200 | 0,22 s | Sí | 354 palabras |
| `/dark-kitchen` · `/marcas` | 200 | 0,25 s | Sí | Sin pago, solo solicitud |
| `/casos-de-exito` | 200 | 0,27 s | Sí | Néstor Pizzas + 3 proyectos propios |
| `/faq` · `/blog` (3 artículos) | 200 | 0,25 s | Sí | Blog con 179 palabras de índice |
| `/contacto` · `/carta-de-autor` · `/fundador` · `/demos/carta` · `/demos/signature` · `/demo/panel` | 200 | 0,1–0,2 s | **No** (noindex) | Correcto para páginas de anuncio; decidir `/fundador` |
| `/pagar/signature` · `/pagar/experience` · `/pagar/auditoria` | 200 | 0,1 s | No | IVA desglosado (847 € · 56,87 €) |
| `/pagar/qr` | 404 | — | — | Correcto: el QR se paga desde `/qr` y `/carta-de-autor` (no hay enlaces rotos a esta ruta) |
| `/terms` · `/privacy` · `/data-deletion` | 200 | 0,2–0,4 s | Sí | `/data-deletion` con H1 heredado «Soberanía de Datos» |
| `/panel` | 200 | **1,6 s** | **Sí (error)** | La pantalla de acceso se puede indexar: `robots.ts` bloquea `/panel/` pero no `/panel` |
| `/base-operativa` | 308 → `/signature` | — | — | Correcto |
| `/nucleo-operativo` · `/llms.txt` | 404 | — | — | Falta `llms.txt` (lo leen los asistentes de IA que recomiendan proveedores) |
| `/robots.txt` · `/sitemap.xml` | 200 | — | — | Sitemap con 24 URL; sin `/fundador` ni demos (a propósito) |

Formularios (detalle en MAPEO §3, comprobados el 17/10): contacto 4 pasos, «Que me llamen», ventana de salida, solicitud, alta QR, pago directo, briefing Experience, intake Signature, reservas, camarero, tickets y propuesta. Todos con freno por IP y precios calculados en el servidor.

## 2. Psicología de precios (qué hace cada truco y si es limpio)
| Técnica | Dónde | Efecto | Valoración |
|---|---|---|---|
| Entrada de 1 € | Plan Local, todo el embudo | Quita el miedo a probar | ✅ Buena. Pero exige tarjeta: los gratuitos dicen «sin tarjeta» |
| Garantía 30 días (devolvemos el euro + PDF de tu carta) | /qr, /carta-de-autor | Inversión del riesgo | ✅ Muy buena y diferencial |
| Ancla «Alta de 159 € incluida» | /precios | Hace parecer regalo lo que no se cobra nunca | 🟡 Ancla sin precio real: arriesgado si alguien lo reclama. Mejor «sin coste de alta (otros cobran 150–900 €)» |
| Tachado 297 € → 47 € | /auditoria | Urgencia y valor | 🟡 Nunca se ha vendido a 297 €. En B2B el riesgo es bajo, pero es un «precio de referencia» inventado |
| Señuelo de 3 planes (9 · **29** · 69) | /qr, /precios | Empuja al del medio | ✅ Bien construido; el Local a 1 € es el gancho |
| «El más elegido» | Plan Local | Prueba social | 🔴 Falso con 0 clientes: cambiar por «Recomendado» |
| Escasez «Quedan 100 de 100» + fecha | /fundador, /signature, /pagar/signature | Urgencia | 🟡 La fecha funciona; el contador a 100/100 dice que nadie compró |
| Calculadora de comisiones (3.750 €/mes vs 149 €) | /signature | Dolor cuantificado con datos del dueño | ✅ Excelente, la mejor pieza de venta de la web |
| Tarifas decrecientes 299 → 250 → 150 → 99 | /experience | Fidelización por repetición | ✅ Clara |
| Descuento cruzado (199 € si ya tienes la carta QR; lo pagado en QR se descuenta de Signature) | /experience, /precios | Escalera de producto | ✅ Muy buena y poco explotada en los anuncios |

## 3. Psicología de venta y copy
- **Lo mejor:** titulares de dolor muy buenos («Tu martes vacío, convertido en taquilla llena», «Te están buscando. ¿Te están encontrando?», «Un TPV cobra. Una marca vende.»), demos que se pueden tocar dentro del móvil, transparencia (IVA aparte, «sin garantía de resultado» en Auditoría, «valores ilustrativos»).
- **Lo que frena:**
  1. **La portada vende Signature (700 €) y los anuncios, propuestas y flyers venden la carta a 1 €.** El que llega desde un flyer ve «app propia» y tiene que buscar el enlace pequeño «¿Solo quieres la carta digital?».
  2. **Demasiados productos en la portada** (Signature, Experience, QR, Dark Kitchen): el estudio de Comandero-IA ya lo marcaba (1 dolor, 1 promesa, 1 acción).
  3. **Prueba social casi nula:** 1 caso real (Néstor Pizzas) y 3 proyectos propios. Ningún testimonio, ninguna reseña, ningún logo de cliente.
  4. **Cifras a 0 en el HTML** (lo que lee Google y lo que se ve si falla el JavaScript): «0 € el primer mes», «0 alérgenos UE», «0 % clientes propios», «0 app con su marca». En pantalla se animan bien (comprobado), pero Google y los asistentes de IA leen el 0.
  5. **Experience sin una sola foto** (0 imágenes en /experience): vende eventos solo con texto.
  6. **«Signature Fundador: Pago único, sin cuotas»** junto a «69 €/mes»: se entiende como contradicción. Quiere decir que la entrada no se fracciona.

## 4. Ofertas: ventajas y desventajas frente al mercado
| Oferta | Precio | Ventaja real | Desventaja real |
|---|---|---|---|
| Carta QR · Carta | 9 €/mes | Diseño de autor y Sala desde el plan más bajo | Contra un mercado que la da gratis |
| Carta QR · Local | 1 € y luego 29 €/mes | Montaje incluido (20 primeros), reservas, llamada al camarero, app de sala, garantía | FlexFood da **pedido desde la mesa** por el mismo precio; nosotros no (decidido: solo en Signature) |
| Carta QR · Sala | 69 €/mes | Máximo de todo + encargados | Precio alto si la conexión TPV no se puede usar en su TPV |
| Fundador | 41,40 €/mes (trimestral) | 40 % de por vida | Nadie lo ha comprado aún; se vende peor con 100/100 |
| Signature | 700 € + 99–199 €/mes según ventas | Código propio, sin comisión, cuota por tramos, pack de arranque, demos reales | Promesas por verificar (fiscal, push, kiosko); contrato pendiente; Pincer y Turbopos posicionan mejor |
| Experience | 299 € (199 € con QR) | 0 % de comisión, 7 formatos, precio decreciente | Sin fotos ni casos; la web de entradas se verifica en F2 |
| Auditoría | 47 € | Muy barata, entrada a Signature | Tachado de 297 € inventado |

## 5. SEO y posición real (Google España, 17/10, sesión de karc0)
| Búsqueda | Nuestra posición | Quién gana |
|---|---|---|
| «carta digital qr restaurante» | Fuera del top 20 | Anuncios: WEIQ, HappyMenu, Bitly, FineDine, Kavuo, Kalyra. Orgánico: BuenaCarta, QR Carta, Mi Restaurante QR, TuCartaDigital, Radoo, TPVFácil (55 € pago único), lacartaqr, qrcartadigital |
| «app propia pedidos restaurante sin comisiones» | Fuera del top 10 | Pincer, Turbopos Vipper, RestroSuite, InnoDelivery, TuWebLocal, Scanneat, Autoflowly, Bouzon (Tableo, GloriaFood) |
| «carta digital qr bares granada» | Fuera del top 10 | **Todos con página por ciudad:** QR Carta, MiCartaDigital (200 € único), Kasero, Qrusty, Menuda (16 idiomas IA), **FlexFood**, Menumigo (carta desde foto con IA), MiraMenu, Carta Activa (49 €/año) |
| `site:dkitchencorporate.es` | 7 páginas indexadas | Descripciones del 7/10: «/precios … Módulos de sala» (ya no existen) y «/demo/carta … pedido en el móvil» (la carta QR no tiene pedido) |

**Lo que está bien:** títulos y descripciones únicos en las páginas de venta, canónicas correctas, datos estructurados ricos (SoftwareApplication, Product, Offer, FAQPage, Breadcrumb), 0 imágenes sin `alt`, tiempos < 0,5 s.

**Lo que falta, por impacto:**
1. **Páginas por ciudad** (Baza, Granada, Guadix, Almería, Jaén: las mismas zonas que la tarea de leads), con diseño de autor y casos locales. Es lo que hace ganar a 7 de los 9 resultados de Granada.
2. **Reenviar el sitemap en Search Console** y pedir la indexación de /experience, /auditoria, /casos-de-exito y el blog (no están en Google). Google enseña «Prueba Google Search Console» en la búsqueda: comprobar que la propiedad está verificada en tu cuenta.
3. **Blog:** 3 artículos frente a decenas en la competencia. Uno por semana, con las palabras clave de la memoria #215 (QR, carta, cartas digitales, PWA, app, TPV, hostelería, bares, restaurantes).
4. **Cifras renderizadas en el servidor** con su valor final (no 0).
5. `/panel` con noindex + `Disallow: /panel` · `llms.txt` · descripción nueva de `/demo/carta`.
6. Ficha de Google Business y reseñas (la ficha existe; sin reseñas no hay SEO local).

## 6. Competencia: base viva en Central
- **24 competidores en Central → Competencia** (antes: 3 en un documento). 4 auditados o en vigilancia: **Comandero-IA** (amenaza alta), **FlexFood** (alta, auditado hoy), OrderManager y Vitrina Viva (media). 20 por auditar a fondo, con lo visto hoy ya anotado: BuenaCarta, QR Carta, Menumigo, FineDine, Kasero, MiCartaDigital, Menuda, Carta Activa, Kalyra, Kavuo, HappyMenu, WEIQ, Pincer, Turbopos Vipper, Scanneat, InnoDelivery, RestroSuite, Tableo, GloriaFood y CoverManager.
- **Para prospectar:** Comandero-IA publica 8 clientes en su sitemap (Sevilla); QR Carta y Carta Activa tienen directorios públicos de Granada con los locales que los usan. Son locales ya convencidos de la carta digital: el mejor lead posible.
- **Qué les funciona y no tenemos:** páginas por ciudad, «gratis/sin tarjeta», carta desde foto con IA, muchos idiomas con IA, pedido desde la mesa en el plan de entrada.
- **Qué tenemos y nadie tiene junto:** diseño de autor + montaje hecho por personas + Sala (plano, camareros, llamada) + reservas + persona en la zona + escalera a app propia y eventos con descuento cruzado.

## 7. Tareas que salen de esta fase (cargadas en Mis tareas)
Ver Central → Mis tareas, bloques «Producto», «Desarrollo» y «Auditorías». Las que cambian textos de la web necesitan tu decisión: te las planteo al final de la sesión.
