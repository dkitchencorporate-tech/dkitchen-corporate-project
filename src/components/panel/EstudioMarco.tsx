'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** Evento que lanzan las pantallas del Estudio al guardar (recarga el móvil) o al probar un estilo sin guardar. */
export const EVENTO_ESTUDIO = 'dk:estudio';
export type DetalleEstudio = { recargar?: boolean; vista?: 'foto' | 'autor'; tema?: 'noir' | 'crema'; ver?: 'carta' | 'landing' };
export const avisarEstudio = (d: DetalleEstudio = { recargar: true }) => {
  try { window.dispatchEvent(new CustomEvent<DetalleEstudio>(EVENTO_ESTUDIO, { detail: d })); } catch { /* sin ventana */ }
};

/**
 * ESTUDIO (13/10, karc0): Identidad, Carta, Estilo, Landing y QR en un solo
 * sitio, con el móvil a la derecha enseñando la carta o la landing REAL del
 * local. Se recarga al guardar y prueba estilos antes de guardarlos.
 */
export default function EstudioMarco({ slug, conLanding, verInicial = 'carta', children }: {
  slug: string; conLanding: boolean; verInicial?: 'carta' | 'landing'; children: ReactNode;
}) {
  const [ver, setVer] = useState<'carta' | 'landing'>(conLanding ? verInicial : 'carta');
  const [prueba, setPrueba] = useState<{ vista?: string; tema?: string }>({});
  const [n, setN] = useState(0);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => { setVer(conLanding ? verInicial : 'carta'); }, [verInicial, conLanding]);
  useEffect(() => {
    const oir = (e: Event) => {
      const d = (e as CustomEvent<DetalleEstudio>).detail ?? {};
      if (d.vista || d.tema) { setPrueba({ vista: d.vista, tema: d.tema }); setVer('carta'); }
      if (d.ver && (d.ver === 'carta' || conLanding)) setVer(d.ver);
      if (d.recargar) { setPrueba({}); setN((x) => x + 1); }
    };
    window.addEventListener(EVENTO_ESTUDIO, oir);
    return () => window.removeEventListener(EVENTO_ESTUDIO, oir);
  }, [conLanding]);

  const q = new URLSearchParams();
  if (ver === 'carta' && prueba.vista) q.set('vista', prueba.vista);
  if (ver === 'carta' && prueba.tema) q.set('tema', prueba.tema);
  q.set('estudio', String(n));
  const src = `/${ver === 'landing' ? 'l' : 'm'}/${slug}?${q.toString()}`;

  const movil = (alto: string) => (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
        {(['carta', 'landing'] as const).filter((v) => v === 'carta' || conLanding).map((v) => (
          <button key={v} type="button" onClick={() => setVer(v)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${ver === v ? 'bg-[#F2C14E] text-[#0D090F]' : 'text-white/70 hover:text-white'}`}>
            {v === 'carta' ? 'Carta' : 'Landing'}
          </button>
        ))}
        <button type="button" onClick={() => setN((x) => x + 1)} title="Recargar" aria-label="Recargar la vista previa" className="rounded-full px-3 py-1.5 text-xs text-white/70 hover:text-white">↻</button>
      </div>
      <div className="relative w-[300px] rounded-[44px] bg-[#0D090F] p-[10px] shadow-[0_40px_80px_-30px_rgba(13,9,15,.9)] ring-1 ring-[#F2C14E]/25">
        <span className="absolute left-1/2 top-[18px] z-10 h-[6px] w-20 -translate-x-1/2 rounded-full bg-black/80" />
        <iframe key={src} src={src} title={`Vista en vivo de tu ${ver}`} className={`w-full rounded-[34px] bg-[#0B0A09] ${alto}`} />
      </div>
      <a href={`/${ver === 'landing' ? 'l' : 'm'}/${slug}`} target="_blank" rel="noopener" className="text-xs font-semibold text-[#F2C14E] hover:underline">
        Abrir {ver === 'landing' ? 'la landing' : 'la carta'} en otra pestaña ↗
      </a>
      {(prueba.vista || prueba.tema) && <p className="max-w-[260px] text-center text-[11px] text-white/55">Vista de prueba: aún no está guardada.</p>}
    </div>
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">{children}</div>

      {/* Escritorio: móvil fijo a la derecha */}
      <aside className="hidden xl:block">
        <div className="sticky top-[132px] rounded-[36px] bg-[#0D090F] px-5 py-5"
          style={{ backgroundImage: 'radial-gradient(120% 60% at 0% 0%, rgba(110,12,43,.4), transparent 60%)' }}>
          <p className="mb-2 text-center font-display text-lg italic text-[#F2C14E]">En vivo</p>
          {movil('h-[min(600px,calc(100dvh-300px))] min-h-[380px]')}
        </div>
      </aside>

      {/* Móvil y tableta: botón flotante que abre la vista en vivo */}
      <button type="button" onClick={() => setAbierto(true)}
        className="fixed bottom-24 left-4 z-40 rounded-full bg-[#0D090F] px-5 py-3 text-sm font-bold text-[#F2C14E] shadow-xl ring-1 ring-[#F2C14E]/40 xl:hidden">
        Ver en vivo
      </button>
      {abierto && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-[#0D090F]/95 p-4 backdrop-blur xl:hidden" role="dialog" aria-modal="true" aria-label="Vista en vivo">
          <button type="button" onClick={() => setAbierto(false)} className="self-end rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">Cerrar ✕</button>
          {movil('h-[min(640px,72dvh)]')}
        </div>
      )}
    </div>
  );
}
