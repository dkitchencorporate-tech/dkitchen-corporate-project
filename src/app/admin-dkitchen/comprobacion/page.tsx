import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { esComercialActual } from '@/lib/rol-central';
import { leerComprobacion, guardarPunto, ESTADOS_C, GRUPOS, type EstadoC, type Grupo, type ServicioC } from '@/lib/comprobacion';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const RUTA = '/admin-dkitchen/comprobacion';
const COLOR: Record<EstadoC, string> = { ok: '#2F8F6B', falla: '#B3261E', pendiente: '#D9B25C', no_iniciado: '#9A9EA6' };
const CHIP: Record<EstadoC, string> = {
  ok: 'bg-exito text-white', falla: 'bg-red-600 text-white', pendiente: 'bg-oro text-noche', no_iniciado: 'bg-acero/30 text-carbon',
};
const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

async function guardarAction(f: FormData) {
  'use server';
  const jwt = await exigirAdmin();
  if (await esComercialActual(jwt)) redirect('/admin-dkitchen/inicio');
  const s = String(f.get('s') ?? ''), p = String(f.get('p') ?? '');
  let e = '';
  try {
    await guardarPunto(s, p, { estado: String(f.get('estado') ?? ''), nota: String(f.get('nota') ?? '').trim(), evidencia: String(f.get('evidencia') ?? '').trim() }, 'Alex');
  } catch { e = '1'; }
  revalidatePath(RUTA);
  redirect(`${RUTA}?s=${encodeURIComponent(s)}${e ? '&e=1' : '&ok=1'}#p-${p}`);
}

const cuenta = (s: ServicioC) => Object.fromEntries(ESTADOS_C.map((e) => [e.id, s.puntos.filter((p) => p.estado === e.id).length])) as Record<EstadoC, number>;

function Barra({ s }: { s: ServicioC }) {
  const c = cuenta(s), n = s.puntos.length || 1;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10" aria-label={`${c.ok} OK, ${c.falla} fallan, ${c.pendiente} pendientes, ${c.no_iniciado} sin iniciar`}>
      {ESTADOS_C.map((e) => <span key={e.id} style={{ width: `${(c[e.id] / n) * 100}%`, background: COLOR[e.id] }} />)}
    </div>
  );
}

