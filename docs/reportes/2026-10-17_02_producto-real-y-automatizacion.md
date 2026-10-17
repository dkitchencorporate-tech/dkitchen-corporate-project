# Fase 2 · Producto real: qué recibe un cliente, qué está automatizado y nivel tecnológico

> 17/10/2026. Contraste de lo que promete la web con el código de producción de dkitchencorporate.es (48ac325), el repo de **Wing Boss** (`wing-boss-pwa`, la app de marca más avanzada y base de Signature), el **motor de marca blanca** (`dkitchen-white-label-engine`) y los datos de Neon. Veredicto: la carta QR es un producto real y automatizado de principio a fin; Signature es una app muy completa pero sin pago online ni fiscal, montada a mano y fuera de la plataforma; Experience tiene la venta de entradas real (Stripe Connect) y el resto es servicio manual.

## 0. Foto en una tabla
| Producto | Se cobra solo | Se entrega solo | Nivel tecnológico real | Listo para vender esta semana |
|---|---|---|---|---|
| **Carta QR** (Carta, Local, Sala, Fundador) | ✅ Stripe, IVA, factura, renovación, impago, baja y reenganche | ✅ Cuenta, carta, QR, panel, formación guiada · 🔧 montaje (karc0, 20 primeros) | **8/10** | ✅ Sí, corrigiendo 3 textos (TPV, IA 24/7, montaje) |
| **Signature** | ✅ Stripe (700 € o 2 × 375 €; Fundador 500 €) → proyecto en Central | 🔧 Todo manual: clonar app, base, dominio, carta | **App 7/10 · plataforma 3/10** | 🟡 Solo con contrato y quitando de la web lo que no existe (pago online, VeriFactu) |
| **Experience** | 🟡 Solicitud sin pago → llamada → enlace de pago | 🟡 Entradas, QR por entrada y puerta reales (Stripe Connect al local) · 🔧 concepto, anuncios, informe | **Entradas 7/10 · servicio manual** | 🟡 Sí, sin probar todavía con un evento real |
| **Auditoría** (47 €) | ✅ | 🔧 Reunión e informe a mano | Servicio | ✅ |
| **Dark Kitchen / Marcas** | ❌ Solo solicitud | 🔧 Proyecto a medida | Servicio | Solo bajo pedido |

## 1. Carta QR: lo que recibe de verdad un cliente (comprobado en código y en la compra real del 12/10)
**Automático de principio a fin:**
1. Paga 1 € en `/pago` (Stripe, IVA aparte, términos guardados con fecha, IP y versión).
2. El webhook crea su cuenta (Neon Auth), el local, la carta `/m/<slug>`, la landing `/l/<slug>` y su QR.
3. Le llegan «Crea tu contraseña» y la bienvenida; a ti, NUEVA ALTA QR.
4. Entra en `/panel`: **montaje guiado obligatorio** (solo se puede pausar una vez) y **formación paso a paso** la primera vez que abre cada sección.
5. Cobro mensual, 30 días de gracia por impago, solo lectura, suspensión, borrado a los 60 días y **reenganche** de 3 correos (día 0, 30 y 53) con `/volver` (0081).

**Qué tiene su panel (todo construido y en producción):**
| Zona | Secciones |
|---|---|
| Estudio | Identidad del local · Carta (platos, categorías y combos, idiomas, banners) · Estilo (4 estilos, fondos, letras, colores, Premium) · Landing del local · QR y kit |
| Servicio | Pedidos (comandero de sala) · Reservas · Llamadas al camarero · Equipo (camareros, encargados) · Sala (plano vivo, mesas, zonas) |
| Negocio | Escaneos · Mi plan (cobro, subir de plan, baja) · Mejoras · Legal |
| Ayuda | Soporte (chat N1 → ticket N2) |
| IA | Fotos de platos con IA · carta desde foto · «Escribir con IA» · traducción |

