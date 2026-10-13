import { exigirAdmin } from '@/lib/guard-admin';
import { verTareas, BLOQUES, type Tarea } from '@/lib/tareas';
import GuiaZona from '@/components/admin/GuiaZona';
import { guardarTareaAction, materialAction } from './actions';

export const dynamic = 'force-dynamic';

const dia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
const OK: Record<string, string> = {
  hecha: 'Tachada. Claude lo verá al empezar su próxima sesión.', bloqueada: 'Marcada como bloqueada. Claude leerá tu nota.',
  pendiente: 'Reabierta.', material: 'Enviado al Buzón para Claude. Lo leerá al empezar su próxima sesión.',
};
const ERR: Record<string, string> = { datos: 'Datos no válidos.', base: 'No se pudo guardar. Inténtalo de nuevo.', corto: 'Escribe al menos unas palabras.', muchos: 'Demasiados mensajes en una hora.' };

/** Central → Mis tareas (0077): checklist interactivo del lanzamiento para karc0 + buzón privado de material. */
export default async function MisTareas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const tareas = await verTareas(jwt).catch(() => null);
  const hechas = tareas?.filter((t) => t.estado === 'hecha').length ?? 0;
  const total = tareas?.length ?? 0;
  const pct = total ? Math.round((hechas / total) * 100) : 0;
  const proxima = tareas?.find((t) => t.estado !== 'hecha');
  const grupos = Object.keys(BLOQUES).map((b) => [b, tareas?.filter((t) => t.bloque === b) ?? []] as const).filter(([, l]) => l.length);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-vino/40 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Lanzamiento</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Mis tareas</h1>
        <p className="relative mt-2 max-w-xl text-sm text-white/70">Lo que te toca a ti para salir. Táchalo al terminar o déjame una nota: lo leo al empezar cada sesión.</p>
        <div className="relative mt-6">
          <div className="flex items-end justify-between text-sm">
            <span className="font-display text-4xl font-semibold text-oro">{hechas}<span className="text-xl text-white/50"> / {total}</span></span>
            <span className="text-white/60">{pct} % hecho</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-oro transition-all" style={{ width: `${pct}%` }} /></div>
          {proxima && <p className="mt-4 text-sm text-white/80">Siguiente: <a href={`#t-${proxima.id}`} className="font-semibold text-white underline decoration-oro underline-offset-4">{proxima.titulo}</a></p>}
        </div>
      </header>

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">{OK[sp.ok] ?? 'Guardado.'}</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERR[sp.e] ?? 'No se pudo guardar.'}</p>}

      <GuiaZona titulo="Mis tareas" ancla="tareas"
        que="Claude apunta aquí todo lo que solo puedes hacer tú (cuentas, datos, revisiones, publicar). Cada cambio y cada nota se guardan en la base y Claude los lee al empezar su sesión."
        pasos={['Abre la tarea, hazla y pulsa «Hecha». Si quieres, deja una nota (qué hiciste, un dato, un enlace).', 'Si no puedes, pulsa «Bloqueada» y explica por qué.', 'Para pasarle archivos o carpetas de tu equipo, usa «Te dejo material» al final.']} />

      {!tareas && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudieron leer las tareas.</p>}

      {grupos.map(([b, lista], gi) => (
        <section key={b} className="space-y-3">
          <h2 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-vino">
            <span className="font-display text-2xl normal-case tracking-normal text-oro">{String(gi + 1).padStart(2, '0')}</span>{BLOQUES[b]}
            <span className="text-xs font-normal normal-case tracking-normal text-niebla">{lista.filter((t) => t.estado === 'hecha').length}/{lista.length}</span>
          </h2>
          <ul className="space-y-3">{lista.map((t) => <TareaFicha key={t.id} t={t} />)}</ul>
        </section>
      ))}

      <section id="material" className="rounded-[28px] border border-oro/40 bg-papel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Buzón privado</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Te dejo material</h2>
        <p className="mt-1 text-sm text-niebla">Dime dónde has dejado algo (carpeta del escritorio, archivo, ID, texto) y para qué es. Llega al Buzón para Claude.</p>
        <form action={materialAction} className="mt-4 space-y-3">
          <label className="block text-sm">Ruta o dónde está (opcional)
            <input name="ruta" maxLength={280} placeholder="p. ej. Escritorio\fotos rincon  ·  ID píxel 1234567890" className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
          </label>
          <label className="block text-sm">Qué es y qué quieres que haga
            <textarea name="mensaje" required minLength={3} maxLength={4000} rows={3} className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta" />
          </label>
          <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Enviar a Claude</button>
        </form>
      </section>
    </div>
  );
}

function TareaFicha({ t }: { t: Tarea }) {
  const hecha = t.estado === 'hecha';
  return (
    <li id={`t-${t.id}`} className={`scroll-mt-6 rounded-[22px] border bg-white ${t.estado === 'bloqueada' ? 'border-vino/50' : 'border-linea'}`}>
      <details open={!hecha} className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-5">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${hecha ? 'border-oro bg-oro text-noche' : t.estado === 'bloqueada' ? 'border-vino text-vino' : 'border-acero text-transparent'}`}>{hecha ? '✓' : t.estado === 'bloqueada' ? '!' : '·'}</span>
          <span className="min-w-0 flex-1">
            <span className={`block font-semibold ${hecha ? 'text-niebla line-through' : ''}`}>{t.titulo}</span>
            <span className="mt-1 flex flex-wrap gap-2 text-xs text-niebla">
              {t.paraCuando && <span className="rounded-full bg-papel px-2.5 py-0.5 font-medium text-carbon">Para el {dia.format(new Date(t.paraCuando + 'T12:00:00'))}</span>}
              {t.estado === 'bloqueada' && <span className="rounded-full bg-vino/10 px-2.5 py-0.5 font-semibold text-vino">Bloqueada</span>}
              {t.cambiadoEn && <span>{t.leidoClaude ? 'Claude ya lo ha leído' : 'Pendiente de que Claude lo lea'}</span>}
            </span>
          </span>
        </summary>
        <div className="space-y-3 px-5 pb-5">
          {t.detalle && <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.detalle}</p>}
          {t.enlace && <a href={t.enlace} target={t.enlace.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="inline-block rounded-full bg-tinta px-4 py-2 text-sm font-semibold text-white">Abrir →</a>}
          {t.notaClaude && (
            <div className="rounded-2xl border-l-[3px] border-vino bg-papel px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">Nota de Claude</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{t.notaClaude}</p>
            </div>
          )}
          <form action={guardarTareaAction} className="space-y-2">
            <input type="hidden" name="id" value={t.id} />
            <label className="block text-sm">Tu nota para Claude (opcional)
              <textarea name="nota" maxLength={3000} rows={2} defaultValue={t.notaKarc0 ?? ''} placeholder="Qué has hecho, un dato, un enlace o por qué no puedes." className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
            </label>
            <div className="flex flex-wrap gap-2">
              {!hecha && <button name="estado" value="hecha" className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">✓ Hecha</button>}
              {t.estado !== 'bloqueada' && !hecha && <button name="estado" value="bloqueada" className="rounded-full border border-acero px-4 py-2.5 text-sm font-medium">No puedo · bloqueada</button>}
              {t.estado !== 'pendiente' && <button name="estado" value="pendiente" className="rounded-full border border-acero px-4 py-2.5 text-sm font-medium">Reabrir</button>}
              <button name="estado" value={t.estado} className="rounded-full border border-acero px-4 py-2.5 text-sm font-medium">Solo enviar la nota</button>
            </div>
          </form>
        </div>
      </details>
    </li>
  );
}
