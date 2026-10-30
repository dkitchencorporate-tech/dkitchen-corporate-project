import { exigirAdmin } from '@/lib/guard-admin';
import { verTareas, BLOQUES, RESPONSABLES, URGENCIAS, ESTADOS_COMUNICACION, RESULTADOS_CLAUDE, type Tarea } from '@/lib/tareas';
import { verRevisiones, ESTADOS_REVISION, ESTADOS_CLAUDE, type Revision } from '@/lib/revisiones';
import { verDecisiones } from '@/lib/decisiones';
import { esDePlanificacion } from '@/lib/planificacion';
import { enlaceDocumento } from '@/lib/documentos';
import GuiaZona from '@/components/admin/GuiaZona';
import RevisionForm from '@/components/admin/RevisionForm';
import PulirTexto from '@/components/admin/PulirTexto';
import { tareasDeHoy, esMia, type Adelanto } from '@/lib/tareas-hoy';
import { guardarTareaAction, materialAction, revisionAction, comunicacionAction, implementarYaAction } from './actions';

export const dynamic = 'force-dynamic';

const dia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const OK: Record<string, string> = {
  hecha: 'Tarea cerrada. Pasa a «Resueltas».', bloqueada: 'Marcada como bloqueada. Claude leerá tu nota.', pendiente: 'Reabierta.',
  nota: 'Nota enviada a Claude. La tarea sigue abierta para ti y la nota está en «Comunicación».', cerrar: 'Nota enviada y tarea cerrada. Está en «Resueltas».',
  traspasar: 'Nota enviada: cerrada para ti y pendiente para Claude. La sigues en «Comunicación».',
  implementar: 'En cola: Claude la tiene la primera en su arranque y está en Hoy · De Claude. Cuando la termine, te llega para aprobar.',
  aprobar: 'Aprobada: la comunicación pasa a Resueltas.', reabrir: 'Reabierta: Claude la verá al empezar su sesión.',
  revision: 'Enviada: la tiene Claude y está aquí, en «Enviadas a Claude», hasta que responda. Tus comentarios anteriores se conservan en el hilo.', aprobada: 'Aprobada: está en «Aprobadas».',
  material: 'Enviado al Buzón para Claude. Lo leerá al empezar su próxima sesión.',
};
const ERR: Record<string, string> = { datos: 'Datos no válidos.', base: 'No se pudo guardar. Inténtalo de nuevo.', corto: 'Escribe al menos unas palabras (o añade una imagen).', muchos: 'Demasiados mensajes en una hora.' };
const urgente = (t: Tarea, hoy: string) => t.estado !== 'hecha' && esMia(t) && (!!t.paraCuando && t.paraCuando <= hoy);

/**
 * Central → Mis tareas (0077; rehecha el 18/10 con 0087, karc0: «no puedo tener
 * todo de golpe, es confuso incluso para ti»). Una zona cada vez, elegida en un
 * menú flotante: Hoy · Lo mío · De Claude · Comunicación (0091) · Revisiones de Alex ·
 * Resueltas. La nota enviada queda bloqueada hasta pulsar «Editar nota».
 */
