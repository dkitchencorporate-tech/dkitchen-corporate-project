'use client';

import { useMemo, useRef, useState } from 'react';

/**
 * Crear evento en 3 toques (decisión 9 de karc0, 01/11):
 * 1 formato en tarjetas con foto → 2 fecha, plazas y precio con selectores grandes (precio sugerido del
 * catálogo del formato) → 3 vista previa de la página del comensal, editable tocando el texto.
 * Sin barras «|» ni campos técnicos: la FAQ y la foto salen del formato; el resto se edita después.
 */
export type FormatoTresToques = {
  slug: string; codigo: string; nombre: string; etiqueta: string; frase: string; titular: string; resumen: string;
  dias: string; aforo: [number, number]; entrada: [number, number]; faq: [string, string][]; foto: string | null;
};

const HORAS = ['13:30', '14:00', '19:30', '20:30', '21:00'];
const redondeo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
const slugDe = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const hoyMas = (d: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + d * 86_400_000));

function Editable({ valor, cambiar, className, testid, multilinea = false }: { valor: string; cambiar: (v: string) => void; className?: string; testid?: string; multilinea?: boolean }) {
  return (
    <span
      role="textbox"
      tabIndex={0}
      data-testid={testid}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => cambiar((e.currentTarget.innerText || '').trim())}
      onKeyDown={(e) => { if (!multilinea && e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); } }}
      className={`rounded-lg outline-none ring-oro/60 transition hover:bg-white/5 focus:ring-2 ${className ?? ''}`}
    >{valor}</span>
  );
}

