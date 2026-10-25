import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { verDocumentos, enlaceDocumento, mapaReportes, base, CLASES, type ClaseReporte, type ReporteMapa } from '@/lib/documentos';
import { RESPONSABLES, verTareas, type Tarea } from '@/lib/tareas';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const diaLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const diaHora = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const ORDEN_CLASES: ClaseReporte[] = ['arranque', 'mapa', 'plan', 'auditoria', 'decisiones', 'otro'];

/** Dónde vive cada tipo de conocimiento: el mapa que karc0 pidió para que nada quede desperdigado (19/10). */
const MAPA = [
  { zona: 'Reportes', href: '/admin-dkitchen/reportes', que: 'Lo que se hizo y lo que manda ahora: arranques, mapas, planes y auditorías, con fecha y sus tareas.' },
  { zona: 'Documentos', href: '/admin-dkitchen/documentos', que: 'La biblioteca del escritorio por bloques (ventas, publicar, referencia, bitácora…). Copia de consulta.' },
  { zona: 'Decisiones', href: '/admin-dkitchen/decisiones', que: 'Lo que eliges tú, con fecha y dónde quedó aplicado.' },
  { zona: 'Mis tareas', href: '/admin-dkitchen/tareas', que: 'Lo que hay que hacer, quién y cuándo. Cada tarea enlaza al reporte del que sale.' },
];

/**
 * Central → Reportes (17/10, rehecha el 19/10): la memoria del proyecto en un solo sitio y con orden.
 * Arriba lo VIGENTE (último arranque, último mapa y la instrucción fija); debajo, filtro por clase y la
 * línea del tiempo, con cada reporte marcado vigente/superado y las tareas que salen de él.
 */
