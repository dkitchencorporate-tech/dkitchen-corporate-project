/**
 * Verificación del blindaje.
 *
 * Comprueba que las políticas hacen lo que dicen, con datos reales y desde el
 * rol con el que se conecta la aplicación. No mira el SQL: lo ejecuta y observa
 * qué pasa. Una política que "se ve bien" pero no bloquea no sirve de nada.
 *
 * Debe poder ejecutarse cada vez que se toque una política, sin pensarlo, y
 * sobre cualquier rama —incluida main— sin dejar rastro: la semilla se borra
 * al empezar y al terminar.
 *
 * Uso:  node db/verificar-blindaje.mjs <entorno-propietario> [entorno-aplicación]
 *
 * Con el segundo argumento ejecuta además la prueba de fuego: abre la misma
 * cadena de conexión que tendrá el despliegue y comprueba que desde ahí no se
 * lee ni una sola fila de cliente.
 */
import { readFileSync } from 'node:fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const rutaEntorno = process.argv[2];
if (!rutaEntorno) {
  console.error('Falta la ruta al archivo de entorno.');
  process.exit(1);
}

const uri = readFileSync(rutaEntorno, 'utf8')
  .split('\n').find((l) => l.startsWith('NEON_DB_DIRECT'))
  .split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');

const pool = new Pool({ connectionString: uri });

// Una consulta colgada no debe convertirse en una espera de cinco minutos ni
// dejar la sesión abierta dentro de una transacción.
pool.on('connect', (c) => {
  c.query("SET statement_timeout = '20s'").catch(() => {});
  c.query("SET idle_in_transaction_session_timeout = '30s'").catch(() => {});
});
pool.on('error', (e) => console.error('  (error del pool) ' + e.message));

let pasan = 0, fallan = 0;

function comprobar(descripcion, condicion, detalle = '') {
  if (condicion) { pasan++; console.log(`  ✓ ${descripcion}`); }
  else { fallan++; console.log(`  ✗ ${descripcion}${detalle ? '\n      ' + detalle : ''}`); }
}

/**
 * Presta una conexión y la devuelve pase lo que pase. Sin esto, un error deja
 * el cliente fuera del pool y pool.end() espera por él indefinidamente.
 */
async function conConexion(fn) {
  const c = await pool.connect();
  try { return await fn(c); }
  finally { c.release(); }
}

/** Ejecuta como un rol concreto dentro de una transacción que siempre se revierte. */
function comoRol(rol, fn) {
  return conConexion(async (c) => {
    await c.query('BEGIN');
    try {
      await c.query(`SET LOCAL ROLE ${rol}`);
      return await fn(c);
    } finally {
      await c.query('ROLLBACK').catch(() => {});
    }
  });
}

/**
 * Espera que una sentencia sea rechazada, y devuelve el motivo.
 *
 * Va sobre un SAVEPOINT porque en PostgreSQL un error aborta la transacción
 * entera: sin esto, la primera denegación envenenaría todas las comprobaciones
 * siguientes, que "pasarían" por el motivo equivocado.
 */
async function debeFallar(c, sql, params = []) {
  await c.query('SAVEPOINT prueba');
  try {
    await c.query(sql, params);
    await c.query('RELEASE SAVEPOINT prueba');
    return null;
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT prueba').catch(() => {});
    return e.message.split('\n')[0];
  }
}

const CORREOS = ["'dueno@prueba.test'", "'otro@prueba.test'"].join(',');

async function limpiar(c) {
  // El orden importa: restaurantes referencia identidades con ON DELETE RESTRICT.
  await c.query(`DELETE FROM restaurantes WHERE propietario IN (SELECT id FROM identidades WHERE email IN (${CORREOS}))`);
  await c.query(`DELETE FROM identidades WHERE email IN (${CORREOS})`);
}

let semilla = null;

