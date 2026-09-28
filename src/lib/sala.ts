import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { comoCliente, comoVisitante } from '@/lib/db';

/**
 * Módulos de Sala (0027). Frontera con el Núcleo: el cliente final nunca pide
 * desde la carta; aquí solo el CAMARERO registra lo que pide cada mesa y se
 * envía al TPV del local (que factura). Sin cocina, tickets, pagos ni
 * historial de ventas (los registros se purgan a los 30 días, sin importes).
 */

export interface Mesa {
  id: string; numero: string; zona: string; forma: 'cuadrada' | 'redonda' | 'rectangular';
  plazas: number; x: number; y: number; camareroId: string | null;
}
export interface Camarero { id: string; nombre: string; activo: boolean; ultimoAcceso: string | null }

export const huellaToken = (token: string) => createHash('sha256').update(token).digest('hex');

// ------------------------------------------------------------------ dueño
export async function listarMesas(jwt: string, restauranteId: string): Promise<Mesa[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT id, numero, zona, forma, plazas, x, y, camarero_id FROM mesas WHERE restaurante_id = $1 ORDER BY zona, numero', [restauranteId]);
    return rows.map((m) => ({ id: m.id, numero: m.numero, zona: m.zona, forma: m.forma, plazas: m.plazas, x: Number(m.x), y: Number(m.y), camareroId: m.camarero_id }));
  });
}

export async function guardarMesa(jwt: string, restauranteId: string, m: Omit<Mesa, 'id'> & { id?: string }) {
  await comoCliente(jwt, async (c) => {
    if (m.id) {
      await c.query('UPDATE mesas SET numero=$2, zona=$3, forma=$4, plazas=$5, x=$6, y=$7, camarero_id=$8 WHERE id=$1',
        [m.id, m.numero, m.zona, m.forma, m.plazas, m.x, m.y, m.camareroId]);
    } else {
      await c.query('INSERT INTO mesas (restaurante_id, numero, zona, forma, plazas, x, y, camarero_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [restauranteId, m.numero, m.zona, m.forma, m.plazas, m.x, m.y, m.camareroId]);
    }
  });
}

export async function eliminarMesa(jwt: string, id: string) {
  await comoCliente(jwt, (c) => c.query('DELETE FROM mesas WHERE id = $1', [id]));
}

export async function listarCamareros(jwt: string, restauranteId: string): Promise<Camarero[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT id, nombre, activo, ultimo_acceso FROM camareros WHERE restaurante_id = $1 ORDER BY activo DESC, nombre', [restauranteId]);
    return rows.map((r) => ({ id: r.id, nombre: r.nombre, activo: r.activo, ultimoAcceso: r.ultimo_acceso ? new Date(r.ultimo_acceso).toISOString() : null }));
  });
}

/** Crea el acceso y devuelve el token UNA sola vez (en la base solo queda su huella). */
export async function crearCamarero(jwt: string, nombre: string): Promise<string> {
  const token = randomBytes(24).toString('base64url');
  await comoCliente(jwt, (c) => c.query('SELECT dk.crear_camarero($1, $2)', [nombre, huellaToken(token)]));
  return token;
}

export async function desactivarCamarero(jwt: string, id: string) {
  await comoCliente(jwt, (c) => c.query('UPDATE camareros SET activo = false WHERE id = $1', [id]));
}

export async function estadoConexionTpv(jwt: string): Promise<{ proveedor: string; activa: boolean; ultimoEnvio: string | null; ultimoError: string | null } | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.estado_conexion_tpv_mia()');
    const r = rows[0];
    return r ? { proveedor: r.proveedor, activa: r.activa, ultimoEnvio: r.ultimo_envio ? new Date(r.ultimo_envio).toISOString() : null, ultimoError: r.ultimo_error } : null;
  });
}

// --------------------------------------------------------------- camarero
export async function contextoSala(token: string) {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.sala_contexto($1) AS x', [huellaToken(token)]);
    return rows[0]?.x ?? null;
  });
}

export async function atenderLlamadaSala(token: string, llamadaId: string): Promise<boolean> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.sala_atender($1, $2) AS ok', [huellaToken(token), llamadaId]);
    return rows[0]?.ok === true;
  });
}

export async function registrarSala(token: string, mesa: string, lineas: { plato_id: string; cantidad: number; nota?: string }[]): Promise<string | null> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.sala_registrar($1, $2, $3::jsonb) AS id', [huellaToken(token), mesa, JSON.stringify(lineas)]);
    return rows[0]?.id ?? null;
  });
}

