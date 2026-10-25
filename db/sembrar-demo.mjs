/**
 * Carta de demostración.
 *
 * Crea un restaurante real en la base con su carta y su código de QR, para dos
 * cosas: probar el motor de punta a punta contra Neon, y tener un QR que se
 * pueda enseñar a un cliente potencial sin montar nada.
 *
 * Es idempotente: vuelve a dejar la carta como está definida aquí, así que
 * ejecutarlo dos veces no duplica nada. Y no toca ningún otro restaurante.
 *
 * Uso:  node db/sembrar-demo.mjs <entorno-del-propietario> [--borrar]
 */
import { readFileSync } from 'node:fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const rutaEntorno = process.argv[2];
const borrar = process.argv.includes('--borrar');
if (!rutaEntorno) {
  console.error('Uso: node db/sembrar-demo.mjs <entorno> [--borrar]');
  process.exit(1);
}

const uri = readFileSync(rutaEntorno, 'utf8')
  .split('\n').find((l) => l.startsWith('NEON_DB_DIRECT'))
  .split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');

const SLUG = 'dkitchen-demo';
const CODIGO = 'demo2026';
const CORREO = 'demo@dkitchen.test';

const CARTA = [
  {
    seccion: 'Para empezar',
    platos: [
      ['Croquetas de jamón ibérico', 'Doce unidades, bechamel curada 24 horas.', 9.5, ['GL', 'LE']],
      ['Ensaladilla de la casa', 'Con ventresca de bonito y aceite de oliva virgen extra.', 8.0, ['HU', 'PE']],
      ['Pan de cristal con tomate', 'Tomate rallado y ajo. Servido templado.', 3.5, ['GL']],
    ],
  },
  {
    seccion: 'Principales',
    platos: [
      ['Arroz meloso de carabinero', 'Mínimo dos personas. Precio por comensal.', 24.0, ['CR', 'MU']],
      ['Presa ibérica a la brasa', 'Con puré de patata ahumado y pimientos del piquillo.', 19.5, ['LE']],
      ['Merluza de pincho al pilpil', 'Pescada en el Cantábrico. Según disponibilidad diaria.', 22.0, ['PE', 'AP']],
      ['Risotto de setas de temporada', 'Elaborado con caldo vegetal. Opción sin lácteos bajo petición.', 16.0, ['LE', 'SU']],
    ],
  },
  {
    seccion: 'Postres',
    platos: [
      ['Tarta de queso al horno', 'Cremosa, cuajada al punto.', 6.5, ['HU', 'LE', 'GL']],
      ['Torrija caramelizada', 'Con helado de vainilla bourbon.', 6.0, ['GL', 'HU', 'LE']],
      ['Sorbete de limón al cava', 'Sin lácteos.', 4.5, ['SU']],
    ],
  },
];

const pool = new Pool({ connectionString: uri });

try {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    // Borrar y rehacer es más honesto que intentar reconciliar: así lo que hay
    // en la base es exactamente lo que dice este archivo.
    await c.query('DELETE FROM restaurantes WHERE slug = $1', [SLUG]);

    if (borrar) {
      await c.query('DELETE FROM identidades WHERE email = $1', [CORREO]);
      await c.query('COMMIT');
      console.log('Carta de demostración eliminada.');
      process.exit(0);
    }

    const { rows: [propietario] } = await c.query(
      `INSERT INTO identidades (id, email, nombre, rol)
       VALUES (gen_random_uuid(), $1, 'Demostración DKitchen', 'cliente')
       ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [CORREO]
    );

    const { rows: [restaurante] } = await c.query(
      `INSERT INTO restaurantes (propietario, slug, nombre, plan, activo)
       VALUES ($1, $2, 'Casa Mediterránea', 'ampliado', true)
       RETURNING id`,
      [propietario.id, SLUG]
    );

    for (const [orden, grupo] of CARTA.entries()) {
      const { rows: [seccion] } = await c.query(
        `INSERT INTO menu_secciones (restaurante_id, nombre, orden) VALUES ($1, $2, $3) RETURNING id`,
        [restaurante.id, grupo.seccion, orden]
      );
      for (const [i, [nombre, descripcion, precio, alergenos]] of grupo.platos.entries()) {
        await c.query(
          `INSERT INTO menu_items (restaurante_id, seccion_id, nombre, descripcion, precio, alergenos, orden)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [restaurante.id, seccion.id, nombre, descripcion, precio, alergenos, i]
        );
      }
    }

    await c.query(
      `INSERT INTO codigos_qr (codigo, restaurante_id) VALUES ($1, $2)`,
      [CODIGO, restaurante.id]
    );

    await c.query('COMMIT');

    const platos = CARTA.reduce((n, g) => n + g.platos.length, 0);
    console.log(`Carta sembrada: ${CARTA.length} secciones, ${platos} platos.`);
    console.log(`  QR:    /r/${CODIGO}`);
    console.log(`  Carta: /m/${SLUG}`);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
} finally {
  await pool.end();
}
