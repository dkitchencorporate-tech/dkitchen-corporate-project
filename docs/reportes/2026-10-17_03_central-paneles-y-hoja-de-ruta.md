# Fase 3 · Central, paneles de cliente, Claude desde Central y hoja de ruta con tiempos

> 17/10/2026. Código de producción (48ac325), barrido de las 20 rutas de Central y datos de Neon en solo lectura. Veredicto: Central ya sirve para llevar el día a día de clientes de carta QR y está por encima de los paneles de cliente en control y datos, pero por debajo en ayuda con IA. Signature y Experience no tienen panel de cliente. Claude solo está conectado contigo desde Central de forma diferida (Buzón, Mis tareas y Competencia), no en directo.

## 0. Respuestas directas a tus preguntas
| Pregunta | Respuesta |
|---|---|
| ¿Central está para manejar clientes día a día? | **Sí para QR** (alta, ficha, cobros, planes, bajas, soporte, modo soporte dentro de su panel, partes diarios, embudo). **No para Signature ni Experience**: se llevan como «proyectos» y a mano |
| ¿Está por encima de los admin de los clientes? | **En control y datos, sí** (ve y toca todo de cada cliente, entra en su panel en modo soporte, cobra, regala, da de baja). **En ayuda con IA, no**: el cliente tiene chat N1 con IA, montaje guiado y formación por sección; Central tiene guías escritas y manual, sin chat |
| ¿Funcionan todas las rutas? | Las 20 rutas de Central responden y piden sesión con 2FA (307 → acceso; ninguna da error). Lo que hay dentro de cada una necesita tu sesión para probarlo en pantalla: te lo dejo como tarea de 10 min |
| ¿Puedo hablarte desde Central? | **Hoy, en diferido:** Buzón para Claude, notas en Mis tareas y en Competencia; lo leo al empezar cada sesión. **En directo, no.** Opciones en §4 |
| ¿El admin de cada producto está terminado? | QR: sí (8/10). Signature: el admin vive dentro de cada app (Wing Boss: pedidos, catálogo, clientes, analítica, quiosco, horarios, impresora, campañas), separado de DKitchen. Experience: no hay panel del local |

## 1. Central hoy (21 pantallas)
| Zona | Qué hace | Nivel |
|---|---|---|
| **Inicio** | Altas, a pago, bajas, en riesgo de baja, sin actividad, listos para Local, listos para Signature, «atender hoy» | ✅ 8/10 |
| **Clientes** (lista + ficha) | Ficha con contacto y carta, cobro, escaneos de 30 días, extras, diseño, conexión TPV, checklist de montaje, traducciones, cambio de plan y de estado, enlace de pago a medida, regalar todo, carta demo, reenviar acceso, baja/anular baja, archivar, demo interna y **«Entrar en su panel»** (modo soporte) | ✅ 9/10 |
| **Proyectos** | Signature, Experience, Auditoría, Dark Kitchen y QR físico: se crean solos al pagar o pedir, y a mano | 🟡 6/10 (seguimiento, sin entrega automatizada) |
| **Prospección** | 29 prospectos, propuesta personal `/propuesta/<token>`, vistas, eventos, leads de la tarea de las 07:52 (0081) | ✅ 8/10 |
| **Soporte** | Tickets, interruptor de IA N1/N2, borradores N2, reintento de envíos al TPV, pedidos de QR físico | ✅ 8/10 |
| **Mis tareas** | Tareas con responsable, tiempo estimado, prioridad roja y filtro (0082, hoy) | ✅ |
| **Reportes** | Reportes fechados (hoy) | ✅ nuevo |
| **Competencia** | 24 competidores, alta desde Central (hoy) | ✅ nuevo |
| Entradas | Eventos de Experience con Stripe Connect y puerta | 🟡 sin uso real |
| Embudo · Oportunidades · Campañas y QR · Partes diarios · Fundador · Socios · Avisos de fallo · Buzón · Administradores · Manual | Medición, leads por llamar, QR de campaña, parte de las 08:30, plazas, socios con código, fallos, buzón y gestión de admins | ✅ |

**Lo que se ve y lo que no desde Central:**
- **Se ve:** cada cliente QR, su cobro, su uso (escaneos), su soporte, el embudo, los leads, las propuestas y las tareas.
- **No se ve:**
  - pedidos, ventas y clientes de las apps Signature (cada una tiene su base);
  - ventas de entradas por local en tiempo real fuera de Entradas;
  - el estado de Stripe (saldo, disputas) más allá de los correos;
  - el saldo de AI Gateway;
  - el estado de Vercel y Neon (plan, consumo).

**Ayuda dentro de Central:** guía «Cómo funciona» en cada pantalla + Manual de Central (17 zonas, hoy añadidas Mis tareas, Reportes y Competencia) + «Avisar de un fallo». **Sin chat con IA ni formación interactiva.**

## 2. Paneles que recibe cada cliente
| Producto | Panel | Qué tiene | Qué falta |
|---|---|---|---|
| **Carta QR** | `/panel` (DKitchen) | Estudio (identidad, carta, estilo, landing, QR y kit), Servicio (pedidos de sala, reservas, llamadas, equipo, plano), Negocio (escaneos, plan, mejoras, legal), Ayuda (chat N1 → ticket N2), IA (fotos, carta desde foto, textos, idiomas), montaje guiado obligatorio y formación por sección | IA probada con saldo; conexión TPV real; informes de ventas (no hay ventas: es carta para mirar) |
| **Signature** | Admin dentro de cada app (Wing Boss `AdminDashboard`) | Pedidos, catálogo (categorías, subcategorías, productos, ventas sugeridas), clientes, historial, analítica, quiosco, horarios, impresora, campañas, 2FA | **No está en `/panel`**: el cliente QR que sube a Signature tiene dos paneles y dos accesos. Sin pago online, sin fiscal, sin soporte N1/N2 de DKitchen, sin formación guiada |
| **Experience** | Ninguno | El local usa la puerta `/e/<slug>/puerta` | Panel del local con ventas, entradas, asistentes e informe |
| **Auditoría** | Ninguno | Informe por correo o reunión | Plantilla de informe y entrega en el panel |

