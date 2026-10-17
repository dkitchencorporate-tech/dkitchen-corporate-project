import { exigirAdmin } from '@/lib/guard-admin';
import { verTareas, BLOQUES, RESPONSABLES, URGENCIAS, type Tarea } from '@/lib/tareas';
import { verDecisiones } from '@/lib/decisiones';
import { enlaceDocumento } from '@/lib/documentos';
import GuiaZona from '@/components/admin/GuiaZona';
import { guardarTareaAction, materialAction } from './actions';

export const dynamic = 'force-dynamic';

const dia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
const OK: Record<string, string> = {
  hecha: 'Tachada. Claude lo verá al empezar su próxima sesión.', bloqueada: 'Marcada como bloqueada. Claude leerá tu nota.',
  pendiente: 'Reabierta.', material: 'Enviado al Buzón para Claude. Lo leerá al empezar su próxima sesión.',
};
const ERR: Record<string, string> = { datos: 'Datos no válidos.', base: 'No se pudo guardar. Inténtalo de nuevo.', corto: 'Escribe al menos unas palabras.', muchos: 'Demasiados mensajes en una hora.' };
/** Aviso rojo: sin hacer y con fecha de hoy o ya pasada (hora de Madrid). Claude marca la prioridad poniendo «para_cuando». */
const hoyMadrid = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
const urgente = (t: Tarea, hoy: string) => t.estado !== 'hecha' && !!t.paraCuando && t.paraCuando <= hoy;

