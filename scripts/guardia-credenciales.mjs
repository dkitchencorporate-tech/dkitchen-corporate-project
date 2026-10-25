/**
 * Guardia de credenciales.
 *
 * La regla inamovible del proyecto es que el despliegue no tenga autoridad
 * sobre la base de datos: se conecta con dk_app, un rol que no puede saltarse
 * las políticas por fila.
 *
 * Esa regla no la sostiene un acuerdo, la sostiene esto. La integración de Neon
 * inyecta en Vercel una quincena de variables que llevan la credencial de
 * `neondb_owner`, que SÍ tiene BYPASSRLS. Basta con que una línea de la
 * aplicación lea una de ellas para que todo el blindaje quede en adorno, y sería
 * un cambio de una línea que pasa desapercibido en cualquier revisión.
 *
 * Por eso se ejecuta en `prebuild`: el despliegue falla antes de existir.
 *
 * Uso:  node scripts/guardia-credenciales.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Variables que transportan la credencial del propietario de la base.
const PROHIBIDAS = [
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL_NO_SSL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_PASSWORD',
  'POSTGRES_USER',
  'POSTGRES_HOST',
  'POSTGRES_DATABASE',
  'PGPASSWORD',
  'PGUSER',
  'PGHOST',
  'PGHOST_UNPOOLED',
  'PGDATABASE',
];

// Restos de la etapa anterior. Si vuelven, vuelven los agujeros que se cerraron.
const ERRADICADAS = [
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'WHOP_',
  'KOMMO_',
  'WOZTELL_',
  'META_ACCESS_TOKEN',
  'WHATSAPP_TOKEN',
];

function archivos(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules' || entrada === '.next' || entrada === '.git') continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ruta)) salida.push(ruta);
  }
  return salida;
}

const hallazgos = [];

for (const ruta of archivos('src')) {
  const lineas = readFileSync(ruta, 'utf8').split('\n');
  lineas.forEach((linea, i) => {
    // Solo lecturas reales del entorno. Nombrar una variable en un comentario
    // —como hace src/lib/db.ts para explicar por qué no la usa— es legítimo.
    for (const v of PROHIBIDAS) {
      if (new RegExp(`process\\.env(\\.${v}\\b|\\[['"\`]${v}['"\`]\\])`).test(linea)) {
        hallazgos.push(`${ruta}:${i + 1}  lee ${v}, que lleva la credencial del propietario`);
      }
    }
    for (const v of ERRADICADAS) {
      if (new RegExp(`process\\.env(\\.${v}|\\[['"\`]${v})`).test(linea)) {
        hallazgos.push(`${ruta}:${i + 1}  lee ${v}, de un servicio retirado del proyecto`);
      }
    }
  });
}

if (hallazgos.length > 0) {
  console.error('\nLa guardia de credenciales ha detenido el build:\n');
  for (const h of hallazgos) console.error('  ✗ ' + h);
  console.error(
    '\nLa aplicación se conecta únicamente con DK_DATABASE_URL (rol dk_app).\n' +
      'Las demás cadenas pertenecen al propietario de la base, que puede saltarse\n' +
      'todas las políticas de seguridad. Ver src/lib/db.ts.\n'
  );
  process.exit(1);
}

console.log('Guardia de credenciales: ninguna lectura prohibida en src/.');