try {
  // ---- Semilla ---------------------------------------------------------
  semilla = await conConexion(async (c) => {
    await limpiar(c);
    const ident = (await c.query(
      `INSERT INTO identidades (id,email,nombre,rol) VALUES (gen_random_uuid(),'dueno@prueba.test','Dueño','cliente') RETURNING id`)).rows[0];
    const otro = (await c.query(
      `INSERT INTO identidades (id,email,nombre,rol) VALUES (gen_random_uuid(),'otro@prueba.test','Otro','cliente') RETURNING id`)).rows[0];
    const rest = (await c.query(
      `INSERT INTO restaurantes (propietario,slug,nombre,plan) VALUES ($1,'casa-pepe','Casa Pepe','basico') RETURNING id`, [ident.id])).rows[0];
    const restOculto = (await c.query(
      `INSERT INTO restaurantes (propietario,slug,nombre,activo) VALUES ($1,'cerrado','Cerrado',false) RETURNING id`, [otro.id])).rows[0];
    await c.query(`INSERT INTO menu_items (restaurante_id,nombre,precio,disponible) VALUES ($1,'Croquetas',9.50,true)`, [rest.id]);
    await c.query(`INSERT INTO menu_items (restaurante_id,nombre,precio,disponible) VALUES ($1,'Agotado',5.00,false)`, [rest.id]);
    await c.query(`INSERT INTO menu_items (restaurante_id,nombre,precio) VALUES ($1,'Secreto',1.00)`, [restOculto.id]);
    await c.query(`INSERT INTO codigos_qr (codigo,restaurante_id) VALUES ('abc12345',$1)`, [rest.id]);
    return { ident: ident.id, rest: rest.id };
  });

  console.log('\nRESTRICCIONES DE NEGOCIO');
  await conConexion(async (c) => {
    await c.query('BEGIN');
    try {
      comprobar('un slug con mayúsculas se rechaza',
        !!(await debeFallar(c, `INSERT INTO restaurantes (propietario,slug,nombre) VALUES ($1,'MAL','x')`, [semilla.ident])));
      comprobar('un precio negativo se rechaza',
        !!(await debeFallar(c, `INSERT INTO menu_items (restaurante_id,nombre,precio) VALUES ($1,'x',-1)`, [semilla.rest])));
      comprobar('un código de QR correlativo se rechaza',
        !!(await debeFallar(c, `INSERT INTO codigos_qr (codigo,restaurante_id) VALUES ('1',$1)`, [semilla.rest])));
      comprobar('un nombre de plato vacío se rechaza',
        !!(await debeFallar(c, `INSERT INTO menu_items (restaurante_id,nombre,precio) VALUES ($1,'   ',1)`, [semilla.rest])));
    } finally {
      await c.query('ROLLBACK').catch(() => {});
    }
  });

  console.log('\nROL ANÓNIMO (el visitante que escanea un QR)');
  await comoRol('dk_anon', async (c) => {
    const nombres = (await c.query(`SELECT nombre FROM menu_items ORDER BY nombre`)).rows.map((r) => r.nombre);
    comprobar('ve el plato disponible de un restaurante activo', nombres.includes('Croquetas'));
    comprobar('NO ve un plato marcado como agotado', !nombres.includes('Agotado'));
    comprobar('NO ve la carta de un restaurante inactivo', !nombres.includes('Secreto'));

    const slugs = (await c.query(`SELECT slug FROM restaurantes`)).rows.map((r) => r.slug);
    comprobar('NO ve un restaurante desactivado', !slugs.includes('cerrado'));

    // Aquí ni siquiera llega a las políticas: no tiene permiso sobre la tabla,
    // que es una capa antes. Vale cualquiera de las dos formas de negarlo.
    let idNegado = await debeFallar(c, `SELECT count(*) FROM identidades`);
    if (!idNegado) {
      const { rows } = await c.query(`SELECT count(*)::int n FROM identidades`);
      idNegado = rows[0].n === 0 ? 'sin filas visibles' : null;
    }
    comprobar('NO puede leer la tabla de identidades', !!idNegado, 'devolvió filas');

    const esc = await debeFallar(c, `SELECT * FROM escaneos`);
    comprobar('NO puede leer los escaneos', !!esc, 'devolvió filas');

    const ins = await debeFallar(c, `INSERT INTO escaneos (codigo) VALUES ('abc12345')`);
    comprobar('NO puede insertar escaneos a mano', !!ins, 'la inserción funcionó');

    const aud = await debeFallar(c, `INSERT INTO auditoria (accion) VALUES ('falso')`);
    comprobar('NO puede escribir en la auditoría', !!aud, 'la inserción funcionó');

    const upd = await debeFallar(c, `UPDATE menu_items SET precio = 0 WHERE nombre = 'Croquetas'`);
    comprobar('NO puede cambiar el precio de un plato', !!upd, 'el precio cambió');

    const r = await c.query(`SELECT * FROM dk.resolver_codigo('abc12345','agente','ES')`);
    comprobar('SÍ puede resolver un QR mediante la función',
      r.rows.length === 1 && r.rows[0].slug === 'casa-pepe', JSON.stringify(r.rows));

    const vacio = await c.query(`SELECT * FROM dk.resolver_codigo('noexiste','a','ES')`);
    comprobar('un código inexistente no revela nada', vacio.rows.length === 0);

    const admin = await debeFallar(c, `SELECT dk.es_admin()`);
    comprobar('NO puede preguntar por el rol de administrador', !!admin, 'respondió');
  });

  console.log('\nAISLAMIENTO ENTRE CLIENTES');
  await comoRol('dk_auth', async (c) => {
    // Sin JWT, dk.identidad_actual() es NULL: no debe verse ningún restaurante ajeno.
    const n = (await c.query(`SELECT count(*)::int n FROM restaurantes`)).rows[0].n;
    comprobar('sin sesión verificada no se ve ningún restaurante', n === 0, `vio ${n}`);

    const ni = (await c.query(`SELECT count(*)::int n FROM identidades`)).rows[0].n;
    comprobar('sin sesión verificada no se ve ninguna identidad', ni === 0, `vio ${ni}`);

    const ne = (await c.query(`SELECT count(*)::int n FROM escaneos`)).rows[0].n;
    comprobar('sin sesión verificada no se ve ningún escaneo', ne === 0, `vio ${ne}`);

    const a = await debeFallar(c, `INSERT INTO auditoria (accion) VALUES ('falso')`);
    comprobar('un usuario con sesión tampoco escribe en la auditoría', !!a, 'la inserción funcionó');

    const d = await debeFallar(c, `DELETE FROM auditoria`);
    comprobar('un usuario con sesión no puede borrar la auditoría', !!d, 'el borrado funcionó');

    const rol = await debeFallar(c, `UPDATE identidades SET rol = 'admin'`);
    comprobar('nadie puede ascenderse a administrador', !!rol, 'el ascenso funcionó');

    const prop = await debeFallar(c, `UPDATE restaurantes SET propietario = gen_random_uuid()`);
    comprobar('nadie puede reasignar un restaurante', !!prop, 'la reasignación funcionó');
  });

  console.log('\nPRIVILEGIOS DE LOS ROLES');
  await conConexion(async (c) => {
    const { rows } = await c.query(
      `SELECT rolname, rolbypassrls, rolsuper, rolcreaterole FROM pg_roles
        WHERE rolname IN ('dk_app','dk_anon','dk_auth','dk_sync','dk_sincronizacion',
                          'dk_webhook','dk_aprovisionamiento','neondb_owner')
        ORDER BY 1`);
    comprobar('existen los ocho roles del diseño', rows.length === 8,
      rows.map((r) => r.rolname).join(', '));
    for (const r of rows) {
      if (r.rolname === 'neondb_owner') {
        comprobar('el propietario sí puede saltarse RLS (por eso no lo usa la app)', r.rolbypassrls === true);
      } else {
        comprobar(`${r.rolname} NO puede saltarse RLS`, r.rolbypassrls === false);
        comprobar(`${r.rolname} NO es superusuario ni crea roles`,
          r.rolsuper === false && r.rolcreaterole === false);
      }
    }

    const { rows: [pub] } = await c.query(`SELECT has_schema_privilege('public','public','USAGE') u`);
    comprobar('PUBLIC ya no tiene acceso al esquema public', pub.u === false);

    // La comprobación que de verdad importa de la caché de resiliencia: la
    // capacidad de enumerar todos los códigos de QR no puede llegar al
    // despliegue público por ningún camino de herencia. Si esto alguna vez
    // deja de ser false, el despliegue podría recorrer el catálogo entero de
    // códigos de todos los clientes.
    const { rows: [herencia] } = await c.query(
      `SELECT pg_has_role('dk_app', 'dk_sincronizacion', 'usage') puede`);
    comprobar('dk_app NO puede adoptar dk_sincronizacion (la caché no llega al despliegue)',
      herencia.puede === false);

    const { rows: [herenciaSync] } = await c.query(
      `SELECT pg_has_role('dk_sync', 'dk_anon', 'usage') anon,
              pg_has_role('dk_sync', 'dk_auth', 'usage') auth`);
    comprobar('dk_sync no hereda dk_anon ni dk_auth: solo sabe ser dk_sincronizacion',
      herenciaSync.anon === false && herenciaSync.auth === false);

    // El aprovisionamiento (creación de identidades y restaurantes saltándose
    // el INSERT que ningún rol de aplicación tiene) es tan sensible como la
    // caché de resiliencia: no puede llegar al despliegue público por ningún
    // camino de herencia.
    const { rows: [herenciaApp] } = await c.query(
      `SELECT pg_has_role('dk_app', 'dk_aprovisionamiento', 'usage') puede`);
    comprobar('dk_app NO puede adoptar dk_aprovisionamiento (el alta de clientes no llega al despliegue público)',
      herenciaApp.puede === false);

    const { rows: [herenciaWebhook] } = await c.query(
      `SELECT pg_has_role('dk_webhook', 'dk_anon', 'usage') anon,
              pg_has_role('dk_webhook', 'dk_auth', 'usage') auth,
              pg_has_role('dk_webhook', 'dk_sincronizacion', 'usage') sync`);
    comprobar('dk_webhook no hereda dk_anon, dk_auth ni dk_sincronizacion: solo sabe ser dk_aprovisionamiento',
      herenciaWebhook.anon === false && herenciaWebhook.auth === false && herenciaWebhook.sync === false);

    // Una tabla sin RLS forzado es una puerta abierta esperando a que alguien
    // se conecte con el rol equivocado. Se comprueba por barrido, no de memoria.
    //
    // Corregido el 20/09/2026: este barrido solo miraba `public`, y una tabla
    // de la migración 0005 se creó en `dk` sin RLS. El barrido dijo "todas las
    // tablas tienen RLS" con una tabla sin blindar delante, porque nunca la
    // miró. Ahora cubre los dos esquemas con datos —los mismos que ya cubre
    // el barrido de funciones SECURITY DEFINER, un poco más abajo—, para que
    // una tabla nueva en cualquiera de los dos no pueda repetir el mismo hueco.
    const { rows: sinRls } = await c.query(`
      SELECT n.nspname || '.' || c.relname AS tabla
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname IN ('public', 'dk') AND c.relkind = 'r'
         AND c.relname <> 'dk_migraciones'
         AND (c.relrowsecurity = false OR c.relforcerowsecurity = false)`);
    comprobar('todas las tablas tienen RLS activado y forzado', sinRls.length === 0,
      'sin blindar: ' + sinRls.map((r) => r.tabla).join(', '));

    // Una función SECURITY DEFINER sin search_path fijo es la vía clásica de
    // escalada: basta con crear un objeto que se resuelva antes.
    const { rows: sinRuta } = await c.query(`
      SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname IN ('dk','public') AND p.prosecdef
         AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) cfg
                         WHERE cfg LIKE 'search_path=%')`);
    comprobar('toda función SECURITY DEFINER fija su search_path', sinRuta.length === 0,
      'sin fijar: ' + sinRuta.map((r) => r.proname).join(', '));
  });

  console.log('\nCACHÉ DE RESILIENCIA (aislamiento de dk_sincronizacion)');
  await comoRol('dk_anon', async (c) => {
    const negado = await debeFallar(c, `SELECT * FROM dk.listar_qr_activos()`);
    comprobar('un visitante anónimo NO puede enumerar los códigos de QR', !!negado, 'devolvió filas');
  });
  await comoRol('dk_auth', async (c) => {
    const negado = await debeFallar(c, `SELECT * FROM dk.listar_qr_activos()`);
    comprobar('un cliente con sesión NO puede enumerar los códigos de QR', !!negado, 'devolvió filas');
  });
  await comoRol('dk_sincronizacion', async (c) => {
    const r = await c.query(`SELECT codigo, slug FROM dk.listar_qr_activos() WHERE codigo = 'abc12345'`);
    comprobar('dk_sincronizacion sí puede enumerar los códigos activos',
      r.rows.length === 1 && r.rows[0].slug === 'casa-pepe');
  });

  console.log('\nAPROVISIONAMIENTO TRAS EL PAGO (dk.aprovisionar_cliente_qr)');
  await comoRol('dk_anon', async (c) => {
    const negado = await debeFallar(c,
      `SELECT * FROM dk.aprovisionar_cliente_qr('evt_falso', gen_random_uuid(), 'x@x.test', 'X', 'basico', 'X', 'x', 'cus_x', 'sub_x')`);
    comprobar('un visitante anónimo NO puede aprovisionar clientes', !!negado, 'la llamada funcionó');
  });
  await comoRol('dk_auth', async (c) => {
    const negado = await debeFallar(c,
      `SELECT * FROM dk.aprovisionar_cliente_qr('evt_falso', gen_random_uuid(), 'x@x.test', 'X', 'basico', 'X', 'x', 'cus_x', 'sub_x')`);
    comprobar('un cliente con sesión NO puede aprovisionar clientes', !!negado, 'la llamada funcionó');
  });
  await comoRol('dk_aprovisionamiento', async (c) => {
    const idCliente = 'a0000000-0000-4000-8000-000000000001';
    const evento = 'evt_verificacion_' + Math.random().toString(36).slice(2);

    const { rows: [alta] } = await c.query(
      `SELECT * FROM dk.aprovisionar_cliente_qr($1, $2, 'cliente@prueba.test', 'Cliente Prueba', 'basico', 'Restaurante Prueba', 'restaurante-prueba', 'cus_prueba', 'sub_prueba')`,
      [evento, idCliente]);
    comprobar('dk_aprovisionamiento crea identidad + restaurante + QR en un solo paso',
      !!alta && alta.slug === 'restaurante-prueba');

    // dk_aprovisionamiento solo tiene USAGE sobre el esquema dk: no puede leer
    // `identidades` ni `codigos_qr` directamente, solo a través de la función.
    // Se vuelve al rol de conexión (el propietario) para comprobar el efecto.
    await c.query('RESET ROLE');

    const { rows: [ident] } = await c.query(`SELECT email FROM identidades WHERE id = $1`, [idCliente]);
    comprobar('la identidad queda creada con el correo del pago', ident?.email === 'cliente@prueba.test');

    const { rows: [codigo] } = await c.query(
      `SELECT count(*)::int n FROM codigos_qr WHERE restaurante_id = $1`, [alta.restaurante_id]);
    comprobar('se genera un código de QR para el restaurante nuevo', codigo.n === 1);

    await c.query('SET LOCAL ROLE dk_aprovisionamiento');

    // Reintento del mismo evento (Stripe reentrega webhooks): debe devolver el
    // mismo restaurante, nunca crear un segundo.
    const { rows: [reintento] } = await c.query(
      `SELECT * FROM dk.aprovisionar_cliente_qr($1, $2, 'cliente@prueba.test', 'Cliente Prueba', 'basico', 'Restaurante Prueba', 'restaurante-prueba', 'cus_prueba', 'sub_prueba')`,
      [evento, idCliente]);
    comprobar('reintentar el mismo evento de Stripe no duplica el restaurante',
      reintento.restaurante_id === alta.restaurante_id);

    await c.query('RESET ROLE');

    const { rows: [total] } = await c.query(
      `SELECT count(*)::int n FROM restaurantes WHERE propietario = $1`, [idCliente]);
    comprobar('sigue existiendo un único restaurante tras el reintento', total.n === 1);
  });

  console.log('\nFRENO DE FRECUENCIA (dk.limite_superado)');
  {
    // Con una clave dedicada, para no interferir con contadores reales que
    // ya pudiera haber en la tabla por tráfico de verdad.
    const clave = 'verificacion:' + Math.random().toString(36).slice(2);

    await comoRol('dk_anon', async (c) => {
      const t1 = await debeFallar(c, `SELECT * FROM limite_frecuencia`);
      comprobar('dk_anon no puede leer la tabla de contadores directamente', !!t1, 'devolvió filas');

      let superado = false;
      for (let i = 0; i < 4; i++) {
        const { rows } = await c.query(`SELECT dk.limite_superado($1, 3, interval '1 minute') AS s`, [clave]);
        superado = rows[0].s;
      }
      comprobar('el cuarto intento supera un límite de 3', superado === true);
    });

    await comoRol('dk_auth', async (c) => {
      const t2 = await debeFallar(c, `INSERT INTO limite_frecuencia (clave) VALUES ('intento-directo')`);
      comprobar('dk_auth no puede escribir en la tabla de contadores directamente', !!t2, 'la inserción funcionó');
    });

    await conConexion((c) => c.query(`DELETE FROM limite_frecuencia WHERE clave = $1`, [clave]));
  }

  // ---- Prueba de fuego --------------------------------------------------
  // Todo lo anterior se ejecuta desde el propietario adoptando roles. Esto es
  // distinto: es la cadena de conexión real del despliegue, tal cual, sin
  // ayudas. Si algo se lee desde aquí, la regla inamovible está rota.
  const rutaApp = process.argv[3];
  if (rutaApp) {
    console.log('\nPRUEBA DE FUEGO (la cadena que tendrá el despliegue)');
    const uriApp = readFileSync(rutaApp, 'utf8')
      .split('\n').find((l) => l.startsWith('DATABASE_URL='))
      .split('=').slice(1).join('=').trim();
    const appPool = new Pool({ connectionString: uriApp });
    try {
      const quien = (await appPool.query(`SELECT current_user u, pg_has_role(current_user,'neondb_owner','member') o`)).rows[0];
      comprobar('el despliegue se conecta como dk_app, no como el propietario',
        quien.u === 'dk_app' && quien.o === false, `conectado como ${quien.u}`);

      for (const tabla of ['identidades', 'restaurantes', 'menu_items', 'escaneos', 'auditoria', 'codigos_qr']) {
        let negado = null;
        try { await appPool.query(`SELECT count(*) FROM ${tabla}`); }
        catch (e) { negado = e.message.split('\n')[0]; }
        comprobar(`sin adoptar rol, no puede tocar ${tabla}`, !!negado, 'la consulta respondió');
      }

      // Y con el sombrero puesto sí funciona: el blindaje no rompe el producto.
      const c = await appPool.connect();
      try {
        await c.query('BEGIN');
        await c.query('SET LOCAL ROLE dk_anon');
        const r = await c.query(`SELECT * FROM dk.resolver_codigo('abc12345','prueba','ES')`);
        comprobar('adoptando dk_anon sí resuelve un QR', r.rows.length === 1);
        const id = await debeFallar(c, `SELECT count(*) FROM identidades`);
        comprobar('adoptando dk_anon sigue sin ver identidades', !!id, 'respondió');
        await c.query('ROLLBACK');
      } finally { c.release(); }
    } finally {
      await appPool.end();
    }
  }

  console.log(`\n${pasan} correctas, ${fallan} fallidas`);
  if (!rutaApp) console.log('(prueba de fuego omitida: no se pasó el entorno de la aplicación)');
  process.exitCode = fallan === 0 ? 0 : 1;
} catch (err) {
  console.error('\nLa verificación se interrumpió: ' + err.message);
  process.exitCode = 1;
} finally {
  if (semilla) {
    await conConexion(limpiar).catch((e) => console.error('  (no se pudo limpiar) ' + e.message));
  }
  await pool.end();
}
