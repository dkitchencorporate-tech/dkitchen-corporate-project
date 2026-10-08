# DKitchen — architect-landing-hosteleria

Web de producto y motor de QR de DKitchen Corporate SL, sobre Next.js 14 (App Router) y Neon Postgres.

**Antes de tocar nada, lee esto en orden** — es el contrato con cualquier agente de IA o desarrollador que trabaje en este repo:

1. **`SEGURIDAD_Y_PERSISTENCIA_NEON.md`** — arquitectura de roles, RLS y hallazgos de seguridad (V-01 a V-18) sobre Neon. Sección 8 dice qué está realmente ejecutado.
2. **`ESTADO_FRONT.md`** — ruta por ruta, qué funciona de verdad, qué está hueco y qué es deuda conocida.
3. **`MOTOR_QR_ANALISIS_PROFESIONAL_Y_PLAN.md`** y **`VALOR_ANADIDO_QR_PERSONALIZADO_Y_CRECIMIENTO.md`** — disponibilidad del motor de QR y las piezas de valor añadido (QR personalizado, SEO programático, afiliados).
4. **`DKITCHEN_AUDITORIA_CONVERSION_Y_DISENO.md`** — auditoría de conversión/diseño página por página que dio origen al vocabulario de bloques de la Parte 6.

## Desarrollo local

```bash
npm install
npm run dev
```

Necesita `DK_DATABASE_URL`, `DK_IP_HASH_PEPPER` y `GLOBAL_CONFIG` en `.env.local` — ver `SEGURIDAD_Y_PERSISTENCIA_NEON.md` para qué rol de Neon usa cada una.

## Base de datos

Migraciones en `db/migrations/`, aplicadas con `node db/migrate.mjs <entorno-propietario>`. Verificación de blindaje (RLS, roles, funciones) con `node db/verificar-blindaje.mjs <entorno-propietario>`.

## Pagos

Todos los cobros corren sobre Stripe (`src/lib/payments/stripe.ts` y `cobros.ts`), único proveedor de pago, con checkout nativo en `/pago` y webhook en `/api/webhooks/stripe`. Necesita `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `STRIPE_PUBLISHABLE_KEY` en el entorno.

## Buenas prácticas de despliegue (Vercel)

Ver `AGENTS.md`.
