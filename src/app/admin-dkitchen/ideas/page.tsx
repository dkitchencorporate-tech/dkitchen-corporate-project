import Link from 'next/link';
import { redirect } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { esComercialActual } from '@/lib/rol-central';
import GuiaZona from '@/components/admin/GuiaZona';
import {
  listarIdeas,
  ESTADOS_IDEA,
  PUBLICOS_IDEA,
  REDES_IDEA,
  SERVICIOS_IDEA,
  ZONAS_IDEAS,
  type IdeaContenido,
  type ZonaIdeas,
} from '@/lib/ideas-contenido';
import { crearIdeaAction, estadoIdeaAction, guardarIdeaAction } from './actions';

export const dynamic = 'force-dynamic';

const OK: Record<string, string> = {
  creada: 'Idea guardada. Agente DK la desarrolla y te la deja en «Por aprobar».',
  guardada: 'Cambios guardados.',
  aprobada: 'Aprobada: pasa a Planificación para producirla.',
  idea: 'Devuelta a ideas con tu nota: Agente DK la rehace.',
  descartada: 'Descartada (puedes recuperarla abajo en Lluvia de ideas).',
  produccion: 'Marcada en producción.',
  programada: 'Marcada como programada.',
  publicada: 'Marcada como publicada: ya cuenta en Medición.',
  propuesta: 'Vuelve a «Por aprobar».',
};
const ERR: Record<string, string> = {
  titulo: 'Escribe un título corto (2 a 160 caracteres).',
  datos: 'Datos no válidos.',
  numero: 'Las cifras van sin puntos ni letras (la retención admite decimales: 2,5).',
  enlace: 'El enlace tiene que empezar por https://',
  muchas: 'Demasiadas ideas en una hora. Espera un poco.',
  base: 'No se pudo guardar en la base. Inténtalo de nuevo.',
};

const fechaCorta = (iso: string | null) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha';

const campo = 'mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2 text-sm';
const boton = 'rounded-full px-4 py-2 text-sm font-semibold';

function Chips({ i }: { i: IdeaContenido }) {
  const c = 'rounded-full px-2.5 py-0.5 text-[11px] font-semibold';
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`${c} ${ESTADOS_IDEA[i.estado].chip}`}>{ESTADOS_IDEA[i.estado].nombre}</span>
      <span className={`${c} bg-papel text-carbon`}>{SERVICIOS_IDEA[i.servicio]}</span>
      <span className={`${c} bg-papel text-carbon`}>{PUBLICOS_IDEA[i.publico]}</span>
      <span className={`${c} bg-papel text-carbon`}>{REDES_IDEA[i.red]}</span>
      {i.nicho && <span className={`${c} bg-oro/20 text-carbon`}>{i.nicho}</span>}
      {i.formato && <span className={`${c} bg-papel text-grafito`}>{i.formato}</span>}
    </div>
  );
}

function BotonEstado({ i, zona, estado, texto, clase, nota }: { i: IdeaContenido; zona: ZonaIdeas; estado: string; texto: string; clase: string; nota?: boolean }) {
  if (nota) {
    return (
      <details className="w-full">
        <summary className={`${boton} ${clase} inline-block cursor-pointer list-none`}>{texto}</summary>
        <form action={estadoIdeaAction} className="mt-2 space-y-2">
          <input type="hidden" name="id" value={i.id} />
          <input type="hidden" name="estado" value={estado} />
          <input type="hidden" name="zona" value={zona} />
          <textarea name="nota" required rows={3} className={campo} placeholder="¿Qué cambiarías? (se guarda en la ficha con fecha y hora)" />
          <button className={`${boton} bg-noche text-white`}>Enviar</button>
        </form>
      </details>
    );
  }
  return (
    <form action={estadoIdeaAction}>
      <input type="hidden" name="id" value={i.id} />
      <input type="hidden" name="estado" value={estado} />
      <input type="hidden" name="zona" value={zona} />
      <button className={`${boton} ${clase}`}>{texto}</button>
    </form>
  );
}

