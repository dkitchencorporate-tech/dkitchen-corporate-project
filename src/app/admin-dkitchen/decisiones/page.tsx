import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { verDecisiones, faseDe, FASES, type Decision, type FaseDecision } from '@/lib/decisiones';
import { enlaceDocumento } from '@/lib/documentos';
import GuiaZona from '@/components/admin/GuiaZona';
import { decidirAction, reabrirDecisionAction } from './actions';

export const dynamic = 'force-dynamic';

const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const cuando = (x?: string | null) => (x ? dia.format(new Date(x)) : '');
const OK: Record<string, string> = { decidida: 'Decidido. Si escribiste un matiz, pasa a «En comunicación» hasta que Claude responda; si no, a «Decidido».', aplazada: 'Aplazada. Sigue en «Por decidir».', reabierta: 'Reabierta: vuelve a «Por decidir».' };
const ERR: Record<string, string> = { elige: 'Elige una opción.', otra: 'Escribe tu respuesta para «Otra».', base: 'No se pudo guardar. Inténtalo de nuevo.' };

/** Central → Decisiones (0083): lo que necesita una respuesta de karc0, con la recomendación de Claude marcada. */
export default async function Decisiones({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const lista = await verDecisiones(jwt).catch(() => null);
  const pendientes = lista?.filter((d) => faseDe(d) === 'por_decidir') ?? [];
  const decididas = lista?.filter((d) => faseDe(d) !== 'por_decidir') ?? [];
  // 18/10 (karc0): submenú por fase, como en Comunicación; cada paso con fecha y hora.
  const cuenta = (k: FaseDecision) => lista?.filter((d) => faseDe(d) === k).length ?? 0;
  const fase = ((Object.keys(FASES) as FaseDecision[]).find((k) => k === sp.f) ?? (pendientes.length ? 'por_decidir' : cuenta('comunicacion') ? 'comunicacion' : 'decidida')) as FaseDecision;
  const fechaDe = (d: Decision) => d.resuelta_en ?? d.respuesta_claude_en ?? d.decidido_en ?? d.creado_en;
  const visibles = (lista ?? []).filter((d) => faseDe(d) === fase)
    .sort((a, b) => (fase === 'por_decidir' ? 0 : fechaDe(b).localeCompare(fechaDe(a))));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-oro/25 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Tú decides</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Decisiones</h1>
        <p className="relative mt-2 max-w-xl text-sm text-white/70">Cada punto que necesita tu respuesta, con su contexto y mi recomendación marcada. Elige, escribe la tuya o aplázala: lo leo al empezar cada sesión.</p>
        <p className="relative mt-5 font-display text-4xl font-semibold text-oro">{pendientes.length}<span className="ml-2 text-base font-normal text-white/60">por decidir · {decididas.length} decididas ({cuenta('resuelta')} ya resueltas)</span></p>
      </header>

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">{OK[sp.ok] ?? 'Guardado.'}</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERR[sp.e] ?? 'No se pudo guardar.'}</p>}

      <GuiaZona titulo="Decisiones" ancla="decisiones"
        que="Lo que Claude no puede decidir por ti: textos de la web, prioridades, gastos, proveedores. Cada decisión tomada se convierte en una tarea en Mis tareas."
        pasos={['Lee el contexto y las opciones. La recomendada lleva la marca «Recomendada».', 'Elige una y pulsa «Decidir». Si quieres matizar, escribe en la caja de debajo.', 'Si no te convence ninguna, elige «Otra» y escribe la tuya. Si no es el momento, «Aplazar».']} />

      {!lista && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudieron leer las decisiones.</p>}
      <nav aria-label="Fase de las decisiones" className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(FASES) as FaseDecision[]).map((k) => (
          <a key={k} href={`/admin-dkitchen/decisiones?f=${k}`} aria-current={fase === k ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold ${fase === k ? 'bg-tinta text-white' : 'border border-acero bg-white'}`}>
            {FASES[k]} <span className={`rounded-full px-1.5 text-[11px] ${k === 'por_decidir' && cuenta(k) ? 'bg-vino text-white' : fase === k ? 'bg-white/20' : 'bg-papel'}`}>{cuenta(k)}</span>
          </a>
        ))}
      </nav>
      {lista && !visibles.length && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Nada en este apartado.</p>}
      {fase === 'por_decidir'
        ? <ol className="space-y-4">{visibles.map((d, i) => <Pendiente key={d.id} d={d} n={i + 1} />)}</ol>
        : <ul className="space-y-2">{visibles.map((d) => <Decidida key={d.id} d={d} />)}</ul>}
    </div>
  );
}

function Pendiente({ d, n }: { d: Decision; n: number }) {
  return (
    <li id={`d-${d.id}`} className={`scroll-mt-6 rounded-[24px] bg-white p-5 sm:p-6 ${d.estado === 'aplazada' ? 'border border-acero' : 'border-2 border-oro/70'}`}>
      <div className="flex items-start gap-3">
        <span className="font-display text-2xl font-semibold leading-none text-oro">{String(n).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">{d.tema}{d.estado === 'aplazada' ? ' · aplazada' : ''} <span className="font-normal normal-case tracking-normal text-niebla">· creada el {cuando(d.creado_en)}</span></p>
          <h2 className="font-display mt-1 break-words text-xl font-semibold leading-snug">{d.titulo}</h2>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-carbon">{d.contexto}</p>
      {d.doc_ruta && <Link href={enlaceDocumento(d.doc_ruta)} className="mt-2 inline-block text-sm font-semibold text-vino underline">Ver el documento →</Link>}
      <form action={decidirAction} className="mt-4 space-y-2">
        <input type="hidden" name="id" value={d.id} />
        <fieldset className="space-y-2">
          <legend className="sr-only">Opciones</legend>
          {d.opciones.map((o) => (
            <label key={o.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 text-sm transition has-[:checked]:border-tinta has-[:checked]:bg-papel ${o.recomendada ? 'border-oro/60' : 'border-linea'}`}>
              <input type="radio" name="eleccion" value={o.id} defaultChecked={!!o.recomendada} className="mt-1 accent-[#6E0C2B]" />
              <span className="min-w-0">
                <span className="font-semibold">{o.texto}</span>
                {o.recomendada && <span className="ml-2 rounded-full bg-oro px-2 py-0.5 text-[11px] font-semibold text-noche">Recomendada</span>}
                {o.detalle && <span className="mt-0.5 block text-niebla">{o.detalle}</span>}
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer gap-3 rounded-2xl border border-dashed border-acero p-3.5 text-sm has-[:checked]:border-tinta has-[:checked]:bg-papel">
            <input type="radio" name="eleccion" value="otra" className="mt-1 accent-[#6E0C2B]" />
            <span className="font-semibold">Otra (escríbela abajo)</span>
          </label>
        </fieldset>
        <label className="block text-sm">Tu matiz o tu respuesta (opcional, salvo en «Otra»)
          <textarea name="respuesta" maxLength={4000} rows={2} defaultValue={d.respuesta_karc0 ?? ''} className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Decidir</button>
          <button name="aplazar" value="1" className="rounded-full border border-acero px-4 py-2.5 text-sm font-medium">Aplazar</button>
        </div>
      </form>
    </li>
  );
}

function Decidida({ d }: { d: Decision }) {
  const elegida = d.eleccion === 'otra' ? 'Otra' : d.opciones.find((o) => o.id === d.eleccion)?.texto ?? d.eleccion;
  return (
    <li id={`d-${d.id}`} className="scroll-mt-6 rounded-[20px] border border-linea bg-white">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm">
          <span className="text-exito">✓</span>
          <span className="min-w-0 flex-1 break-words font-semibold">{d.titulo}</span>
          <span className="rounded-full bg-papel px-2.5 py-0.5 text-[11px] font-semibold text-carbon">{FASES[faseDe(d)]}</span>
          <span className="text-xs text-niebla">{cuando(d.resuelta_en ?? d.respuesta_claude_en ?? d.decidido_en)}</span>
        </summary>
        <div className="space-y-2 border-t border-linea px-5 py-4 text-sm">
          <p><span className="font-semibold">Elegiste:</span> {elegida}</p>
          {d.respuesta_karc0 && <p className="whitespace-pre-wrap rounded-2xl bg-papel px-4 py-3">{d.respuesta_karc0}</p>}
          {d.nota_claude ? <p className="whitespace-pre-wrap border-l-[3px] border-vino pl-3 text-niebla">Claude: {d.nota_claude}</p>
            : faseDe(d) === 'comunicacion' ? <p className="text-niebla">Esperando la respuesta de Claude (la lee al empezar su sesión).</p> : null}
          <p className="flex flex-wrap gap-x-3 text-xs text-niebla">
            <span>Creada: {cuando(d.creado_en)}</span>
            {d.decidido_en && <span>Decidida: {cuando(d.decidido_en)}</span>}
            {d.respuesta_claude_en && <span>Respuesta de Claude: {cuando(d.respuesta_claude_en)}</span>}
            {d.resuelta_en && <span>Resuelta: {cuando(d.resuelta_en)}</span>}
          </p>
          <form action={reabrirDecisionAction}><input type="hidden" name="id" value={d.id} /><button className="rounded-full border border-acero px-4 py-1.5 text-xs font-medium">Reabrir</button></form>
        </div>
      </details>
    </li>
  );
}
