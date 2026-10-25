# Estado del front — qué se ve y qué hay detrás

**Actualizado:** 20 de septiembre de 2026, al cerrar el motor de QR de carta.

**Documentos relacionados, más recientes en su tema:**
`MOTOR_QR_ANALISIS_PROFESIONAL_Y_PLAN.md` (disponibilidad del motor de QR) y
`VALOR_ANADIDO_QR_PERSONALIZADO_Y_CRECIMIENTO.md` (QR con marca, SEO
programático, afiliados). Este archivo describe el front en general; para el
motor de QR en concreto, esos dos mandan.

Este documento existe para que puedas recorrer la web pantalla por pantalla y
distinguir tres cosas que a simple vista se confunden:

1. Lo que **funciona de verdad** hoy.
2. Lo que **se ve pero está hueco** porque no hay base de datos detrás.
3. Lo que está **mal** y hay que arreglar.

Supabase se eliminó por completo. Neon ya está provisionado, blindado y **cableado
para el motor de QR de carta**: `/r/{codigo}` y `/m/{slug}` leen de la base de verdad.

El resto de pantallas —paneles, invitaciones, campañas, analítica— siguen huecas, y
eso no es un descuido: esas tablas no existen todavía. Tener la base conectada no es
tener las tablas. La regla que se sigue es que **ninguna pantalla finja tener datos
que no tiene**: donde antes había una consulta, hay una lista vacía y un aviso
visible, nunca datos de ejemplo disfrazados de reales.

Para verlo en local: `npm install && npm run dev` → http://localhost:3000

---

## 1. Lo que SÍ funciona hoy, sin base de datos

Esto es lo importante para empezar a vender: **la parte comercial de la web es
autosuficiente.**

| Qué | Dónde | Condición |
|---|---|---|
| Toda la web pública (textos, precios, secciones, demo de carta) | `/` y legales | Ninguna, es estática |
| **Captación de leads por formulario** | Modal de consultoría, modal enterprise, popup de salida | Requiere `SMTP_EMAIL` y `SMTP_PASSWORD` en Vercel |
| Botones de WhatsApp | Toda la web | Ninguna |
| Demo interactivo de la carta | `/demo/carta` | Requiere `GEMINI_API_KEY` solo para el botón "llamar al camarero" |

Los formularios **no escriben en ninguna base de datos**: `/api/lead` envía un
correo con los datos del lead vía Gmail SMTP. Es decir, puedes captar clientes hoy
mismo sin esperar a Neon. Si el correo no está configurado, el formulario falla en
silencio para el visitante — conviene probarlo antes de dar tráfico.

---

## 2. Ruta por ruta

### Público