/** Central → Mis tareas (0077): checklist interactivo del lanzamiento para karc0 + buzón privado de material. */
export default async function MisTareas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const [tareas, decisiones] = await Promise.all([verTareas(jwt).catch(() => null), verDecisiones(jwt).catch(() => null)]);
  const porDecidir = decisiones?.filter((d) => d.estado === 'pendiente').length ?? 0;
  const hechas = tareas?.filter((t) => t.estado === 'hecha').length ?? 0;
  const total = tareas?.length ?? 0;
  const pct = total ? Math.round((hechas / total) * 100) : 0;
  const hoy = hoyMadrid();
  const urgentes = tareas?.filter((t) => urgente(t, hoy)) ?? [];
  const proxima = urgentes[0] ?? tareas?.find((t) => t.estado !== 'hecha');
  // 0082: «de quién» filtra la lista (?de=karc0 | claude). Sin filtro se ve todo, como antes.
  const de = sp.de && sp.de in RESPONSABLES ? sp.de : null;
  const mias = tareas?.filter((t) => t.estado !== 'hecha' && (t.responsable === 'karc0' || t.responsable === 'ambos')).length ?? 0;
  const deClaude = tareas?.filter((t) => t.estado !== 'hecha' && t.responsable === 'claude').length ?? 0;
  const u = sp.u && sp.u in URGENCIAS ? sp.u : null;
  const visibles = tareas?.filter((t) => (!de || t.responsable === de || (de === 'karc0' && t.responsable === 'ambos')) && (!u || (t.urgencia === u && t.estado !== 'hecha')));
  // Tablero (0083): pendientes por urgencia, por estado y por responsable; y cuántas tienen documentación.
  const abiertas = tareas?.filter((t) => t.estado !== 'hecha') ?? [];
  const cuenta = (f: (t: Tarea) => boolean) => abiertas.filter(f).length;
  const conDoc = cuenta((t) => !!(t.docEscritorio || t.docCentral));
  const filtro = (extra: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, x] of Object.entries({ de, u, ...extra })) if (x) q.set(k, x);
    const s = q.toString();
    return `/admin-dkitchen/tareas${s ? `?${s}` : ''}`;
  };
  const grupos = Object.keys(BLOQUES).map((b) => [b, visibles?.filter((t) => t.bloque === b) ?? []] as const).filter(([, l]) => l.length);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-vino/40 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Lanzamiento</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Mis tareas</h1>
        <p className="relative mt-2 max-w-xl text-sm text-white/70">Lo que te toca a ti para salir y la hoja de ruta de lo que construye Claude, con su tiempo estimado. Táchalo al terminar o déjame una nota: lo leo al empezar cada sesión.</p>
        <div className="relative mt-6">
          <div className="flex items-end justify-between text-sm">
            <span className="font-display text-4xl font-semibold text-oro">{hechas}<span className="text-xl text-white/50"> / {total}</span></span>
            <span className="text-white/60">{pct} % hecho</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-oro transition-all" style={{ width: `${pct}%` }} /></div>
          {proxima && <p className="mt-4 text-sm text-white/80">Siguiente: <a href={`#t-${proxima.id}`} className="font-semibold text-white underline decoration-oro underline-offset-4">{proxima.titulo}</a></p>}
        </div>
      </header>

      {urgentes.length > 0 && (
        <section className="rounded-[24px] border-2 border-red-600 bg-red-50 p-5 sm:p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" /></span>
            Prioridad · para hoy
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-red-800">{urgentes.length === 1 ? 'Tienes 1 tarea para hoy' : `Tienes ${urgentes.length} tareas para hoy`}</h2>
          <ol className="mt-3 space-y-2">
            {urgentes.map((t, i) => (
              <li key={t.id}>
                <a href={`#t-${t.id}`} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-red-200 hover:ring-red-500">
                  <span className="font-display text-lg font-semibold leading-none text-red-600">{i + 1}</span>
                  <span className="flex-1 font-semibold text-carbon">{t.titulo}</span>
                  {t.paraCuando && t.paraCuando < hoy && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">Atrasada</span>}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {porDecidir > 0 && (
        <a href="/admin-dkitchen/decisiones" className="flex items-center justify-between gap-3 rounded-[22px] border-2 border-oro bg-papel p-4 text-sm sm:p-5">
          <span><span className="font-display text-2xl font-semibold text-vino">{porDecidir}</span> <span className="font-semibold">{porDecidir === 1 ? 'decisión espera' : 'decisiones esperan'} tu respuesta</span><span className="block text-niebla">Con su contexto y mi recomendación marcada.</span></span>
          <span className="shrink-0 rounded-full bg-vino px-4 py-2 font-semibold text-white">Decidir →</span>
        </a>
      )}

      <section aria-label="Tablero" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-linea bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">Por urgencia · abiertas</p>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(URGENCIAS).map(([k, txt]) => (
              <li key={k}><a href={filtro({ u: u === k ? null : k })} aria-current={u === k ? 'true' : undefined} className={`flex justify-between rounded-lg px-2 py-1 ${u === k ? 'bg-tinta text-white' : 'hover:bg-papel'}`}><span>{txt}</span><span className="font-semibold">{cuenta((t) => t.urgencia === k)}</span></a></li>
            ))}
          </ul>
        </div>
        <div className="rounded-[22px] border border-linea bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">Por estado</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="flex justify-between px-2 py-1"><span>Pendientes</span><span className="font-semibold">{cuenta((t) => t.estado === 'pendiente')}</span></li>
            <li className="flex justify-between px-2 py-1"><span>Bloqueadas</span><span className="font-semibold text-vino">{cuenta((t) => t.estado === 'bloqueada')}</span></li>
            <li className="flex justify-between px-2 py-1"><span>Hechas</span><span className="font-semibold">{hechas}</span></li>
            <li className="flex justify-between px-2 py-1"><span>Para hoy o atrasadas</span><span className="font-semibold text-red-700">{urgentes.length}</span></li>
          </ul>
        </div>
        <div className="rounded-[22px] border border-linea bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">Quién · abiertas</p>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(RESPONSABLES).map(([k, txt]) => (
              <li key={k} className="flex justify-between px-2 py-1"><span>{txt}</span><span className="font-semibold">{cuenta((t) => t.responsable === k)}</span></li>
            ))}
            <li className="flex justify-between border-t border-linea px-2 pt-2"><span>Con documentación</span><span className="font-semibold">{conDoc} / {abiertas.length}</span></li>
          </ul>
        </div>
      </section>

      <nav aria-label="Filtrar por responsable" className="flex flex-wrap gap-2 text-sm">
        {([[null, `Todo (${total})`], ['karc0', `Lo tuyo · ${mias} pendientes`], ['claude', `De Claude · ${deClaude} pendientes`]] as const).map(([v, txt]) => (
          <a key={txt} href={filtro({ de: v })} aria-current={de === v ? 'page' : undefined}
            className={`rounded-full px-4 py-2 font-medium ${de === v ? 'bg-tinta text-white' : 'border border-acero bg-white text-carbon'}`}>{txt}</a>
        ))}
        <a href="/admin-dkitchen/reportes" className="rounded-full border border-oro/60 bg-papel px-4 py-2 font-medium text-vino">Reportes por fecha →</a>
      </nav>

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">{OK[sp.ok] ?? 'Guardado.'}</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERR[sp.e] ?? 'No se pudo guardar.'}</p>}

      <GuiaZona titulo="Mis tareas" ancla="tareas"
        que="Claude apunta aquí todo lo que solo puedes hacer tú (cuentas, datos, revisiones, publicar) y también lo que construirá él, con quién lo hace y cuánto lleva. Cada cambio y cada nota se guardan en la base y Claude los lee al empezar su sesión."
        pasos={['Arriba puedes ver solo lo tuyo o solo lo de Claude. Lo de Claude no lo tachas tú: lo tacha él al terminarlo; tú puedes dejarle una nota o cambiar el orden pidiéndoselo.', 'Abre la tarea, hazla y pulsa «Hecha». Si quieres, deja una nota (qué hiciste, un dato, un enlace).', 'Si no puedes, pulsa «Bloqueada» y explica por qué.', 'Para pasarle archivos o carpetas de tu equipo, usa «Te dejo material» al final.']} />

      {!tareas && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudieron leer las tareas.</p>}

      {grupos.map(([b, lista], gi) => (
        <section key={b} className="space-y-3">
          <h2 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-vino">
            <span className="font-display text-2xl normal-case tracking-normal text-oro">{String(gi + 1).padStart(2, '0')}</span>{BLOQUES[b]}
            <span className="text-xs font-normal normal-case tracking-normal text-niebla">{lista.filter((t) => t.estado === 'hecha').length}/{lista.length}</span>
          </h2>
          <ul className="space-y-3">{lista.map((t) => <TareaFicha key={t.id} t={t} hoy={hoy} />)}</ul>
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

function TareaFicha({ t, hoy }: { t: Tarea; hoy: string }) {
  const hecha = t.estado === 'hecha';
  const roja = urgente(t, hoy);
  return (
    <li id={`t-${t.id}`} className={`scroll-mt-6 rounded-[22px] bg-white ${roja ? 'border-2 border-red-600 shadow-[0_0_0_4px_rgba(220,38,38,0.08)]' : t.estado === 'bloqueada' ? 'border border-vino/50' : 'border border-linea'}`}>
      <details open={!hecha} className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-5">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${hecha ? 'border-oro bg-oro text-noche' : t.estado === 'bloqueada' ? 'border-vino text-vino' : 'border-acero text-transparent'}`}>{hecha ? '✓' : t.estado === 'bloqueada' ? '!' : '·'}</span>
          <span className="min-w-0 flex-1">
            <span className={`block font-semibold ${hecha ? 'text-niebla line-through' : ''}`}>{t.titulo}</span>
            <span className="mt-1 flex flex-wrap gap-2 text-xs text-niebla">
              {roja && <span className="rounded-full bg-red-600 px-2.5 py-0.5 font-semibold uppercase tracking-wide text-white">{t.paraCuando! < hoy ? 'Atrasada' : 'Hoy · prioridad'}</span>}
              {t.paraCuando && !roja && <span className="rounded-full bg-papel px-2.5 py-0.5 font-medium text-carbon">Para el {dia.format(new Date(t.paraCuando + 'T12:00:00'))}</span>}
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${t.responsable === 'claude' ? 'bg-noche text-oro' : t.responsable === 'antigravity' ? 'bg-acero/40 text-carbon' : 'bg-vino/10 text-vino'}`}>{RESPONSABLES[t.responsable] ?? t.responsable}</span>
              {t.estado !== 'hecha' && t.urgencia !== 'media' && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${t.urgencia === 'urgente' ? 'bg-red-600 text-white' : t.urgencia === 'alta' ? 'bg-oro text-noche' : 'bg-acero/30 text-carbon'}`}>{URGENCIAS[t.urgencia] ?? t.urgencia}</span>}
              {t.estimado && <span className="rounded-full border border-linea px-2.5 py-0.5 font-medium text-carbon">⏱ {t.estimado}</span>}
              {(t.docEscritorio || t.docCentral) && <span className="rounded-full border border-oro/50 px-2.5 py-0.5 font-medium text-vino">📄 Documentada</span>}
              {t.estado === 'bloqueada' && <span className="rounded-full bg-vino/10 px-2.5 py-0.5 font-semibold text-vino">Bloqueada</span>}
              {t.cambiadoEn && <span>{t.leidoClaude ? 'Claude ya lo ha leído' : 'Pendiente de que Claude lo lea'}</span>}
            </span>
          </span>
        </summary>
        <div className="space-y-3 px-5 pb-5">
          {t.detalle && <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.detalle}</p>}
          {(t.docEscritorio || t.docCentral) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {t.docCentral && <a href={enlaceDocumento(t.docCentral)} className="rounded-full bg-papel px-3 py-1.5 font-semibold text-vino ring-1 ring-oro/40">📄 Leer en Central</a>}
              {t.docEscritorio && <span className="break-all rounded-full bg-papel px-3 py-1.5 text-niebla">Escritorio: {t.docEscritorio}</span>}
            </div>
          )}
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
