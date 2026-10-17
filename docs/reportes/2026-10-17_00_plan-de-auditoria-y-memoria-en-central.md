# Fase 0 · Plan de la auditoría industrial y memoria del proyecto en Central

> Sábado 17/10/2026, noche. Encargo de karc0: que nada se quede solo en el chat. Central pasa a ser la memoria del proyecto (Mis tareas con tiempos, Reportes por fecha, Competencia) y la auditoría completa se hace en 4 fases que se guardan al terminar cada una.

## Por qué así
- karc0: «todo lo que me digas en este chat, si no queda en Central como tarea, se pierde al hacer clear». Corrección de Claude: lo que dije en la sesión anterior (Vercel Pro, Stripe, recarga, registro del lunes, seguimiento del miércoles) **no estaba en Mis tareas**. Ya está.
- Regla nueva para todas las sesiones: **toda tarea, hallazgo o decisión acaba en Central** (Mis tareas o Reportes) además del escritorio y el repo.

## Qué se ha construido (migración 0082 + código)
| Pieza | Qué hace | Dónde |
|---|---|---|
| Mis tareas con responsable y tiempo | Cada tarea dice quién la hace (tú, Claude, Antigravity, los dos) y cuánto lleva. Filtro «Lo tuyo / De Claude». Bloques nuevos: Central y paneles, Producto, Desarrollo y automatización, Auditorías y reportes | Central → Más → Mis tareas |
| Reportes | Este documento y los de cada fase, por fecha. Fuente única: `docs/reportes/` del repo; copia en el escritorio | Central → Más → Reportes |
| Competencia | Base viva de competidores. Tú añades nombre + web + nota; Claude audita y rellena: precio, qué les funciona, dónde nos ganan y les ganamos, **clientes visibles para prospectar**, qué hacemos mejor y fuentes | Central → Más → Competencia |
| Buzón de Claude | `buzon.cjs` enseña al empezar cada sesión los competidores que añadas o comentes, y Claude tacha sus propias tareas con `buzon.cjs hecha` | herramientas-claude |

Pruebas de 0082 en rama temporal de Neon: **29/29**. Producción: 82/82 migraciones.

## Las 4 fases (todas hoy, cada una guardada al terminar)
| Fase | Qué cubre | Resultado |
|---|---|---|
| 0 | Memoria en Central, tareas pendientes con tiempos, documentación al día y archivo de lo implementado | Este reporte |
| 1 | Web pública: todas las páginas, secciones, formularios y rutas; psicología de precios y de venta; copy; ofertas; ventajas y desventajas; SEO; posición frente a la competencia | Reporte F1 + fichas en Competencia |
| 2 | Producto real: qué recibe de verdad un cliente de QR, Signature (auditando Wing Boss y el motor de marca blanca) y Experience; qué está automatizado de principio a fin y qué es manual; nivel tecnológico | Reporte F2 |
| 3 | Central y paneles de cliente: control, rutas, IA y asistencia, integración de Claude desde Central, qué falta en cada panel; hoja de ruta de automatización con tiempos | Reporte F3 + tareas en Mis tareas |

## Tareas cargadas hoy en Mis tareas
- **Tuyas, para el lunes 19/10:** Vercel Pro (10 min) · aprobar en Stripe la cancelación de Casa Caracas (5 min) · recarga de 20 € en AI Gateway (5 min). Más adelante: Neon Launch al llegar a 10–15 clientes.
- **De Claude:** IA de soporte a AI Gateway y prueba de cada IA de pago tras la recarga (45 min) · revisar el registro de «Buscar clientes» del lunes (15 min) · lista del seguimiento a 48 h el miércoles a las 09:00 (20 min) · auditar el scraper cuando pases el enlace (1 h) · primera renovación real el 12/11 (20 min) · reglas de sesión de Neon Auth (1 h) · correo con reintento y límite de Arsys (3 h) · las 3 fases de hoy.

## Competencia: punto de partida
Ya auditados (12–13/10) y cargados: **Comandero-IA** (amenaza alta, directo con el QR), **OrderManager** y **Vitrina Viva** (media). Por auditar: **CoverManager**. La fase 1 amplía la lista con búsquedas y Chrome.