**Lo que NO es como dice la web (detalle en F1 §0):**
- **Conexión TPV:** envío genérico JSON a una URL https (`src/lib/envio-tpv.ts`, con protección SSRF y credencial cifrada). Sin integración con ningún TPV del mercado: solo funciona si el fabricante acepta pedidos externos en ese formato. **Las «comandas al mes por plan» y «sale por tus impresoras» dependen de ello.**
- **IA:** carta desde foto, fotos con IA y «Escribir con IA» están programadas pero **sin probar con saldo** (recarga del lunes). El asistente N1 «24/7» hoy está en modo agente.
- **El comensal no puede pedir desde la carta** (decidido: el carrito es solo de Signature). Lo dice la FAQ, bien.
- **QR físicos:** se piden desde el panel, pero la entrega es manual (🔧).

**Nivel tecnológico: 8/10.** Next.js 16, Neon con RLS y funciones `SECURITY DEFINER` (82 migraciones), Stripe nativo, cron de cobros, 2FA en Central, cabeceras de seguridad, pruebas de estrés (100 usuarios a la vez) y de seguridad. Por encima de los competidores gratuitos en sala, reservas y diseño; por debajo de FlexFood/WEIQ en pedido desde la mesa.

## 2. Signature: auditoría de Wing Boss (la base real)
**Qué es:** una PWA por marca (Vite + React 19 + Zustand) con funciones de Vercel (`api/*.js`), su propia base Neon (`schema_white_label.sql`) y su propio login (JWT + bcrypt + 2FA TOTP de admin). Hermanas: Seven Food Fries y Bokadipan (misma base). Caso real de cliente: Néstor Pizzas (repo propio). Todas en producción en `*.dkitchencorporate.es` (Wing Boss responde 200; su API de administración responde 401 sin sesión: cerrada).

**Promesa de la web frente al código de Wing Boss:**
| Lo que dice /signature | En Wing Boss | Estado |
|---|---|---|
| App instalable con tu marca y tu dominio | PWA con `sw.js`, aviso de instalación, marca en `brandConfig.ts` | ✅ |
| Pedidos en mesa, recogida y domicilio | Carrito, recogida y domicilio con zonas, mesa en quiosco | ✅ |
| Pantalla de cocina / comandero | Panel de pedidos con estados y alarma de pedido nuevo | ✅ |
| Freno de emergencia (pausar pedidos) | Horarios y pausa en el panel | ✅ |
| Club de fidelización con puntos y canje | Puntos, niveles VIP, canje con correo verificado | ✅ |
| Notificaciones push | Web Push con VAPID propio (`api/notify.js`) | ✅ (el «sub» VAPID es `hola@sevenfoodfries.com`: identidad copiada de otra marca) |
| Seguimiento del pedido en tiempo real | `OrderTracking.tsx` | ✅ |
| Ventas sugeridas | `UpsellModal` gobernado desde la base | ✅ |
| Campañas a tus clientes | `MarketingCampaignModal` | ✅ (por revisar el canal: push/correo) |
| Kiosko de autoservicio | `AdminKiosk` + modales de quiosco | ✅ |
| Comandas impresas en cocina | Impresora de red configurada en el navegador del local | 🟡 Funciona por local, sin probar con varias marcas de impresora |
| **Pago online (Stripe, SumUp o Revolut Pay, a tu elección)** | **Solo efectivo o tarjeta al entregar** (datáfono). Ningún adaptador de pago online | 🔴 **No existe** |
| **Cierre fiscal conectado (VeriFactu)** | **Nada fiscal** (la decisión del 26/09 fue «casi POS sin módulos fiscales») | 🔴 **No existe** |
| «Recibes el contrato en tu correo» | El contrato de Signature está pendiente | 🔴 **No existe** |
| «El código es tuyo» | Repos privados en la cuenta de DKitchen | 🟡 Hay que definir en el contrato cómo se entrega (transferencia del repo o licencia) |

