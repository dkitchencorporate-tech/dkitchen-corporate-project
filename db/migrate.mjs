/**
 * Aplicador de migraciones.
 *
 * Reglas que respeta, y por qué:
 *
 *  - Usa la conexión DIRECTA, no la agrupada. PgBouncer trabaja en modo
 *    transacción y rompe el estado de sesión del que depende el DDL.
 *  - Cada migración va en su propia transacción: o entra entera o no entra.
 *  - Lleva registro de lo aplicado, así que repetir la ejecución no hace daño.
 *  - Nunca imprime la cadena de conexión.
 *
 * Uso:  node db/migrate.mjs <ruta-al-archivo-de-entorno> [--dry]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const aquí = dirname(fileURLToPath(import.meta.url));
const rutaEntorno = process.argv[2];
const soloSimular = process.argv.includes('--dry');

if (!rutaEntorno) {
  console.error('Falta la ruta al archivo de entorno.');
  process.exit(1);
}

function leerClave(nombre) {
  const linea = readFileSync(rutaEntorno, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(nombre + '='));
  if (!linea) throw new Error(`No se encontró ${nombre} en el archivo de entorno`);
  return linea.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
}

const pool = new Pool({ connectionString: leerClave('NEON_DB_DIRECT') });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dk_migraciones (
      nombre      text PRIMARY KEY,
      aplicada_en timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query('SELECT nombre FROM dk_migraciones');
  const yaAplicadas = new Set(rows.map((r) => r.nombre));

  const pendientes = readdirSync(join(aquí, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => !yaAplicadas.has(f));

  if (pendientes.length === 0) {
    console.log('Sin migraciones pendientes.');
    process.exit(0);
  }

  console.log(`Pendientes: ${pendientes.join(', ')}`);
  if (soloSimular) {
    console.log('(simulación: no se aplica nada)');
    process.exit(0);
  }

  for (const archivo of pendientes) {
    const sql = readFileSync(join(aquí, 'migrations', archivo), 'utf8');
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query('INSERT INTO dk_migraciones (nombre) VALUES ($1)', [archivo]);
      await cliente.query('COMMIT');
      console.log(`  ✓ ${archivo}`);
    } catch (err) {
      await cliente.query('ROLLBACK');
      console.error(`  ✗ ${archivo}\n    ${err.message}`);
      process.exitCode = 1;
      break;
    } finally {
      cliente.release();
    }
  }
} finally {
  await pool.end();
}
