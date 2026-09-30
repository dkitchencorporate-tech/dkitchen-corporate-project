'use client';

import { useEffect, useRef, useState } from 'react';
import type { Banner } from '@/lib/menu';

const INTERVALO_MS = 5000;

/**
 * Carrusel de banners arriba de la carta (0024). Banners ya diseñados por el
 * hostelero (imagen 16:9) o solo texto. Hasta 3 en Ampliado, 1 en Básico.
 * Rotación automática cada 5 s, se desliza con el dedo, se pausa al tocarlo
 * y respeta "reducir movimiento" del sistema.
 */
export default function CarruselBanners({ banners, color }: { banners: Banner[]; color: string }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const pista = useRef<HTMLDivElement>(null);
  const vistos = useRef(new Set<string>());
  const varios = banners.length > 1;

  const ir = (i: number) => {
    const n = (i + banners.length) % banners.length;
    setActual(n);
    pista.current?.children[n]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  // Rotación automática
  useEffect(() => {
    if (!varios || pausado) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => ir(actual + 1), INTERVALO_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual, pausado, varios]);

  // Métrica: una vista por banner mostrado (el anti-inflado está en la BD)
  useEffect(() => {
    const b = banners[actual];
    if (!b || vistos.current.has(b.id)) return;
    vistos.current.add(b.id);
    fetch('/api/promocion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, tipo: 'vista' }), keepalive: true }).catch(() => {});
  }, [actual, banners]);

  // Sincroniza el punto activo cuando se desliza con el dedo
  function alDesplazar() {
    const el = pista.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== actual) setActual(i);
  }

  function pulsar(b: Banner) {
    fetch('/api/promocion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, tipo: 'clic' }), keepalive: true }).catch(() => {});
    const destino = b.botonDestino ?? (b.botonSeccion ? 'seccion' : 'inicio');
    if (destino === 'plato' && b.botonPlato) window.dispatchEvent(new CustomEvent('dk:abrir-plato', { detail: b.botonPlato }));
    else if (destino === 'reservar') window.dispatchEvent(new Event('dk:reservar'));
    else if (b.botonSeccion) document.getElementById(`s-${b.botonSeccion}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  if (banners.length === 0) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Novedades y promociones"
      className="mx-auto max-w-3xl px-5 pt-5"
      onPointerDown={() => setPausado(true)}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div
        ref={pista}
        onScroll={alDesplazar}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => {
          const sinBoton = b.botonDestino === 'ninguno';
          const interactivo = !sinBoton && Boolean(b.botonSeccion || b.botonTexto || b.botonPlato || b.botonDestino === 'reservar');
          if (sinBoton) b = { ...b, botonTexto: null };
          const contenido = b.imagenUrl ? (
            <div className="relative aspect-[16/9] w-full bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imagenUrl} alt={b.titulo ?? 'Promoción del local'} loading={i === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
              {b.imagenUrl.includes('/ia/') && <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white">Imagen orientativa</span>}
              {(b.titulo || b.botonTexto) && (
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-4">
                  {b.titulo && <p className="text-base font-bold leading-tight text-white drop-shadow sm:text-lg">{b.titulo}</p>}
                  {b.botonTexto && <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1a1a1a]">{b.botonTexto}</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-full flex-col justify-center gap-2 p-6 text-white sm:aspect-[3/1]" style={{ background: color }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Hoy en la casa</p>
              <p className="text-2xl font-bold leading-tight">{b.titulo}</p>
              {b.texto && <p className="text-sm opacity-90">{b.texto}</p>}
              {b.botonTexto && <span className="mt-1 self-start rounded-full bg-white px-3 py-1.5 text-xs font-bold" style={{ color }}>{b.botonTexto}</span>}
            </div>
          );
          return (
            <div key={b.id} className="w-full shrink-0 snap-start" role="group" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${banners.length}`}>
              {interactivo ? (
                <button type="button" onClick={() => pulsar(b)} className="block w-full text-left">{contenido}</button>
              ) : (
                contenido
              )}
            </div>
          );
        })}
      </div>

      {varios && (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Ver banner ${i + 1}`}
              aria-current={i === actual}
              onClick={() => { setPausado(true); ir(i); }}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === actual ? 20 : 6, background: i === actual ? color : 'rgba(0,0,0,.2)' }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
