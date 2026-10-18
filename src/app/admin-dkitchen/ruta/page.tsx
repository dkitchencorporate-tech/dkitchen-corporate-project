import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { verRuta, progreso, estadoHito, PESO, type Hito, type EstadoHito } from '@/lib/ruta';
import { verTareas } from '@/lib/tareas';
import { tareasDeHoy } from '@/lib/tareas-hoy';
import { verDecisiones } from '@/lib/decisiones';
import { QR_MENU, FUNDADOR, BASE_OPERATIVA, EXPERIENCE, AUDITORIA_CANALES } from '@/lib/pricing-config';
import GuiaZona from '@/components/admin/GuiaZona';
import SimuladorIngresos from '@/components/admin/SimuladorIngresos';
import { valorHitoAction } from './actions';

export const dynamic = 'force-dynamic';

const diaCorto = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const num = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
const ESTADO: Record<EstadoHito, { txt: string; clase: string }> = {
  hecho: { txt: 'Hecho', clase: 'bg-exito text-white' },
  atrasado: { txt: 'Atrasado', clase: 'bg-red-600 text-white' },
  en_curso: { txt: 'Esta semana', clase: 'bg-oro text-noche' },
  proximo: { txt: 'Próximo', clase: 'bg-papel text-carbon ring-1 ring-linea' },
};
const COLOR: Record<string, string> = { auto: 'bg-exito', parcial: 'bg-oro', manual: 'bg-acero', falta: 'bg-red-600' };
const LEYENDA: Record<string, string> = { auto: 'Automático', parcial: 'A medias', manual: 'Manual', falta: 'Falta' };

