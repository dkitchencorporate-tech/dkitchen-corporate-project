# DKitchen Corporate — instrucciones de proyecto para agentes (actualizado 16/11/2026)

Este archivo aplica a **toda sesión** que trabaje en este repositorio (`claude/github-repository-access-1cf0ss`).

## 1. Diseño de autor («Gran Reserva») y coherencia de precios

- La estética **Gran Reserva** ya está implantada en producción (`https://dkitchencorporate.es`), paneles y cartas demo `/m/[slug]`. Todo cambio nuevo debe mantener ese mismo estándar de diseño de autor, contraste AA y comportamiento responsive en móvil y escritorio.
- Antes de tocar cualquier tarifa, copy comercial o componente de precios, consultar `src/lib/pricing-config.ts`:
  - **Carta QR:** Carta `9 €/mes` · Local `29 €/mes` (`1 €` primer mes) · Sala `79 €/mes` · Fundador QR `49 €/mes` (`147 €/trimestre`, hasta `10/01/2027` o `100` plazas).
  - **Signature:** Entrada `700 €` (o `2 × 375 €`) · Fundador `500 € + 69 €/mes` (12 meses); tramos `99 / 149 / 199 / 279 €/mes`.
  - **Experience:** desde `99 €` fidelizado / `199 €` cliente QR / `299 €` primera vez; `0 %` comisión.
  - **Auditoría:** `47 € + IVA` (ancla tachada `297 € + IVA` en `/auditoria` y checkout).
  - **Prohibido ofrecer:** la antigua «Carta de Autor 199 €» está **CANCELADA**.

## 2. Infraestructura, Neon, Pagos e IA (estado real 16/11/2026)

- **Neon PostgreSQL:** rama principal `br-lively-bread-b2xhvsm6`, `117` archivos SQL en `db/migrations/` (hasta `0118_ruta_y_lotes.sql`), RLS activo con roles `dk_app`, `dk_anon`, `dk_auth` y `dk_webhook`. Nunca aplicar migraciones destructivas en producción sin probar primero en rama temporal.
- **Stripe:** pasarela única **en vivo** en España (`DK_TITULAR_NOMBRE`, `DK_TITULAR_NIF` configurados en Vercel y visibles en `/aviso-legal`). Kunfupay, PayPal, LLC y DKitchen Venezuela están archivados en planificación futura. El precio se valida siempre en servidor.
- **Vercel y AI Gateway:** Vercel permanece en plan **Hobby** hasta facturar **>= 300 €/mes**. Los endpoints de IA (`carta-foto-ia.ts`, `agente-prospeccion-ia.ts`) leen `AI_GATEWAY_API_KEY` o el token OIDC automático del despliegue (`x-vercel-oidc-token` / `VERCEL_OIDC_TOKEN`); el soporte IA permanece en `public.ia_soporte_ajustes` (`n1='apagado'`, `n2='reglas'`) para reservar el crédito OIDC gratuito a fotos y demos.

## 3. Ramas y compilación

- La rama de producción conectada a `https://dkitchencorporate.es` es **`claude/github-repository-access-1cf0ss`**.
- `archive/architect-sys-legacy` es copia histórica de respaldo y no se modifica sin orden expresa.
- No ejecutar `npm run build` ni `tsc` en equipos locales ligeros: usar los builds automáticos de Vercel y verificar `READY` + respuestas HTTP reales en producción.
