'use client';

import { useMemo, useRef, useState } from 'react';

/**
 * Central → Entradas: asistente para crear o editar un evento de Experience (21/10, karc0: «el formulario
 * amplio y triste no debe ser así»). Cinco pasos con tarjetas; todos los campos viven en un único <form>
 * (los pasos solo se ocultan) y se envían a guardarEventoAction con los mismos nombres de siempre.
 */
export type FormatoAsistente = {
  slug: string; nombre: string; etiqueta: string; frase: string; dias: string;
  aforo: [number, number]; entrada: [number, number]; faq: [string, string][]; claves: string[];
};
export type EventoAsistente = {
  id: string; slug: string; local_nombre: string; titulo: string; fecha: string; precio: string; aforo: number;
  max_por_compra: number; lugar: string; imagen_url: string; formato: string; muestra: boolean; descripcion: string;
  l: { subtitulo: string; historia: string; menu: string; programa: string; incluye: string; anf_nombre: string; anf_rol: string;
    anf_texto: string; direccion: string; mapa: string; faq: string; avisos: string };
};

const PASOS = ['Formato', 'Local', 'Fecha y entradas', 'Página de venta', 'Revisar'];
const campo = 'w-full rounded-2xl border border-linea bg-white px-4 py-3 text-[15px] transition focus:border-vino focus:outline-none focus:ring-4 focus:ring-vino/10';
const etiqueta = 'grid gap-1.5 text-sm font-medium text-grafito';
const ayuda = 'text-xs font-normal text-ceniza';
const img = (slug: string, p: '4x5' | '16x9') => `/images/experience/experience-${slug}-${p}.webp`;
const slugDe = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' €';

