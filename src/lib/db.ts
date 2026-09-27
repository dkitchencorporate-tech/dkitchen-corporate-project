import 'server-only';

import { Pool, neonConfig, type PoolClient } from '@neondatabase/serverless';
import ws from 'ws';
import { verificarJwtNeonAuth } from './verificar-jwt';

/**
 * CONEXIÓN A NEON — EL ÚNICO SITIO DEL PROYECTO QUE ABRE UNA
 *
 * Aquí se materializa la regla inamovible: el despliegue no tiene autoridad.
 *
 * Vercel recibe de la integración de Neon un puñado de variables
 * (DATABASE_URL, POSTGRES_URL, PGPASSWORD…) que llevan la credencial de
 * `neondb_owner`. Ese rol tiene BYPASSRLS: con él, cada política de seguridad
 * del esquema sería decorativa. Es exactamente lo que ocurría con la clave de
 * servicio de Supabase que se retiró del proyecto.
 *
 * Por eso este módulo lee `DK_DATABASE_URL` y ninguna otra: apunta a `dk_app`,
 * un rol sin BYPASSRLS, sin superusuario y —esto es lo importante— NOINHERIT.
 * Recién conectado, `dk_app` no puede leer ni una fila de ninguna tabla. Para
 * hacer algo tiene que declarar con qué sombrero, dentro de la transacción:
 *
 *     comoVisitante()  →  SET LOCAL ROLE dk_anon
 *     comoCliente(jwt) →  JWT verificado + set_config('dk.usuario_id') + SET LOCAL ROLE dk_auth
 *
 * Olvidar ese paso no abre nada: deja la consulta sin permisos y falla. El
 * error por omisión es denegar, que es la única forma segura de equivocarse.
 *
 * Quien añada consultas debe usar estas dos funciones. No se exporta el pool.
 */

// El driver necesita WebSocket para transacciones; sobre HTTP solo caben
// consultas sueltas, y aquí todo va en transacción a propósito.
//
// Importa: el driver y `ws` van declarados en `serverComponentsExternalPackages`
// (next.config.js). Si se dejan empaquetar por webpack, la conexión se cae nada
// más abrirse, y el mensaje —«Connection terminated unexpectedly», o bien
// «bufferUtil.mask is not a function»— no menciona en ningún momento que la
// causa sea el empaquetado. Se pierde una tarde buscándolo en el sitio
// equivocado, así que queda escrito aquí.
neonConfig.webSocketConstructor = ws;

let pool: Promise<Pool> | null = null;

function obtenerPool(): Promise<Pool> {
  if (pool) return pool;

  const cadena = process.env.DK_DATABASE_URL;
  if (!cadena) {
    throw new Error(
      'Falta DK_DATABASE_URL. No se debe sustituir por DATABASE_URL: esa cadena ' +
        'pertenece al propietario de la base, que puede saltarse todas las políticas.'
    );
  }
  if (/:\/\/neondb_owner:/.test(cadena)) {
    throw new Error(
      'DK_DATABASE_URL apunta al propietario de la base. La aplicación solo puede ' +
        'conectarse con dk_app. Revisa las variables de entorno del despliegue.'
    );
  }

  // Conexión directa (sin PgBouncer): pocas conexiones por instancia. La
  // identidad viaja con set_config(..., true), que es local a la transacción,
  // así que también sería segura detrás del pooler.
  pool = Promise.resolve(
    new Pool({
      connectionString: cadena.replace('-pooler.', '.'),
      max: 5,
    })
  );
  return pool;
}

/**
 * Abre una transacción y la cierra pase lo que pase.
 *
 * Todo va dentro de una transacción por dos motivos: `SET LOCAL ROLE` solo
 * existe dentro de una, y la conexión viene de PgBouncer en modo transacción,
 * donde el estado de sesión se comparte entre clientes. `LOCAL` garantiza que
 * el rol muere con la transacción y no viaja a la petición siguiente.
 */
async function enTransaccion<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await (await obtenerPool()).connect();
  try {
    await c.query('BEGIN');
    try {
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    }
  } finally {
    // Sin esto, un error deja la conexión fuera del pool y ocupada dentro de
    // una transacción abierta, hasta que Postgres la mata por tiempo.
    c.release();
  }
}

