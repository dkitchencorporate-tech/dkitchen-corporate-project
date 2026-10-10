import 'server-only';
import { comoCliente, comoVisitante } from '@/lib/db';

/**
 * Servicios contratables del QR (0027): Setup, idiomas y Módulos de Sala.
 * El precio lo decide SIEMPRE la base (dk.precio_servicio), nunca el cliente.
 * Estrategia: DKITCHEN_ESTRATEGIA_PRECIOS_ESCALERA_Y_RETENCION_2026-09-28.md
 */

export type Servicio = 'setup_esencial' | 'setup_experto' | 'idiomas' | 'idioma_extra' | 'plano_mesas' | 'app_sala' | 'conexion_tpv' | 'pack_sala' | 'bono_ia' | 'comandero_pro';
export const SERVICIOS: Servicio[] = ['setup_esencial', 'setup_experto', 'idiomas', 'plano_mesas', 'app_sala', 'conexion_tpv', 'pack_sala', 'comandero_pro'];
export const MODULOS_SALA: Servicio[] = ['plano_mesas', 'app_sala', 'conexion_tpv'];
/** Lo que un plan puede traer incluido (dk.tiene_servicio, 0050). */
const INCLUIBLES: Servicio[] = ['plano_mesas', 'app_sala', 'conexion_tpv', 'comandero_pro', 'idiomas'];

export interface ItemCatalogo {
  servicio: Servicio;
  nombre: string;
  tipo: 'unico' | 'mensual';
  precioCentimos: number;
  precioAnclaCentimos: number | null;
  requiereAmpliado: boolean;
}

export interface ServicioContratado {
  servicio: Servicio;
  estado: 'activo' | 'entregado' | 'cancelado';
  /** 'plan': incluido en el plan (0068: todos los planes traen plano, app de sala, TPV y Comandero, por cantidades). */
  origen: 'pago' | 'regalo' | 'demo' | 'plan';
  contratadoEn: string;
  checklist: Record<string, boolean>;
}

export interface EstadoServicios {
  catalogo: ItemCatalogo[];
  contratados: ServicioContratado[];
  plazasExperto: number;
  oferta: { oferta: string; motivo: string } | null;
  credito: { centimos: number; venceEn: string } | null;
  /** Comandero Pro activo por cualquier vía (contratado, prueba o incluido en Signature), según la base. */
  comanderoPro?: boolean;
  /** Señal de Signature (0057): tracción de 30 días y si se muestra la tarjeta en Inicio. */
  signature?: SenalSignature | null;
  /** Upsell de la puesta a punto a precio de bienvenida (0068): solo antes de que el dueño monte su carta. */
  puestaBienvenida?: boolean;
  /** Idiomas además del español que puede activar (0068): 1 incluido + extras pagados. */
  idiomasPermitidos?: number;
}

export interface SenalSignature {
  mostrar: boolean;
  motivo: 'escaneos' | 'reservas' | 'llamadas' | null;
  escaneos: number;
  reservas: number;
  llamadas: number;
}

export async function estadoServicios(jwt: string, restauranteId: string): Promise<EstadoServicios> {
  return comoCliente(jwt, async (c) => {
    const [cat, con, plazas, oferta, credito, pro, inc, senal, bienvenida, idiomas] = await Promise.all([
      c.query('SELECT servicio, nombre, tipo, dk.precio_servicio(servicio) AS precio, precio_ancla_centimos, requiere_ampliado FROM catalogo_servicios WHERE en_venta ORDER BY precio_centimos'),
      c.query(`SELECT servicio, estado, origen, contratado_en, checklist FROM servicios_contratados
                WHERE restaurante_id = $1 AND estado <> 'cancelado'`, [restauranteId]),
      c.query('SELECT dk.plazas_setup_experto() AS n'),
      c.query('SELECT * FROM dk.ofertas_para_mi()'),
      c.query('SELECT * FROM dk.credito_migracion_mio()'),
      c.query("SELECT dk.tiene_servicio($1, 'comandero_pro') AS si", [restauranteId]),
      c.query('SELECT s FROM unnest($2::text[]) s WHERE dk.tiene_servicio($1, s)', [restauranteId, INCLUIBLES]),
      c.query('SELECT dk.senal_signature() AS s'),
      c.query('SELECT dk.puesta_bienvenida_mia() AS si'),
      c.query("SELECT tope FROM dk.mi_uso_plan() WHERE que = 'idiomas'"),
    ]);
    const contratados: ServicioContratado[] = con.rows.map((r) => ({
      servicio: r.servicio, estado: r.estado, origen: r.origen, contratadoEn: new Date(r.contratado_en).toISOString(), checklist: r.checklist ?? {},
    }));
    for (const { s } of inc.rows as { s: Servicio }[]) {
      if (!tiene(contratados, s)) contratados.push({ servicio: s, estado: 'activo', origen: 'plan', contratadoEn: new Date(0).toISOString(), checklist: {} });
    }
    return {
      catalogo: cat.rows.map((r) => ({
        servicio: r.servicio, nombre: r.nombre, tipo: r.tipo, precioCentimos: Number(r.precio),
        precioAnclaCentimos: r.precio_ancla_centimos, requiereAmpliado: r.requiere_ampliado,
      })),
      contratados,
      plazasExperto: Number(plazas.rows[0]?.n ?? 0),
      oferta: oferta.rows[0] ?? null,
      credito: credito.rows[0] ? { centimos: Number(credito.rows[0].centimos), venceEn: new Date(credito.rows[0].vence_en).toISOString() } : null,
      comanderoPro: pro.rows[0]?.si === true,
      signature: (senal.rows[0]?.s as SenalSignature | undefined) ?? null,
      puestaBienvenida: bienvenida.rows[0]?.si === true,
      idiomasPermitidos: Number(idiomas.rows[0]?.tope ?? 1),
    };
  });
}

/** ¿Tiene activo un módulo? (el pack cubre los tres). */
export function tiene(contratados: ServicioContratado[], s: Servicio): boolean {
  return contratados.some((c) => c.servicio === s || (c.servicio === 'pack_sala' && MODULOS_SALA.includes(s)));
}

export async function precioServicio(jwt: string, s: Servicio): Promise<number | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT dk.precio_servicio($1) AS p', [s]);
    return rows[0]?.p ? Number(rows[0].p) : null;
  });
}

export async function registrarOferta(jwt: string, oferta: string, tipo: 'mostrada' | 'cerrada' | 'aceptada') {
  await comoCliente(jwt, (c) => c.query('SELECT dk.registrar_oferta($1, $2)', [oferta, tipo]));
}

/** Plazas del Setup Experto a precio de lanzamiento (para la web pública). */
export async function plazasSetupExperto(): Promise<number> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.plazas_setup_experto() AS n');
    return Number(rows[0]?.n ?? 0);
  });
}
