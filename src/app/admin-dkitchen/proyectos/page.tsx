import Link from 'next/link';
import type { ReactNode } from 'react';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { listarProyectos, nombreFase, PRODUCTOS_PROYECTO, FASES, type ProductoProyecto, type ProyectoFila } from '@/lib/proyectos';
import { crearProyectoAction } from './actions';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

/**
 * Central → Proyectos (0060, H13): Signature, Experience, Auditoría, Dark
 * Kitchen y QR físico en un solo sitio, desde la solicitud o el pago hasta el
 * cierre. Filtros por producto, fase y «toca hoy» (siguiente paso vencido).
 */
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const dia = (s: string) => new Date(s + (s.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' });
const ERRORES: Record<string, string> = { datos: 'Datos no válidos.', crear: 'No se pudo crear: revisa el correo.' };

function Filtro({ href, activo, children }: { href: string; activo: boolean; children: ReactNode }) {
  return (
    <Link href={href} aria-current={activo ? 'page' : undefined}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${activo ? 'bg-noche text-white' : 'bg-white text-grafito ring-1 ring-linea hover:ring-acero'}`}>
      {children}
    </Link>
  );
}

type EventoResumen = { local_nombre: string; titulo: string; fecha: string; vendidas: number; aforo: number; estado: string };
const ACENTO: Record<ProductoProyecto, string> = { signature: '#7A2E3A', experience: '#B08D57', auditoria: '#2E6E8E', dark_kitchen: '#1F1B16', qr_fisico: '#0F7B5F' };
const norm = (t: string | null) => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Tarjeta de proyecto: fase como barra de progreso, siguiente paso y, en Experience, sus eventos y entradas. */
function Tarjeta({ p, eventos }: { p: ProyectoFila; eventos: EventoResumen[] }) {
  const fases = FASES[p.producto].filter(([k]) => k !== 'descartado');
  const paso = Math.max(0, fases.findIndex(([k]) => k === p.fase));
  const pct = p.fase === 'descartado' ? 0 : Math.round(((paso + 1) / fases.length) * 100);
  const acento = ACENTO[p.producto];
  const vendidas = eventos.reduce((n, e) => n + Number(e.vendidas), 0);
  const aforo = eventos.reduce((n, e) => n + Number(e.aforo), 0);
  const inicial = (p.negocio || p.nombre || p.email).trim().charAt(0).toUpperCase();
  return (
    <li>
      <Link href={`/admin-dkitchen/proyectos/${p.id}`}
        className={`group flex h-full flex-col rounded-[22px] border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(20,16,12,.45)] ${p.vencido ? 'border-vino/40' : 'border-linea'}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-semibold text-white" style={{ background: acento }}>{inicial}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg font-semibold leading-tight group-hover:text-vino">{p.negocio || p.nombre || p.email}</span>
            <span className="block truncate text-xs text-niebla">{PRODUCTOS_PROYECTO[p.producto]}{p.nombre && p.negocio ? ` · ${p.nombre}` : ''}</span>
          </span>
          {p.importe_centimos ? <span className="shrink-0 rounded-full bg-papel px-2.5 py-1 text-xs font-semibold tabular-nums">{(p.importe_centimos / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span> : null}
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold" style={{ color: acento }}>{nombreFase(p.producto, p.fase)}</span>
            <span className="text-ceniza">{p.fase === 'descartado' ? 'descartado' : `paso ${paso + 1} de ${fases.length}`}</span>
          </div>
          <div className="mt-1.5 flex gap-1" aria-hidden>
            {fases.map(([k], i) => <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: i <= paso && p.fase !== 'descartado' ? acento : '#E7E1D6' }} />)}
          </div>
          <span className="sr-only">{pct} % del recorrido</span>
        </div>
        {eventos.length > 0 && (
          <div className="mt-3 rounded-2xl bg-papel/80 p-3 text-xs">
            <p className="font-semibold">🎟 {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'} · {vendidas}/{aforo} entradas</p>
            <p className="mt-0.5 truncate text-niebla">{eventos[0].titulo} · {dia(new Date(eventos[0].fecha).toISOString())} · {eventos[0].estado}</p>
          </div>
        )}
        <p className={`mt-auto pt-3 text-xs ${p.vencido ? 'font-semibold text-vino' : 'text-grafito'}`}>
          {p.siguiente_paso ? <>{p.vencido ? '⏰ ' : '→ '}{p.siguiente_paso}{p.siguiente_fecha ? ` · ${dia(p.siguiente_fecha)}` : ''}</> : <span className="text-ceniza">Sin siguiente paso · creado {dia(p.creado_en)}</span>}
        </p>
      </Link>
    </li>
  );
}

export default async function Proyectos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const producto = q.producto && q.producto in PRODUCTOS_PROYECTO ? (q.producto as ProductoProyecto) : undefined;
  const hoy = q.hoy === '1';
  const fase = q.fase ?? 'abiertos';
  const lista = await listarProyectos(jwt, { producto, fase: fase === 'todos' ? undefined : fase, hoy }).catch(() => null);
  const url = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ producto, fase: fase === 'abiertos' ? undefined : fase, hoy: hoy ? '1' : undefined, vista: q.vista, ...cambios }).filter(([, v]) => v) as [string, string][]);
    return `/admin-dkitchen/proyectos${p.toString() ? `?${p}` : ''}`;
  };
  const vencidos = lista?.filter((p) => p.vencido).length ?? 0;
  // Experience: los eventos de Entradas se cruzan con el cliente por el nombre del negocio.
  const eventos = !producto || producto === 'experience'
    ? await comoCliente(jwt, async (c) => (await c.query<EventoResumen>('SELECT local_nombre, titulo, fecha, vendidas, aforo, estado FROM dk.admin_eventos()')).rows).catch(() => [] as EventoResumen[])
    : [];
  const eventosDe = (p: ProyectoFila) => p.producto === 'experience' && p.negocio ? eventos.filter((e) => norm(e.local_nombre) === norm(p.negocio)) : [];
  const importe = lista?.reduce((n, p) => n + (p.fase !== 'descartado' ? p.importe_centimos ?? 0 : 0), 0) ?? 0;
  const tablero = !!producto && q.vista !== 'tarjetas';

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 text-carbon sm:px-6 lg:px-10 lg:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Proyectos</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Proyectos</h1>
        <p className="mt-1 text-sm text-niebla">Signature, Experience, Auditoría, Dark Kitchen y QR físico: de la solicitud o el pago al cierre. Se crean solos con cada pago y cada solicitud de la web.</p>
      </header>

      <GuiaZona titulo="Proyectos" ancla="proyectos"
        que="Signature, Experience, Auditoría, Dark Kitchen y QR físico: de la solicitud a la entrega. Nacen solos al pagar o al pedir información en la web; también se crean a mano."
        pasos={['Filtra por producto, fase o «toca hoy».', 'Abre un proyecto para avanzarlo de fase (con correo opcional al cliente) y apuntar llamadas y el siguiente paso.', '«Nuevo proyecto» abajo: para un cliente que llega por teléfono o en persona.']} />

      {q.e && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[q.e] ?? 'No se pudo hacer.'}</p>}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Filtro href={url({ producto: undefined })} activo={!producto}>Todos</Filtro>
        {(Object.keys(PRODUCTOS_PROYECTO) as ProductoProyecto[]).map((k) => (
          <Filtro key={k} href={url({ producto: k, fase: undefined })} activo={producto === k}>{PRODUCTOS_PROYECTO[k]}</Filtro>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Filtro href={url({ hoy: hoy ? undefined : '1' })} activo={hoy}>Toca hoy{vencidos && !hoy ? ` · ${vencidos}` : ''}</Filtro>
        <form action="/admin-dkitchen/proyectos" className="flex items-center gap-2">
          {producto && <input type="hidden" name="producto" value={producto} />}
          {hoy && <input type="hidden" name="hoy" value="1" />}
          <label className="sr-only" htmlFor="fase">Fase</label>
          <select id="fase" name="fase" defaultValue={fase} className="rounded-full border border-linea bg-white px-3 py-1.5 text-sm">
            <option value="abiertos">Abiertos</option>
            <option value="todos">Todos, también cerrados</option>
            {producto && FASES[producto].map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <button className="rounded-full bg-papel px-3 py-1.5 text-sm font-semibold hover:bg-linea">Filtrar</button>
        </form>
      </div>

      <section className="grid grid-cols-3 gap-3 rounded-[26px] bg-noche p-5 text-white sm:p-6">
        {([['Abiertos', String(lista?.length ?? 0)], ['Toca hoy', String(vencidos)], ['En juego', `${(importe / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`]] as const).map(([t, n], i) => (
          <div key={t} className={i === 1 && vencidos > 0 ? 'text-oro' : ''}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">{t}</p>
            <p className="font-display text-3xl font-semibold tabular-nums sm:text-4xl">{n}</p>
          </div>
        ))}
      </section>

      {lista === null ? <p className={`${tarjeta} text-sm font-semibold text-vino`}>No se pudieron leer los proyectos.</p>
        : lista.length === 0 ? <p className={`${tarjeta} text-sm text-ceniza`}>{hoy ? 'Nada vence hoy. Todo al día.' : 'No hay proyectos con este filtro.'}</p>
        : tablero && producto ? (
          <>
            <p className="text-xs text-niebla">Tablero por fases · <Link href={url({ vista: 'tarjetas' })} className="font-semibold text-vino">ver como tarjetas</Link></p>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
              {FASES[producto].filter(([k]) => k !== 'descartado').map(([k, n]) => {
                const col = lista.filter((p) => p.fase === k);
                return (
                  <section key={k} className="w-[290px] shrink-0 snap-start rounded-[22px] bg-papel/70 p-3">
                    <h2 className="mb-3 flex items-center px-1 text-xs font-bold uppercase tracking-[0.14em] text-grafito">{n}<span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px]">{col.length}</span></h2>
                    {col.length === 0 ? <p className="rounded-2xl border border-dashed border-linea p-4 text-center text-xs text-ceniza">Vacío</p>
                      : <ul className="space-y-3">{col.map((p) => <Tarjeta key={p.id} p={p} eventos={eventosDe(p)} />)}</ul>}
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {producto && <p className="text-xs text-niebla"><Link href={url({ vista: undefined })} className="font-semibold text-vino">Ver como tablero por fases</Link></p>}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{lista.map((p) => <Tarjeta key={p.id} p={p} eventos={eventosDe(p)} />)}</ul>
          </>
        )}

      {(!producto || producto === 'experience') && (
        <Link href="/admin-dkitchen/entradas?nuevo=1" className="flex items-center justify-between gap-3 rounded-[22px] border border-oro/50 bg-[linear-gradient(120deg,#FBF6EC,#F3E7CF)] p-5 hover:shadow-md">
          <span><span className="block font-display text-lg font-semibold">Crear un evento de Experience</span><span className="text-sm text-niebla">Asistente en 4 pasos: formato, local, fecha y entradas, y la página de venta.</span></span>
          <span className="rounded-full bg-noche px-4 py-2 text-sm font-semibold text-white">Empezar →</span>
        </Link>
      )}

      <details className={tarjeta}>
        <summary className="cursor-pointer text-sm font-semibold">Crear un proyecto a mano</summary>
        <form action={crearProyectoAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Producto
            <select name="producto" required className="mt-1 w-full rounded-lg border border-acero bg-white px-3 py-2">
              {(Object.keys(PRODUCTOS_PROYECTO) as ProductoProyecto[]).map((k) => <option key={k} value={k}>{PRODUCTOS_PROYECTO[k]}</option>)}
            </select>
          </label>
          <label className="text-sm">Correo<input name="email" type="email" required maxLength={254} className="mt-1 w-full rounded-lg border border-acero px-3 py-2" /></label>
          <label className="text-sm">Nombre<input name="nombre" maxLength={120} className="mt-1 w-full rounded-lg border border-acero px-3 py-2" /></label>
          <label className="text-sm">Teléfono<input name="telefono" type="tel" maxLength={30} className="mt-1 w-full rounded-lg border border-acero px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">Negocio<input name="negocio" maxLength={120} className="mt-1 w-full rounded-lg border border-acero px-3 py-2" /></label>
          <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-bold text-white hover:bg-vino-hondo sm:col-span-2 sm:justify-self-start">Crear proyecto</button>
        </form>
      </details>
    </div>
  );
}