/**
 * Ejecuta como visitante anónimo: quien escanea un QR pegado en una mesa.
 *
 * Con este sombrero solo se ven cartas de restaurantes activos y platos
 * disponibles. Ninguna política de `dk_anon` consulta la identidad, así que no
 * hay nada que suplantar aunque la conexión venga reciclada del pool.
 */
export function comoVisitante<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  return enTransaccion(async (c) => {
    await c.query('SET LOCAL ROLE dk_anon');
    return fn(c);
  });
}

/**
 * Ejecuta como cliente con sesión demostrada (Ruta A, 27/09/2026).
 *
 * 1. El servidor verifica el JWT de Neon Auth (firma EdDSA contra el JWKS de
 *    Neon, emisor, audiencia, caducidad): verificarJwtNeonAuth().
 * 2. El id verificado entra en Postgres con set_config('dk.usuario_id', id,
 *    true): muere con la transacción, no viaja por el pool.
 * 3. SET LOCAL ROLE dk_auth y dk.identidad_actual() confirma que el usuario
 *    existe en neon_auth.user y no está baneado.
 *
 * Por qué no se verifica en Postgres con pg_session_jwt: en Neon el esquema
 * `auth` es de cloud_admin y dk_app no puede recibir USAGE sobre él.
 * Diagnóstico y Ruta B pendiente: SEGURIDAD_SESION_PANEL_RUTA_A_Y_B_2026-09-27.md.
 */
export async function comoCliente<T>(jwt: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const usuarioId = await verificarJwtNeonAuth(jwt);
  if (!usuarioId) throw new SesionNoValida();

  return enTransaccion(async (c) => {
    await c.query("SELECT set_config('dk.usuario_id', $1, true)", [usuarioId]);
    await c.query('SET LOCAL ROLE dk_auth');

    const { rows } = await c.query<{ id: string | null }>('SELECT dk.identidad_actual() AS id');
    if (rows[0]?.id !== usuarioId) {
      console.error('comoCliente: identidad no confirmada por la base (usuario borrado o baneado)');
      throw new SesionNoValida();
    }

    return fn(c);
  });
}

export class SesionNoValida extends Error {
  constructor() {
    super('La sesión no es válida.');
    this.name = 'SesionNoValida';
  }
}

/** True cuando el despliegue tiene cableada la conexión de la aplicación. */
export const HAY_BASE_DE_DATOS = Boolean(process.env.DK_DATABASE_URL);

// ---------------------------------------------------------------------------
// Webhook de Stripe — segunda conexión, con su propio rol (0010)
// ---------------------------------------------------------------------------
//
// dk_webhook es un rol aparte de dk_app, con su propia credencial
// (DK_WEBHOOK_DATABASE_URL): solo sabe convertirse en dk_aprovisionamiento, que
// solo sabe ejecutar dk.aprovisionar_cliente_qr(). Si esta credencial se
// filtrara, quien la tenga puede aprovisionar un cliente falso; no puede leer
// ni una fila de otro cliente, porque no tiene privilegio directo sobre
// ninguna tabla, solo EXECUTE sobre esa única función.

let poolWebhook: Pool | null = null;

function obtenerPoolWebhook(): Pool {
  if (poolWebhook) return poolWebhook;

  const cadena = process.env.DK_WEBHOOK_DATABASE_URL;
  if (!cadena) {
    throw new Error('Falta DK_WEBHOOK_DATABASE_URL.');
  }
  if (/:\/\/neondb_owner:/.test(cadena)) {
    throw new Error(
      'DK_WEBHOOK_DATABASE_URL apunta al propietario de la base. El webhook solo ' +
        'puede conectarse con dk_webhook.'
    );
  }

  poolWebhook = new Pool({ connectionString: cadena });
  return poolWebhook;
}

/** Ejecuta como el rol dedicado al aprovisionamiento tras el pago (0010). */
export function comoAprovisionamiento<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  return (async () => {
    const c = await obtenerPoolWebhook().connect();
    try {
      await c.query('BEGIN');
      try {
        await c.query('SET LOCAL ROLE dk_aprovisionamiento');
        const r = await fn(c);
        await c.query('COMMIT');
        return r;
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw e;
      }
    } finally {
      c.release();
    }
  })();
}

/** True cuando el despliegue tiene cableada la conexión del webhook. */
export const HAY_WEBHOOK_DATABASE = Boolean(process.env.DK_WEBHOOK_DATABASE_URL);
