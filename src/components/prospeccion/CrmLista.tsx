import Link from 'next/link';
import {
  ESTADOS, TIPOS, FUENTES, enlacesRuta, fechaCorta, hoyMadrid,
  type BaseCrm, type Estado, type Prospecto, type Metrica,
} from '@/lib/prospeccion';
import { guardarProspectoAction, guardarRutaAction, guardarMiContactoAction } from '@/lib/prospeccion-acciones';

/**
 * Lista del CRM de prospección (0058), móvil primero: ruta de hoy con Google
 * Maps, «toca hoy», filtros por estado y alta rápida a pie de calle. La usan
 * Central (karc0: todas las carteras) y /socio (solo la suya).
 */
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const campo = 'w-full rounded-2xl border border-linea bg-white px-4 py-3 text-[15px] focus:border-vino focus:outline-none';
const COLOR: Record<Estado, string> = {
  por_revisar: 'bg-papel text-niebla', por_visitar: 'bg-amber-50 text-amber-800', muestra: 'bg-sky-50 text-sky-800',
  visitado: 'bg-indigo-50 text-indigo-800', demo: 'bg-violet-50 text-violet-800', interesado: 'bg-orange-50 text-orange-800',
  cliente: 'bg-emerald-50 text-emerald-800', descartado: 'bg-zinc-100 text-zinc-500',
};
const AVISOS: Record<string, string> = {
  permiso: 'No tienes permiso para eso.', datos: 'Revisa los datos: algún campo no es válido.', error: 'No se pudo guardar. Prueba otra vez.',
};
const OKS: Record<string, string> = { ruta: 'Ruta de hoy guardada.', contacto: 'Tus datos de contacto están guardados.' };