| Ruta | Estado | Notas |
|---|---|---|
| `/` | ✅ Funciona | Home de entrada: hero, en tres pasos, CTA a la demo, tarjetas a los 5 peldaños, bio del fundador |
| `/qr` | ✅ Funciona | Peldaño 1 — QR Menú: valor de la carta interactiva + tarjetas de precio Básico/Ampliado leídas de `pricing-config.ts` |
| `/experience` | ✅ Funciona | Peldaño 2 — catálogo de formatos de evento (antes `/eventos`) |
| `/auditoria` | ✅ Funciona | Peldaño 3 — Auditoría de canales externos. Sin precio público (no está cerrado), CTA a WhatsApp para presupuesto |
| `/base-operativa` | ✅ Funciona | Peldaño 4 — Fundación Digital, Pack de Arranque (antes `/precios`) |
| `/dark-kitchen` | ✅ Funciona | Peldaño 4b, Ruta A — admisión de proyectos +3k€. El catálogo `/marcas` y la Ruta B siguen pendientes (tarea #11) |
| `/faq` | ✅ Funciona | Preguntas frecuentes (Fase 4) |
| `/demo/carta` | ✅ Funciona | Carta interactiva de **demostración**, con datos en el código. Es la pieza de venta, no el producto. Fuera del layout de marketing a propósito: no debe romper la inmersión con nuestra barra de ventas |
| `/m/{slug}` | ✅ **Con base de datos** | La carta real de un cliente, leída de Neon. HTML puro, sin JavaScript. Fuera del layout de marketing a propósito: es la pantalla del restaurante, no la nuestra |
| `/r/{codigo}` | ✅ **Con base de datos** | Lo que hay detrás del QR impreso: registra el escaneo y redirige a la carta |
| `/carta-no-disponible` | ✅ Funciona | Lo que ve quien escanea un QR que ya no resuelve |
| `/privacy` | ✅ Funciona | Identidad migrada a DKitchen. Movida al grupo de rutas `(marketing)`: misma URL, ahora con navegación |
| `/terms` | ✅ Funciona | Reescrito: describía un bot de WhatsApp que ya no existe. Movida al grupo `(marketing)` |
| `/data-deletion` | ✅ Funciona | Ya no menciona Supabase ni Meta. Movida al grupo `(marketing)` |
| `/robots.txt` | ✅ Funciona | Excluye `/r/`, paneles y manuales; deja indexar las cartas |
| `/sitemap.xml` | ✅ Funciona | Lista las páginas de marketing reales, una por peldaño. **Las cartas de clientes (`/m/{slug}`) aún no entran**: exige leer Neon en tiempo de build, se completa en la Fase SEO |

**Sobre la reestructura de la Fase 4:** las páginas de marketing viven bajo
`src/app/(marketing)/` —un grupo de rutas de Next.js que no aparece en la
URL— y comparten un layout con navegación real (`src/components/NavBar.tsx`,
antes eran anclas `#suscripciones`, `#eventos`, `#dark-kitchen` en una sola
página larga), pie de página (`src/components/Footer.tsx`) y un botón
flotante de WhatsApp (`src/components/FloatingWhatsApp.tsx`), distinto del
CTA de la barra. Deliberadamente **no** envuelve `/m/{slug}`, `/demo/carta`,
`/dashboard`, `/admin-architect`, `/manuals` ni `/onboarding`, cada una con su
propia identidad — verificado sirviendo cada ruta y comprobando que la marca
del botón de WhatsApp (`25D366`) no aparece fuera del grupo de marketing.

### Detrás de acceso (hueco, sin base de datos)

| Ruta | Qué se ve | Qué falta |
|---|---|---|
| `/dashboard` | Panel de cliente con sus 4 pestañas y aviso ámbar arriba | Todo: no hay perfil, ni eventos, ni autogestión |
| `/dashboard` → Eventos | Catálogo vacío | Los eventos viven en la base de datos |
| `/dashboard` → Autogestión | Tarjetas borrosas con overlay "en desarrollo" | Es el estado real: esa sección nunca se terminó |
| `/dashboard` → Up-sells | ✅ Se ve completo | Es un catálogo estático, no necesita base de datos |
| `/dashboard` → Pipeline | Se ve en su primer peldaño | Sin proyecto que consultar |
| `/onboarding` | Pantalla de "Acceso Denegado" | Los tokens de invitación viven en la base de datos. Cerrado a propósito |
| `/admin-architect` y subpáginas | Paneles vacíos con aviso ámbar | Clientes, pipeline, eventos y tráfico: todo sale de la base de datos |
| `/admin-architect/creative` | ✅ La interfaz se ve entera | Los botones de IA devuelven 503 (ver seguridad, punto 3) |
| `/manuals/*` | ✅ Se leen completos | **Su contenido está desactualizado** (Fase 7) |

### API

| Ruta | Estado |
|---|---|
| `/api/lead` | ✅ Operativa — envía el lead por email |
| `/api/demo/waiter` | ✅ Operativa — la usa el demo de carta |
| `/api/creative-factory/*` (6) | 🔒 Devuelven 503 a propósito |
| `/api/admin/export-leads` | 🔒 Devuelve 503 a propósito |

---

## 3. Errores y deudas encontrados durante la migración

Cosas que **ya estaban rotas** antes de tocar nada, y que conviene tener fichadas:

1. **`/onboarding` redirigía a `/client`**, una ruta que no existe en el proyecto.
   Cualquiera que hubiera completado el alta habría acabado en un 404.
2. **`events-data.ts` declara la interfaz `EventDossier` dos veces.** TypeScript lo
   tolera porque fusiona interfaces, así que nunca dio error, pero es un copia-pega
   que conviene limpiar.
3. **La sección de manuales se declara "DOCUMENTO CONFIDENCIAL - USO INTERNO"** en su
   propio pie de página, y sin embargo era completamente pública e indexable por
   Google: SOPs, estrategia de venta y precios. Se le ha puesto `noindex`, pero
   **sigue siendo accesible para cualquiera que tenga la URL**.
4. **Los manuales describen el negocio viejo**: marca Architect, modelo Growth, el bot
   de WhatsApp, Kommo y Woztell. Se reescriben enteros en la Fase 7; parchearlos a
   medias habría sido trabajo tirado.
5. **`AnalyticsPixel` llama a `https://ipapi.co/json/`** en cada visita, enviando la IP
   del visitante a un tercero para geolocalizarlo. Ocurre al margen del banner de
   cookies. Conviene revisarlo con criterio de RGPD antes de dar tráfico real.
6. **El sitemap solo declara la home.** Ninguna otra página se le está ofreciendo a Google.

---

## 4. Seguridad: cerrar antes de publicar

Tres puntos que **no deben llegar al dominio nuevo** tal como están:

1. **`/dashboard` y `/admin-architect/*` son públicos.** El `middleware.ts` que los
   protegía dependía de Supabase y se ha eliminado. Hoy están vacíos, así que no se
   filtra nada, pero en cuanto tengan datos reales hay que cerrarlos con la
   autenticación de Neon **antes** de cargar el primer cliente.

2. **Se han eliminado tres puertas traseras** que daban permisos de administrador:
   - `middleware.ts` **fabricaba un usuario falso** (`klarx94@gmail.com`) cuando no
     había sesión en desarrollo, y ese objeto pasaba después los controles de admin.
   - `dashboard/page.tsx` activaba "modo demo" para ese mismo correo.
   - `dashboard/layout.tsx` daba acceso al panel interno a **cualquier correo que
     contuviera la cadena `klar`**.
   - El backup de agentes documentaba además un "Modo Dios" con
     `alex@architectsys.com` y `admin@architectsys.com`.

3. **`/api/admin/export-leads` no tenía ninguna comprobación de identidad.** Era un
   POST abierto que devolvía en CSV el nombre, teléfono y correo de todos los leads a
   quien lo pidiera. Ahora responde 503. **Al reconectar Neon hay que exigirle sesión
   de administrador, no solo que exista base de datos** — está avisado en el propio
   archivo.

---

## 5. Qué cambia cuando entre Neon

Toda la aplicación habla con la base de datos a través de un único archivo:
`src/lib/data-source.ts`. Ningún componente sabe de dónde vienen los datos.

Para encender el sistema hay que:

1. Poner `BACKEND_CONFIGURED = true` en ese archivo.
2. Implementar sus funciones contra Neon (hoy devuelven vacío o lanzan un error explícito).
3. Añadir autenticación y volver a proteger `/dashboard` y `/admin-architect`.
4. Revisar el punto 3 de seguridad antes de exponer la exportación de leads.

Los avisos ámbar de las pantallas desaparecen solos: leen esa misma constante.

**Nota sobre tiempo real:** el monitor de tráfico usaba suscripciones en vivo de
Supabase. Neon no las trae de serie, así que arrancará con sondeo periódico, que es
suficiente para un panel de este tamaño.
