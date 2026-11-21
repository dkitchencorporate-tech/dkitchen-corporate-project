# DKitchen Corporate (`dkitchencorporate.es`)

Plataforma comercial, motor de cartas digitales QR (`nivel_diseno = 'autor'`), eventos (Experience), app propia (Signature), panel del hostelero y **Central** (`/admin-dkitchen`), construida sobre **Next.js 16.3.5** (App Router), **React 19.3**, **Neon PostgreSQL** y **Stripe**, operada bajo gobernanza **Dirección + Agente DK** (agnóstico de modelo).

## Arquitectura y estado vigente (21/11/2026)

1. **Base de datos y seguridad (`Neon PostgreSQL`):**
   - `121` archivos SQL en `db/migrations/` (numeración hasta `0122_fix_control_diseno_cliente.sql`).
   - Blindaje mediante roles RLS separados (`dk_app`, `dk_anon`, `dk_auth`, `dk_webhook`), 2FA obligatorio en `/admin-dkitchen`, cookies seguras y cumplimiento estricto de las 20 medidas de seguridad (`CLAUDE.md` §2 y `SEGURIDAD_Y_PERSISTENCIA_NEON.md`).
2. **Precios y cobros en vivo (`Stripe`):**
   - Fuente única de precios en `src/lib/pricing-config.ts`, validados siempre en servidor y sincronizados con tablas `dk.*` en Neon.
   - Pasarela **Stripe en vivo** (`src/lib/payments/cobros.ts`) con webhooks firmados e idempotencia sobre cobros, contratos PDF, facturas y correos.
3. **Prospección, demos operativas y motor IA (`Vercel AI Gateway`):**
   - Demos de autor con equipo de sala y comandas demo en vivo (`0119`–`0122`), emblemas SVG (`/api/emblema/[slug]`), prospección unificada en 3 bandejas, modo móvil `Calle Express` y filtro `?preview=1` anti-autoapertura.
   - `src/lib/carta-foto-ia.ts` y `src/lib/agente-prospeccion-ia.ts` utilizan `AI_GATEWAY_API_KEY` o el token OIDC automático del despliegue; soporte gobernado por `public.ia_soporte_ajustes` (`n1 = 'apagado'`, `n2 = 'reglas'`).
4. **Rutas y estado del front:**
   - Ver `ESTADO_FRONT.md` para el mapa verificado de rutas públicas, checkout, demos, panel de cliente, portal de socios y Central.

## Reglas de despliegue y desarrollo

- La rama de producción conectada a `https://dkitchencorporate.es` es **`claude/github-repository-access-1cf0ss`**.
- Vercel opera en plan **Hobby** hasta superar **`>= 300 €/mes`** de facturación recurrente.
- Las compilaciones se realizan exclusivamente en Vercel (**prohibido** compilar en equipos locales ligeros); ver `AGENTS.md` y `CLAUDE.md`.
- Repositorio público: prohibido subir secretos, emails privados, datos de clientes/prospectos o reportes internos.