**Seguridad (🔴 a revisar):** el arreglo del 03/10 «cerrar endpoints abiertos y quitar credenciales del código» está en la rama `master`, pero la rama `main` tiene **65 commits más que no lo incluyen**. Hay que saber qué rama publica wingboss.dkitchencorporate.es. Ese proyecto está en otro equipo de Vercel (`team_fkazd…`) al que nuestro token no llega: **lo comprueba karc0 o me da acceso de lectura**.

**Nivel tecnológico de la app: 7/10.** Muy completa en experiencia de pedido y fidelización. **Como plataforma: 3/10:** cada cliente es un repo, una base y un proyecto de Vercel distintos, sin cobro online, sin fiscal y sin conexión con el panel de DKitchen.

## 3. El motor de marca blanca (para automatizar Signature)
- **Repo `dkitchen-white-label-engine` (🔴 PÚBLICO)**, parado desde el 03/10. 5 PR fusionados (API en TypeScript con zod, RLS en 14 tablas, marcas en `brands/<slug>/`, CI con 53 + 3 pruebas, sincronización motor → clientes v1.0.0). **PR #6 abierto** (Fase 3: zonas, existencias, marca de prueba Alacena Exprés).
- Notas de la auditoría del 05/10 (siguen vigentes): seguridad 8 · pagos **3** (interfaz sin adaptadores) · calidad 8 · motor 7,5 · **paridad con el QR 4/10 (25–30 %)**.
- Saldo del agente de la nube: 16 USD que **caducan el 05/11/2026**.
- **Riesgo:** al ser público, cualquiera ve la estructura de la base, los ID de proyectos de Neon que publicó el agente y la lógica. Recomendación: pasarlo a privado (lo decides tú; es repo de otro agente).

## 4. QR → Signature: «se lleva todo lo de QR más Signature» (estado real)
- **Hoy no es así técnicamente.** QR vive en la plataforma (Next.js + Neon `withered-scene`). Signature es otra app con otra base. Al pasar:
  - la carta se copia a mano (o con `seed_menu.json`);
  - reservas, sala, camareros, llamadas, landing, escaneos e historial **se quedan en el panel QR** (si sigue pagando QR) o se pierden;
  - el descuento «lo pagado en QR se descuenta de la entrada» se hace a mano (enlace de pago con importe ajustado).
- **Lo que haría falta:** Signature como **nivel superior dentro de la misma plataforma** (el mismo `/panel` con pedidos, pago online por Stripe Connect —ya usado en Experience—, push y club), con el diseño de autor por marca y su dominio. Ver la hoja de ruta (F3 §5).

## 5. Experience: lo que existe
- **Real y en producción (0067):** Central → Entradas crea el evento; el local da de alta su cobro en **Stripe Connect Express** (el dinero va directo a su cuenta, sin comisión de DKitchen); página pública `/e/<slug>`, compra `/e/<slug>/entradas`, **QR único por entrada** y **puerta** `/e/<slug>/puerta` con cámara.
- **Manual:** concepto y guía del evento, piezas y flyer, campaña de anuncios, informe final.
- **No existe:** panel del local para ver sus ventas (solo la puerta); cobro por SumUp o Revolut (la web lo ofrece; solo hay Stripe); fotos de los formatos.
- **Datos:** 0 eventos, 0 entradas, 0 proyectos. **Sin probar con un evento real.**

## 6. Auditoría, Dark Kitchen y Marcas
- Auditoría: pago automático → proyecto en Central → reunión e informe manuales (sin plantilla de informe en el repo).
- Dark Kitchen y Marcas: solo solicitud. Precios publicados como orientativos («desde 1.200 € por marca»).

## 7. Capacidad para meter clientes esta semana
- **QR:** sí. Técnica 30–50 activos con Vercel Pro; humana 5–10 altas/semana con el montaje incluido (el montaje es tu tiempo).
- **Signature:** 1 cliente cada 1–3 días de trabajo de Claude (clonar, marca, base, dominio), y solo cuando haya contrato. Sin pago online.
- **Experience:** 1–2 eventos en paralelo (3 semanas cada uno, mucho trabajo manual).
