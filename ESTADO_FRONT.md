# Estado del front — mapa real de rutas en producción (21/11/2026)

**Producción:** `https://dkitchencorporate.es` (rama `claude/github-repository-access-1cf0ss`)
**Backend:** Neon PostgreSQL (`db/migrations/`, `121` archivos hasta `0122_fix_control_diseno_cliente.sql`, RLS activo) + Stripe en vivo + Vercel AI Gateway (OIDC automático).

## 1. Web pública de marketing (`src/app/(marketing)`)

- Portada y producto: `/`, `/qr`, `/signature`, `/experience`, `/experience/[formato]`, `/auditoria` (`297 € -> 47 € + IVA`), `/fundador`, `/precios`, `/dark-kitchen`, `/marcas`, `/casos-de-exito`.
- Captación y SEO local: `/carta-de-autor`, `/portada-qr/[origen]`, `/contacto`, `/faq`, `/blog`, `/blog/[slug]`, `/carta-digital`, `/carta-digital/[ciudad]`, `/demos/carta`, `/demos/signature`.
- Legales: `/aviso-legal` (con titular `DK_TITULAR_*`), `/privacy`, `/terms`, `/data-deletion`.

## 2. Checkout y pagos con Stripe

- Flujo de contratación: `/pagar/[producto]`, `/pagar/gracias`, `/pago`, `/pago/listo`, `/pago/reserva`.
- Webhooks firmados e idempotentes en `src/lib/payments/cobros.ts`; precios validados en servidor desde `src/lib/pricing-config.ts`.

## 3. Cartas públicas, landings, eventos y demos de autor

- Demos generales y simulador: `/demo/carta`, `/demo/panel` (con soporte `?local=[slug]&preview=1` anti-autoapertura, `4` mesas y comandas demo en vivo), `/demos/carta`, `/demos/signature`.
- Cartas, landings, emblemas y propuestas por local: `/m/[slug]` (`nivel_diseno = 'autor'` con rama `premium` preservada), `/m/[slug]/legal`, `/api/emblema/[slug]` (emblemas SVG dinámicos `512x512`), `/l/[slug]`, `/propuesta/[token]` (soporte `?preview=1`), `/carta-no-disponible`, `/qr/bienvenida`, `/base-operativa/bienvenida`, `/nucleo-operativo/completar/[token]`, `/documentos/contrato`, `/kit`, `/kit/[id]`.
- Servicio en sala y eventos Experience: `/sala/[token]`, `/e/[slug]`, `/e/[slug]/entradas`, `/e/[slug]/puerta`, `/volver/[token]`, `/baja-lista/[token]`.

## 4. Panel del cliente y portal de socios

- Cliente: `/panel` (incluye modo completo al entrar en Modo Soporte), `/panel/iniciar-sesion`, `/panel/nueva-contrasena`, `/panel/vista-previa`, `/panel/documentos`, `/mi-experience`, `/mis-servicios`.
- Socios y formación: `/socio`, `/socio/buzon`, `/socio/kit`, `/socio/prospeccion`, `/socio/prospeccion/[id]`, `/academia`, `/acceso-seguro`.

## 5. Central de administración (`/admin-dkitchen`)

- Arranque y control: `/admin-dkitchen`, `/admin-dkitchen/inicio`, `/admin-dkitchen/partes`, `/admin-dkitchen/tareas`, `/admin-dkitchen/decisiones`, `/admin-dkitchen/reportes`, `/admin-dkitchen/buzon`, `/admin-dkitchen/avisos`, `/admin-dkitchen/manual`.
- Comercial y prospección (unificada en 4 bloques, 3 bandejas y `Calle Express`): `/admin-dkitchen/prospeccion`, `/admin-dkitchen/prospeccion/[id]`, `/admin-dkitchen/propuesta-correo/[id]`, `/admin-dkitchen/ruta`, `/admin-dkitchen/ofertas`, `/admin-dkitchen/oportunidades`, `/admin-dkitchen/campanas`, `/admin-dkitchen/fundador`, `/admin-dkitchen/competencia`, `/admin-dkitchen/comerciales`, `/admin-dkitchen/socios`, `/admin-dkitchen/contratos`.
- Servicios, clientes y operación: `/admin-dkitchen/servicios`, `/admin-dkitchen/servicios/qr`, `/admin-dkitchen/servicios/signature`, `/admin-dkitchen/servicios/experience`, `/admin-dkitchen/servicios/auditoria`, `/admin-dkitchen/proyectos`, `/admin-dkitchen/proyectos/[id]`, `/admin-dkitchen/qr`, `/admin-dkitchen/qr/[id]`, `/admin-dkitchen/entradas`, `/admin-dkitchen/soporte`, `/admin-dkitchen/comprobacion`.
- Analítica, docs y gobierno: `/admin-dkitchen/embudo`, `/admin-dkitchen/mapa`, `/admin-dkitchen/documentos`, `/admin-dkitchen/documentos/ver`, `/admin-dkitchen/entrenamiento`, `/admin-dkitchen/administradores`, `/admin-dkitchen/planificacion`.