export default async function Reportes({ searchParams }: { searchParams: Promise<{ clase?: string; q?: string }> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const [lista, tareas] = await Promise.all([verDocumentos(jwt, 'reporte').catch(() => null), verTareas(jwt).catch(() => [] as Tarea[])]);
  const todos = mapaReportes(lista ?? []);
  const clase = (ORDEN_CLASES as string[]).includes(sp.clase ?? '') ? (sp.clase as ClaseReporte) : null;
  const q = (sp.q ?? '').trim().toLowerCase().slice(0, 80);
  const vista = todos.filter((r) => (!clase || r.clase === clase) && (!q || `${r.titulo} ${r.resumen ?? ''}`.toLowerCase().includes(q)));
  const dias = [...new Set(vista.map((r) => r.fecha ?? 'sin-fecha'))].sort().reverse();

  // Tareas ligadas: la tarea apunta al reporte o a su copia del escritorio (mismo nombre base).
  const tareasDe = (r: ReporteMapa) => tareas.filter((t) => t.docCentral && base(t.docCentral) === base(r.ruta));
  const vigentes = ORDEN_CLASES.flatMap((c) => (c === 'arranque' || c === 'mapa' ? todos.filter((r) => r.clase === c && r.vigente) : []));
  const cuenta = (c: ClaseReporte) => todos.filter((r) => r.clase === c).length;
  const href = (c: ClaseReporte | null) => `/admin-dkitchen/reportes${c ? `?clase=${c}` : ''}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-oro/20 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Memoria del proyecto</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Reportes</h1>
        <p className="relative mt-2 max-w-xl text-sm text-white/70">Lo que manda hoy arriba; debajo, todo lo hecho por fecha y por clase. Viven en la base: si el chat o el escritorio se pierden, siguen aquí.</p>
        <div className="relative mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
          <p className="font-display text-4xl font-semibold text-oro">{todos.length}<span className="ml-2 text-base font-normal text-white/60">{todos.length === 1 ? 'reporte' : 'reportes'}</span></p>
          <p className="font-display text-2xl font-semibold">{todos.filter((r) => r.vigente).length}<span className="ml-2 text-sm font-normal text-white/60">vigentes · {todos.filter((r) => !r.vigente).length} superados</span></p>
        </div>
      </header>

      {/* Mapa de Conocimiento: qué va en cada sitio */}
      <nav aria-label="Dónde está cada cosa" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MAPA.map((m) => (
          <Link key={m.href} href={m.href} className={`rounded-[22px] border p-4 transition hover:border-oro ${m.zona === 'Reportes' ? 'border-oro bg-white' : 'border-linea bg-white/60'}`}>
            <p className="font-display text-lg font-semibold">{m.zona}{m.zona === 'Reportes' && <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">aquí</span>}</p>
            <p className="mt-1 text-xs leading-relaxed text-niebla">{m.que}</p>
          </Link>
        ))}
      </nav>

      {lista === null && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudieron leer los reportes.</p>}

      {/* Lo que manda ahora */}
      {!clase && !q && (vigentes.length > 0) && (
        <section className="rounded-[26px] border-2 border-oro/70 bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Vigente ahora · empieza por aquí</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {vigentes.map((r) => (
              <Link key={r.ruta} href={enlaceDocumento(r.ruta)} className="group rounded-[20px] bg-papel p-4 [overflow-wrap:anywhere] hover:bg-crema">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-niebla">{CLASES[r.clase].nombre}</p>
                <p className="font-display mt-1 font-semibold leading-snug group-hover:text-vino">{r.titulo}</p>
                <p className="mt-2 text-xs text-niebla">Actualizado {diaHora.format(new Date(r.actualizadoEn))}</p>
              </Link>
            ))}
            <Link href={enlaceDocumento('00_DIRECTOR_LANZAMIENTO.md')} className="group rounded-[20px] bg-papel p-4 [overflow-wrap:anywhere] hover:bg-crema">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-niebla">Instrucción fija</p>
              <p className="font-display mt-1 font-semibold leading-snug group-hover:text-vino">Director de lanzamiento: vender primero, una prioridad al día</p>
              <p className="mt-2 text-xs text-niebla">El «Siguiente» de cada día está en Lanzamiento → Ruta</p>
            </Link>
          </div>
        </section>
      )}

      <GuiaZona titulo="Reportes" ancla="reportes"
        que="Claude deja aquí un reporte fechado al terminar cada fase de trabajo, con su clase. Los arranques y los mapas se sustituyen: solo manda el último y los anteriores quedan como «Superado». Cada reporte enseña las tareas que salen de él."
        pasos={['Empieza por «Vigente ahora».', 'Filtra por clase (planes, auditorías…) o busca por palabra.', 'Si algo no cuadra: contesta en Decisiones o deja una nota en la tarea ligada. Los reportes no se editan: son el registro.']} />

      {/* Filtro por clase + búsqueda */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href(null)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${!clase ? 'bg-tinta text-white' : 'bg-white text-carbon ring-1 ring-linea hover:ring-oro'}`}>Todos <span className="tabular-nums opacity-70">{todos.length}</span></Link>
        {ORDEN_CLASES.filter((c) => cuenta(c)).map((c) => (
          <Link key={c} href={href(c)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${clase === c ? 'bg-tinta text-white' : 'bg-white text-carbon ring-1 ring-linea hover:ring-oro'}`}>{CLASES[c].nombre} <span className="tabular-nums opacity-70">{cuenta(c)}</span></Link>
        ))}
        <form className="ml-auto flex min-w-[220px] flex-1 gap-2 sm:flex-none">
          {clase && <input type="hidden" name="clase" value={clase} />}
          <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar en reportes…" maxLength={80} className="min-w-0 flex-1 rounded-full border border-acero bg-white px-4 py-1.5 text-sm outline-none focus:border-tinta" />
        </form>
      </div>
      {clase && <p className="-mt-3 text-sm text-niebla">{CLASES[clase].que}</p>}

      {lista && !vista.length && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">{todos.length ? 'Nada con ese filtro.' : 'Todavía no hay reportes.'}</p>}

      {/* Línea del tiempo */}
      <ol className="relative space-y-8 border-l border-linea pl-5 sm:pl-7">
        {dias.map((d) => (
          <li key={d} className="relative space-y-3">
            <span aria-hidden className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-oro sm:-left-[33px]" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-vino first-letter:uppercase">{d === 'sin-fecha' ? 'Sin fecha' : diaLargo.format(new Date(`${d}T12:00:00Z`))}</h2>
            <ul className="space-y-3">
              {vista.filter((r) => (r.fecha ?? 'sin-fecha') === d).map((r) => <Ficha key={r.ruta} r={r} tareas={tareasDe(r)} todos={todos} />)}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Ficha({ r, tareas, todos }: { r: ReporteMapa; tareas: Tarea[]; todos: ReporteMapa[] }) {
  const abiertas = tareas.filter((t) => t.estado !== 'hecha');
  const sustituto = r.superadoPor ? todos.find((x) => x.ruta === r.superadoPor) : null;
  return (
    <li className={`rounded-[22px] border bg-white p-5 transition [overflow-wrap:anywhere] hover:border-oro ${r.vigente ? 'border-linea' : 'border-dashed border-acero opacity-75'}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
        <span className="rounded-full bg-papel px-2.5 py-1 text-vino">{CLASES[r.clase].nombre}</span>
        {r.vigente ? <span className="rounded-full bg-oro/20 px-2.5 py-1 text-carbon">Vigente</span> : <span className="rounded-full bg-acero/40 px-2.5 py-1 text-carbon">Superado</span>}
        {tareas.length > 0 && (abiertas.length ? <span className="rounded-full bg-noche px-2.5 py-1 text-white">{abiertas.length} {abiertas.length === 1 ? 'tarea abierta' : 'tareas abiertas'} · {tareas.length - abiertas.length} {tareas.length - abiertas.length === 1 ? 'hecha' : 'hechas'}</span> : <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-white">Cumplido · {tareas.length} {tareas.length === 1 ? 'tarea hecha' : 'tareas hechas'}</span>)}
      </div>
      <Link href={enlaceDocumento(r.ruta)} className="group mt-2 block">
        <p className="font-display text-xl font-semibold leading-snug group-hover:text-vino">{r.titulo}</p>
        {r.resumen && <p className="mt-1.5 text-sm leading-relaxed text-niebla">{r.resumen}</p>}
        <p className="mt-3 text-xs font-semibold text-vino">Leer el reporte →</p>
      </Link>
      {sustituto && <p className="mt-2 text-xs text-niebla">Lo sustituye: <Link href={enlaceDocumento(sustituto.ruta)} className="font-semibold text-vino underline">{sustituto.titulo}</Link></p>}
      {abiertas.length > 0 && (
        <details className="mt-3 rounded-2xl bg-papel/70">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold">Tareas abiertas que salen de aquí</summary>
          <ul className="space-y-1.5 px-4 pb-3 text-sm">
            {abiertas.slice(0, 8).map((t) => (
              <li key={t.id} className="flex flex-wrap justify-between gap-x-3">
                <Link href={`/admin-dkitchen/tareas#t-${t.id}`} className="min-w-0 flex-1 break-words hover:text-vino">{t.titulo}</Link>
                <span className="text-xs text-niebla">{t.responsable === 'claude' ? 'Claude' : (RESPONSABLES[t.responsable] ?? t.responsable)}{t.paraCuando ? ` · ${t.paraCuando.slice(8, 10)}/${t.paraCuando.slice(5, 7)}` : ''}</span>
              </li>
            ))}
            {abiertas.length > 8 && <li className="text-xs text-niebla">y {abiertas.length - 8} más en Mis tareas</li>}
          </ul>
        </details>
      )}
    </li>
  );
}