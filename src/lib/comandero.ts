import 'server-only';
import { comoCliente, comoVisitante } from '@/lib/db';
import { huellaToken } from '@/lib/sala';

/**
 * Comandero (0045): cuenta por mesa, rondas, mesas en vivo e informes.
 * Frontera Verifactu: NO es un sistema de facturación. La cuenta no se numera,
 * no se cobra y no se imprime; «cerrar» = cobrada fuera, en el TPV del local.
 * Los importes los calcula la base (dk.precio_vigente), nunca el navegador.
 */

export interface LineaCuenta {
  id: string; registro_id: string | null; plato_id: string | null; nombre: string; cantidad: number; precio: number;
  nota: string; creada_en: string; camarero: string | null; anulada: boolean; motivo_anulacion: string | null;
}
export interface Ronda { id: string; estado: 'registrado' | 'enviado_tpv' | 'error_tpv'; creado_en: string; revisado_en: string | null; camarero: string | null }
export interface Cuenta {
  id: string; mesa: string; comensales: number | null; estado: 'abierta' | 'cerrada' | 'anulada';
  abierta_en: string; cerrada_en: string | null; motivo_anulacion: string | null; minutos: number;
  abierta_por: string | null; importe: number; lineas: LineaCuenta[]; rondas: Ronda[]; aviso: string;
}
export interface CuentaResumen { id: string; mesa: string; comensales: number | null; abierta_en: string; minutos: number; abierta_por: string | null; importe: number; rondas: number }
export interface RondaEntrante {
  id: string; mesa: string; cuenta_id: string | null; estado: Ronda['estado']; creado_en: string; detalle_tpv: string | null; camarero: string | null;
  lineas: { nombre: string; cantidad: number; nota: string }[];
}
export interface MesasEnVivo {
  tpv: boolean; pro: boolean;
  mesas: { id: string; numero: string; zona: string; forma: string; plazas: number; x: number; y: number; ancho: number; alto: number; camarero: string | null }[];
  cuentas: CuentaResumen[];
  rondas_entrantes: RondaEntrante[];
}
export interface ResumenSala {
  aviso: string; desde: string; hasta: string; pro: boolean;
  cuentas_cerradas: number; cuentas_abiertas: number; cuentas_anuladas: number;
  importe: number; comensales: number; importe_medio: number; minutos_medios: number;
  lineas_anuladas: number; importe_anulado: number;
  por_mesa: { mesa: string; cuentas: number; importe: number }[];
  ranking_camareros: { camarero_id: string | null; nombre: string; cuentas: number; importe: number; comensales: number }[] | null;
}
export interface FilaCuenta {
  fecha: string; mesa: string; abiertaEn: string; cerradaEn: string | null; minutos: number; estado: string; comensales: number | null;
  camareroApertura: string | null; camareroCierre: string | null; rondas: number; lineas: number; importe: number; importeAnulado: number; motivoAnulacion: string | null;
}
export interface FilaAnulacion { anuladaEn: string; tipo: 'linea' | 'cuenta'; mesa: string; plato: string | null; cantidad: number | null; importe: number; camarero: string | null; motivo: string }

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const fecha = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

// --------------------------------------------------------------- camarero (token)
export async function abrirCuenta(token: string, mesa: string, comensales: number | null): Promise<string | null> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.sala_abrir_cuenta($1, $2, $3) AS id', [huellaToken(token), mesa, comensales]);
    return rows[0]?.id ?? null;
  });
}

export async function cuentaDeMesa(token: string, mesa: string): Promise<Cuenta | null> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.sala_cuenta($1, $2) AS j', [huellaToken(token), mesa]);
    return rows[0]?.j ?? null;
  });
}

export async function cerrarCuentaCamarero(token: string, cuentaId: string): Promise<boolean> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.sala_cerrar_cuenta($1, $2) AS ok', [huellaToken(token), cuentaId]);
    return rows[0]?.ok === true;
  });
}

// --------------------------------------------------------------- encargado (sesión)
export async function mesasEnVivo(jwt: string): Promise<MesasEnVivo> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.mesas_en_vivo() AS j')).rows[0].j);
}

export async function cuentaDetalle(jwt: string, cuentaId: string): Promise<Cuenta | null> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.cuenta_detalle($1) AS j', [cuentaId])).rows[0]?.j ?? null);
}

export async function rondaRevisada(jwt: string, registroId: string): Promise<boolean> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.ronda_revisada($1) AS ok', [registroId])).rows[0]?.ok === true);
}

export async function cerrarCuenta(jwt: string, cuentaId: string): Promise<boolean> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.cerrar_cuenta($1) AS ok', [cuentaId])).rows[0]?.ok === true);
}

export async function anularLinea(jwt: string, lineaId: string, motivo: string): Promise<boolean> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.anular_linea($1, $2) AS ok', [lineaId, motivo])).rows[0]?.ok === true);
}

export async function anularCuenta(jwt: string, cuentaId: string, motivo: string): Promise<boolean> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.anular_cuenta($1, $2) AS ok', [cuentaId, motivo])).rows[0]?.ok === true);
}

export interface Filtro { desde: string; hasta: string; mesa: string | null; camareroId: string | null }

export async function resumenSala(jwt: string, f: Filtro): Promise<ResumenSala> {
  return comoCliente(jwt, async (c) =>
    (await c.query('SELECT dk.resumen_sala($1::date, $2::date, $3, $4::uuid) AS j', [f.desde, f.hasta, f.mesa, f.camareroId])).rows[0].j);
}

export async function informeCuentas(jwt: string, f: Filtro): Promise<FilaCuenta[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.informe_cuentas($1::date, $2::date, $3, $4::uuid)', [f.desde, f.hasta, f.mesa, f.camareroId]);
    return rows.map((r) => ({
      fecha: fecha(r.fecha), mesa: r.mesa, abiertaEn: iso(r.abierta_en)!, cerradaEn: iso(r.cerrada_en), minutos: Number(r.minutos), estado: r.estado,
      comensales: r.comensales === null ? null : Number(r.comensales), camareroApertura: r.camarero_apertura, camareroCierre: r.camarero_cierre,
      rondas: Number(r.rondas), lineas: Number(r.lineas), importe: Number(r.importe), importeAnulado: Number(r.importe_anulado), motivoAnulacion: r.motivo_anulacion,
    }));
  });
}

export async function informeAnulaciones(jwt: string, desde: string, hasta: string): Promise<FilaAnulacion[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.informe_anulaciones($1::date, $2::date)', [desde, hasta]);
    return rows.map((r) => ({
      anuladaEn: iso(r.anulada_en)!, tipo: r.tipo, mesa: r.mesa, plato: r.plato, cantidad: r.cantidad === null ? null : Number(r.cantidad),
      importe: Number(r.importe), camarero: r.camarero, motivo: r.motivo,
    }));
  });
}
