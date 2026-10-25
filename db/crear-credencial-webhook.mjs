/**
 * Credencial de conexión del webhook de Stripe.
 *
 * Mismo patrón que db/crear-credencial-app.mjs, para el mismo motivo: el
 * webhook corre como función serverless en Vercel, con la misma exposición
 * pública que el resto del despliegue, así que no puede conectarse con el
 * propietario de la base. Se conecta con dk_webhook, que solo sabe convertirse
 * en dk_aprovisionamiento (0010) y no puede tocar nada más.
 *
 * La contraseña se genera aquí, se asigna, y se escribe UNA sola vez en el
 * archivo de salida, que debe estar fuera del repositorio. Si se pierde, se
 * vuelve a ejecutar este script y se rota.
 *
 * Uso:  node db/crear-credencial-webhook.mjs <entorno-del-propietario> <archivo-de-salida>
 */
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const [rutaEntorno, rutaSalida] = process.argv.slice(2);
if (!rutaEntorno || !rutaSalida) {
  console.error('Uso: node db/crear-credencial-webhook.mjs <entorno> <archivo-de-salida>');
  process.exit(1);
}
if (rutaSalida.includes('/architect-landing-hosteleria/')) {
  console.error('El archivo de salida no puede estar dentro del repositorio.');
  process.exit(1);
}

function leerClave(nombre) {
  const linea = readFileSync(rutaEntorno, 'utf8').split('\n').find((l) => l.startsWith(nombre + '='));
  if (!linea) throw new Error(`No se encontró ${nombre} en el archivo de entorno`);
  return linea.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
}

const uriPropietario = leerClave('NEON_DB_DIRECT');
const clave = randomBytes(32).toString('base64url');

const pool = new Pool({ connectionString: uriPropietario });
try {
  await pool.query(`ALTER ROLE dk_webhook LOGIN PASSWORD '${clave}'`);
  await pool.query(`GRANT CONNECT ON DATABASE neondb TO dk_webhook`);

  const { rows: [r] } = await pool.query(
    `SELECT rolbypassrls, rolsuper, rolinherit FROM pg_roles WHERE rolname = 'dk_webhook'`);
  if (!r) throw new Error('dk_webhook no existe: aplica antes las migraciones');
  if (r.rolbypassrls || r.rolsuper) throw new Error('dk_webhook tiene privilegios que no debería tener');
  if (r.rolinherit) throw new Error('dk_webhook hereda roles: debería ser NOINHERIT');

  const base = new URL(uriPropietario);
  const host = base.hostname;
  const agrupado = host.includes('-pooler') ? host : host.replace(/^(ep-[^.]+)/, '$1-pooler');

  const construir = (h) => `postgresql://dk_webhook:${clave}@${h}${base.pathname}?sslmode=require`;

  writeFileSync(rutaSalida,
    `# Credencial del webhook de Stripe. NO subir al repositorio.\n` +
    `# Generada el ${new Date().toISOString()}\n` +
    `DK_WEBHOOK_DATABASE_URL=${construir(agrupado)}\n`);
  chmodSync(rutaSalida, 0o600);

  console.log('Credencial de dk_webhook creada.');
  console.log('Comprobado: sin BYPASSRLS, sin superusuario, sin herencia.');
} finally {
  await pool.end();
}