## 3. Nivel tecnológico global (sobre 10)
| Pieza | Nota | Por qué |
|---|---|---|
| Plataforma QR (web + panel + cobros) | **8** | Automatizada de principio a fin, segura, probada con estrés |
| Central | **8** | Control completo de QR; falta Signature/Experience y la IA de admin |
| App Signature (Wing Boss) | **7** | Completa en pedidos y fidelización; sin pago online ni fiscal |
| Plataforma Signature (alta, multi-cliente) | **3** | Un repo por cliente, alta a mano, sin conexión con Central |
| Experience | **5** | Entradas reales; el resto es servicio manual |
| IA en producto | **5** | Programada en muchos sitios, sin probar con saldo |
| SEO y adquisición orgánica | **3** | Ver F1 |

## 4. Claude integrado contigo desde Central (opciones)
| Opción | Cómo funciona | Coste | Tiempo | Recomendación |
|---|---|---|---|---|
| A · Lo que hay | Buzón, notas en Mis tareas y Competencia → lo leo al empezar cada sesión | 0 € | — | Sigue |
| **B · Buzón con respuesta automática** | Una tarea de Windows cada 30–60 min (el mismo lanzador resistente de las 07:52) arranca Claude Code, lee el Buzón, **responde y hace solo lo seguro** (consultas de solo lectura, borradores, documentos); lo que toca producción o dinero lo deja como tarea para tu aprobación | 0 € extra (tu plan de Claude) | 3 h | **Sí, la primera** |
| C · Chat de administrador en Central | Un chat dentro de Central (como el N1 del cliente) con un modelo de AI Gateway que lee datos de Central en solo lectura y te responde al momento | Saldo de AI Gateway (céntimos por consulta) | 1–2 sesiones | Después de B |
| D · Claude Code en el móvil | Ya puedes seguir y escribir a esta sesión desde la app de Claude en el móvil (Remote Control / claude.ai/code) cuando el portátil está encendido | 0 € | — | Úsalo ya para lo urgente |

## 5. Hoja de ruta con tiempos (cargada en Mis tareas, en este orden)
**Esta semana (antes de cobrar al primer cliente):**
| # | Qué | Quién | Tiempo |
|---|---|---|---|
| 1 | Corregir los textos que prometen lo que no hay (TPV «llega solo», IA 24/7 si no hay recarga, montaje 49 €/gratis, pago online, VeriFactu y contrato de Signature, SumUp/Revolut en Experience, «El más elegido», contador 100/100) | Claude, con tu visto bueno | 2–3 h |
| 2 | SEO rápido: `/panel` sin indexar, `llms.txt`, descripción de `/demo/carta`, cifras con su valor final en el HTML, reenviar el sitemap | Claude (sitemap: tú en Search Console) | 1,5 h |
| 3 | Probar en tu sesión Central → Reportes, Competencia y Mis tareas (lo nuevo de hoy) | Tú | 10 min |
| 4 | Wing Boss: saber qué rama está publicada y llevar el arreglo de seguridad del 03/10 a `main` | Tú (acceso al equipo de Vercel) + Claude | 1 h |
| 5 | Pasar a privado el repo del motor de marca blanca | Tú | 5 min |
| 6 | Contrato de Signature y condiciones de entrega del código | Tú + Claude | 3–4 h |

**Próximas 2 semanas:**
| # | Qué | Quién | Tiempo |
|---|---|---|---|
| 7 | Buzón con respuesta automática (opción B) | Claude | 3 h |
| 8 | 5 páginas por ciudad (Baza, Granada, Guadix, Almería, Jaén) con diseño de autor | Claude | 5–6 h |
| 9 | Blog: 1 artículo por semana con las palabras clave | Claude | 1 h/semana |
| 10 | Auditar a fondo los 20 competidores pendientes (tandas de 5) y sacar sus clientes visibles para prospectar | Claude | 5 h |
| 11 | Conexión TPV real: investigar la API de SumUp (y 1–2 TPV de la zona) e integrar el primero | Claude | 2 h + 1–2 sesiones |
| 12 | Panel de Experience para el local (ventas, entradas, asistentes, informe) | Claude | 1 sesión |
| 13 | Chat de administrador con IA en Central (opción C) | Claude | 1–2 sesiones |
| 14 | Prueba social: 3 testimonios o reseñas reales y fotos de locales | Tú | continuo |

**1–2 meses (para escalar):**
| # | Qué | Quién | Tiempo |
|---|---|---|---|
| 15 | **Signature dentro de la plataforma** (mismo `/panel`, pedidos, carrito, push y club), para que el salto QR → Signature se lleve todo | Claude | 3–5 sesiones (2–4 semanas) |
| 16 | Pago online en Signature con Stripe Connect (ya usado en Experience) | Claude | 1–2 sesiones |
| 17 | VeriFactu: decidir entre integrarse con el TPV del local o exportar el cierre para la gestoría | Tú + Claude | 3 h de estudio |
| 18 | Alta automática de una marca Signature (base, proyecto, dominio y carta) | Claude | 2 sesiones |
| 19 | Fotos y casos para Experience | Antigravity | — |
| 20 | Correo con reintento y cola (ya en Mis tareas) | Claude | 3 h |
