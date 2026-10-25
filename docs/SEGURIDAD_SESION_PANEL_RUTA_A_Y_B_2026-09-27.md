# ⚠️ SEGURIDAD — Sesión del panel de cliente: Ruta A (activa) y Ruta B (pendiente de prueba)

**Fecha:** 27/09/2026 · **Estado:** Ruta A en implementación · Ruta B pendiente (NO olvidar)
**Relacionado:** `ESTADO_WEB_DKITCHENCORPORATE.md` §1e

---

## 1. Qué pasó

El login de clientes (`/panel/iniciar-sesion`) aceptaba la contraseña pero el panel devolvía al login sin mensaje.
Causa real (log de servidor): `permission denied for schema auth`.

El diseño del 26/09 (commit `582065e`) verificaba el JWT **dentro de Postgres** con la extensión `pg_session_jwt`
(`auth.init()` + `auth.jwt_session_init()`). En Neon eso **no es viable** para el rol de la app (`dk_app`):

| Comprobación (27/09, ramas aisladas ya borradas) | Resultado |
|---|---|
| Esquema `auth` | Dueño `cloud_admin` (interno de Neon), sin ACL. Solo lo usan `cloud_admin`, `neon_service`, `neon_superuser`, `neondb_owner` |
| `GRANT USAGE ON SCHEMA auth TO dk_app` como `neondb_owner` | No tiene efecto (`WITH GRANT OPTION` = false) |
| Reinstalar la extensión | Vuelve a crear `auth` de `cloud_admin` sin ACL |
| Crear `auth` propio antes de la extensión | Rechazado: `schema auth is not a member of extension` |
| Función puente `SECURITY DEFINER` | Rechazado por diseño: `cannot set parameter "pg_session_jwt.jwt" within security-definer function` |
| Verificar Ed25519 en SQL | Imposible: Neon no ofrece `pgsodium` ni `plv8` |
| Vercel / API de Neon como "admin" | Mismo techo que `neondb_owner`; conectar la app como owner = `BYPASSRLS` = inaceptable |

Conclusión: **el panel nunca funcionó con un cliente real** desde el 26/09. No es un parche fallido, era un diseño inviable en Neon.

## 2. Ruta A — ACTIVA (documentada por Neon)

Fuente oficial: https://neon.com/docs/guides/rls-query-execution (backend por TCP: verificar JWT con `jose`, identidad vía `set_config` transaccional, rol sin `BYPASSRLS`).

- El servidor verifica el JWT de Neon Auth: firma **EdDSA** contra el JWKS público de Neon (rotación automática), `exp`, emisor, audiencia, `sub` con formato UUID.
- Identidad a Postgres con `set_config('dk.usuario_id', <uuid>, true)` → solo vive en esa transacción.
- `SET LOCAL ROLE dk_auth` (sin BYPASSRLS). RLS forzado en las 15 tablas no cambia.
- `dk.identidad_actual()` lee ese valor y además comprueba que el usuario existe en `neon_auth.user`.

**Riesgo residual (aceptado conscientemente):** si alguien robara las credenciales del servidor en Vercel, podría suplantar a un cliente. Con Ruta B no.

### Batería de pruebas obligatoria (resultado en §4)
1. Rechazo: firma falsa, `alg: none`, HS256 con la clave pública, token caducado, emisor/audiencia erróneos, `sub` manipulado, sin token.
2. Cliente A no lee/modifica nada de cliente B.
3. Sin identidad → ningún dato privado.
4. La identidad no se filtra entre peticiones por el pool.
5. Consultas parametrizadas (sin inyección que cambie la identidad).

## 3. Ruta B — PENDIENTE (probar DESPUÉS de que A funcione)

**Data API de Neon** (ya activa en el proyecto: `…apirest…/neondb/rest/v1`, rol `authenticated`). Neon verifica el JWT → ni un servidor comprometido puede suplantar a un cliente.

- Duda a resolver primero: el rol `authenticated` **tampoco** tiene USAGE en `auth`. Hay que probar en rama aislada si su RLS funciona con nuestras tablas (probablemente vía `request.jwt.claims`).
- Regla acordada con karc0: **si B no sirve, se queda A tal cual**. Si B es mejor, cambio rápido (las políticas RLS son las mismas).
- Opción C paralela: pedir a Neon USAGE en `auth` para `dk_app` (volveríamos al diseño original).

## 4. Registro de ejecución
- 27/09 — Diagnóstico completo. Intentos fallidos retirados: `dk.iniciar_sesion_jwt` (se elimina), `GRANT USAGE ON SCHEMA dk TO dk_app` (se revierte).