export function EtiquetaEstado({ e }: { e: Estado }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${COLOR[e]}`}>{ESTADOS[e]}</span>;
}

function Fila({ p, base, central }: { p: Prospecto; base: BaseCrm; central: boolean }) {
  const hoy = hoyMadrid();
  const vence = p.siguiente_fecha && p.siguiente_fecha <= hoy;
  return (
    <li>
      <Link href={`${base}/${p.id}`} className="block px-4 py-3.5 hover:bg-papel/60 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.nombre}</p>
            <p className="truncate text-xs text-niebla">{TIPOS[p.tipo]} · {p.barrio || p.zona}{central && !p.mio ? ` · ${p.comercial}` : ''}</p>
          </div>
          <EtiquetaEstado e={p.estado} />
        </div>
        {(p.siguiente_accion || p.siguiente_fecha || p.apertura_prevista) && (
          <p className={`mt-1.5 text-xs ${vence ? 'font-semibold text-vino' : 'text-niebla'}`}>
            {p.siguiente_fecha ? `${fechaCorta(p.siguiente_fecha)} · ` : ''}{p.siguiente_accion || ''}
            {p.apertura_prevista ? ` · abre ${fechaCorta(p.apertura_prevista)}` : ''}
          </p>
        )}
        <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-ceniza">
          {p.muestra && <span>✓ Muestra</span>}
          {p.propuesta_vistas > 0 && <span>👁 Propuesta vista {p.propuesta_vistas}</span>}
          {p.nota_guia && <span>★ Nota de guía</span>}
          {p.no_contactar && <span className="text-red-600">No contactar</span>}
          {p.puntuacion != null && <span>{p.puntuacion}/100</span>}
        </p>
      </Link>
    </li>
  );
}

/** Demo ligada al local (0097): miniatura de su carta con su color y su composición. */
export type DemoProspecto = { slug: string; color: string | null; plantilla: string; fondo: string; platos: number };
const COMPOSICION: Record<string, string> = { gastro: 'Alta cocina', taberna: 'Taberna', urbano: 'Urbana' };
const BARRA: Record<Estado, string> = {
  por_revisar: 'bg-acero', por_visitar: 'bg-amber-400', muestra: 'bg-sky-400', visitado: 'bg-indigo-400',
  demo: 'bg-violet-500', interesado: 'bg-orange-500', cliente: 'bg-emerald-500', descartado: 'bg-zinc-300',
};

function MiniCarta({ d, nombre }: { d: DemoProspecto; nombre: string }) {
  const c = d.color || '#7A2E3A';
  const oscuro = d.fondo === 'oscuro';
  return (
    <div aria-hidden className={`relative h-[118px] w-[66px] shrink-0 overflow-hidden rounded-[14px] border-[3px] border-noche shadow-[0_10px_24px_-12px_rgba(0,0,0,.5)] ${oscuro ? 'bg-[#141414]' : 'bg-[#F7F3EA]'}`}>
      <div className="h-[46px] px-1.5 pt-2" style={{ background: d.plantilla === 'urbano' ? `linear-gradient(135deg, ${c}, ${c}AA)` : `linear-gradient(180deg, ${c}55, transparent)` }}>
        <p className={`line-clamp-2 text-[7px] font-bold leading-[1.1] ${d.plantilla === 'urbano' || oscuro ? 'text-white' : 'text-noche'}`}>{nombre}</p>
      </div>
      {['', 'CC', '99'].map((alfa) => (
        <div key={alfa} className="mx-1.5 mt-1.5 flex items-center gap-1">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: `${c}${alfa}` }} />
          <span className={`h-1 flex-1 rounded-full ${oscuro ? 'bg-white/25' : 'bg-noche/15'}`} />
        </div>
      ))}
      <span className="absolute bottom-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full" style={{ background: c }} />
    </div>
  );
}

function Tarjeta({ p, base, central, demo }: { p: Prospecto; base: BaseCrm; central: boolean; demo?: DemoProspecto }) {
  const hoy = hoyMadrid();
  const vence = p.siguiente_fecha && p.siguiente_fecha <= hoy && !['cliente', 'descartado'].includes(p.estado);
  return (
    <li className={`group relative flex gap-4 overflow-hidden rounded-[22px] border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(20,16,12,.45)] ${vence ? 'border-vino/40' : 'border-linea'}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${BARRA[p.estado]}`} />
      {demo ? <MiniCarta d={demo} nombre={p.nombre} /> : (
        <div aria-hidden className="flex h-[118px] w-[66px] shrink-0 items-center justify-center rounded-[14px] border-2 border-dashed border-linea text-center text-[10px] leading-tight text-ceniza">Sin<br />demo</div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link href={`${base}/${p.id}`} className="min-w-0 after:absolute after:inset-0 after:content-['']">
            <p className="truncate font-display text-lg font-semibold leading-tight group-hover:text-vino">{p.nombre}</p>
            <p className="truncate text-xs text-niebla">{TIPOS[p.tipo]} · {p.barrio || p.zona}{central && !p.mio ? ` · ${p.comercial}` : ''}</p>
          </Link>
          <EtiquetaEstado e={p.estado} />
        </div>
        {(p.siguiente_accion || p.siguiente_fecha) && (
          <p className={`mt-2 line-clamp-2 text-xs ${vence ? 'font-semibold text-vino' : 'text-grafito'}`}>
            {vence ? '⏰ ' : ''}{p.siguiente_fecha ? `${fechaCorta(p.siguiente_fecha)} · ` : ''}{p.siguiente_accion || ''}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[11px]">
          {demo && <span className="rounded-full bg-papel px-2 py-0.5 font-medium text-grafito">{COMPOSICION[demo.plantilla] ?? 'Carta'} · {demo.platos} platos</span>}
          {p.propuesta_vistas > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">👁 Vista {p.propuesta_vistas}×</span>}
          {p.puntuacion != null && <span className="rounded-full bg-papel px-2 py-0.5 text-grafito">{p.puntuacion}/100</span>}
          {p.no_contactar && <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">No contactar</span>}
          {demo && (
            <a href={`/m/${demo.slug}`} target="_blank" rel="noopener noreferrer"
              className="relative z-10 ml-auto rounded-full bg-noche px-3 py-1 text-[11px] font-semibold text-white hover:bg-vino">Ver demo ↗</a>
          )}
        </div>
      </div>
    </li>
  );
}

export default function CrmLista({ base, lista, estado, aviso, ok, contacto, central, comerciales, comercial, metricas, demos = {}, vista = 'tarjetas' }: {
  base: BaseCrm; lista: Prospecto[]; estado: string | null; aviso?: string; ok?: string; demos?: Record<string, DemoProspecto>; vista?: 'tarjetas' | 'tablero';
  contacto: { nombre_publico: string; telefono: string | null } | null;
  central?: boolean; comerciales?: { id: string; nombre: string }[]; comercial?: string | null; metricas?: Metrica[] | null;
}) {
  const hoy = hoyMadrid();
  const mios = lista.filter((p) => p.mio);
  const ruta = mios.filter((p) => p.ruta_fecha === hoy).sort((a, b) => (a.ruta_orden ?? 0) - (b.ruta_orden ?? 0));
  const tocaHoy = lista.filter((p) => p.siguiente_fecha && p.siguiente_fecha <= hoy && !['cliente', 'descartado'].includes(p.estado));
  const cuenta = (e: Estado) => lista.filter((p) => p.estado === e).length;
  const filtrada = estado ? lista.filter((p) => p.estado === estado) : lista.filter((p) => p.estado !== 'descartado');
  const planificables = mios.filter((p) => !['cliente', 'descartado'].includes(p.estado) && !p.no_contactar);
  const tramos = enlacesRuta(ruta);
  const conDemo = lista.filter((p) => demos[p.id] && p.estado !== 'descartado').length;
  const vistas = lista.filter((p) => p.propuesta_vistas > 0).length;
  const activos = lista.length - cuenta('descartado');
  const embudo = (Object.keys(ESTADOS) as Estado[]).filter((e) => e !== 'descartado');
  const q = (e: string | null, v: string = vista) => {
    const s = new URLSearchParams();
    if (e) s.set('estado', e);
    if (comercial) s.set('comercial', comercial);
    if (v !== 'tarjetas') s.set('vista', v);
    const t = s.toString();
    return t ? `${base}?${t}` : base;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">{central ? 'Central · Prospección' : 'Prospección'}</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Locales objetivo</h1>
        <p className="mt-1 text-sm text-niebla">Cada local con su análisis, su propuesta y su siguiente paso. Nunca en frío del todo.</p>
      </div>

      <section className="overflow-hidden rounded-[26px] bg-noche p-5 text-white sm:p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {([['Activos', activos, 'en la cartera'], ['Con demo', conDemo, 'carta montada'], ['Propuestas vistas', vistas, 'han abierto el enlace'], ['Toca hoy', tocaHoy.length, 'o van con retraso']] as const).map(([t, n, sub], i) => (
            <div key={t} className={i === 3 && n > 0 ? 'text-oro' : ''}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">{t}</p>
              <p className="font-display text-4xl font-semibold tabular-nums">{n}</p>
              <p className="text-xs text-white/55">{sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex h-9 w-full gap-1 overflow-hidden rounded-full bg-white/10 p-1" aria-label="Embudo por estado">
          {embudo.filter((e) => cuenta(e) > 0).map((e) => (
            <Link key={e} href={q(e)} title={`${ESTADOS[e]}: ${cuenta(e)}`} style={{ flexGrow: cuenta(e) }}
              className={`flex min-w-[28px] items-center justify-center rounded-full text-[11px] font-bold text-noche transition hover:brightness-110 ${BARRA[e]} ${estado === e ? 'ring-2 ring-oro' : ''}`}>
              {cuenta(e)}
            </Link>
          ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/60">
          {embudo.map((e) => <span key={e} className="inline-flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${BARRA[e]}`} />{ESTADOS[e]}</span>)}
        </p>
      </section>
      {aviso && AVISOS[aviso] && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{AVISOS[aviso]}</p>}
      {ok && OKS[ok] && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{OKS[ok]}</p>}

      {central && comerciales && (
        <form className="flex flex-col gap-2 sm:flex-row" action={base}>
          <select name="comercial" defaultValue={comercial ?? ''} className={campo}>
            <option value="">Todas las carteras</option>
            {comerciales.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {estado && <input type="hidden" name="estado" value={estado} />}
          <button className="rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white">Filtrar</button>
        </form>
      )}

      <section id="ruta" className={tarjeta}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Ruta de hoy · {ruta.length} paradas</h2>
          <span className="text-xs text-ceniza">{fechaCorta(hoy)}</span>
        </div>
        {ruta.length === 0 ? (
          <p className="mt-2 text-sm text-niebla">Sin ruta para hoy. Planifícala abajo: numera los locales en el orden de la visita.</p>
        ) : (
          <>
            <ol className="mt-3 space-y-2">
              {ruta.map((p, i) => (
                <li key={p.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-vino text-xs font-semibold text-white">{i + 1}</span>
                  <Link href={`${base}/${p.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.nombre}</span>
                    <span className="block truncate text-xs text-niebla">{p.direccion || 'Sin dirección'} · {ESTADOS[p.estado]}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              {tramos.map((u, i) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white">
                  Abrir en Google Maps{tramos.length > 1 ? ` (tramo ${i + 1})` : ''}
                </a>
              ))}
            </div>
          </>
        )}
        {planificables.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-vino">Planificar la ruta de hoy</summary>
            <form action={guardarRutaAction} className="mt-3 space-y-2">
              <input type="hidden" name="base" value={base} />
              <p className="text-xs text-niebla">Pon 1, 2, 3… en los que vas a visitar hoy. Vacío = fuera de la ruta.</p>
              <ul className="divide-y divide-linea rounded-2xl border border-linea">
                {planificables.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <input name={`orden_${p.id}`} inputMode="numeric" pattern="[0-9]*" defaultValue={p.ruta_fecha === hoy ? String(p.ruta_orden ?? '') : ''}
                      aria-label={`Orden de ${p.nombre}`} className="w-14 rounded-xl border border-linea px-2 py-2 text-center text-[15px]" />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.nombre}<span className="text-xs text-niebla"> · {p.barrio || p.zona} · {ESTADOS[p.estado]}</span></span>
                  </li>
                ))}
              </ul>
              <button className="w-full rounded-full bg-vino px-5 py-3 text-sm font-semibold text-white sm:w-auto">Guardar ruta de hoy</button>
            </form>
          </details>
        )}
      </section>

      {tocaHoy.length > 0 && (
        <section className={`${tarjeta} p-0`}>
          <h2 className="px-5 pt-4 text-sm font-semibold text-vino">Toca hoy o va con retraso · {tocaHoy.length}</h2>
          <ul className="mt-2 divide-y divide-linea">{tocaHoy.map((p) => <Fila key={p.id} p={p} base={base} central={!!central} />)}</ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filtrar por estado">
          <Link href={q(null)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${!estado ? 'bg-tinta text-white' : 'bg-white text-carbon ring-1 ring-linea'}`}>Activos · {activos}</Link>
          {(Object.keys(ESTADOS) as Estado[]).map((e) => (
            <Link key={e} href={q(e)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${estado === e ? 'bg-tinta text-white' : 'bg-white text-carbon ring-1 ring-linea'}`}>{ESTADOS[e]} · {cuenta(e)}</Link>
          ))}
        </nav>
        <div className="flex rounded-full bg-white p-1 ring-1 ring-linea" role="group" aria-label="Vista">
          {([['tarjetas', 'Tarjetas'], ['tablero', 'Tablero']] as const).map(([v, n]) => (
            <Link key={v} href={q(estado, v)} aria-current={vista === v ? 'page' : undefined} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${vista === v ? 'bg-vino text-white' : 'text-grafito'}`}>{n}</Link>
          ))}
        </div>
      </div>

      {vista === 'tablero' && !estado ? (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {embudo.map((e) => {
            const col = lista.filter((p) => p.estado === e);
            return (
              <section key={e} className="w-[300px] shrink-0 snap-start rounded-[22px] bg-papel/70 p-3">
                <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-grafito"><i className={`h-2.5 w-2.5 rounded-full ${BARRA[e]}`} />{ESTADOS[e]}<span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px]">{col.length}</span></h2>
                {col.length === 0 ? <p className="rounded-2xl border border-dashed border-linea p-4 text-center text-xs text-ceniza">Vacío</p>
                  : <ul className="space-y-3">{col.map((p) => <Tarjeta key={p.id} p={p} base={base} central={!!central} demo={demos[p.id]} />)}</ul>}
              </section>
            );
          })}
        </div>
      ) : filtrada.length === 0 ? <p className={`${tarjeta} text-sm text-niebla`}>Nada en esta lista todavía.</p> : (
        <ul className="grid gap-3 md:grid-cols-2">{filtrada.map((p) => <Tarjeta key={p.id} p={p} base={base} central={!!central} demo={demos[p.id]} />)}</ul>
      )}

      <details className={tarjeta} open={lista.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold">+ Alta rápida (a pie de calle)</summary>
        <form action={guardarProspectoAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="base" value={base} />
          <input name="nombre" required minLength={2} maxLength={120} placeholder="Nombre del local *" className={`${campo} sm:col-span-2`} />
          <select name="tipo" defaultValue="restaurante" className={campo}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select name="fuente" defaultValue="visita" className={campo}>{Object.entries(FUENTES).filter(([k]) => k !== 'script').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input name="zona" defaultValue="Baza" maxLength={60} placeholder="Zona (pueblo/ciudad)" className={campo} />
          <input name="barrio" maxLength={60} placeholder="Barrio o calle principal" className={campo} />
          <input name="direccion" maxLength={200} placeholder="Dirección" className={`${campo} sm:col-span-2`} />
          <input name="telefono" type="tel" maxLength={30} placeholder="Teléfono del local" className={campo} />
          <input name="instagram" maxLength={120} placeholder="Instagram (@usuario)" className={campo} />
          <input name="referido_por" maxLength={120} placeholder="Si es referido: ¿quién?" className={campo} />
          <label className="text-xs text-niebla">Apertura prevista (si es nuevo)
            <input name="apertura_prevista" type="date" className={`${campo} mt-1`} />
          </label>
          <textarea name="notas" maxLength={2000} rows={3} placeholder="Qué has visto: carta en papel, Glovo, colores, quién atiende…" className={`${campo} sm:col-span-2`} />
          {central && comerciales && (
            <select name="comercial_id" defaultValue="" className={`${campo} sm:col-span-2`}>
              <option value="">Para mi cartera</option>
              {comerciales.slice(1).map((c) => <option key={c.id} value={c.id}>Para {c.nombre}</option>)}
            </select>
          )}
          <button className="rounded-full bg-vino px-5 py-3 text-sm font-semibold text-white sm:col-span-2 sm:justify-self-start">Dar de alta</button>
        </form>
      </details>

      <details className={tarjeta} open={!contacto}>
        <summary className="cursor-pointer text-sm font-semibold">Mis datos para la propuesta{contacto ? ` · ${contacto.nombre_publico}` : ' (pendiente)'}</summary>
        <form action={guardarMiContactoAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="base" value={base} />
          <input name="nombre_publico" required minLength={2} maxLength={80} defaultValue={contacto?.nombre_publico ?? ''} placeholder="Tu nombre como lo verá el local" className={campo} />
          <input name="telefono" type="tel" maxLength={20} defaultValue={contacto?.telefono ?? ''} placeholder="Tu móvil / WhatsApp (+34 …)" className={campo} />
          <button className="rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white sm:justify-self-start">Guardar</button>
        </form>
      </details>

      {central && metricas && metricas.length > 0 && (
        <section className={tarjeta}>
          <h2 className="text-sm font-semibold">Conversión por comercial</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-niebla"><tr><th className="py-1.5 font-medium">Comercial</th><th>Locales</th><th>Contactados</th><th>Demos</th><th>Clientes</th><th>Descartes (motivo)</th></tr></thead>
              <tbody className="divide-y divide-linea">
                {metricas.map((m) => (
                  <tr key={m.comercial}>
                    <td className="py-2 font-medium">{m.comercial}</td><td>{m.total}</td><td>{m.contactados}</td><td>{m.demos}</td>
                    <td>{m.clientes}{m.contactados > 0 ? <span className="text-xs text-niebla"> ({Math.round((m.clientes / m.contactados) * 100)} %)</span> : null}</td>
                    <td className="text-xs text-niebla">{m.descartados}{Object.keys(m.motivos).length ? ' · ' + Object.entries(m.motivos).map(([k, v]) => `${k.replace('_', ' ')} ${v}`).join(', ') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
