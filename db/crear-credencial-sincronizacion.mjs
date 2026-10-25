/**
 * Credencial del flujo de sincronización de la caché de resiliencia.
 *
 * Es el mismo patrón que db/crear-credencial-app.mjs, para el mismo motivo:
 * la contraseña se genera aquí, se asigna, y se escribe una sola vez en el
 * archivo de salida, que debe estar fuera del repositorio y —en este caso—
 * fuera también del proyecto de Vercel: esta credencial va a un secreto de
 * GitHub Actions, nunca a una variable de entorno del despliegue.
 *
 * Uso:  node db/crear-credencial-sincronizacion.mjs <entorno-del-propietario> <archivo-de-salida>
 */
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const [rutaEntorno, rutaSalida] = process.argv.slice(2);
if (!rutaEntorno || !rutaSalida) {
  console.error('Uso: node db/crear-credencial-sincronizacion.mjs <entorno> <archivo-de-salida>');
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
  await pool.query(`ALTER ROLE dk_sync LOGIN PASSWORD '${clave}'`);
  await pool.query(`GRANT CONNECT ON DATABASE neondb TO dk_sync`);

  const { rows: [r] } = await pool.query(
    `SELECT rolbypassrls, rolsuper, rolinherit FROM pg_roles WHERE rolname = 'dk_sync'`);
  if (!r) throw new Error('dk_sync no existe: aplica antes las migraciones');
  if (r.rolbypassrls || r.rolsuper) throw new Error('dk_sync tiene privilegios que no debería tener');
  if (r.rolinherit) throw new Error('dk_sync hereda roles: debería ser NOINHERIT');

  const base = new URL(uriPropietario);
  const construir = (h) => `postgresql://dk_sync:${clave}@${h}${base.pathname}?sslmode=require`;

  writeFileSync(rutaSalida,
    `# Credencial de la sincronización de la caché de resiliencia.\n` +
    `# Va a un secreto de GitHub Actions, nunca a Vercel. NO subir al repositorio.\n` +
    `# Generada el ${new Date().toISOString()}\n` +
    `DK_DATABASE_URL=${construir(base.hostname)}\n`);
  chmodSync(rutaSalida, 0o600);

  console.log('Credencial de dk_sync creada.');
  console.log('Comprobado: sin BYPASSRLS, sin superusuario, sin herencia.');
} finally {
  await pool.end();
}