export default async function MisTareas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const [tareas, revisionesTodas, decisiones] = await Promise.all([verTareas(jwt).catch(() => null), verRevisiones(jwt).catch(() => null), verDecisiones(jwt).catch(() => null)]);
  // 30/10 (karc0): lo de Venezuela y pasarelas descartadas sale de aquí y vive en Lanzamiento → Planificación.
  const revisiones = revisionesTodas?.filter((r) => !esDePlanificacion(r.titulo, r.queCambio)) ?? null;
  const porDecidir = decisiones?.filter((d) => d.estado === 'pendiente').length ?? 0;
  // 30/10 (karc0): Venezuela, dk-vzl y pasarelas descartadas viven en su propia pestaña «Planificación»; no entran en Hoy ni en Lo mío.
  const planificacion = (tareas ?? []).filter((t) => t.bloque === 'planificacion' && t.estado !== 'hecha');
  const todas = (tareas ?? []).filter((t) => t.bloque !== 'planificacion' || t.estado === 'hecha');
  const H = tareasDeHoy(todas);
  const hoy = H.hoy;
  const abiertas = todas.filter((t) => t.estado !== 'hecha');
  // 18/10 (karc0): «Hoy» es lo de hoy o atrasado; lo urgente con fecha futura espera en «Lo mío» con su día.
  const comunicaciones = todas.filter((t) => t.comEstado).sort((a, b) => (b.respuestaEn ?? b.notaEnviadaEn ?? '').localeCompare(a.respuestaEn ?? a.notaEnviadaEn ?? ''));
  const GRUPOS_COM = {
    respondidas: (t: Tarea) => t.comEstado === 'respondida',
    abiertas: (t: Tarea) => t.comEstado === 'abierta' || t.comEstado === 'reabierta',
    resueltas: (t: Tarea) => t.comEstado === 'resuelta',
  } as const;
  const filtroCom = (Object.keys(GRUPOS_COM) as (keyof typeof GRUPOS_COM)[]).find((k) => k === sp.c)
    ?? (comunicaciones.some(GRUPOS_COM.respondidas) ? 'respondidas' : 'abiertas');
  const zonas = {
    hoy: [...H.mias, ...H.claude],
    mias: abiertas.filter(esMia),
    claude: abiertas.filter((t) => t.responsable === 'claude' || t.responsable === 'antigravity'),
    comunicacion: comunicaciones.filter(GRUPOS_COM[filtroCom]),
    planificacion,
    resueltas: todas.filter((t) => t.estado === 'hecha').sort((a, b) => (b.hechaEn ?? '').localeCompare(a.hechaEn ?? '')),
  };
  const revPend = (revisiones?.filter((r) => r.estado === 'por_revisar').length ?? 0)
    + (revisiones?.filter((r) => r.estado === 'cambios' && (r.estadoClaude === 'implementada' || r.estadoClaude === 'descartada')).length ?? 0);
  // 0090: cada revisión con cambios lleva el resultado de Claude; las resueltas por Claude salen de «Enviadas»
  // 18/10 noche (karc0): «Enviadas» = sin respuesta de Claude; «En curso» = respondida con trabajo pendiente;
  // «Resueltas por Claude» = para que karc0 apruebe o reabra.
  const resuelta = (x: Revision) => x.estado === 'cambios' && (x.estadoClaude === 'implementada' || x.estadoClaude === 'descartada');
  const GRUPOS_REV = {
    por_revisar: (x: Revision) => x.estado === 'por_revisar',
    enviadas: (x: Revision) => x.estado === 'cambios' && !x.estadoClaude,
    en_curso: (x: Revision) => x.estado === 'cambios' && !!x.estadoClaude && !resuelta(x),
    resueltas: resuelta,
    aprobada: (x: Revision) => x.estado === 'aprobada',
  } as const;
  const filtroRev = (Object.keys(GRUPOS_REV) as (keyof typeof GRUPOS_REV)[]).find((k) => k === sp.r) ?? (revisiones?.some((r) => r.estado === 'por_revisar') ? 'por_revisar' : revisiones?.some(resuelta) ? 'resueltas' : 'enviadas');
  const revsVisibles = revisiones?.filter(GRUPOS_REV[filtroRev]) ?? [];
  const ZONAS = [
    ['hoy', 'Hoy', H.mias.length], ['mias', 'Lo mío', zonas.mias.length], ['claude', 'De Claude', zonas.claude.length],
    ['comunicacion', 'Comunicación', comunicaciones.filter(GRUPOS_COM.respondidas).length], ['revisiones', 'Revisiones', revPend], ['resueltas', 'Resueltas', zonas.resueltas.length],
  ] as const;
  const pedida = sp.zona === 'enviadas' ? 'comunicacion' : sp.zona;
  const zona = (ZONAS.some(([k]) => k === pedida) ? pedida : H.mias.length || H.adelantoMias ? 'hoy' : 'mias') as (typeof ZONAS)[number][0];
  const hechas = zonas.resueltas.length;
  const pct = todas.length ? Math.round((hechas / todas.length) * 100) : 0;
  const lista = zona === 'revisiones' ? [] : zonas[zona];
  const grupos = zona === 'mias' || zona === 'claude'
    ? Object.keys(BLOQUES).map((b) => [b, lista.filter((t) => t.bloque === b)] as const).filter(([, l]) => l.length)
    : [['', lista] as const];
  const TITULOS: Record<string, [string, string]> = {
    hoy: ['Para hoy', 'Lo de hoy o atrasado, tuyo y de Claude. Cuando uno acaba lo suyo, entra el adelanto: lo del siguiente día y lo urgente.'],
    mias: ['Lo mío', 'Todo lo que te toca a ti (o a ti con Claude), por bloques.'],
    claude: ['De Claude', 'Lo que construye Claude (y Antigravity), con su tiempo. Lo tacha él al terminar; tú puedes dejarle una nota.'],
    comunicacion: ['Comunicación', 'Cada nota que le envías a Claude y su respuesta. Si está lista, apruébala y pasa a Resueltas; solo tú puedes reabrirla.'],
    revisiones: ['Revisiones de Alex', 'Por revisar → Enviadas a Claude (sin respuesta) → En curso (respondida, falta hacerlo) → Resueltas por Claude (apruébala o reábrela) → Aprobadas.'],
    planificacion: ['Planificación', 'Lo que queda aparcado para más adelante: DKitchen Venezuela (dk-vzl), su sistema de cobro y las pasarelas o figuras descartadas para España. Aquí decides cuándo retomarlo.'],
    resueltas: ['Resueltas', 'Tareas cerradas, de la más reciente a la más antigua.'],
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-6 text-carbon sm:p-6 sm:pb-32 lg:p-10 lg:pb-32">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-vino/40 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Lanzamiento</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Mis tareas</h1>
        <div className="relative mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-display whitespace-nowrap text-4xl font-semibold text-oro">{hechas}<span className="text-xl text-white/50"> / {todas.length}</span></span>
          <span className="text-white/60 sm:text-right">{pct} % hecho · {zonas.mias.length} tuyas abiertas · {zonas.claude.length} de Claude</span>
        </div>
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-oro" style={{ width: `${pct}%` }} /></div>
        <div className="relative mt-4 flex flex-wrap gap-2 text-sm">
          <a href="/admin-dkitchen/ruta" className="rounded-full bg-white/10 px-4 py-2 font-semibold text-oro">Ruta de lanzamiento →</a>
          <a href="/admin-dkitchen/reportes" className="rounded-full bg-white/10 px-4 py-2 text-white/80">Reportes →</a>
          {porDecidir > 0 && <a href="/admin-dkitchen/decisiones" className="rounded-full bg-oro px-4 py-2 font-semibold text-noche">{porDecidir} {porDecidir === 1 ? 'decisión espera' : 'decisiones esperan'} →</a>}
        </div>
      </header>

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">{OK[sp.ok] ?? 'Guardado.'}</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERR[sp.e] ?? 'No se pudo guardar.'}</p>}

      <div>
        <h2 className="font-display text-2xl font-semibold">{TITULOS[zona][0]}</h2>
        <p className="mt-1 text-sm text-niebla">{TITULOS[zona][1]}</p>
      </div>

      {!tareas && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudieron leer las tareas.</p>}

      {zona === 'revisiones' ? (
        <>
          {/* 18/10 (karc0): cada revisión en su sitio según su estado, sin que nada se pierda */}
          <nav aria-label="Estado de las revisiones" className="flex flex-wrap gap-2 text-sm">
            {([['por_revisar', 'Por revisar'], ['enviadas', 'Enviadas a Claude'], ['en_curso', 'En curso'], ['resueltas', 'Resueltas por Claude'], ['aprobada', 'Aprobadas']] as const).map(([k, t]) => (
              <a key={k} href={`/admin-dkitchen/tareas?zona=revisiones&r=${k}`} aria-current={filtroRev === k ? 'page' : undefined}
                className={`rounded-full px-4 py-2 font-semibold ${filtroRev === k ? 'bg-tinta text-white' : 'border border-acero bg-white'}`}>{t} · {revisiones?.filter(GRUPOS_REV[k]).length ?? 0}</a>
            ))}
          </nav>
          {revsVisibles.length ? <ul className="space-y-3">{revsVisibles.map((r) => <RevisionFicha key={r.id} r={r} tarea={todas.find((t) => t.id === r.tareaId) ?? null} filtro={filtroRev} />)}</ul>
            : <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Nada en este apartado.</p>}
        </>
      ) : zona === 'hoy' && tareas ? (
        <>
          <p className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-exito/10 px-3 py-1 font-semibold text-exito">Hoy has cerrado {H.hechasHoyMias}</span>
            <span className="rounded-full bg-noche/10 px-3 py-1 font-semibold text-noche">Claude ha cerrado {H.hechasHoyClaude}</span>
          </p>
          <BloqueHoy titulo="Lo tuyo" lista={H.mias} adelanto={H.adelantoMias} hoy={hoy} vacio="Lo tuyo de hoy está hecho." />
          <BloqueHoy titulo="De Claude" lista={H.claude} adelanto={H.adelantoClaude} hoy={hoy} vacio="Claude ha terminado lo suyo de hoy." />
        </>
      ) : zona === 'comunicacion' ? (
        <>
          <nav aria-label="Estado de la comunicación" className="flex flex-wrap gap-2 text-sm">
            {([['respondidas', 'Claude ha respondido'], ['abiertas', 'Esperando a Claude'], ['resueltas', 'Resueltas']] as const).map(([k, t]) => (
              <a key={k} href={`/admin-dkitchen/tareas?zona=comunicacion&c=${k}`} aria-current={filtroCom === k ? 'page' : undefined}
                className={`rounded-full px-4 py-2 font-semibold ${filtroCom === k ? 'bg-tinta text-white' : 'border border-acero bg-white'}`}>{t} · {comunicaciones.filter(GRUPOS_COM[k]).length}</a>
            ))}
          </nav>
          {lista.length ? <ul className="space-y-3">{lista.map((t) => <TareaFicha key={t.id} t={t} hoy={hoy} zona={zona} editar={sp.editar === t.id} />)}</ul>
            : <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Nada en este apartado.</p>}
        </>
      ) : lista.length === 0 && tareas ? (
        <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Nada en esta zona. 🎉</p>
      ) : grupos.map(([b, l]) => (
        <section key={b || 'todo'} className="space-y-3">
          {b && <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-vino">{BLOQUES[b]} <span className="text-xs font-normal normal-case tracking-normal text-niebla">{l.length}</span></h3>}
          <ul className="space-y-3">{l.map((t) => <TareaFicha key={t.id} t={t} hoy={hoy} zona={zona} editar={sp.editar === t.id} />)}</ul>
        </section>
      ))}

      {zona === 'mias' && (
        <>
          <GuiaZona titulo="Mis tareas" ancla="tareas"
            que="Una zona cada vez, con el menú flotante de abajo. Claude apunta aquí lo que solo puedes hacer tú y lo que construye él; cada nota y cada cambio quedan en la base y Claude los lee al empezar su sesión."
            pasos={['Haz la tarea y pulsa «✓ Hecha»: pasa a Resueltas.', 'Para escribir a Claude: escribe la nota y pulsa «Enviar nota»; elige si cierras la tarea, si la cierras para ti y la dejas pendiente para Claude, o si sigue abierta.', 'La nota enviada queda bloqueada; para cambiarla, «Editar nota».', 'Cuando Claude cambie algo que debas ver, te llega a «Revisiones»: apruébalo o dile qué cambiar con texto y capturas (puedes pegarlas con Ctrl+V).']} />
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
              <PulirTexto campo="mensaje" />
              <button className="block rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Enviar a Claude</button>
            </form>
          </section>
        </>
      )}

      <nav aria-label="Zonas de tareas" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 md:bottom-4">
        <div className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full [scrollbar-width:none] border border-white/10 bg-noche/95 p-1.5 text-sm shadow-[0_20px_50px_rgba(23,25,30,.35)] backdrop-blur">
          {ZONAS.map(([k, txt, n]) => (
            <a key={k} href={`/admin-dkitchen/tareas?zona=${k}`} aria-current={zona === k ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold sm:px-3.5 sm:py-2 sm:text-sm ${zona === k ? 'bg-oro text-noche' : 'text-white/80 hover:bg-white/10'}`}>
              {txt}{n > 0 && <span className={`rounded-full px-1.5 text-[11px] ${zona === k ? 'bg-noche text-oro' : k === 'hoy' || k === 'revisiones' ? 'bg-vino text-white' : 'bg-white/15'}`}>{n}</span>}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}

function BloqueHoy({ titulo, lista, adelanto, hoy, vacio }: { titulo: string; lista: Tarea[]; adelanto: Adelanto | null; hoy: string; vacio: string }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-vino">{titulo} <span className="text-xs font-normal normal-case tracking-normal text-niebla">{lista.length || ''}</span></h3>
      {lista.length > 0 ? <ul className="space-y-3">{lista.map((t) => <TareaFicha key={t.id} t={t} hoy={hoy} zona="hoy" editar={false} />)}</ul> : (
        <>
          <p className="rounded-[22px] border border-exito/30 bg-exito/5 p-4 text-sm text-exito">{vacio} {adelanto ? 'Puedes adelantar esto:' : 'No hay nada más con fecha. 🎉'}</p>
          {adelanto && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-carbon">Adelanto{adelanto.dia ? ` · lo del ${dia.format(new Date(adelanto.dia + 'T12:00:00'))}` : ''} y lo urgente</p>
              <ul className="space-y-3">{adelanto.lista.map((t) => <TareaFicha key={t.id} t={t} hoy={hoy} zona="hoy" editar={false} />)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function TareaFicha({ t, hoy, zona, editar }: { t: Tarea; hoy: string; zona: string; editar: boolean }) {
  const hecha = t.estado === 'hecha';
  const roja = urgente(t, hoy);
  const deClaude = t.responsable === 'claude' || t.responsable === 'antigravity';
  const notaBloqueada = !!t.notaKarc0 && !!t.notaEnviadaEn && !editar;
  // 0093: mientras la tarea siga abierta (o su comunicación esté reabierta) siempre se puede añadir otra nota.
  const puedeAnadir = notaBloqueada && (!hecha || t.comEstado === 'reabierta');
  return (
    <li id={`t-${t.id}`} className={`scroll-mt-6 rounded-[22px] bg-white ${roja ? 'border-2 border-red-600' : t.estado === 'bloqueada' ? 'border border-vino/50' : 'border border-linea'}`}>
      <details open={zona === 'comunicacion' ? t.comEstado !== 'resuelta' || editar : !hecha || editar} className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-5">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${hecha ? 'border-oro bg-oro text-noche' : t.estado === 'bloqueada' ? 'border-vino text-vino' : 'border-acero text-transparent'}`}>{hecha ? '✓' : t.estado === 'bloqueada' ? '!' : '·'}</span>
          <span className="min-w-0 flex-1">
            <span className={`block font-semibold ${hecha ? 'text-niebla line-through' : ''}`}>{t.titulo}</span>
            <span className="mt-1 flex flex-wrap gap-2 text-xs text-niebla">
              {roja && <span className="rounded-full bg-red-600 px-2.5 py-0.5 font-semibold uppercase tracking-wide text-white">{t.paraCuando! < hoy ? 'Atrasada' : 'Hoy'}</span>}
              {t.paraCuando && !roja && !hecha && <span className="rounded-full bg-papel px-2.5 py-0.5 font-medium text-carbon">Para el {dia.format(new Date(t.paraCuando + 'T12:00:00'))}</span>}
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${deClaude ? 'bg-noche text-oro' : 'bg-vino/10 text-vino'}`}>{RESPONSABLES[t.responsable] ?? t.responsable}</span>
              {!hecha && t.urgencia !== 'media' && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${t.urgencia === 'urgente' ? 'bg-red-600 text-white' : t.urgencia === 'alta' ? 'bg-oro text-noche' : 'bg-acero/30 text-carbon'}`}>{URGENCIAS[t.urgencia] ?? t.urgencia}</span>}
              {t.estimado && !hecha && <span className="rounded-full border border-linea px-2.5 py-0.5 font-medium text-carbon">⏱ {t.estimado}</span>}
              {t.traspasadaEn && !hecha && <span className="rounded-full bg-noche/10 px-2.5 py-0.5 font-semibold text-noche">Cerrada para ti · pendiente para Claude</span>}
              {t.creadoEn && <span>Creada el {fecha.format(new Date(t.creadoEn))}</span>}
              {t.notaEnviadaEn && <span>· Nota el {fecha.format(new Date(t.notaEnviadaEn))}</span>}
              {t.respuestaEn && <span>· Respondida el {fecha.format(new Date(t.respuestaEn))}</span>}
              {hecha && t.hechaEn && <span>· Cerrada el {fecha.format(new Date(t.hechaEn))}</span>}
              {t.comEstado && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${t.comEstado === 'respondida' ? 'bg-oro text-noche' : t.comEstado === 'resuelta' ? 'bg-exito/15 text-exito' : t.comEstado === 'reabierta' ? 'bg-vino text-white' : 'bg-papel text-carbon ring-1 ring-linea'}`}>{ESTADOS_COMUNICACION[t.comEstado]}{t.comEstado === 'abierta' && t.leidoClaude ? ' · leída' : ''}</span>}
              {t.hito && <span className="rounded-full border border-oro/50 px-2.5 py-0.5 font-medium text-vino">Ruta · {t.hito}</span>}
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
            <div className={`rounded-2xl border-l-[3px] px-4 py-3 ${t.comResultado === 'listo' ? 'border-exito bg-exito/5' : t.comResultado ? 'border-vino bg-vino/5' : 'border-vino bg-papel'}`}>
              <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">
                <span>{t.comResultado ? 'Respuesta de Claude' : 'Nota de Claude'}</span>
                {t.comResultado && <span className="rounded-full bg-tinta px-2 py-0.5 normal-case tracking-normal text-white">{RESULTADOS_CLAUDE[t.comResultado]}</span>}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{t.notaClaude}</p>
              {t.respuestaEn && <p className="mt-1 text-xs text-niebla">{fecha.format(new Date(t.respuestaEn))}</p>}
            </div>
          )}
          {deClaude && !hecha && <BotonImplementar t={t} zona={zona} ancla={`t-${t.id}`} />}
          {(t.comEstado === 'respondida' || t.comEstado === 'resuelta') && (
            <form action={comunicacionAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={t.id} />
              {t.comEstado === 'respondida' && <button name="accion" value="aprobar" className="rounded-full bg-exito px-5 py-2.5 text-sm font-semibold text-white">✓ Aprobar · pasa a Resuelta{t.comResultado === 'listo' && !hecha ? ' y cierra la tarea' : ''}</button>}
              <button name="accion" value="reabrir" className="rounded-full border border-acero bg-white px-4 py-2.5 text-sm font-medium">Reabrir</button>
              {t.comEstado === 'resuelta' && t.resueltaEn && <span className="text-xs text-niebla">Resuelta el {fecha.format(new Date(t.resueltaEn))}</span>}
            </form>
          )}
          {notaBloqueada && (
            <div className="rounded-2xl border-l-[3px] border-oro bg-white px-4 py-3 ring-1 ring-linea">
              <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-carbon">
                <span>Tus notas · la última, el {fecha.format(new Date(t.notaEnviadaEn!))}</span>
                <a href={`/admin-dkitchen/tareas?zona=${zona}&editar=${t.id}#t-${t.id}`} className="normal-case tracking-normal text-vino underline">Editar nota</a>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{t.notaKarc0}</p>
            </div>
          )}
          <form action={guardarTareaAction} className="space-y-2">
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="zona" value={zona} />
            {(!notaBloqueada || puedeAnadir) && (
              <>
                {puedeAnadir && <input type="hidden" name="anadir" value="1" />}
                <label className="block text-sm">{editar ? 'Edita tus notas para Claude' : puedeAnadir ? 'Añadir otra nota (queda con fecha y hora)' : 'Nota para Claude'}
                  <textarea name="nota" maxLength={editar ? 12000 : 3000} rows={3} defaultValue={editar ? t.notaKarc0 ?? '' : ''} placeholder="Qué has hecho, un dato, un enlace, una instrucción o por qué no puedes." className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
                </label>
                <PulirTexto campo="nota" />
                <input type="hidden" name="estado" value={t.estado} />
                <details className="rounded-2xl border border-vino/30 bg-vino/[0.04] p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-vino">Enviar nota ▾ <span className="font-normal text-niebla">· elige qué pasa con la tarea</span></summary>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {!deClaude && !hecha && <button name="modo" value="cerrar" className="rounded-full bg-vino px-4 py-2.5 text-sm font-semibold text-white">Enviar y cerrar la tarea</button>}
                    {!deClaude && !hecha && <button name="modo" value="traspasar" className="rounded-full bg-noche px-4 py-2.5 text-sm font-semibold text-oro">Enviar · cerrada para mí, pendiente para Claude</button>}
                    <button name="modo" value="abierta" className="rounded-full border border-acero bg-white px-4 py-2.5 text-sm font-medium">Enviar y dejarla abierta</button>
                  </div>
                </details>
              </>
            )}
          </form>
          {!deClaude && (
            <form action={guardarTareaAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="zona" value={zona} />
              <input type="hidden" name="modo" value="estado" />
              {!hecha && <button name="estado" value="hecha" className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">✓ Hecha</button>}
              {t.estado !== 'bloqueada' && !hecha && <button name="estado" value="bloqueada" className="rounded-full border border-acero px-4 py-2.5 text-sm font-medium">No puedo · bloqueada</button>}
              {t.estado !== 'pendiente' && <button name="estado" value="pendiente" className="rounded-full border border-acero px-4 py-2.5 text-sm font-medium">Reabrir</button>}
            </form>
          )}
        </div>
      </details>
    </li>
  );
}

/** 0095: botón «▶ Implementar ya» o, si ya está en cola, desde cuándo. */
function BotonImplementar({ t, zona, ancla, r }: { t: Tarea; zona: string; ancla: string; r?: string }) {
  if (t.estado === 'hecha') return null;
  if (t.implementarYaEn) return <p className="rounded-2xl bg-noche px-4 py-2.5 text-sm font-semibold text-oro">▶ En cola para Claude desde el {fecha.format(new Date(t.implementarYaEn))} · la primera en su arranque</p>;
  return (
    <form action={implementarYaAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={t.id} /><input type="hidden" name="zona" value={zona} /><input type="hidden" name="ancla" value={ancla} />
      {r && <input type="hidden" name="r" value={r} />}
      <button className="rounded-full bg-noche px-5 py-2.5 text-sm font-semibold text-oro">▶ Implementar ya</button>
      <span className="text-xs text-niebla">Pasa a Hoy y Claude empieza por aquí en su próxima sesión.</span>
    </form>
  );
}

function RevisionFicha({ r, tarea, filtro }: { r: Revision; tarea: Tarea | null; filtro: string }) {
  const color = r.estado === 'por_revisar' ? 'bg-oro text-noche' : r.estado === 'cambios' ? 'bg-vino text-white' : 'bg-exito/15 text-exito';
  return (
    <li id={`r-${r.id}`} className={`scroll-mt-6 rounded-[22px] bg-white ${r.estado === 'por_revisar' ? 'border-2 border-oro' : 'border border-linea'}`}>
      <details open={r.estado === 'por_revisar'}>
        <summary className="flex cursor-pointer list-none items-start gap-3 p-5">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{r.titulo}</span>
            <span className="mt-1 flex flex-wrap gap-2 text-xs text-niebla">
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${color}`}>{ESTADOS_REVISION[r.estado]}</span>
              <span>{fecha.format(new Date(r.creadoEn))}{r.version ? ` · ${r.version}` : ''}</span>
              {r.revisadoEn && r.estado !== 'aprobada' && <span>Enviada a Claude el {fecha.format(new Date(r.revisadoEn))} · {r.leidoClaude ? '✓ la ha leído' : '● aún sin leer'}</span>}
              {r.estado === 'aprobada' && r.revisadoEn && <span>Aprobada el {fecha.format(new Date(r.revisadoEn))}</span>}
            </span>
          </span>
        </summary>
        <div className="space-y-3 px-5 pb-5">
          {r.queCambio && <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.queCambio}</p>}
          {r.enlace && <a href={r.enlace} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-tinta px-4 py-2 text-sm font-semibold text-white">Abrir lo que hay que revisar →</a>}
          {r.comentario && <div className="rounded-2xl border-l-[3px] border-oro bg-papel px-4 py-3 text-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.15em]">Tus comentarios (todos, con fecha)</p><p className="mt-1 whitespace-pre-wrap">{r.comentario}</p></div>}
          {r.estado === 'cambios' && (
            <div className={`rounded-2xl border-l-[3px] px-4 py-3 text-sm ${r.estadoClaude === 'implementada' ? 'border-exito bg-exito/5' : r.estadoClaude === 'en_preguntas' || r.estadoClaude === 'decision' ? 'border-vino bg-vino/5' : 'border-tinta bg-white ring-1 ring-linea'}`}>
              <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.15em]">
                <span>Respuesta de Claude</span>
                <span className="rounded-full bg-tinta px-2 py-0.5 normal-case tracking-normal text-white">{r.estadoClaude ? ESTADOS_CLAUDE[r.estadoClaude] : r.leidoClaude ? 'Leída, sin respuesta aún' : 'Sin leer'}</span>
              </p>
              {r.respuestaClaude ? <p className="mt-1 whitespace-pre-wrap">{r.respuestaClaude}</p> : <p className="mt-1 text-niebla">Claude aún no ha dado el resultado de esta revisión.</p>}
              {r.respondidaEn && <p className="mt-1 text-xs text-niebla">{fecha.format(new Date(r.respondidaEn))}</p>}
            </div>
          )}
          {r.imagenes.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.imagenes.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" className="h-24 w-32 rounded-lg object-cover ring-1 ring-linea" /></a></li>)}
            </ul>
          )}
          {r.estado === 'por_revisar' || (r.estado === 'cambios' && (r.estadoClaude === 'implementada' || r.estadoClaude === 'descartada'))
            ? <RevisionForm id={r.id} accion={revisionAction} comentario={null} />
            : r.estado === 'cambios' && (
              <>
              {tarea && <div className="rounded-2xl border border-linea bg-papel/60 p-3 text-sm">
                <p className="mb-2 text-xs text-niebla">Se implementa en la tarea «{tarea.titulo}»{tarea.paraCuando ? ` · prevista para el ${dia.format(new Date(tarea.paraCuando + 'T12:00:00'))}` : ''}{tarea.estimado ? ` · ⏱ ${tarea.estimado}` : ''}</p>
                <BotonImplementar t={tarea} zona="revisiones" ancla={`r-${r.id}`} r={filtro} />
              </div>}
              <details className="rounded-2xl border border-linea p-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-vino">✓ Ya está en manos de Claude · Añadir algo más ▾</summary>
                <div className="mt-3"><RevisionForm id={r.id} accion={revisionAction} comentario={null} /></div>
              </details>
              </>
            )}
        </div>
      </details>
    </li>
  );
}
