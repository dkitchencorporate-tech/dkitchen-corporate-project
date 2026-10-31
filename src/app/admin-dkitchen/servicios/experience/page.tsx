import Link from 'next/link';
import type { ReactNode } from 'react';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { listarProyectos, type ProyectoFila } from '@/lib/proyectos';
import { clavePuerta, euros, leerLanding, urlAltaCobro } from '@/lib/entradas';
import { FORMATOS_EXPERIENCE, rutaImagen } from '@/lib/experience-formatos';
import { esComercialActual } from '@/lib/rol-central';
import Tablero, { type Columna, type Tarjeta } from '@/components/admin/tablero/Tablero';
import NuevoCliente from '@/components/admin/NuevoCliente';
import EventoTresToques, { type FormatoTresToques } from '@/components/admin/EventoTresToques';
import AsistenteEvento, { type EventoAsistente, type FormatoAsistente } from '@/components/admin/AsistenteEvento';
import { cambiarEstadoAction, conectarCobroAction, guardarEventoAction, nuevaClavePuertaAction } from '../../entradas/actions';

export const dynamic = 'force-dynamic';

/**
 * Servicios → Experience (decisión 1 de karc0, 01/11): UN tablero.
 * Briefing → Propuesta pagada → Evento creado → En venta → Celebrado.
 * La venta de entradas, la puerta y el cobro del local (Stripe Connect) viven dentro de cada evento (?ev=).
 */
type Evento = {
  id: string; slug: string; local_nombre: string; titulo: string; fecha: string; precio_centimos: number; aforo: number;
  vendidas: number; usadas: number; ingresos_centimos: string; estado: string; stripe_cuenta: string | null; tiene_clave: boolean;
  descripcion: string; lugar: string; max_por_compra: number; imagen_url: string | null; landing: unknown; muestra: boolean; formato: string | null;
};
type Entrada = { codigo: string; numero: number; nombre: string; email: string; estado: string; usada_en: string | null };

const COLUMNAS: Columna[] = [
  { clave: 'briefing', nombre: 'Briefing', fases: ['solicitud', 'llamada'] },
  { clave: 'pagada', nombre: 'Propuesta pagada', fases: ['contrato_pago', 'concepto'], destino: 'contrato_pago' },
  { clave: 'creado', nombre: 'Evento creado', fases: ['evento_montado'] },
  { clave: 'venta', nombre: 'En venta', fases: ['venta_abierta'] },
  { clave: 'celebrado', nombre: 'Celebrado', fases: ['celebrado', 'cerrado'] },
];
const FASE_EVENTO: Record<string, string> = { borrador: 'evento_montado', venta: 'venta_abierta', cerrado: 'celebrado' };
const SITIO = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const MENSAJES: Record<string, string> = {
  guardado: 'Evento creado. Siguiente: conecta el cobro del local y abre la venta.', cuenta: 'Cuenta de cobro creada: manda al local su enlace de alta.',
  estado: 'Hecho.', clave: 'Puerta activada.', fase: 'Fase cambiada.',
  datos: 'Faltan datos.', guardar: 'No se pudo guardar el evento: revisa la fecha, el precio y las plazas.',
  connect: 'No se pudo crear la cuenta en Stripe (¿Stripe Connect activado?).', cobro: 'El local aún no ha terminado su alta en Stripe: todavía no se puede abrir la venta.',
  estado_error: 'No se pudo cambiar el estado.',
};
const aLocal = (s: string) => new Date(s).toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 16).replace(' ', 'T');
const diaHora = (s: string) => new Date(s).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function paraAsistente(e: Evento): EventoAsistente {
  const l = leerLanding(e.landing);
  const area = (filas: string[]) => filas.join('\n');
  return {
    id: e.id, slug: e.slug, local_nombre: e.local_nombre, titulo: e.titulo, fecha: aLocal(e.fecha), precio: String(e.precio_centimos / 100),
    aforo: e.aforo, max_por_compra: e.max_por_compra, lugar: e.lugar ?? '', imagen_url: e.imagen_url ?? '', formato: e.formato ?? '',
    muestra: !!e.muestra, descripcion: e.descripcion ?? '',
    l: {
      subtitulo: l.subtitulo, historia: l.historia.join('\n\n'), menu: area(l.menu.map((m) => `${m.pase} | ${m.plato} | ${m.bebida}`)),
      programa: area(l.programa.map((p) => `${p.hora} | ${p.que}`)), incluye: area(l.incluye), anf_nombre: l.anfitrion?.nombre ?? '',
      anf_rol: l.anfitrion?.rol ?? '', anf_texto: l.anfitrion?.texto ?? '', direccion: l.direccion, mapa: l.mapa ?? '',
      faq: area(l.faq.map((x) => `${x.p} | ${x.r}`)), avisos: l.avisos,
    },
  };
}