export default function EventoTresToques({ formatos, locales, accion, proyecto, localInicial, cancelar }: {
  formatos: FormatoTresToques[];
  locales: string[];
  accion: (f: FormData) => void | Promise<void>;
  proyecto?: string;
  localInicial?: string;
  cancelar: string;
}) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [f, setF] = useState<FormatoTresToques | null>(null);
  const [local, setLocal] = useState(localInicial ?? locales[0] ?? '');
  const [fecha, setFecha] = useState(hoyMas(21));
  const [hora, setHora] = useState('20:30');
  const [plazas, setPlazas] = useState(30);
  const [precio, setPrecio] = useState(40);
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const elegir = (x: FormatoTresToques) => {
    setF(x);
    setPlazas(Math.round((x.aforo[0] + x.aforo[1]) / 2));
    setPrecio(redondeo5((x.entrada[0] + x.entrada[1]) / 2));
    setTitulo(x.nombre);
    setSubtitulo(x.frase);
    setDescripcion(x.resumen);
    setPaso(2);
  };

  const slug = useMemo(() => slugDe(`${local || 'evento'}-${f?.codigo ?? ''}-${fecha}`).slice(0, 60), [local, f, fecha]);
  const fechaTxt = useMemo(() => {
    try { return new Date(`${fecha}T${hora}:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return fecha; }
  }, [fecha, hora]);
  const paso2Ok = local.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && plazas >= 1 && precio >= 1;

  const Paso = ({ n, t }: { n: number; t: string }) => (
    <span className={`flex items-center gap-2 text-xs font-bold ${paso >= n ? 'text-tinta' : 'text-niebla'}`}>
      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${paso >= n ? 'bg-vino text-white' : 'bg-linea'}`}>{n}</span><span className={paso === n ? '' : 'hidden sm:inline'}>{t}</span>
    </span>
  );
  const stepper = (v: number, set: (n: number) => void, paso_: number, min: number, sufijo: string, testid: string) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => set(Math.max(min, v - paso_))} className="grid h-12 w-12 place-items-center rounded-full border border-linea bg-white text-xl font-bold hover:bg-papel" aria-label="Menos">−</button>
      <span className="min-w-[96px] text-center font-display text-3xl font-bold tabular-nums" data-testid={testid}>{v}{sufijo}</span>
      <button type="button" onClick={() => set(v + paso_)} className="grid h-12 w-12 place-items-center rounded-full border border-linea bg-white text-xl font-bold hover:bg-papel" aria-label="Más">+</button>
    </div>
  );

  return (
    <section className="rounded-[26px] border border-oro/40 bg-[linear-gradient(160deg,#FFFDF8,#F6EEDD)] p-4 sm:p-6" data-testid="evento-3-toques">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Nuevo evento</h2>
        <a href={cancelar} className="text-sm font-semibold text-vino">Cancelar</a>
      </div>
      <div className="mb-5 flex items-center gap-3 sm:gap-4"><Paso n={1} t="Formato" /><Paso n={2} t="Fecha, plazas y precio" /><Paso n={3} t="Vista previa" /></div>

      {paso === 1 && (
        <div className="dk-paso grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {formatos.map((x, i) => (
            <button key={x.slug} type="button" onClick={() => elegir(x)} style={{ ['--i' as string]: i }} data-testid={`formato-${x.slug}`}
              className="dk-carta group overflow-hidden rounded-[22px] border border-linea bg-white text-left transition hover:border-vino hover:shadow-[0_18px_40px_-24px_rgba(20,16,12,.45)]">
              <div className="relative aspect-[16/9] bg-noche">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.foto && <img src={x.foto} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
              </div>
              <div className="p-4">
                <b className="block font-display text-lg">{x.nombre}</b>
                <span className="block text-sm text-niebla">{x.etiqueta}</span>
                <span className="mt-1 block text-xs text-grafito">{x.aforo[0]}–{x.aforo[1]} plazas · {x.entrada[0]}–{x.entrada[1]} € la entrada</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {paso === 2 && f && (
        <div className="dk-paso space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">¿En qué local?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {locales.map((l) => (
                <button key={l} type="button" onClick={() => setLocal(l)} className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${local === l ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white'}`}>{l}</button>
              ))}
            </div>
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Nombre del local" data-testid="evento-local" className="mt-2 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-base outline-none focus:border-vino" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">¿Qué día?</p>
              <input type="date" value={fecha} min={hoyMas(1)} onChange={(e) => setFecha(e.target.value)} data-testid="evento-fecha" className="mt-2 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-vino" />
              <p className="mt-1 text-xs text-niebla">Mejor: {f.dias.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">¿A qué hora?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HORAS.map((h) => (
                  <button key={h} type="button" onClick={() => setHora(h)} className={`min-h-[48px] rounded-full border px-4 text-sm font-bold tabular-nums ${hora === h ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white'}`}>{h}</button>
                ))}
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="min-h-[48px] rounded-full border border-linea bg-white px-3 text-sm" aria-label="Otra hora" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Plazas</p>
              <div className="mt-2">{stepper(plazas, setPlazas, 2, 1, '', 'evento-plazas')}</div>
              <p className="mt-1 text-xs text-niebla">Lo habitual: {f.aforo[0]}–{f.aforo[1]}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Precio de la entrada</p>
              <div className="mt-2">{stepper(precio, setPrecio, 5, 5, ' €', 'evento-precio')}</div>
              <p className="mt-1 text-xs text-niebla">Sugerido para {f.nombre.toLowerCase()}: {f.entrada[0]}–{f.entrada[1]} €. El dinero va directo al local.</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setPaso(1)} className="min-h-[48px] rounded-full border border-linea bg-white px-5 text-sm font-bold">← Otro formato</button>
            <button type="button" disabled={!paso2Ok} onClick={() => setPaso(3)} data-testid="evento-siguiente" className="dk-btn min-h-[48px] rounded-full bg-vino px-6 text-sm font-bold text-white disabled:opacity-40">Ver cómo queda →</button>
          </div>
        </div>
      )}

      {paso === 3 && f && (
        <div className="dk-paso space-y-4">
          <p className="text-sm text-niebla">Así lo verá el comensal. <b className="text-tinta">Toca cualquier texto para cambiarlo.</b></p>
          <div className="mx-auto max-w-md overflow-hidden rounded-[28px] border-[8px] border-noche bg-noche text-white shadow-2xl">
            <div className="relative aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.foto && <img src={f.foto} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-noche via-noche/30 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-noche">{local}</span>
            </div>
            <div className="space-y-3 px-5 pb-6">
              <h3 className="font-display text-3xl font-bold leading-tight"><Editable valor={titulo} cambiar={setTitulo} testid="evento-titulo" /></h3>
              <p className="text-oro"><Editable valor={subtitulo} cambiar={setSubtitulo} /></p>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-3 text-center text-xs">
                <span><b className="block font-display text-base capitalize">{fechaTxt.split(',')[0]}</b>{fechaTxt.split(',').slice(1).join(',')} · {hora}</span>
                <span><b className="block font-display text-base">{plazas}</b>plazas</span>
                <span><b className="block font-display text-base">{precio} €</b>la entrada</span>
              </div>
              <p className="text-sm leading-relaxed text-white/80"><Editable valor={descripcion} cambiar={setDescripcion} multilinea /></p>
              <span className="block rounded-full bg-oro py-3 text-center text-sm font-bold text-noche">Reservar mi entrada</span>
              {!!f.faq.length && (
                <div className="space-y-1.5 pt-2 text-xs text-white/60">
                  {f.faq.slice(0, 3).map(([p]) => <p key={p}>· {p}</p>)}
                </div>
              )}
            </div>
          </div>
          <form ref={formRef} action={accion} className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="local_nombre" value={local.trim()} />
            <input type="hidden" name="lugar" value={local.trim()} />
            <input type="hidden" name="titulo" value={titulo} />
            <input type="hidden" name="descripcion" value={descripcion} />
            <input type="hidden" name="fecha" value={`${fecha}T${hora}`} />
            <input type="hidden" name="precio" value={String(precio)} />
            <input type="hidden" name="aforo" value={String(plazas)} />
            <input type="hidden" name="max_por_compra" value="6" />
            <input type="hidden" name="imagen_url" value={f.foto ?? ''} />
            <input type="hidden" name="formato" value={f.slug} />
            <input type="hidden" name="l_subtitulo" value={subtitulo} />
            <input type="hidden" name="l_historia" value={descripcion} />
            <input type="hidden" name="l_faq" value={f.faq.map(([p, r]) => `${p.replace(/\|/g, '/')} | ${r.replace(/\|/g, '/')}`).join('\n')} />
            {proyecto && <input type="hidden" name="proyecto" value={proyecto} />}
            <button type="button" onClick={() => setPaso(2)} className="min-h-[48px] rounded-full border border-linea bg-white px-5 text-sm font-bold">← Cambiar fecha o precio</button>
            <button className="dk-btn min-h-[48px] rounded-full bg-vino px-6 text-sm font-bold text-white" data-testid="evento-crear">Crear evento</button>
          </form>
        </div>
      )}
    </section>
  );
}
