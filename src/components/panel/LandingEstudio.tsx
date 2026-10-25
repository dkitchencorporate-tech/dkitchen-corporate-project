'use client';

import { useState, useTransition } from 'react';
import { avisarEstudio } from './EstudioMarco';
import SubirImagen from './SubirImagen';
import { guardarLandingAction, generarLandingIaAction } from '@/app/panel/actions';
import { BLOQUES, LANDING_VACIA, type Landing, type BloqueLanding, type EstiloLanding } from '@/lib/landing-tipos';

/**
 * LANDING del local dentro del Estudio (13/10, 0076). Editor por bloques con el
 * móvil en vivo a la derecha. Textos con IA (1 crédito del saldo de IA, el mismo
 * que las imágenes). Topes por plan en la base: Local 3 estilos y 4 fotos sin
 * preguntas; Sala, todo. Plan Carta (9 €): solo carta QR, sin landing.
 */
const ESTILOS: { id: EstiloLanding; nombre: string; frase: string; fondo: string; tinta: string; acento: string; soloSala?: boolean }[] = [
  { id: 'noir', nombre: 'Noir', frase: 'Negro y oro. Noche, autor, cócteles.', fondo: '#0B0A09', tinta: '#F4EEE4', acento: '#F2C14E' },
  { id: 'crema', nombre: 'Crema', frase: 'Papel cálido. Día, brunch, terraza.', fondo: '#F5EFE4', tinta: '#221D17', acento: '#8C0D37' },
  { id: 'brasa', nombre: 'Brasa', frase: 'Ascuas y humo. Asador, parrilla, tapas.', fondo: '#1A0F0A', tinta: '#F6E7D8', acento: '#E8792E' },
  { id: 'mar', nombre: 'Mar', frase: 'Azul hondo y sal. Marisquería, arroces.', fondo: '#0A1A24', tinta: '#EAF2F4', acento: '#7FC8D9', soloSala: true },
];
const campo = 'w-full rounded-2xl border border-linea bg-white px-4 py-3 text-sm placeholder-ceniza focus:border-vino focus:outline-none';
const etiqueta = 'text-[11px] font-bold uppercase tracking-[0.22em] text-niebla';
const tarjeta = 'rounded-[26px] bg-white p-5 ring-1 ring-linea sm:p-6';