export default function AsistenteEvento({ accion, formatos, clientes, e }: {
  accion: (f: FormData) => void | Promise<void>; formatos: FormatoAsistente[]; clientes: string[]; e?: EventoAsistente;
}) {
  const [paso, setPaso] = useState(e ? 3 : 0);
  const [formato, setFormato] = useState(e?.formato ?? '');
  const [local, setLocal] = useState(e?.local_nombre ?? '');
  const [titulo, setTitulo] = useState(e?.titulo ?? '');
  const [slug, setSlug] = useState(e?.slug ?? '');
  const [slugTocado, setSlugTocado] = useState(!!e);
  const [fecha, setFecha] = useState(e?.fecha ?? '');
  const [precio, setPrecio] = useState(e?.precio ?? '');
  const [aforo, setAforo] = useState(String(e?.aforo ?? ''));
  const [imagen, setImagen] = useState(e?.imagen_url ?? '');
  const [subtitulo, setSubtitulo] = useState(e?.l.subtitulo ?? '');
  const [faq, setFaq] = useState(e?.l.faq ?? '');
  const [historia, setHistoria] = useState(e?.l.historia ?? '');
  const [muestra, setMuestra] = useState(!!e?.muestra);
  const pasosRef = useRef<(HTMLDivElement | null)[]>([]);
  const f = formatos.find((x) => x.slug === formato);
  const slugFinal = slugTocado ? slug : slugDe(`${titulo} ${local}`);
  const precioN = Number(precio.replace(',', '.')) || 0;
  const aforoN = Number(aforo) || 0;

  const elegirFormato = (x?: FormatoAsistente) => {
    setFormato(x?.slug ?? '');
    if (!x) return;
    if (!imagen || imagen.startsWith('/images/experience/')) setImagen(img(x.slug, '16x9'));
    if (!precio) setPrecio(String(Math.round((x.entrada[0] + x.entrada[1]) / 2)));
    if (!aforo) setAforo(String(Math.round((x.aforo[0] + x.aforo[1]) / 2)));
    if (!faq) setFaq(x.faq.map(([p, r]) => `${p} | ${r}`).join('\n'));
    if (!titulo) setTitulo(x.nombre);
    setPaso(1);
  };
  // Antes de avanzar, el navegador valida los campos obligatorios del paso en curso.
  const ir = (n: number) => {
    if (n > paso) {
      const caja = pasosRef.current[paso];
      const malos = caja ? Array.from(caja.querySelectorAll<HTMLInputElement>('input, textarea, select')).filter((i) => !i.checkValidity()) : [];
      if (malos.length) { malos[0].reportValidity(); return; }
    }
    setPaso(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const fechaBonita = useMemo(() => fecha ? new Date(fecha).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha', [fecha]);
  const faltan = [!local && 'el local', !titulo && 'el título', !fecha && 'la fecha', !precioN && 'el precio', !aforoN && 'el aforo', !historia && 'la historia (recomendable)'].filter(Boolean) as string[];

  return (
    <form action={accion} noValidate onSubmit={(ev) => {
      // Si falta algo en un paso que no se ve, se salta a ese paso y se señala el campo.
      for (let i = 0; i < pasosRef.current.length; i++) {
        const malo = pasosRef.current[i] && Array.from(pasosRef.current[i]!.querySelectorAll<HTMLInputElement>('input, textarea, select')).find((x) => !x.checkValidity());
        if (malo) { ev.preventDefault(); setPaso(i); setTimeout(() => malo.reportValidity(), 50); return; }
      }
    }} className="grid gap-6">
      {e && <input type="hidden" name="id" value={e.id} />}
      <input type="hidden" name="formato" value={formato} />
      {!e && <input type="hidden" name="slug" value={slugFinal} />}

      <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Pasos">
        {PASOS.map((n, i) => (
          <li key={n} className="shrink-0">
            <button type="button" onClick={() => ir(i)} aria-current={paso === i ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${paso === i ? 'bg-noche text-white' : i < paso ? 'bg-oro/20 text-carbon' : 'bg-white text-ceniza ring-1 ring-linea'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${paso === i ? 'bg-oro text-noche' : i < paso ? 'bg-oro text-noche' : 'bg-papel'}`}>{i < paso ? '✓' : i + 1}</span>{n}
            </button>
          </li>
        ))}
      </ol>

      {/* 1 · Formato */}
      <div ref={(el) => { pasosRef.current[0] = el; }} hidden={paso !== 0}>
        <h3 className="font-display text-2xl font-semibold">¿Qué tipo de evento es?</h3>
        <p className="mt-1 text-sm text-niebla">El formato rellena por ti la imagen, el precio y el aforo orientativos y las preguntas frecuentes. Todo se puede cambiar después.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {formatos.map((x) => (
            <li key={x.slug}>
              <button type="button" onClick={() => elegirFormato(x)}
                className={`group relative block aspect-[4/5] w-full overflow-hidden rounded-[22px] text-left ring-offset-2 transition hover:-translate-y-1 ${formato === x.slug ? 'ring-4 ring-oro' : 'ring-1 ring-linea'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(x.slug, '4x5')} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <span className="block font-display text-xl font-semibold leading-tight">{x.nombre}</span>
                  <span className="mt-1 block text-xs text-white/75">{x.etiqueta}</span>
                  <span className="mt-2 block text-[11px] text-oro">{x.entrada[0]}–{x.entrada[1]} € · {x.aforo[0]}–{x.aforo[1]} personas</span>
                </span>
                {formato === x.slug && <span className="absolute right-3 top-3 rounded-full bg-oro px-2.5 py-1 text-[11px] font-bold text-noche">Elegido</span>}
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => { elegirFormato(undefined); setPaso(1); }}
              className={`flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed p-4 text-center transition hover:border-vino ${!formato ? 'border-oro bg-oro/5' : 'border-linea'}`}>
              <span className="text-3xl">✦</span><span className="font-display text-lg font-semibold">A medida</span><span className="text-xs text-niebla">Sin formato: lo escribes todo tú.</span>
            </button>
          </li>
        </ul>
      </div>

      {/* 2 · Local */}
      <div ref={(el) => { pasosRef.current[1] = el; }} className={`${paso !== 1 ? 'hidden' : 'grid'} gap-4 sm:grid-cols-2`}>
        <div className="sm:col-span-2">
          <h3 className="font-display text-2xl font-semibold">¿Dónde y cómo se llama?</h3>
          {f && <p className="mt-1 text-sm text-niebla">{f.frase} Mejor día: {f.dias.toLowerCase()}.</p>}
        </div>
        <label className={etiqueta}>Local que organiza
          <input name="local_nombre" required list="clientes-experience" value={local} onChange={(x) => setLocal(x.target.value)} placeholder="Cuevas Al Jatib" className={campo} />
          <span className={ayuda}>Si es cliente de Experience, elígelo de la lista: así sale en su ficha.</span>
        </label>
        <datalist id="clientes-experience">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
        <label className={etiqueta}>Título del evento
          <input name="titulo" required maxLength={140} value={titulo} onChange={(x) => setTitulo(x.target.value)} placeholder="Noche de maridaje en la cueva" className={campo} />
        </label>
        {!e && (
          <label className={`${etiqueta} sm:col-span-2`}>Dirección de la página
            <span className="flex items-center overflow-hidden rounded-2xl border border-linea bg-papel/60 focus-within:border-vino">
              <span className="pl-4 text-sm text-ceniza">dkitchencorporate.es/e/</span>
              <input value={slugFinal} onChange={(x) => { setSlugTocado(true); setSlug(slugDe(x.target.value)); }} required pattern="[a-z0-9-]{3,60}" aria-label="Dirección (slug)" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[15px] focus:outline-none" />
            </span>
            <span className={ayuda}>Se genera sola con el título y el local. Solo minúsculas, números y guiones.</span>
          </label>
        )}
        <label className={etiqueta}>Lugar (sala, terraza…)<input name="lugar" maxLength={300} defaultValue={e?.lugar} className={campo} placeholder="Comedor principal" /></label>
        <label className={etiqueta}>Dirección<input name="l_direccion" maxLength={200} defaultValue={e?.l.direccion} className={campo} placeholder="Calle, número, pueblo" /></label>
        <label className={`${etiqueta} sm:col-span-2`}>Enlace de Google Maps <span className={ayuda}>(opcional)</span><input name="l_mapa" maxLength={400} defaultValue={e?.l.mapa} className={campo} placeholder="https://maps.app.goo.gl/…" /></label>
      </div>

      {/* 3 · Fecha y entradas */}
      <div ref={(el) => { pasosRef.current[2] = el; }} className={`${paso !== 2 ? 'hidden' : 'grid'} gap-4 lg:grid-cols-[1fr_300px]`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <h3 className="font-display text-2xl font-semibold sm:col-span-2">¿Cuándo y cuántas entradas?</h3>
          <label className={`${etiqueta} sm:col-span-2`}>Fecha y hora (hora de Madrid)<input type="datetime-local" name="fecha" required value={fecha} onChange={(x) => setFecha(x.target.value)} className={campo} /></label>
          <label className={etiqueta}>Precio por entrada (IVA incluido)
            <span className="relative"><input name="precio" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={precio} onChange={(x) => setPrecio(x.target.value)} className={`${campo} pr-10`} /><span className="absolute right-4 top-3 text-ceniza">€</span></span>
            {f && <span className={ayuda}>Orientativo del formato: {f.entrada[0]}–{f.entrada[1]} €</span>}
          </label>
          <label className={etiqueta}>Aforo
            <input type="number" name="aforo" min={1} max={5000} required value={aforo} onChange={(x) => setAforo(x.target.value)} className={campo} />
            {f && <span className={ayuda}>Habitual: {f.aforo[0]}–{f.aforo[1]} personas</span>}
          </label>
          <label className={etiqueta}>Máximo de entradas por compra<input type="number" name="max_por_compra" min={1} max={20} defaultValue={e?.max_por_compra ?? 6} className={campo} /></label>
          <label className="flex items-start gap-3 rounded-2xl border border-linea bg-white p-4 text-sm">
            <input type="checkbox" name="muestra" value="1" checked={muestra} onChange={(x) => setMuestra(x.target.checked)} className="mt-0.5 h-5 w-5 accent-vino" />
            <span><span className="font-semibold">Evento de muestra</span><span className="block text-xs text-ceniza">Para enseñar a un cliente: nunca vende entradas.</span></span>
          </label>
        </div>
        <aside className="self-start rounded-[22px] bg-noche p-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Si se llena</p>
          <p className="font-display text-4xl font-semibold tabular-nums text-oro">{eur(precioN * aforoN)}</p>
          <p className="mt-1 text-xs text-white/60">{aforoN || '—'} entradas × {eur(precioN)}. El dinero va directo a la cuenta de Stripe del local; DKitchen no cobra comisión por entrada.</p>
          <p className="mt-4 text-sm capitalize">{fechaBonita}</p>
        </aside>
      </div>

      {/* 4 · Página de venta */}
      <div ref={(el) => { pasosRef.current[3] = el; }} className={`${paso !== 3 ? 'hidden' : 'grid'} gap-4 sm:grid-cols-2`}>
        <div className="sm:col-span-2">
          <h3 className="font-display text-2xl font-semibold">La página que verá el comensal</h3>
          <p className="mt-1 text-sm text-niebla">Lo justo para que quiera ir. Lo que dejes vacío no sale en la página.</p>
        </div>
        <label className={`${etiqueta} sm:col-span-2`}>Imagen de portada <span className={ayuda}>(URL de Vercel Blob o la del formato)</span>
          <input name="imagen_url" maxLength={500} value={imagen} onChange={(x) => setImagen(x.target.value)} className={campo} />
        </label>
        <label className={`${etiqueta} sm:col-span-2`}>Subtítulo <span className={ayuda}>(fecha, hora, plazas…)</span><input name="l_subtitulo" maxLength={160} value={subtitulo} onChange={(x) => setSubtitulo(x.target.value)} className={campo} placeholder="Jueves 13 de noviembre · 21:00 · 40 plazas" /></label>
        <label className={`${etiqueta} sm:col-span-2`}>La historia del evento <span className={ayuda}>(deja una línea en blanco entre párrafos)</span>
          <textarea name="l_historia" rows={5} maxLength={3000} value={historia} onChange={(x) => setHistoria(x.target.value)} className={campo} placeholder="Cinco pases dentro de la cueva, cada uno con su vino de la tierra…" />
        </label>
        <label className={etiqueta}>Menú <span className={ayuda}>una línea por pase: Pase | Plato | Bebida</span>
          <textarea name="l_menu" rows={5} defaultValue={e?.l.menu} className={`${campo} font-mono text-[13px]`} placeholder={'Aperitivo | Croqueta de rabo de toro | Cava\nPrincipal | Cordero al horno de leña | Tinto Jabalcón'} />
        </label>
        <label className={etiqueta}>Programa <span className={ayuda}>Hora | Qué pasa</span>
          <textarea name="l_programa" rows={5} defaultValue={e?.l.programa} className={`${campo} font-mono text-[13px]`} placeholder={'21:00 | Bienvenida\n21:30 | Primer pase'} />
        </label>
        <label className={etiqueta}>La entrada incluye <span className={ayuda}>una cosa por línea</span>
          <textarea name="l_incluye" rows={4} defaultValue={e?.l.incluye} className={campo} placeholder={'Menú de 5 pases\nMaridaje completo'} />
        </label>
        <div className="grid gap-3 rounded-[22px] border border-linea bg-papel/50 p-4">
          <p className="text-sm font-semibold">Anfitrión o chef <span className={ayuda}>(opcional)</span></p>
          <input name="l_anf_nombre" maxLength={80} defaultValue={e?.l.anf_nombre} placeholder="Nombre" className={campo} />
          <input name="l_anf_rol" maxLength={80} defaultValue={e?.l.anf_rol} placeholder="Su papel (chef, sumiller…)" className={campo} />
          <input name="l_anf_texto" maxLength={400} defaultValue={e?.l.anf_texto} placeholder="Una frase sobre él o ella" className={campo} />
        </div>
        <label className={`${etiqueta} sm:col-span-2`}>Preguntas frecuentes <span className={ayuda}>Pregunta | Respuesta {f ? '(traídas del formato)' : ''}</span>
          <textarea name="l_faq" rows={3} value={faq} onChange={(x) => setFaq(x.target.value)} className={campo} />
        </label>
        <label className={etiqueta}>Avisos <span className={ayuda}>(edad, alérgenos, aforo…)</span><input name="l_avisos" maxLength={400} defaultValue={e?.l.avisos} className={campo} /></label>
        <label className={etiqueta}>Descripción corta <span className={ayuda}>(si no hay historia)</span><input name="descripcion" maxLength={3000} defaultValue={e?.descripcion} className={campo} /></label>
      </div>

      {/* 5 · Revisar */}
      <div className={`${paso !== 4 ? 'hidden' : 'grid'} gap-5 lg:grid-cols-[1fr_320px]`}>
        <div className="overflow-hidden rounded-[26px] bg-noche text-white">
          <div className="relative aspect-[16/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imagen && <img src={imagen} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
            <div className="absolute inset-0 bg-gradient-to-t from-noche via-noche/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oro">{local || 'Tu local'}{f ? ` · ${f.nombre}` : ''}</p>
              <p className="mt-1 font-display text-3xl font-semibold leading-tight">{titulo || 'Título del evento'}</p>
              <p className="mt-1 text-sm text-white/75">{subtitulo || fechaBonita}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 p-5">
            <p className="line-clamp-2 text-sm text-white/70">{historia.split(/\n{2,}/)[0] || 'Aquí irá la historia del evento.'}</p>
            <span className="shrink-0 rounded-full bg-oro px-4 py-2 text-sm font-bold text-noche">{precioN ? eur(precioN) : '— €'}</span>
          </div>
        </div>
        <aside className="grid content-start gap-3">
          <div className={`rounded-[22px] p-4 text-sm ${faltan.length ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
            {faltan.length ? <><p className="font-semibold">Falta:</p><p>{faltan.join(', ')}.</p></> : <p className="font-semibold">Todo listo para guardar.</p>}
          </div>
          {!e && <p className="text-xs text-niebla">Se publicará en dkitchencorporate.es/e/{slugFinal || '…'} cuando abras la venta. Guardar no vende nada todavía.</p>}
          {muestra && <p className="rounded-2xl bg-sky-50 p-3 text-xs text-sky-900">Es un evento de muestra: nunca venderá.</p>}
          <button className="rounded-full bg-vino px-6 py-3.5 text-sm font-bold text-white transition hover:bg-vino-hondo">{e ? 'Guardar cambios' : 'Crear evento'}</button>
        </aside>
      </div>

      <div className="flex items-center justify-between border-t border-linea pt-4">
        <button type="button" onClick={() => ir(Math.max(0, paso - 1))} disabled={paso === 0} className="rounded-full px-4 py-2 text-sm font-semibold text-grafito disabled:opacity-30">← Atrás</button>
        <span className="text-xs text-ceniza">Paso {paso + 1} de {PASOS.length}</span>
        {paso < PASOS.length - 1
          ? <button type="button" onClick={() => ir(paso + 1)} className="rounded-full bg-noche px-5 py-2.5 text-sm font-semibold text-white">Siguiente →</button>
          : <span className="w-24" />}
      </div>
    </form>
  );
}
