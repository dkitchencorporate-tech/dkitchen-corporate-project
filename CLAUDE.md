# DKitchen Corporate — instrucciones de proyecto para Agente DK (actualizado 21/11/2026)

Este archivo aplica a **toda sesión** que trabaje en este repositorio (`claude/github-repository-access-1cf0ss`).

## 1. Gobernanza y canon de marca («Gran Reserva»)

- **Gobernanza:** **Alex (Dirección)** y **Agente DK** (figura agnóstica de modelo: Antigravity, Claude o el agente elegido por Dirección). Ambos comparten jerarquía operativa en prospección, estrategia, código y control de calidad.
- **Identidad visual Gran Reserva:** estética de autor implantada en producción (`https://dkitchencorporate.es`), paneles y cartas demo `/m/[slug]` (`nivel_diseno = 'autor'`, emblemas SVG en `/api/emblema/[slug]`, fotos editoriales WebP). Mantener contraste AA y responsividad móvil `360 px+` y escritorio.
- **Cero emojis y cero rastro visible de «IA»:** prohibidos emojis en UI visible a clientes/comerciales, propuestas `/propuesta/[token]`, demos y mensajes. Tampoco exhibir menciones tipo «con IA» o «Generador IA» hacia hosteleros.
- **Fuente única de precios:** consultar siempre `src/lib/pricing-config.ts`:
  - **Carta QR:** Carta `9 €/mes` · Local `29 €/mes` (`1 €` primer mes) · Sala `79 €/mes` · Fundador QR `49 €/mes` (`147 €/trimestre`, hasta `10/01/2027` o `100` plazas).
  - **Signature:** Entrada `700 €` (o `2 × 375 €`) · Fundador `500 € + 69 €/mes` (12 meses); tramos `99 / 149 / 199 / 279 €/mes`.
  - **Experience:** desde `99 €` fidelizado / `199 €` cliente QR / `299 €` primera vez; `0 %` comisión.
  - **Auditoría:** `47 € + IVA` (ancla tachada `297 € + IVA` en `/auditoria` y checkout).
  - **Prohibido ofrecer:** la antigua «Carta de Autor 199 €» está **CANCELADA**.

## 2. Seguridad obligatoria y repositorio público

- **Repositorio público:** queda **terminantemente prohibido** subir claves, tokens, variables de entorno, emails privados de clientes o equipo, listas de prospectos, notas internas de Central ni reportes internos del negocio.
- **20 medidas de seguridad:** todo cambio de código debe cumplir HSTS, CSRF, cookies `HttpOnly`/`Secure`/`SameSite`, SQL parametrizado sin concatenación, sanitización XSS, rate limiting (`limite_frecuencia`), bloqueo tras fallos (`admin_2fa_fallos`), CORS estricto, validación positiva (listas blancas) en subidas/slugs/redirecciones, protección 2FA en `/admin-dkitchen`, aislamiento por roles RLS en Neon (`dk_app`, `dk_anon`, `dk_auth`, `dk_webhook`) y **validación exclusiva de precios en servidor**.

## 3. Infraestructura, Neon, Prospección e IA (`21/11/2026`)

- **Neon PostgreSQL:** rama principal `br-lively-bread-b2xhvsm6`, `121` archivos SQL en `db/migrations/` (numeración hasta `0122_fix_control_diseno_cliente.sql`), RLS activo. Nunca aplicar migraciones o borrados masivos en producción sin copia previa y prueba en rama temporal.
- **Stripe:** pasarela única **en vivo** en España (`DK_TITULAR_NOMBRE`, `DK_TITULAR_NIF` en Vercel, visibles en `/aviso-legal`). El importe se calcula siempre en servidor.
- **Vercel y AI Gateway:** Vercel en plan **Hobby** hasta superar `>= 300 €/mes` MRR. `carta-foto-ia.ts` y `agente-prospeccion-ia.ts` usan `AI_GATEWAY_API_KEY` o token OIDC automático (`x-vercel-oidc-token` / `VERCEL_OIDC_TOKEN`); `public.ia_soporte_ajustes` permanece en `n1 = 'apagado'`, `n2 = 'reglas'` (soporte atendido internamente) para reservar el crédito OIDC gratuito a fotos y demos.
- **Prospección y anti-autoapertura:** `CrmFicha.tsx` unificada en 4 bloques (`Carta QR`, `Simulador del dueño`, `Editor interno`, `Propuesta web`), `CrmLista.tsx` en 3 bandejas (`1. Por enviar`, `2. Zona de Seguimiento`, `3. Todos activos`), `Montaje gratis` en `AltaUnicaModal.tsx`, `Calle Express` en `~20 s`, y parámetro `?preview=1` obligatorio en revisiones internas de `/propuesta/[token]` y `/demo/panel` para no sumar vistas falsas.

## 4. Ramas y compilación

- La rama de producción conectada a `https://dkitchencorporate.es` es **`claude/github-repository-access-1cf0ss`**.
- `archive/architect-sys-legacy` es respaldo histórico congelado.
- **Prohibido** ejecutar `npm run build` ni `tsc` en equipos locales ligeros: usar los builds automáticos de Vercel y verificar `READY` + respuestas HTTP reales en producción.
