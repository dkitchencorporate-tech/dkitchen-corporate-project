import Link from 'next/link';
import type { ReactNode } from 'react';
import { exigirAdmin } from '@/lib/guard-admin';
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

function Fila({ p }: { p: ProyectoFila }) {
  return (
    <li>
      <Link href={`/admin-dkitchen/proyectos/${p.id}`} className="flex items-start gap-3 py-3.5 hover:text-vino">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${p.vencido ? 'bg-vino' : p.fase === 'descartado' ? 'bg-acero' : 'bg-exito'}`} title={p.vencido ? 'Toca hoy o vencido' : ''} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{p.negocio || p.nombre || p.email}</span>
          <span className="block truncate text-xs text-niebla">{PRODUCTOS_PROYECTO[p.producto]} · {nombreFase(p.producto, p.fase)}{p.nombre && p.negocio ? ` · ${p.nombre}` : ''}</span>
          {p.siguiente_paso && (
            <span className={`mt-1 block truncate text-xs ${p.vencido ? 'font-semibold text-vino' : 'text-ceniza'}`}>
              {p.siguiente_paso}{p.siguiente_fecha ? ` · ${dia(p.siguiente_fecha)}` : ''}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right text-xs text-ceniza">
          {p.importe_centimos ? <span className="block font-semibold tabular-nums text-carbon">{(p.importe_centimos / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span> : null}
          {dia(p.creado_en)}
        </span>
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
    const p = new URLSearchParams(Object.entries({ producto, fase: fase === 'abiertos' ? undefined : fase, hoy: hoy ? '1' : undefined, ...cambios }).filter(([, v]) => v) as [string, string][]);
    return `/admin-dkitchen/proyectos${p.toString() ? `?${p}` : ''}`;
  };
  const vencidos = lista?.filter((p) => p.vencido).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 text-carbon sm:px-6 lg:px-10 lg:py-10">
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

      <section className={tarjeta}>
        {lista === null ? <p className="text-sm font-semibold text-vino">No se pudieron leer los proyectos.</p>
          : lista.length === 0 ? <p className="text-sm text-ceniza">{hoy ? 'Nada vence hoy. Todo al día.' : 'No hay proyectos con este filtro.'}</p>
          : <ul className="divide-y divide-linea">{lista.map((p) => <Fila key={p.id} p={p} />)}</ul>}
      </section>

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