/** Central → Comprobación (remapeo final 81f7ea99): qué es real y funciona, qué falla y qué no existe, servicio por servicio. */
export default async function Comprobacion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  if (await esComercialActual(jwt)) redirect('/admin-dkitchen/inicio');
  const sp = await searchParams;
  const { datos, ok } = await leerComprobacion();
  const sel = datos.servicios.find((s) => s.id === sp.s) ?? null;
  const total = datos.servicios.flatMap((s) => s.puntos);
  const t = (e: EstadoC) => total.filter((p) => p.estado === e).length;
  const cifras: [string, number, EstadoC][] = [['OK', t('ok'), 'ok'], ['Fallan', t('falla'), 'falla'], ['Pendientes', t('pendiente'), 'pendiente'], ['Sin iniciar', t('no_iniciado'), 'no_iniciado']];
  const fallas = datos.servicios.flatMap((s) => s.puntos.filter((p) => p.estado === 'falla').map((p) => ({ s, p })));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-vino/50 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Lanzamiento</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Comprobación</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-white/70">Remapeo final sin concesiones: cada servicio recorrido desde cero, como un cliente real y como dirección. Lo que funciona, lo que falla y lo que todavía no existe.</p>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {cifras.map(([k, v, e]) => (
            <div key={k} className="rounded-2xl bg-white/[0.06] px-2 py-3 ring-1 ring-white/10">
              <dd className="font-display text-2xl font-semibold sm:text-3xl" style={{ color: COLOR[e] }}>{v}</dd>
              <dt className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/60 sm:text-[11px]">{k}</dt>
            </div>
          ))}
        </dl>
        {datos.actualizado && <p className="relative mt-4 text-xs text-white/50">Última actualización: {dia.format(new Date(datos.actualizado))}</p>}
      </header>

      {!ok && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">No se pudo leer la comprobación guardada. No guardes cambios hasta que vuelva a cargar.</p>}
      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">Guardado.</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">No se pudo guardar. Inténtalo de nuevo.</p>}

      <GuiaZona titulo="Comprobación" ancla="comprobacion"
        que="El checklist de cada servicio: entrada externa (landing → pago → factura y contrato → cuenta → panel), desde Central (alta → tablero → baja), venta y los puntos robustos (precio, móvil, velocidad, seguridad, legales). Claude lo rellena con las pruebas automáticas del repositorio de pruebas; tú puedes cambiar cualquier punto."
        pasos={['Elige un servicio en la lista.', 'En cada punto pulsa OK, Falla, Pendiente o No iniciado; añade una nota y, si la tienes, la evidencia (enlace o captura).', 'Abajo, en «Ruta priorizada», están todos los fallos juntos: eso es lo que se arregla primero.']} />

      <section aria-label="Servicios" className="grid gap-3 sm:grid-cols-2">
        {datos.servicios.map((s) => {
          const c = cuenta(s);
          return (
            <Link key={s.id} href={`${RUTA}?s=${s.id}#detalle`} aria-current={sel?.id === s.id ? 'page' : undefined}
              className={`block rounded-2xl bg-noche p-4 text-white ring-1 transition hover:ring-oro/60 ${sel?.id === s.id ? 'ring-oro' : 'ring-white/10'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{s.nombre}</p>
                <p className="shrink-0 text-xs text-white/60">{s.precio}</p>
              </div>
              <div className="mt-3"><Barra s={s} /></div>
              <p className="mt-2 text-xs text-white/60">{c.ok} OK · {c.falla} fallan · {c.pendiente} pendientes · {c.no_iniciado} sin iniciar</p>
            </Link>
          );
        })}
      </section>

      {sel && (
        <section id="detalle" aria-label={sel.nombre} className="space-y-5">
          <h2 className="font-display text-2xl font-semibold">{sel.nombre} <span className="text-base font-normal text-carbon/60">· {sel.precio}</span></h2>
          {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
            <div key={g} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">{g} · {GRUPOS[g]}</h3>
              {sel.puntos.filter((p) => p.grupo === g).map((p) => (
                <form key={p.id} id={`p-${p.id}`} action={guardarAction} className="scroll-mt-24 rounded-2xl border border-linea bg-white p-4">
                  <input type="hidden" name="s" value={sel.id} />
                  <input type="hidden" name="p" value={p.id} />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium">{p.texto}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${CHIP[p.estado]}`}>{ESTADOS_C.find((e) => e.id === p.estado)?.nombre}</span>
                  </div>
                  <textarea name="nota" defaultValue={p.nota} rows={p.nota.length > 120 ? 4 : 2} placeholder="Nota: qué pasa exactamente"
                    className="mt-3 w-full rounded-xl border border-linea p-2.5 text-base sm:text-sm" />
                  <input name="evidencia" defaultValue={p.evidencia} placeholder="Evidencia: enlace, ejecución de pruebas o captura"
                    className="mt-2 w-full rounded-xl border border-linea p-2.5 text-base sm:text-sm" />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {ESTADOS_C.map((e) => (
                      <button key={e.id} name="estado" value={e.id}
                        className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ring-1 ring-linea ${p.estado === e.id ? CHIP[e.id] : 'bg-crema text-carbon hover:ring-vino'}`}>{e.nombre}</button>
                    ))}
                    {p.fecha && <span className="ml-auto text-[11px] text-carbon/50">{p.por} · {dia.format(new Date(p.fecha))}</span>}
                  </div>
                </form>
              ))}
            </div>
          ))}
        </section>
      )}

      <section aria-label="Ruta priorizada" className="rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <h2 className="font-display text-2xl font-semibold">Ruta priorizada</h2>
        <p className="mt-1 text-sm text-white/60">Todo lo que falla, servicio por servicio. Es lo primero que se arregla; después, lo pendiente y lo que no existe.</p>
        {fallas.length === 0 ? <p className="mt-4 text-sm text-white/70">Nada marcado como fallo todavía.</p> : (
          <ol className="mt-4 space-y-2">
            {fallas.map(({ s, p }) => (
              <li key={s.id + p.id}>
                <Link href={`${RUTA}?s=${s.id}#p-${p.id}`} className="block rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10 hover:ring-red-400/60">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-oro">{s.nombre}</span>
                  <span className="mt-0.5 block text-sm">{p.texto}</span>
                  {p.nota && <span className="mt-1 block text-xs text-white/60">{p.nota.slice(0, 220)}</span>}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
