/**
 * Escritor de la caché de resiliencia.
 *
 * ESTE SCRIPT NUNCA SE EJECUTA DENTRO DEL DESPLIEGUE.
 *
 * Es la mitad que faltaba de src/lib/cache-resiliencia.ts. Necesita un token
 * de Vercel con capacidad de escritura sobre Global Config, y Vercel no
 * ofrece ninguna forma de acotar un token solo a esa capacidad: el más
 * restringido sigue pudiendo tocar despliegues, dominios y variables de
 * entorno del proyecto. Meter un token así dentro de las funciones públicas
 * que atienden a cualquier visitante repetiría exactamente el fallo que se
 * cerró con Neon —un despliegue con más autoridad de la que necesita para
 * responder una petición—, aplicado a Vercel en vez de a la base de datos.
 *
 * Por eso este script corre en GitHub Actions
 * (.github/workflows/sincronizar-cache-resiliencia.yml), no en Vercel: el
 * token con capacidad de escritura vive en un secreto de GitHub, nunca en una
 * variable de entorno del proyecto de Vercel, así que nunca es alcanzable
 * desde ninguna ruta pública de la aplicación.
 *
 * Lo que lee de Neon es, en esencia, lo mismo que un visitante anónimo ya
 * puede ver —restaurantes activos y su carta—, más una capacidad que
 * deliberadamente NINGÚN rol público tiene: enumerar todos los códigos de QR
 * activos de todos los restaurantes a la vez. Por eso corre con dk_sync
 * (migración 0007), un rol propio que solo sabe convertirse en
 * dk_sincronizacion y no hereda dk_anon ni dk_auth. dk_app —el rol de la
 * aplicación pública— no es miembro de dk_sincronizacion ni puede llegar a
 * serlo por herencia: esta capacidad no existe desde ninguna ruta pública.
 *
 * Uso:  node db/sincronizar-cache-resiliencia.mjs
 * Variables de entorno requeridas:
 *   DK_DATABASE_URL             — credencial de dk_sync (db/crear-credencial-
 *                                 sincronizacion.mjs), NUNCA la de dk_app
 *   VERCEL_TOKEN                — con capacidad de escribir en Global Config
 *   VERCEL_TEAM_ID              — equipo al que pertenece el proyecto
 *   GLOBAL_CONFIG_ID            — id del Global Config a sincronizar
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

function requerido(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

const DK_DATABASE_URL = requerido('DK_DATABASE_URL');
const VERCEL_TOKEN = requerido('VERCEL_TOKEN');
const VERCEL_TEAM_ID = requerido('VERCEL_TEAM_ID');
const GLOBAL_CONFIG_ID = requerido('GLOBAL_CONFIG_ID');

const pool = new Pool({ connectionString: DK_DATABASE_URL });

/** Mismo patrón que comoVisitante() en src/lib/db.ts, con el rol dedicado. */
async function comoSincronizacion(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    try {
      await c.query('SET LOCAL ROLE dk_sincronizacion');
      return await fn(c);
    } finally {
      await c.query('ROLLBACK').catch(() => {});
    }
  } finally {
    c.release();
  }
}

async function leerInstantanea() {
  return comoSincronizacion(async (c) => {
    const { rows: restaurantes } = await c.query(
      `SELECT id, slug, nombre, logo_url FROM restaurantes`
    );

    const items = [];

    for (const r of restaurantes) {
      const { rows: secciones } = await c.query(
        'SELECT id, nombre FROM menu_secciones WHERE restaurante_id = $1 ORDER BY orden, nombre',
        [r.id]
      );
      const { rows: platos } = await c.query(
        `SELECT id, seccion_id, nombre, descripcion, precio, foto_url, alergenos
           FROM menu_items WHERE restaurante_id = $1 ORDER BY orden, nombre`,
        [r.id]
      );

      const enCarta = (p) => ({
        id: p.id,
        seccionId: p.seccion_id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        fotoUrl: p.foto_url,
        alergenos: p.alergenos ?? [],
      });

      const carta = {
        slug: r.slug,
        nombre: r.nombre,
        logoUrl: r.logo_url,
        secciones: secciones
          .map((s) => ({
            id: s.id,
            nombre: s.nombre,
            platos: platos.filter((p) => p.seccion_id === s.id).map(enCarta),
          }))
          .filter((s) => s.platos.length > 0),
        sueltos: platos.filter((p) => p.seccion_id === null).map(enCarta),
      };

      items.push({ operation: 'upsert', key: `carta-${r.slug}`, value: carta });
    }

    // Vía la función dedicada, no una consulta directa a codigos_qr: es la
    // única forma en la que dk_sincronizacion puede ver esta lista, y la
    // única que existe en toda la base para enumerar códigos de más de un
    // restaurante a la vez.
    const { rows: codigos } = await c.query(`SELECT codigo, slug FROM dk.listar_qr_activos()`);

    for (const c of codigos) {
      items.push({ operation: 'upsert', key: `qr-${c.codigo}`, value: { slug: c.slug } });
    }

    // Restaurantes desactivados o códigos desactivados desde la última
    // sincronización: se retiran del espejo, no solo se dejan de añadir.
    // Sin esto, un restaurante que se da de baja seguiría siendo accesible
    // por la caché indefinidamente si Neon fallara después.
    const activosAhora = new Set(restaurantes.map((r) => `carta-${r.slug}`));
    const codigosActivosAhora = new Set(codigos.map((c) => `qr-${c.codigo}`));

    return { items, activosAhora, codigosActivosAhora };
  });
}

async function itemsActualesEnGlobalConfig() {
  const resp = await fetch(
    `https://api.vercel.com/v1/global-config/${GLOBAL_CONFIG_ID}/items?teamId=${VERCEL_TEAM_ID}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  );
  if (!resp.ok) throw new Error(`No se pudo leer el Global Config actual: HTTP ${resp.status}`);
  return resp.json();
}

async function escribirItems(items) {
  if (items.length === 0) return;
  // 100 operaciones por llamada, generoso para el volumen actual y con margen.
  const LOTE = 100;
  for (let i = 0; i < items.length; i += LOTE) {
    const lote = items.slice(i, i + LOTE);
    const resp = await fetch(
      `https://api.vercel.com/v1/global-config/${GLOBAL_CONFIG_ID}/items?teamId=${VERCEL_TEAM_ID}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: lote }),
      }
    );
    if (!resp.ok) {
      const cuerpo = await resp.text();
      throw new Error(`Fallo al escribir en Global Config: HTTP ${resp.status} — ${cuerpo}`);
    }
  }
}

try {
  const { items, activosAhora, codigosActivosAhora } = await leerInstantanea();

  const actuales = await itemsActualesEnGlobalConfig();
  const clavesHuerfanas = Object.keys(actuales).filter((k) => {
    if (k.startsWith('carta-')) return !activosAhora.has(k);
    if (k.startsWith('qr-')) return !codigosActivosAhora.has(k);
    return false;
  });

  for (const clave of clavesHuerfanas) {
    items.push({ operation: 'delete', key: clave });
  }

  await escribirItems(items);

  console.log(
    `Sincronizado: ${activosAhora.size} restaurantes, ${codigosActivosAhora.size} códigos activos, ` +
      `${clavesHuerfanas.length} claves retiradas.`
  );
} finally {
  await pool.end();
}