function Editar({ i, zona }: { i: IdeaContenido; zona: ZonaIdeas }) {
  const t = (n: string, l: string, v: string | number | null, extra?: string) => (
    <label className="block text-xs font-semibold text-grafito">{l}
      <input name={n} defaultValue={v ?? ''} className={campo} {...(extra === 'fecha' ? { type: 'date' } : extra === 'num' ? { inputMode: 'decimal' as const } : {})} />
    </label>
  );
  const sel = (n: string, l: string, v: string, op: Record<string, string>) => (
    <label className="block text-xs font-semibold text-grafito">{l}
      <select name={n} defaultValue={v} className={campo}>{Object.entries(op).map(([k, x]) => <option key={k} value={k}>{x}</option>)}</select>
    </label>
  );
  return (
    <details className="mt-3 rounded-2xl bg-papel/60 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-vino">Editar ficha</summary>
      <form action={guardarIdeaAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={i.id} />
        <input type="hidden" name="zona" value={zona} />
        <div className="sm:col-span-2">{t('titulo', 'Título', i.titulo)}</div>
        {t('serie', 'Serie', i.serie)}
        {t('nicho', 'Micro-nicho', i.nicho)}
        {sel('publico', 'Para quién', i.publico, PUBLICOS_IDEA)}
        {sel('servicio', 'Servicio', i.servicio, SERVICIOS_IDEA)}
        {sel('red', 'Red', i.red, REDES_IDEA)}
        {t('formato', 'Formato', i.formato)}
        {t('fecha_prevista', 'Fecha prevista', i.fechaPrevista, 'fecha')}
        {t('enlace', 'Enlace de la publicación', i.enlace)}
        <label className="block text-xs font-semibold text-grafito sm:col-span-2">Idea
          <textarea name="idea" defaultValue={i.idea ?? ''} rows={3} className={campo} />
        </label>
        <label className="block text-xs font-semibold text-grafito sm:col-span-2">Desarrollo (guion, escenas, texto)
          <textarea name="desarrollo" defaultValue={i.desarrollo ?? ''} rows={8} className={campo} />
        </label>
        <div className="sm:col-span-2"><button className={`${boton} bg-noche text-white`}>Guardar ficha</button></div>
      </form>
    </details>
  );
}

function Medir({ i, zona }: { i: IdeaContenido; zona: ZonaIdeas }) {
  const n = (k: string, l: string, v: number | null) => (
    <label className="block text-xs font-semibold text-grafito">{l}<input name={k} defaultValue={v ?? ''} inputMode="decimal" className={campo} /></label>
  );
  return (
    <form action={guardarIdeaAction} className="mt-3 grid gap-3 rounded-2xl bg-papel/60 p-3 sm:grid-cols-5">
      <input type="hidden" name="id" value={i.id} />
      <input type="hidden" name="zona" value={zona} />
      {n('vistas', 'Vistas', i.vistas)}
      {n('retencion_seg', 'Retención media (s)', i.retencionSeg)}
      {n('compartidos', 'Compartidos', i.compartidos)}
      {n('guardados', 'Guardados', i.guardados)}
      {n('comentarios', 'Comentarios', i.comentarios)}
      <label className="block text-xs font-semibold text-grafito sm:col-span-5">Qué aprendemos
        <textarea name="aprendizaje" defaultValue={i.aprendizaje ?? ''} rows={2} className={campo} />
      </label>
      <div className="sm:col-span-5"><button className={`${boton} bg-noche text-white`}>Guardar medición</button></div>
    </form>
  );
}

function Tarjeta({ i, zona }: { i: IdeaContenido; zona: ZonaIdeas }) {
  return (
    <li id={`i-${i.id}`} className="rounded-[22px] border border-linea bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {i.serie && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-vino">{i.serie}</p>}
          <h3 className="font-display mt-1 text-xl font-semibold">{i.titulo}</h3>
        </div>
        {i.fechaPrevista && <p className="rounded-full bg-noche px-3 py-1 text-xs font-semibold text-oro">{fechaCorta(i.fechaPrevista)}</p>}
      </div>
      <div className="mt-3"><Chips i={i} /></div>
      {i.idea && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ceniza">La idea</p>
          <p className="mt-1 whitespace-pre-line text-sm text-grafito">{i.idea}</p>
        </div>
      )}
      {i.desarrollo && (
        <div className="mt-4 rounded-2xl bg-crema p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-vino">Propuesta de Agente DK</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-carbon">{i.desarrollo}</p>
        </div>
      )}
      {i.notaAlex && (
        <div className="mt-3 rounded-2xl bg-vino/[0.06] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-vino">Tus notas</p>
          <p className="mt-1 whitespace-pre-line text-sm text-vino">{i.notaAlex}</p>
        </div>
      )}
      {i.estado === 'publicada' && (
        <p className="mt-3 text-sm text-grafito">
          {i.vistas ?? '—'} vistas · {i.retencionSeg ?? '—'} s de retención · {i.compartidos ?? '—'} compartidos · {i.guardados ?? '—'} guardados
          {i.enlace && <> · <a href={i.enlace} target="_blank" rel="noopener noreferrer" className="text-vino underline">Ver publicación</a></>}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-start gap-2">
        {i.estado === 'idea' && <p className="w-full text-xs text-niebla">Agente DK la desarrolla (guion, escenas y texto) y te la pasa a «Por aprobar».</p>}
        {i.estado === 'propuesta' && <>
          <BotonEstado i={i} zona={zona} estado="aprobada" texto="Aprobar" clase="bg-vino text-white" />
          <BotonEstado i={i} zona={zona} estado="idea" texto="Pedir cambios" clase="bg-papel text-carbon" nota />
        </>}
        {i.estado === 'aprobada' && <BotonEstado i={i} zona={zona} estado="produccion" texto="Pasar a producción" clase="bg-noche text-white" />}
        {i.estado === 'produccion' && <BotonEstado i={i} zona={zona} estado="programada" texto="Ya está programada" clase="bg-noche text-white" />}
        {i.estado === 'programada' && <BotonEstado i={i} zona={zona} estado="publicada" texto="Ya se publicó" clase="bg-exito text-white" />}
        {i.estado === 'descartada' && <BotonEstado i={i} zona={zona} estado="idea" texto="Recuperar" clase="bg-papel text-carbon" />}
        {i.estado !== 'descartada' && i.estado !== 'publicada' && <BotonEstado i={i} zona={zona} estado="descartada" texto="Descartar" clase="bg-white text-ceniza ring-1 ring-linea" />}
      </div>
      {i.estado === 'publicada' && <Medir i={i} zona={zona} />}
      <Editar i={i} zona={zona} />
    </li>
  );
}

/** Agrupa por serie manteniendo el orden de la base. */
function porSerie(lista: IdeaContenido[]) {
  const g = new Map<string, IdeaContenido[]>();
  for (const i of lista) {
    const k = i.serie ?? 'Ideas sueltas';
    g.set(k, [...(g.get(k) ?? []), i]);
  }
  return [...g.entries()];
}

/** Central → Ventas → Ideas y contenido (0125, 27/11/2026): lluvia de ideas, aprobación, plan y medición. Solo Dirección. */
export default async function IdeasContenidoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  if (await esComercialActual(jwt)) redirect('/admin-dkitchen/inicio');
  const sp = await searchParams;
  const zona = ((Object.keys(ZONAS_IDEAS) as ZonaIdeas[]).find((z) => z === sp.zona) ?? 'ideas') as ZonaIdeas;
  const todas = await listarIdeas(jwt).catch(() => [] as IdeaContenido[]);
  const de = (z: ZonaIdeas) => todas.filter((i) => ZONAS_IDEAS[z].estados.includes(i.estado));
  const lista = de(zona);
  const descartadas = todas.filter((i) => i.estado === 'descartada');
  const publicadas = de('medicion');
  const conRet = publicadas.filter((i) => i.retencionSeg != null);
  const retMedia = conRet.length ? (conRet.reduce((s, i) => s + (i.retencionSeg ?? 0), 0) / conRet.length).toFixed(1) : '—';
  const compTot = publicadas.reduce((s, i) => s + (i.compartidos ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-vino/45 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Dirección</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Ideas y contenido</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-white/75">
          Todo lo que se te ocurra queda aquí, entero y a la vista, aunque la conversación con Agente DK se reinicie. La idea pasa a propuesta, tú la apruebas, se produce, se programa y se mide.
        </p>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(ZONAS_IDEAS) as ZonaIdeas[]).map((z) => (
            <div key={z} className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">{ZONAS_IDEAS[z].nombre}</dt>
              <dd className="font-display mt-1 text-2xl font-semibold text-oro">{de(z).length}</dd>
            </div>
          ))}
        </dl>
      </header>

      <GuiaZona
        titulo="Ideas y contenido"
        ancla="ideas"
        que="El tablero de contenido de DKitchen. Cada idea recorre cuatro pestañas: Lluvia de ideas, Por aprobar, Planificación y Medición. Nada se publica sin pasar por «Aprobar»."
        pasos={[
          'Escribe la idea tal cual se te ocurra en el recuadro de arriba y pulsa «Guardar idea».',
          'Agente DK la convierte en propuesta (guion, escenas y texto) y la deja en «Por aprobar».',
          'Pulsa «Aprobar» o «Pedir cambios» (con tu nota). Lo aprobado pasa a Planificación con su fecha.',
          'Cuando se publica, Agente DK apunta vistas, retención y compartidos en Medición y anota qué aprendemos.',
        ]}
        ojo={['Los locales que salen en los vídeos son ficticios: nunca un negocio real sin su permiso.', 'Imágenes realistas hechas con IA: se publican con la etiqueta de contenido generado con IA.']}
      />

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3.5 text-sm text-exito">{OK[sp.ok] ?? 'Guardado.'}</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3.5 text-sm text-red-700">{ERR[sp.e] ?? 'No se pudo completar la acción.'}</p>}

      <nav className="flex flex-wrap gap-2">
        {(Object.keys(ZONAS_IDEAS) as ZonaIdeas[]).map((z) => (
          <Link key={z} href={`/admin-dkitchen/ideas?zona=${z}`} className={`${boton} ${z === zona ? 'bg-vino text-white' : 'bg-white text-carbon ring-1 ring-linea'}`}>
            {ZONAS_IDEAS[z].nombre} <span className="opacity-70">{de(z).length}</span>
          </Link>
        ))}
      </nav>

      {zona === 'ideas' && (
        <form action={crearIdeaAction} className="space-y-3 rounded-[22px] border-2 border-dashed border-vino/30 bg-white p-5">
          <input type="hidden" name="zona" value="ideas" />
          <p className="font-display text-lg font-semibold">Nueva idea</p>
          <input name="titulo" required maxLength={160} placeholder="En pocas palabras (p. ej.: Pizzería, viernes noche con Signature)" className={campo} />
          <textarea name="idea" rows={4} maxLength={6000} placeholder="Cuéntala como te venga: a quién va, qué se ve, qué debería sentir quien lo vea…" className={campo} />
          <div className="grid gap-3 sm:grid-cols-3">
            <select name="publico" defaultValue="dueno" className={campo}>{Object.entries(PUBLICOS_IDEA).map(([k, x]) => <option key={k} value={k}>{x}</option>)}</select>
            <select name="servicio" defaultValue="signature" className={campo}>{Object.entries(SERVICIOS_IDEA).map(([k, x]) => <option key={k} value={k}>{x}</option>)}</select>
            <select name="red" defaultValue="tiktok" className={campo}>{Object.entries(REDES_IDEA).map(([k, x]) => <option key={k} value={k}>{x}</option>)}</select>
          </div>
          <button className={`${boton} bg-vino text-white`}>Guardar idea</button>
        </form>
      )}

      {zona === 'medicion' && publicadas.length > 0 && (
        <p className="rounded-2xl bg-white p-4 text-sm ring-1 ring-linea">
          <b>{publicadas.length}</b> piezas medidas · retención media <b>{retMedia} s</b> · <b>{compTot}</b> compartidos en total. Objetivo actual: más de 4 s de retención media.
        </p>
      )}

      {lista.length === 0 ? (
        <p className="rounded-[22px] bg-white p-6 text-sm text-niebla ring-1 ring-linea">Nada en esta pestaña todavía.</p>
      ) : zona === 'plan' ? (
        <ul className="space-y-4">{lista.map((i) => <Tarjeta key={i.id} i={i} zona={zona} />)}</ul>
      ) : (
        porSerie(lista).map(([serie, filas]) => (
          <section key={serie} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-vino">{serie} <span className="text-ceniza">{filas.length}</span></h2>
            <ul className="space-y-4">{filas.map((i) => <Tarjeta key={i.id} i={i} zona={zona} />)}</ul>
          </section>
        ))
      )}

      {zona === 'ideas' && descartadas.length > 0 && (
        <details className="rounded-[22px] bg-white p-5 ring-1 ring-linea">
          <summary className="cursor-pointer text-sm font-semibold text-grafito">Descartadas ({descartadas.length})</summary>
          <ul className="mt-4 space-y-4">{descartadas.map((i) => <Tarjeta key={i.id} i={i} zona={zona} />)}</ul>
        </details>
      )}
    </div>
  );
}