/** Central → Ruta de lanzamiento (0085, 18/10/2026): dónde está de verdad el proyecto, de un vistazo. */
export default async function RutaLanzamiento({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const [ruta, tareas, decisiones] = await Promise.all([
    verRuta(jwt).catch(() => null), verTareas(jwt).catch(() => null), verDecisiones(jwt).catch(() => null),
  ]);
  if (!ruta) return <p className="m-10 rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudo leer la ruta.</p>;

  const { hoy, kpis, hitos, productos } = ruta;
  const global = hitos.length ? Math.round((hitos.reduce((s, h) => s + progreso(h), 0) / hitos.length) * 100) : 0;
  const hechos = hitos.filter((h) => estadoHito(h, hoy) === 'hecho').length;
  const atrasados = hitos.filter((h) => estadoHito(h, hoy) === 'atrasado').length;
  const siguiente = hitos.find((h) => estadoHito(h, hoy) !== 'hecho');
  const diasA = (f: string) => Math.round((Date.parse(f) - Date.parse(hoy)) / 86400000);
  // Mismo criterio que Mis tareas → Hoy (lo tuyo y lo de Claude de hoy o atrasado).
  const deHoy = tareas ? tareasDeHoy(tareas) : null;
  const urgentes = deHoy ? deHoy.mias.length + deHoy.claude.length : 0;
  const porDecidir = decisiones?.filter((d) => d.estado === 'pendiente').length ?? 0;
  const codigos = [...new Set(hitos.map((h) => h.codigo))];
  const prods = [...new Set(productos.map((p) => p.producto))];
  const metaMrr = hitos.filter((h) => h.metrica === 'mrr_euros').map((h) => h.meta).sort((a, b) => b - a)[0] ?? 1000;
  const L = QR_MENU.planes;
  const kpi: [string, string, string][] = [
    ['Clientes de pago', num(kpis.clientes_pago ?? 0), 'reales, sin demos'],
    ['MRR', `${num(kpis.mrr_euros ?? 0)} €`, 'al mes, sin IVA'],
    ['Propuestas enviadas', num(kpis.propuestas_enviadas ?? 0), `de ${num(kpis.prospectos ?? 0)} prospectos`],
    ['Propuestas abiertas', num(kpis.propuestas_vistas ?? 0), 'por el local'],
    ['Locales visitados', num(kpis.locales_visitados ?? 0), 'anotados en Prospección'],
    ['Contactos web', num(kpis.contactos_web ?? 0), 'desde el 17/10'],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      {/* Termómetro */}
      <header className="relative overflow-hidden rounded-[30px] bg-noche p-6 text-white sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-vino/50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-64 w-64 rounded-full bg-oro/15 blur-3xl" />
        <div className="relative grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-oro">Central · Salida a mercado</p>
            <h1 className="font-display mt-2 text-3xl font-semibold md:text-5xl">Ruta de lanzamiento</h1>
            <p className="mt-3 max-w-xl text-sm text-white/70">Dónde estamos de verdad: cada hito con su meta, su fecha y su dato real. Lo automático se calcula solo; lo manual lo actualizas aquí.</p>
            {siguiente && (
              <a href={`#h-${siguiente.id}`} className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl md:inline-flex bg-white/[0.07] px-4 py-3 text-sm ring-1 ring-white/10 hover:ring-oro/50">
                <span className="text-oro">Siguiente</span>
                <span className="font-semibold">{siguiente.codigo} · {siguiente.titulo}</span>
                <span className="text-white/60">{diasA(siguiente.fecha) < 0 ? `atrasado ${-diasA(siguiente.fecha)} d` : diasA(siguiente.fecha) === 0 ? 'hoy' : `en ${diasA(siguiente.fecha)} d`}</span>
                {siguiente.tareas.find((t) => t.estado !== 'hecha') && <span className="basis-full text-white/80">Tarea: {siguiente.tareas.find((t) => t.estado !== 'hecha')!.titulo.slice(0, 90)}</span>}
              </a>
            )}
          </div>
          {/* 19/10 (karc0 en el móvil): en vertical el termómetro dejaba media pantalla vacía → en móvil, barra horizontal */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-5">
            <div className="relative hidden h-44 w-10 overflow-hidden md:block rounded-full bg-white/10 ring-1 ring-white/15" role="img" aria-label={`Avance global ${global} %`}>
              <div className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-vino via-vino to-oro transition-all" style={{ height: `${Math.max(global, 4)}%` }} />
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1 md:block">
              <p className="font-display text-5xl font-semibold leading-none text-oro md:text-6xl">{global}<span className="text-2xl">%</span></p>
              <p className="text-sm text-white/70 md:mt-2">{hechos} de {hitos.length} hitos hechos</p>
              {atrasados > 0 && <p className="text-sm font-semibold text-red-300 md:mt-1">{atrasados} {atrasados === 1 ? 'atrasado' : 'atrasados'}</p>}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 md:hidden" role="img" aria-label={`Avance global ${global} %`}>
              <div className="h-full rounded-full bg-gradient-to-r from-vino via-vino to-oro" style={{ width: `${Math.max(global, 3)}%` }} />
            </div>
          </div>
        </div>
      </header>

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">Dato actualizado.</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">No se pudo guardar el dato.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin-dkitchen/tareas?zona=hoy" className="flex items-center justify-between rounded-[22px] border-2 border-red-600/70 bg-white p-4 text-sm">
          <span><span className="font-display text-2xl font-semibold text-red-700">{urgentes}</span> <span className="font-semibold">tareas para hoy (tuyas y de Claude)</span></span><span className="text-red-700">Ver →</span>
        </Link>
        <Link href="/admin-dkitchen/decisiones" className="flex items-center justify-between rounded-[22px] border border-oro bg-papel p-4 text-sm">
          <span><span className="font-display text-2xl font-semibold text-vino">{porDecidir}</span> <span className="font-semibold">decisiones esperan tu respuesta</span></span><span className="text-vino">Ver →</span>
        </Link>
      </div>

      <GuiaZona titulo="Ruta de lanzamiento" ancla="ruta"
        que="El termómetro es la media del avance de todos los hitos. Cada hito tiene una meta y una fecha; los datos de clientes, MRR, propuestas, visitas y contactos salen solos de la base. Los manuales (publicaciones, testimonio, anuncios) los actualizas tú aquí."
        pasos={['Mira el «Siguiente» de arriba: es lo único que importa hoy.', 'Si un hito es manual, escribe el dato real y pulsa «Guardar». Los que dicen «avanza al cerrar sus tareas» se mueven solos al tachar sus tareas.', 'Para que cuenten las propuestas y las visitas, anota cada contacto en Central → Prospección.', 'Abajo: qué está automatizado en cada producto y un simulador de ingresos.']} />

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpi.map(([t, v, s]) => (
          <div key={t} className="rounded-[22px] border border-linea bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">{t}</p>
            <p className="font-display mt-1 text-3xl font-semibold">{v}</p>
            <p className="text-xs text-niebla">{s}</p>
          </div>
        ))}
      </section>

      {/* Hitos */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Hitos</h2>
        <ol className="relative space-y-4 border-l-2 border-linea pl-5 sm:pl-7">
          {codigos.map((cod) => {
            const grupo = hitos.filter((h) => h.codigo === cod);
            const ok = grupo.every((h) => estadoHito(h, hoy) === 'hecho');
            return (
              <li key={cod} className="relative">
                <span className={`absolute -left-[31px] top-4 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold sm:-left-[39px] ${ok ? 'bg-exito text-white' : 'bg-noche text-oro'}`}>{ok ? '✓' : cod.replace('H', '')}</span>
                <div className="rounded-[24px] border border-linea bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">{cod} · {grupo[0].fase}</p>
                  <ul className="mt-3 space-y-4">{grupo.map((h) => <FilaHito key={h.id} h={h} hoy={hoy} />)}</ul>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Matriz de productos */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Qué está automatizado</h2>
          <p className="flex flex-wrap gap-3 text-xs text-niebla">{Object.entries(LEYENDA).map(([k, t]) => <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${COLOR[k]}`} />{t}</span>)}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {prods.map((pr) => {
            const caps = productos.filter((p) => p.producto === pr);
            const pct = Math.round((caps.reduce((s, c) => s + PESO[c.estado], 0) / caps.length) * 100);
            return (
              <div key={pr} className="rounded-[24px] border border-linea bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-xl font-semibold">{pr}</p>
                  <p className="font-display text-2xl font-semibold text-vino">{pct}%</p>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-papel">
                  {caps.map((c) => <span key={c.capacidad} className={`${COLOR[c.estado]} border-r border-white last:border-0`} style={{ width: `${100 / caps.length}%` }} />)}
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {caps.map((c) => (
                    <li key={c.capacidad} className="flex gap-2.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${COLOR[c.estado]}`} title={LEYENDA[c.estado]} />
                      <span><span className="font-semibold">{c.capacidad}</span>{c.nota && <span className="text-niebla"> · {c.nota}</span>}
                        {c.tareas.map((t) => <a key={t.id} href={`/admin-dkitchen/tareas?zona=claude#t-${t.id}`} className="mt-1 block text-xs text-vino underline-offset-2 hover:underline">→ {t.titulo.slice(0, 70)}{t.pasa_a ? ` (al cerrarla: ${LEYENDA[t.pasa_a] ?? t.pasa_a})` : ''}</a>)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Simulador */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Simulador de ingresos</h2>
        <div className="rounded-[26px] border border-linea bg-white p-5 sm:p-7">
          <SimuladorIngresos metaMrr={metaMrr} mrrReal={kpis.mrr_euros ?? 0}
            p={{ carta: L.basico.mensual, local: L.ampliado.mensual, sala: L.sala.mensual, fundador: FUNDADOR.mensual,
              signatureEntrada: BASE_OPERATIVA.pagoUnico, signatureMensual: BASE_OPERATIVA.mantenimiento.mensual,
              experience: EXPERIENCE.tarifas.primeraVez.precio, auditoria: AUDITORIA_CANALES.precioOferta }} />
        </div>
      </section>
    </div>
  );
}

function FilaHito({ h, hoy }: { h: Hito; hoy: string }) {
  const e = estadoHito(h, hoy);
  const pct = Math.round(progreso(h) * 100);
  return (
    <li id={`h-${h.id}`} className="scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 flex-1 font-semibold">{h.titulo}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ESTADO[e].clase}`}>{ESTADO[e].txt}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-papel"><div className={`h-full rounded-full ${e === 'hecho' ? 'bg-exito' : e === 'atrasado' ? 'bg-red-600' : 'bg-vino'}`} style={{ width: `${Math.max(pct, 2)}%` }} /></div>
        <span className="w-28 shrink-0 text-right text-sm"><span className="font-display text-lg font-semibold">{num(h.valor)}</span><span className="text-niebla"> / {num(h.meta)} {h.unidad}</span></span>
      </div>
      <p className="mt-1 text-xs text-niebla">{diaCorto.format(new Date(`${h.fecha}T12:00:00Z`))} · {h.metrica === 'tareas' ? 'avanza al cerrar sus tareas' : h.metrica ? 'automático' : 'manual'}{h.detalle ? ` · ${h.detalle}` : ''}</p>
      {h.tareas.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {h.tareas.map((t) => (
            <li key={t.id}><a href={`/admin-dkitchen/tareas?zona=${t.estado === 'hecha' ? 'resueltas' : t.responsable === 'claude' || t.responsable === 'antigravity' ? 'claude' : 'mias'}#t-${t.id}`}
              className={`hover:underline ${t.estado === 'hecha' ? 'text-niebla line-through' : 'text-carbon'}`}>{t.estado === 'hecha' ? '✓' : '○'} {t.titulo.slice(0, 90)}</a></li>
          ))}
        </ul>
      )}
      {!h.metrica && e !== 'hecho' && (
        <form action={valorHitoAction} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="id" value={h.id} />
          <input name="valor" inputMode="decimal" defaultValue={String(h.valor)} aria-label={`Dato real de ${h.titulo}`} className="w-24 rounded-xl border border-acero bg-white px-3 py-1.5 text-sm" />
          <button className="rounded-full bg-tinta px-4 py-1.5 text-xs font-semibold text-white">Guardar</button>
        </form>
      )}
    </li>
  );
}