export async function destinoTpv(token: string, registroId: string) {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.sala_destino_tpv($1, $2)', [huellaToken(token), registroId]);
    return rows[0] ?? null;
  });
}

export async function resultadoTpv(token: string, registroId: string, ok: boolean, detalle: string) {
  await comoVisitante((c) => c.query('SELECT dk.sala_resultado_tpv($1, $2, $3, $4)', [huellaToken(token), registroId, ok, detalle]));
}

// ---------------------------------------------------------------- plano completo (0028)
export type TipoElemento = 'pared' | 'division' | 'barra' | 'puerta' | 'zona';
export interface ElementoPlano {
  id?: string; tipo: TipoElemento; x: number; y: number; ancho: number; alto: number;
  etiqueta: string | null; color: string | null; camareroId: string | null;
}
export interface MesaPlano extends Omit<Mesa, 'id'> { id?: string; ancho: number; alto: number }

export async function cargarPlano(jwt: string, restauranteId: string): Promise<{ mesas: (MesaPlano & { id: string })[]; elementos: ElementoPlano[] }> {
  return comoCliente(jwt, async (c) => {
    const [m, e] = await Promise.all([
      c.query('SELECT id, numero, zona, forma, plazas, x, y, ancho, alto, camarero_id FROM mesas WHERE restaurante_id = $1 ORDER BY zona, numero', [restauranteId]),
      c.query('SELECT id, tipo, x, y, ancho, alto, etiqueta, color, camarero_id FROM elementos_plano WHERE restaurante_id = $1', [restauranteId]),
    ]);
    return {
      mesas: m.rows.map((r) => ({ id: r.id, numero: r.numero, zona: r.zona, forma: r.forma, plazas: r.plazas, x: Number(r.x), y: Number(r.y), ancho: Number(r.ancho), alto: Number(r.alto), camareroId: r.camarero_id })),
      elementos: e.rows.map((r) => ({ id: r.id, tipo: r.tipo, x: Number(r.x), y: Number(r.y), ancho: Number(r.ancho), alto: Number(r.alto), etiqueta: r.etiqueta, color: r.color, camareroId: r.camarero_id })),
    };
  });
}

/**
 * Guarda el plano entero en UNA transacción (antes se guardaba mesa a mesa en
 * cada arrastre y el panel se recargaba entero: en móvil agotaba la memoria).
 * Las mesas que ya no están se borran; los elementos se reemplazan.
 */
export async function guardarPlano(jwt: string, restauranteId: string, mesas: MesaPlano[], elementos: ElementoPlano[]) {
  await comoCliente(jwt, async (c) => {
    const conservar = mesas.filter((m) => m.id).map((m) => m.id);
    await c.query('DELETE FROM mesas WHERE restaurante_id = $1 AND NOT (id = ANY($2::uuid[]))', [restauranteId, conservar]);
    for (const m of mesas) {
      const v = [m.numero, m.zona, m.forma, m.plazas, m.x, m.y, m.ancho, m.alto, m.camareroId];
      if (m.id) await c.query('UPDATE mesas SET numero=$2, zona=$3, forma=$4, plazas=$5, x=$6, y=$7, ancho=$8, alto=$9, camarero_id=$10 WHERE id=$1', [m.id, ...v]);
      else await c.query('INSERT INTO mesas (restaurante_id, numero, zona, forma, plazas, x, y, ancho, alto, camarero_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [restauranteId, ...v]);
    }
    await c.query('DELETE FROM elementos_plano WHERE restaurante_id = $1', [restauranteId]);
    for (const e of elementos) {
      await c.query('INSERT INTO elementos_plano (restaurante_id, tipo, x, y, ancho, alto, etiqueta, color, camarero_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [restauranteId, e.tipo, e.x, e.y, e.ancho, e.alto, e.etiqueta, e.color, e.camareroId]);
    }
  });
}

export interface FilaInforme { camareroId: string; nombre: string; comandas: number; lineas: number; mesas: number; llamadas: number; respuestaMediaSeg: number | null }

export async function informeCamareros(jwt: string, dias: number): Promise<FilaInforme[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.informe_camareros((current_date - $1::int))', [dias]);
    return rows.map((r) => ({
      camareroId: r.camarero_id, nombre: r.nombre, comandas: Number(r.comandas), lineas: Number(r.lineas), mesas: Number(r.mesas),
      llamadas: Number(r.llamadas_atendidas), respuestaMediaSeg: r.respuesta_media_seg === null ? null : Number(r.respuesta_media_seg),
    }));
  });
}