export default function LandingEstudio({ slug, plan, ir, inicial, platos, demo = false }: {
  slug: string; plan: string; ir: (p: string) => void; inicial: Landing | null;
  platos: { id: string; nombre: string; fotoUrl: string | null }[]; demo?: boolean;
}) {
  const sala = plan === 'sala';
  const maxFotos = sala ? 8 : 4;
  const base = inicial ?? LANDING_VACIA;
  const [l, setL] = useState<Landing>(base);
  const [guardada, setGuardada] = useState(JSON.stringify(base));
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [ia, setIa] = useState(false);
  const cambiado = JSON.stringify(l) !== guardada;
  const set = <K extends keyof Landing>(k: K, v: Landing[K]) => setL((x) => ({ ...x, [k]: v }));

  if (plan === 'basico') {
    return (
      <section className="overflow-hidden rounded-[30px] bg-[#0D090F] p-8 text-white" style={{ backgroundImage: 'radial-gradient(120% 70% at 0% 0%, rgba(140,13,55,.5), transparent 60%)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">Landing del local</p>
        <h2 className="mt-2 font-display text-4xl italic text-[#F2C14E]">Tu casa, en una página</h2>
        <p className="mt-3 max-w-lg text-white/75">Portada, la historia de la casa, platos estrella, reseñas de Google y reserva en un toque. Va incluida desde el plan Local; tu plan Carta trae la carta QR.</p>
        <button type="button" onClick={() => ir('plan')} className="mt-6 rounded-full bg-[#F2C14E] px-6 py-3 text-sm font-bold text-[#0D090F]">Ver el plan Local</button>
      </section>
    );
  }

  const guardar = () => {
    if (demo) { setAviso({ ok: true, texto: 'Demostración: en tu panel real se guardaría y la verías al momento.' }); return; }
    setAviso(null);
    iniciar(async () => {
      const r = await guardarLandingAction(l);
      if (!r.ok) { setAviso({ ok: false, texto: r.error }); return; }
      setGuardada(JSON.stringify(l));
      setAviso({ ok: true, texto: l.activa ? 'Guardada y publicada.' : 'Guardada como borrador: se sigue viendo la landing automática.' });
      avisarEstudio({ ver: 'landing', recargar: true });
    });
  };

  const generar = () => {
    if (demo) return;
    setAviso(null); setIa(true);
    iniciar(async () => {
      const r = await generarLandingIaAction();
      setIa(false);
      if (!r.ok) { setAviso({ ok: false, texto: r.error }); return; }
      const t = r.textos;
      setL((x) => ({ ...x, titular: t.titular, subtitulo: t.subtitulo, historia: t.historia, faq: sala ? t.faq : x.faq, seoTitulo: t.seoTitulo, seoDescripcion: t.seoDescripcion }));
      setAviso({ ok: true, texto: `Textos listos: revísalos y guarda.${r.restantes != null ? ` Te quedan ${r.restantes} créditos de IA.` : ''}` });
    });
  };

  const mover = (b: BloqueLanding, d: -1 | 1) => {
    const i = l.bloques.indexOf(b); const j = i + d;
    if (i < 0 || j < 0 || j >= l.bloques.length) return;
    const n = [...l.bloques]; [n[i], n[j]] = [n[j], n[i]]; set('bloques', n);
  };
  const alternarBloque = (b: BloqueLanding) => set('bloques', l.bloques.includes(b) ? l.bloques.filter((x) => x !== b) : [...l.bloques, b]);
  const orden = [...l.bloques, ...BLOQUES.map((b) => b.id).filter((b) => !l.bloques.includes(b))];
  const conFoto = platos.filter((p) => p.fotoUrl);

  return (
    <section className="space-y-6 pb-24">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-vino">Landing del local · incluida en tu plan</p>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">Tu casa, en una página</h2>
        <p className="mt-1 max-w-xl text-sm text-niebla">Nombre, logo, horario y dirección salen de Identidad; la portada, de Estilo. Aquí escribes la historia, eliges platos y fotos y ordenas los bloques.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-[26px] bg-[#0D090F] p-3 pl-5 text-white" style={{ backgroundImage: 'radial-gradient(120% 90% at 0% 0%, rgba(140,13,55,.45), transparent 60%)' }}>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#F2C14E] sm:text-sm">dkitchencorporate.es/l/{slug}</span>
        <button type="button" onClick={() => { void navigator.clipboard?.writeText(`https://dkitchencorporate.es/l/${slug}`); setAviso({ ok: true, texto: 'Enlace copiado.' }); }} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">Copiar enlace</button>
        <button type="button" disabled={pendiente} onClick={generar} className="rounded-full bg-[linear-gradient(135deg,#F2C14E,#D9B25C)] px-4 py-2 text-xs font-bold text-[#0D090F] disabled:opacity-50">
          {ia ? 'Escribiendo…' : '✦ Escribir con IA · 1 crédito'}
        </button>
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Estilo de la landing</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {ESTILOS.map((e) => {
            const bloqueado = e.soloSala && !sala;
            return (
              <button key={e.id} type="button" disabled={bloqueado} onClick={() => set('estilo', e.id)} aria-pressed={l.estilo === e.id}
                className={`relative rounded-[20px] p-4 text-left ring-2 transition disabled:opacity-45 ${l.estilo === e.id ? 'ring-[#F2C14E]' : 'ring-transparent hover:ring-linea-fuerte'}`} style={{ background: e.fondo, color: e.tinta }}>
                <span className="block h-1 w-8 rounded-full" style={{ background: e.acento }} />
                <span className="mt-3 block font-display text-xl italic">{e.nombre}</span>
                <span className="mt-1 block text-[11px] opacity-75">{bloqueado ? 'Incluido en el plan Sala' : e.frase}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${tarjeta} space-y-4`}>
        <p className={etiqueta}>Portada</p>
        <label className="block"><span className="text-sm font-semibold">Titular</span>
          <input value={l.titular ?? ''} maxLength={90} onChange={(e) => set('titular', e.target.value)} placeholder="Ej. Brasa, huerta y sobremesa" className={`${campo} mt-1 font-display text-lg`} /></label>
        <label className="block"><span className="text-sm font-semibold">Subtítulo</span>
          <input value={l.subtitulo ?? ''} maxLength={160} onChange={(e) => set('subtitulo', e.target.value)} placeholder="Una frase que invite a venir" className={`${campo} mt-1`} /></label>
        <div><span className="text-sm font-semibold">Botón principal</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {([['reservar', 'Reservar mesa'], ['carta', 'Ver la carta'], ['llamar', 'Llamar']] as const).map(([id, n]) => (
              <button key={id} type="button" onClick={() => set('ctaPrincipal', id)} className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${l.ctaPrincipal === id ? 'bg-[#0D090F] text-[#F2C14E] ring-[#0D090F]' : 'ring-linea'}`}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${tarjeta} space-y-4`}>
        <p className={etiqueta}>La casa</p>
        <textarea value={l.historia ?? ''} maxLength={600} rows={5} onChange={(e) => set('historia', e.target.value)} placeholder="Quiénes sois, qué cocináis y cómo se está en vuestra casa." className={`${campo} font-display text-base leading-relaxed`} />
        <p className="text-right text-[11px] text-ceniza">{(l.historia ?? '').length}/600</p>
        <SubirImagen valor={l.fotoHistoriaUrl} onCambio={(u) => set('fotoHistoriaUrl', u)} etiqueta="Foto de la casa (vertical)" ia={{ modo: 'portada' }} />
      </div>

      <div className={tarjeta}>
        <div className="flex items-baseline justify-between"><p className={etiqueta}>Platos de la casa</p><span className="text-xs text-niebla">{l.destacados.length}/6</span></div>
        {conFoto.length === 0 ? <p className="mt-3 text-sm text-niebla">Sube fotos a tus platos en Carta → Platos y podrás elegirlos aquí.</p> : (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {conFoto.map((p) => {
              const sel = l.destacados.includes(p.id);
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => set('destacados', sel ? l.destacados.filter((x) => x !== p.id) : l.destacados.length < 6 ? [...l.destacados, p.id] : l.destacados)}
                    className={`relative block aspect-square w-full overflow-hidden rounded-2xl ring-2 transition ${sel ? 'ring-[#F2C14E]' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.fotoUrl!} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-left text-[10px] font-semibold leading-tight text-white">{p.nombre}</span>
                    {sel && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#F2C14E] text-xs font-black text-[#0D090F]">{l.destacados.indexOf(p.id) + 1}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-niebla">Si no eliges ninguno, salen los marcados como Especial o Recomendado.</p>
      </div>

      <div className={tarjeta}>
        <div className="flex items-baseline justify-between"><p className={etiqueta}>Galería</p><span className="text-xs text-niebla">{l.galeria.length}/{maxFotos}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {l.galeria.map((u, i) => (
            <div key={u} className="relative aspect-square overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => set('galeria', l.galeria.filter((_, k) => k !== i))} aria-label="Quitar foto" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white">✕</button>
            </div>
          ))}
        </div>
        {l.galeria.length < maxFotos && <div className="mt-3"><SubirImagen key={l.galeria.length} valor={null} onCambio={(u) => { if (u) set('galeria', [...l.galeria, u].slice(0, maxFotos)); }} etiqueta="Añadir foto del local" /></div>}
        {!sala && <p className="mt-2 text-xs text-niebla">Hasta 4 fotos en tu plan; 8 en el plan Sala.</p>}
      </div>

      <div className={tarjeta}>
        <div className="flex items-baseline justify-between"><p className={etiqueta}>Preguntas frecuentes</p>{sala && <span className="text-xs text-niebla">{l.faq.length}/6</span>}</div>
        {!sala ? <p className="mt-2 text-sm text-niebla">Incluidas en el plan Sala.</p> : (
          <div className="mt-3 space-y-3">
            {l.faq.map((q, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-crema p-3">
                <input value={q.p} maxLength={140} onChange={(e) => set('faq', l.faq.map((x, k) => (k === i ? { ...x, p: e.target.value } : x)))} placeholder="Pregunta" className={campo} />
                <textarea value={q.r} maxLength={400} rows={2} onChange={(e) => set('faq', l.faq.map((x, k) => (k === i ? { ...x, r: e.target.value } : x)))} placeholder="Respuesta" className={campo} />
                <button type="button" onClick={() => set('faq', l.faq.filter((_, k) => k !== i))} className="text-xs font-semibold text-red-600">Quitar</button>
              </div>
            ))}
            {l.faq.length < 6 && <button type="button" onClick={() => set('faq', [...l.faq, { p: '', r: '' }])} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-linea">+ Añadir pregunta</button>}
          </div>
        )}
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Orden de la página</p>
        <ol className="mt-3 space-y-2">
          {orden.map((b) => {
            const activo = l.bloques.includes(b);
            const nombre = BLOQUES.find((x) => x.id === b)?.nombre ?? b;
            const i = l.bloques.indexOf(b);
            return (
              <li key={b} className={`flex items-center gap-2 rounded-2xl px-3 py-2 ring-1 ${activo ? 'bg-white ring-linea' : 'bg-crema/60 ring-transparent opacity-60'}`}>
                <span className="w-7 text-center font-display text-lg text-vino">{activo ? i + 1 : '–'}</span>
                <span className="flex-1 text-sm font-semibold">{nombre}{b === 'faq' && !sala ? ' · plan Sala' : ''}</span>
                {activo && <>
                  <button type="button" onClick={() => mover(b, -1)} aria-label={`Subir ${nombre}`} className="h-8 w-8 rounded-full ring-1 ring-linea">↑</button>
                  <button type="button" onClick={() => mover(b, 1)} aria-label={`Bajar ${nombre}`} className="h-8 w-8 rounded-full ring-1 ring-linea">↓</button>
                </>}
                <button type="button" onClick={() => alternarBloque(b)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${activo ? 'bg-[#0D090F] text-[#F2C14E]' : 'ring-1 ring-linea'}`}>{activo ? 'Visible' : 'Oculto'}</button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={`${tarjeta} space-y-3`}>
        <p className={etiqueta}>Cómo sale en Google y al compartir</p>
        <input value={l.seoTitulo ?? ''} maxLength={70} onChange={(e) => set('seoTitulo', e.target.value)} placeholder="Título (por defecto, el nombre del local)" className={campo} />
        <textarea value={l.seoDescripcion ?? ''} maxLength={160} rows={2} onChange={(e) => set('seoDescripcion', e.target.value)} placeholder="Descripción de 1–2 frases" className={campo} />
      </div>

      <div className={`${cambiado ? 'sticky bottom-20 z-10 shadow-lg lg:bottom-4' : ''} flex flex-wrap items-center gap-3 rounded-full bg-white/95 p-2 pl-5 ring-1 ring-linea backdrop-blur`}>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={l.activa} onChange={(e) => set('activa', e.target.checked)} className="h-4 w-4 accent-[#8C0D37]" /> Publicada
        </label>
        <span className="min-w-0 flex-1 truncate text-sm">{aviso ? <span className={aviso.ok ? 'text-exito' : 'text-red-600'}>{aviso.texto}</span> : <span className="text-niebla">{cambiado ? 'Cambios sin guardar.' : 'Al día.'}</span>}</span>
        {cambiado && <button type="button" onClick={() => setL(JSON.parse(guardada))} className="rounded-full px-4 py-2.5 text-sm font-semibold text-niebla">Deshacer</button>}
        <button type="button" disabled={!cambiado || pendiente} onClick={guardar} className="rounded-full bg-vino px-6 py-3 text-sm font-bold text-white disabled:opacity-35">{pendiente && !ia ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </section>
  );
}
