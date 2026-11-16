# DKitchen Corporate (`dkitchencorporate.es`)

Plataforma comercial, motor de cartas digitales QR, eventos (Experience), app propia (Signature), panel del hostelero y **Central** (`/admin-dkitchen`), construida sobre **Next.js 16.3.5** (App Router), **React 19.3**, **Neon PostgreSQL** y **Stripe**.

## Arquitectura y estado vigente (16/11/2026)

1. **Base de datos y seguridad (`Neon PostgreSQL`):**
   - `117` archivos SQL en `db/migrations/` (hasta `0118_ruta_y_lotes.sql`).
   - Blindaje mediante roles RLS separados (`dk_app`, `dk_anon`, `dk_auth`, `dk_webhook`); ver `SEGURIDAD_Y_PERSISTENCIA_NEON.md`.
2. **Precios y cobros en vivo (`Stripe`):**
   - Fuente única de precios en `src/lib/pricing-config.ts`, sincronizada con tablas `dk.*` en Neon.
   - Pasarela **Stripe en vivo** (`src/lib/payments/cobros.ts`) con webhooks firmados (HMAC-SHA256) e idempotencia sobre cobros y correos.
3. **Motor IA y reserva de crédito (`Vercel AI Gateway`):**
   - `src/lib/carta-foto-ia.ts` y `src/lib/agente-prospeccion-ia.ts` utilizan `AI_GATEWAY_API_KEY` o el token OIDC automático del despliegue (`x-vercel-oidc-token` / `VERCEL_OIDC_TOKEN`).
   - Soporte IA gobernado por `public.ia_soporte_ajustes` (`n1='apagado'`, `n2='reglas'`) para reservar el crédito OIDC gratuito a generación de fotos y demos comerciales.
4. **Rutas y estado del front:**
   - Ver `ESTADO_FRONT.md` para el mapa verificado de rutas públicas, checkout, demos, panel de cliente, portal de socios y Central.

## Reglas de despliegue y desarrollo

- La rama de producción conectada a `https://dkitchencorporate.es` es **`claude/github-repository-access-1cf0ss`**.
- Vercel opera en plan **Hobby** hasta superar **>= 300 €/mes** de facturación recurrente.
- Las compilaciones se realizan exclusivamente en Vercel; ver `AGENTS.md` y `CLAUDE.md`.