const FORMATOS_3: FormatoTresToques[] = FORMATOS_EXPERIENCE.map((f) => ({
  slug: f.slug, codigo: f.codigo, nombre: f.nombre, etiqueta: f.etiqueta, frase: f.frase, titular: f.titular, resumen: f.resumen,
  dias: f.dias, aforo: f.aforo, entrada: f.entrada, faq: f.faq, foto: f.imagen ? rutaImagen(f.slug, '16x9') : null,
}));
const FORMATOS_ASIST: FormatoAsistente[] = FORMATOS_EXPERIENCE.map((f) => ({
  slug: f.slug, nombre: f.nombre, etiqueta: f.etiqueta, frase: f.frase, dias: f.dias, aforo: f.aforo, entrada: f.entrada, faq: f.faq, claves: f.claves,
}));

/** Panel del evento: lo que toca hacer AHORA con él, en orden (cobro → puerta → venta). */
function PanelEvento({ e, entradas }: { e: Evento; entradas: Entrada[] }) {
  const pct = e.aforo ? Math.min(100, Math.round((Number(e.vendidas) / e.aforo) * 100)) : 0;
  const pasos: { hecho: boolean; titulo: string; accion: ReactNode }[] = [
    {
      hecho: !!e.stripe_cuenta, titulo: 'Cobro del local (Stripe)',
      accion: !e.stripe_cuenta ? (
        <form action={conectarCobroAction} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="id" value={e.id} /><input type="hidden" name="local_nombre" value={e.local_nombre} />
          <input name="email" type="email" placeholder="Correo del local (opcional)" className="min-h-[44px] flex-1 rounded-full border border-linea bg-white px-4 text-sm" />
          <button className="dk-btn min-h-[44px] rounded-full bg-vino px-5 text-sm font-bold text-white">Conectar cobro</button>
        </form>
      ) : <span className="break-all text-xs text-niebla">Enlace de alta para el local: <span className="font-mono">{urlAltaCobro(SITIO(), e.stripe_cuenta, e.slug)}</span></span>,
    },
    {
      hecho: e.tiene_clave, titulo: 'Puerta (escáner de entradas)',
      accion: !e.tiene_clave ? (
        <form action={nuevaClavePuertaAction}><input type="hidden" name="id" value={e.id} /><button className="dk-btn min-h-[44px] rounded-full bg-vino px-5 text-sm font-bold text-white">Activar puerta</button></form>
      ) : <span className="break-all text-xs text-niebla">No lo publiques: <span className="font-mono">{SITIO()}/e/{e.slug}/puerta#k={clavePuerta(e.id)}</span></span>,
    },
    {
      hecho: e.estado === 'venta' || e.estado === 'cerrado', titulo: e.estado === 'cerrado' ? 'Venta cerrada' : 'Venta de entradas',
      accion: e.estado === 'venta' ? (
        <form action={cambiarEstadoAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="estado" value="cerrado" /><button className="min-h-[44px] rounded-full border border-linea bg-white px-5 text-sm font-bold">Cerrar la venta</button></form>
      ) : e.estado !== 'cerrado' ? (
        <form action={cambiarEstadoAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="estado" value="venta" /><input type="hidden" name="cuenta" value={e.stripe_cuenta ?? ''} /><button className="dk-btn min-h-[44px] rounded-full bg-exito px-5 text-sm font-bold text-white" data-testid="abrir-venta">Abrir la venta</button></form>
      ) : null,
    },
  ];
  return (
    <section className="dk-paso overflow-hidden rounded-[26px] border border-linea bg-white" data-testid="panel-evento">
      <div className="relative bg-noche text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.imagen_url && <img src={e.imagen_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
        <div className="relative space-y-3 p-5 sm:p-6">
          <Link href="/admin-dkitchen/servicios/experience" className="text-xs font-semibold text-oro">← Tablero</Link>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{e.titulo}</h2>
          <p className="text-sm text-white/70">{e.local_nombre} · {diaHora(e.fecha)} · {euros(e.precio_centimos)}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[[`${e.vendidas}/${e.aforo}`, 'vendidas'], [String(e.usadas), 'dentro'], [euros(Number(e.ingresos_centimos)), 'para el local']].map(([v, t]) => (
              <span key={t} className="rounded-2xl bg-white/10 px-2 py-2.5"><b className="cv-cifra block font-display text-lg">{v}</b><span className="text-[11px] text-white/60">{t}</span></span>
            ))}
          </div>
          <div className="dk-barra-prog h-2 overflow-hidden rounded-full bg-white/15"><span style={{ width: `${pct}%` }} /></div>
          <a href={`/e/${e.slug}`} target="_blank" className="inline-block text-xs text-oro underline">Ver la página del comensal ↗</a>
        </div>
      </div>
      <ol className="divide-y divide-linea">
        {pasos.map((p, i) => (
          <li key={p.titulo} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <span className="flex items-center gap-3 font-semibold">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${p.hecho ? 'dk-check bg-exito text-white' : 'bg-papel text-tinta'}`}>{p.hecho ? '✓' : i + 1}</span>{p.titulo}
            </span>
            <span className="min-w-0 sm:max-w-[60%]">{p.accion}</span>
          </li>
        ))}
      </ol>
      {!!entradas.length && (
        <details className="border-t border-linea p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-semibold">Entradas vendidas ({entradas.length})</summary>
          <ul className="mt-2 divide-y divide-linea text-sm">
            {entradas.map((x) => (
              <li key={x.codigo} className="flex flex-wrap justify-between gap-2 py-2"><span>{x.nombre} · n.º {x.numero}</span><span className={x.estado === 'usada' ? 'text-exito' : 'text-niebla'}>{x.estado}</span></li>
            ))}
          </ul>
        </details>
      )}
      <details className="border-t border-linea p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold">✎ Editar todo el evento (menú, programa, anfitrión…)</summary>
        <div className="mt-4"><AsistenteEvento accion={guardarEventoAction} formatos={FORMATOS_ASIST} clientes={[e.local_nombre]} e={paraAsistente(e)} /></div>
      </details>
    </section>
  );
}

export default async function ServiciosExperiencePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const [proyectos, eventos, esComercial] = await Promise.all([
    listarProyectos(jwt, { producto: 'experience' }).catch(() => [] as ProyectoFila[]),
    // pg devuelve timestamptz como Date: se normaliza a texto ISO (fallo 01/11: la página entera caía).
    comoCliente(jwt, async (c) => (await c.query<Evento>('SELECT * FROM dk.admin_eventos()')).rows.map((e) => ({ ...e, fecha: new Date(e.fecha as unknown as string).toISOString() }))).catch(() => [] as Evento[]),
    esComercialActual(jwt),
  ]);
  const sel = eventos.find((x) => x.id === q.ev);
  const entradas = sel ? await comoCliente(jwt, async (c) => (await c.query<Entrada>('SELECT * FROM dk.admin_entradas($1)', [sel.id])).rows).catch(() => []) : [];
  const aviso = q.ok ? MENSAJES[q.ok] : q.e ? MENSAJES[q.e] ?? MENSAJES.datos : null;
  const vivos = proyectos.filter((p) => p.fase !== 'descartado');
  const locales = [...new Set(vivos.map((p) => p.negocio).filter(Boolean) as string[])];
  const pNuevo = q.evento === 'nuevo' ? vivos.find((p) => p.id === q.p) : undefined;

  // Tarjetas: cada proyecto, con su evento dentro si ya lo tiene; los eventos sin proyecto, sueltos en su columna.
  const usados = new Set<string>();
  const tarjetas: Tarjeta[] = vivos.map((p) => {
    const ev = eventos.find((e) => !usados.has(e.id) && p.negocio && e.local_nombre.toLowerCase() === p.negocio.toLowerCase());
    if (ev) usados.add(ev.id);
    const fase = p.fase;
    return {
      id: p.id, titulo: p.negocio || p.nombre || p.email, sub: ev ? `${ev.titulo} · ${ev.vendidas}/${ev.aforo}` : p.siguiente_paso || p.email,
      fase, fecha: ev?.fecha?.slice(0, 10) ?? p.siguiente_fecha, vencido: p.vencido, foto: ev?.imagen_url ?? null,
      href: ev ? `/admin-dkitchen/servicios/experience?ev=${ev.id}` : `/admin-dkitchen/proyectos/${p.id}`,
      etiqueta: (p.negocio ?? '').startsWith('PRUEBA') ? 'prueba' : null,
      extra: ['contrato_pago', 'concepto'].includes(p.fase) && !ev ? (
        <Link href={`/admin-dkitchen/servicios/experience?evento=nuevo&p=${p.id}`} className="dk-btn mt-2.5 flex min-h-[40px] items-center justify-center rounded-full bg-vino text-xs font-bold text-white">+ Crear su evento</Link>
      ) : ev && ev.estado === 'borrador' ? (
        <Link href={`/admin-dkitchen/servicios/experience?ev=${ev.id}`} className="dk-btn mt-2.5 flex min-h-[40px] items-center justify-center rounded-full bg-exito text-xs font-bold text-white">Preparar la venta →</Link>
      ) : undefined,
      moverCon: ['contrato_pago', 'concepto'].includes(p.fase) && !ev ? 'ninguno' : ev && ev.estado === 'borrador' ? 'ninguno' : 'proyecto',
    };
  });
  for (const e of eventos) {
    if (usados.has(e.id)) continue;
    tarjetas.push({
      id: e.id, titulo: e.titulo, sub: `${e.local_nombre} · ${e.vendidas}/${e.aforo}`, fase: FASE_EVENTO[e.estado] ?? 'evento_montado',
      fecha: e.fecha.slice(0, 10), foto: e.imagen_url, href: `/admin-dkitchen/servicios/experience?ev=${e.id}`, moverCon: 'ninguno',
      etiqueta: e.muestra ? 'muestra' : null,
    });
  }
  const vendidas = eventos.reduce((s, e) => s + Number(e.vendidas), 0);
  const enVenta = eventos.filter((e) => e.estado === 'venta').length;
  const proximo = eventos.filter((e) => new Date(e.fecha).getTime() > Date.now()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

  return (
    <div className="space-y-5 px-4 py-6 text-tinta sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Servicios</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Experience</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin-dkitchen/servicios/experience?evento=nuevo" data-testid="nuevo-evento" className="dk-btn inline-flex min-h-[44px] items-center rounded-full border border-linea bg-white px-5 text-sm font-bold hover:bg-papel">+ Evento</Link>
          <NuevoCliente servicio="experience" etiqueta="+ Nuevo Experience" esComercial={esComercial} />
        </div>
      </div>

      {aviso && <p role="status" className={`rounded-2xl px-4 py-3 text-sm ${q.ok ? 'bg-exito/10 text-exito' : 'bg-vino/10 text-vino'}`}>{aviso}</p>}

      <div className="grid grid-cols-3 gap-2.5">
        {[[String(enVenta), 'en venta'], [String(vendidas), 'entradas vendidas'], [proximo ? diaHora(proximo.fecha).split(',')[0] + ' ' + new Date(proximo.fecha).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' }) : '—', 'próximo evento']].map(([v, t]) => (
          <div key={t} className="rounded-[20px] bg-white p-3.5 shadow-[0_10px_30px_-24px_rgba(62,5,21,.5)]"><b className="cv-cifra block font-display text-2xl">{v}</b><span className="text-xs text-niebla">{t}</span></div>
        ))}
      </div>

      {q.evento === 'nuevo' && (
        <EventoTresToques formatos={FORMATOS_3} locales={locales} accion={guardarEventoAction} proyecto={pNuevo?.id} localInicial={pNuevo?.negocio ?? undefined} cancelar="/admin-dkitchen/servicios/experience" />
      )}
      {sel && <PanelEvento e={sel} entradas={entradas} />}

      <Tablero columnas={COLUMNAS} tarjetas={tarjetas} volver="/admin-dkitchen/servicios/experience" resaltar={q.id} />
    </div>
  );
}
