/**
 * Credencial de conexión de la aplicación.
 *
 * Esto es lo que cierra la regla inamovible: el despliegue no se conecta con el
 * propietario de la base —que tiene BYPASSRLS y volvería decorativa cada
 * política— sino con dk_app, que no puede saltarse nada.
 *
 * La contraseña se genera aquí, se asigna, y se escribe UNA sola vez en el
 * archivo de salida, que debe estar fuera del repositorio. No se imprime en
 * pantalla, no se registra y no vuelve a poder consultarse: si se pierde, se
 * vuelve a ejecutar este script y se rota.
 *
 * Uso:  node db/crear-credencial-app.mjs <entorno-del-propietario> <archivo-de-salida>
 */
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const [rutaEntorno, rutaSalida] = process.argv.slice(2);
if (!rutaEntorno || !rutaSalida) {
  console.error('Uso: node db/crear-credencial-app.mjs <entorno> <archivo-de-salida>');
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

// 32 bytes en base64url: sin caracteres que haya que escapar en una URL.
const clave = randomBytes(32).toString('base64url');

const pool = new Pool({ connectionString: uriPropietario });
try {
  // La contraseña va como literal porque ALTER ROLE no admite parámetros. Se
  // genera aquí con base64url, así que no contiene comillas.
  await pool.query(`ALTER ROLE dk_app LOGIN PASSWORD '${clave}'`);
  await pool.query(`GRANT CONNECT ON DATABASE neondb TO dk_app`);

  // Comprobación inmediata: que el rol que acabamos de habilitar no pueda
  // saltarse RLS. Si esto no se cumple, no se escribe ninguna credencial.
  const { rows: [r] } = await pool.query(
    `SELECT rolbypassrls, rolsuper, rolinherit FROM pg_roles WHERE rolname = 'dk_app'`);
  if (!r) throw new Error('dk_app no existe: aplica antes las migraciones');
  if (r.rolbypassrls || r.rolsuper) throw new Error('dk_app tiene privilegios que no debería tener');
  if (r.rolinherit) throw new Error('dk_app hereda roles: debería ser NOINHERIT');

  const base = new URL(uriPropietario);
  const host = base.hostname;
  const agrupado = host.includes('-pooler') ? host : host.replace(/^(ep-[^.]+)/, '$1-pooler');

  const construir = (h) => `postgresql://dk_app:${clave}@${h}${base.pathname}?sslmode=require`;

  writeFileSync(rutaSalida,
    `# Credencial de la aplicación. NO subir al repositorio.\n` +
    `# Generada el ${new Date().toISOString()}\n` +
    `DATABASE_URL=${construir(agrupado)}\n` +
    `DATABASE_URL_UNPOOLED=${construir(host.replace('-pooler', ''))}\n`);
  chmodSync(rutaSalida, 0o600);

  console.log('Credencial de dk_app creada y escrita en el archivo indicado.');
  console.log('Comprobado: sin BYPASSRLS, sin superusuario, sin herencia.');
} finally {
  await pool.end();
}
