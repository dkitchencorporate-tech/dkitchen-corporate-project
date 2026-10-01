'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useEffect, useRef, useState, useTransition } from 'react';
import { generarImagenIaAction, saldoIaAction, comprarServicioAction } from '@/app/panel/actions';
import HerramientasTexto from './HerramientasTexto';

/**
 * Creación de imágenes con IA (0038; rediseño 01/10/2026 por el feedback de la probadora):
 * - la imagen se ve ARRIBA y, mientras se crea, una animación de carga con los segundos;
 * - el cuadro de texto funciona como un chat: tras la primera imagen, lo que escribes son
 *   cambios sobre ESA imagen; el texto se vacía después de cada creación;
 * - «✨ Mejorar instrucción» reescribe la petición para que la IA la entienda mejor.
 * Cada creación descuenta 1 imagen del saldo (3 gratis siempre; bono de 50 por 9 € + IVA).
 */
type Saldo = { restantes: number; gratisRestantes: number; compradas: number; usadas: number; hoy: number };

const IDEAS_BANNER = [
  'Menú del día con los platos de mi carta',
  'Mi plato estrella, en primer plano y muy apetecible',
  'Promoción de fin de semana, ambiente cálido',
  'Novedad en la carta, estilo elegante',
];
const PASOS = ['Entendiendo lo que pides…', 'Componiendo la imagen…', 'Ajustando luz y color…', 'Últimos detalles…'];

export default function GeneradorIa({
  modo, imagenActual, plato, onUsar, onCerrar, demo = false,
}: {
  modo: 'plato' | 'banner';
  imagenActual?: string | null;
  plato?: { nombre?: string; descripcion?: string | null };
  onUsar: (url: string) => void;
  onCerrar: () => void;
  demo?: boolean;
}) {
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [texto, setTexto] = useState('');
  const [versiones, setVersiones] = useState<string[]>([]);
  const [actual, setActual] = useState<string | null>(null);
  const [historial, setHistorial] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pendiente, iniciar] = useTransition();
  const [comprando, setComprando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const arriba = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (demo) { setSaldo({ restantes: 3, gratisRestantes: 3, compradas: 0, usadas: 0, hoy: 0 }); return; }
    saldoIaAction().then(setSaldo).catch(() => setSaldo(null));
  }, [demo]);

  // Contador visible mientras se crea la imagen
  useEffect(() => {
    if (!pendiente) return;
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pendiente]);

  function crear(desde: 'nuevo' | 'mejorar' | 'retocar', indicacion = texto) {
    setError('');
    if (demo) { setError('Esto es una demostración: en tu panel real aquí aparecería la imagen creada.'); return; }
    arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    iniciar(async () => {
      try {
        const base = desde === 'mejorar' ? imagenActual : desde === 'retocar' ? actual : null;
        const r = await generarImagenIaAction({ modo, texto: indicacion, imagenBase: base ?? null, plato });
        if (!r.ok) throw new Error(r.error);
        setVersiones((v) => [r.url, ...v].slice(0, 8));
        setActual(r.url);
        setHistorial((h) => [...h, desde === 'retocar' ? `Cambio: ${indicacion}` : desde === 'mejorar' ? 'Mejorar mi foto' : (indicacion || 'Crear desde el nombre')].slice(-6));
        setTexto('');
        setSaldo((s) => (s ? { ...s, restantes: r.restantes } : s));
      } catch (e) {
        setError(mensajeError(e, 'No se pudo crear la imagen. No se ha descontado de tu saldo.'));
        saldoIaAction().then(setSaldo).catch(() => {});
      }
    });
  }

  async function comprar() {
    if (demo) { setError('En la demo no se puede comprar.'); return; }
    setComprando(true);
    try { const { url } = await comprarServicioAction('bono_ia'); window.location.href = url; }
    catch (e) { setError(mensajeError(e, 'No se pudo abrir el pago.')); setComprando(false); }
  }

  const sinSaldo = saldo !== null && saldo.restantes <= 0;
  const proporcion = modo === 'banner' ? 'aspect-[16/9]' : 'aspect-[4/3]';
  const boton = 'rounded-full bg-[#6E0C2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4A0819] disabled:opacity-40';
  const secundario = 'rounded-full border border-[#E6E2DC] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Crear imagen con IA" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-[#F7F5F2] p-5 text-[#1B1D22] sm:rounded-[28px] sm:p-7">
        <div ref={arriba} className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6E0C2B]">Crear con IA</p>
            <h3 className="font-display mt-1 text-2xl font-semibold">{modo === 'plato' ? `Foto de ${plato?.nombre?.trim() || 'tu plato'}` : 'Imagen para tu carta'}</h3>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-full px-3 py-1 text-xl text-[#6B7079] hover:bg-white">×</button>
        </div>

        {/* 1. La imagen (o la carga) siempre arriba */}
        <div className="mt-4">
          {pendiente ? (
            <div className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#EDE7E0] ${proporcion}`} role="status" aria-live="polite">
              <div className="absolute inset-0 animate-[dk-brillo_1.6s_linear_infinite] bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,.55)_50%,transparent_75%)] bg-[length:200%_100%]" />
              <div className="relative flex flex-col items-center gap-3 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#6E0C2B]/20 border-t-[#6E0C2B]" />
                <p className="text-sm font-semibold text-[#3F434B]">{PASOS[Math.min(PASOS.length - 1, Math.floor(segundos / 6))]}</p>
                <p className="text-xs text-[#6B7079]">{segundos} s · suele tardar entre 10 y 40 segundos</p>
              </div>
              <style>{`@keyframes dk-brillo{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            </div>
          ) : actual ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={actual} alt="Imagen creada" className={`w-full rounded-2xl object-cover ${proporcion}`} />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { onUsar(actual); onCerrar(); }} className={boton}>✓ Usar esta imagen</button>
                <button disabled={sinSaldo} onClick={() => crear('nuevo', '')} className={secundario}>Crear otra desde cero</button>
              </div>
              {versiones.length > 1 && (
                <div>
                  <p className="mb-1 text-xs text-[#6B7079]">Tus versiones (toca para elegir):</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {versiones.map((v) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <button key={v} onClick={() => setActual(v)} className={`shrink-0 overflow-hidden rounded-lg ring-2 ${v === actual ? 'ring-[#6E0C2B]' : 'ring-transparent'}`}><img src={v} alt="" className="h-14 w-20 object-cover" /></button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-[#6B7079]">En tu carta se mostrará con la nota «Imagen orientativa».</p>
            </div>
          ) : (
            <div className="space-y-3">
              {modo === 'plato' && imagenActual && (
                <button disabled={sinSaldo} onClick={() => crear('mejorar', 'mejora la presentación')} className="w-full rounded-2xl border border-[#E6E2DC] bg-white p-4 text-left hover:border-[#6E0C2B]/40 disabled:opacity-50">
                  <span className="font-semibold">Mejorar mi foto</span>
                  <span className="block text-sm text-[#6B7079]">Mejora luz, color y presentación de tu foto sin cambiar el plato.</span>
                </button>
              )}
              {modo === 'plato' && (
                <button disabled={sinSaldo} onClick={() => crear('nuevo')} className="w-full rounded-2xl border border-[#E6E2DC] bg-white p-4 text-left hover:border-[#6E0C2B]/40 disabled:opacity-50">
                  <span className="font-semibold">Crear la foto desde el nombre del plato</span>
                  <span className="block text-sm text-[#6B7079]">Usamos el nombre y la descripción. Si quieres algo concreto, escríbelo abajo antes.</span>
                </button>
              )}
              {modo === 'banner' && (
                <div>
                  <p className="text-sm font-semibold">Diseños recomendados para tu carta</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {IDEAS_BANNER.map((i) => (
                      <button key={i} disabled={sinSaldo} onClick={() => crear('nuevo', i)} className="rounded-full border border-[#E6E2DC] bg-white px-3.5 py-2 text-[13px] hover:border-[#6E0C2B]/40 disabled:opacity-50">{i}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {/* 2. El «chat»: pedir o corregir */}
        {historial.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-[#6B7079]">{historial.map((h, i) => <li key={i}>• {h}</li>)}</ul>
        )}
        <form className="mt-4 rounded-2xl border border-[#E6E2DC] bg-white p-3" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) crear(actual ? 'retocar' : 'nuevo'); }}>
          <label className="block text-sm font-semibold">
            {actual ? '¿Qué quieres cambiar de esta imagen?' : modo === 'plato' ? 'Describe cómo la quieres (opcional)' : 'O describe tu banner'}
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={400} rows={2} spellCheck lang="es" disabled={pendiente}
              placeholder={actual ? 'Ej.: más luz, fondo de madera, sin servilleta' : modo === 'plato' ? 'Ej.: en plato de barro, vista desde arriba' : 'Ej.: menú de mediodía a 12,90 €, tonos cálidos'}
              className="mt-1.5 w-full rounded-xl border border-[#E6E2DC] bg-[#FBFAF8] px-3 py-2.5 text-sm font-normal placeholder-[#9A9EA6] focus:border-[#6E0C2B] focus:outline-none" />
          </label>
          <HerramientasTexto valor={texto} onCambio={setTexto} tipo="instruccion" contexto={plato?.nombre ?? undefined} demo={demo} />
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={pendiente || sinSaldo || !texto.trim()} className={boton}>
              {pendiente ? 'Creando…' : actual ? 'Aplicar cambios a esta imagen' : modo === 'plato' ? 'Crear con mi descripción' : 'Crear banner'}
            </button>
          </div>
        </form>

        {/* 3. Saldo, explicado claro */}
        <div className="mt-4 rounded-2xl bg-white/60 p-4 text-sm">
          {saldo ? (
            <p><strong>{saldo.restantes}</strong> {saldo.restantes === 1 ? 'imagen disponible' : 'imágenes disponibles'}
              <span className="text-[#6B7079]"> · cada creación o cambio usa 1{saldo.gratisRestantes > 0 ? ` · te quedan ${saldo.gratisRestantes} de tus 3 gratis` : ''}</span></p>
          ) : <p className="text-[#6B7079]">Consultando tu saldo…</p>}
          <p className="mt-1 text-[12.5px] text-[#6B7079]">3 imágenes gratis siempre. ¿Necesitas más? <strong>Bono de 50 por 9 € + IVA</strong>: pago único, <strong>nunca caducan</strong> y las imágenes son tuyas. Máximo 20 al día.</p>
          {(sinSaldo || (saldo && saldo.restantes <= 1)) && (
            <button onClick={comprar} disabled={comprando} className="mt-3 rounded-full bg-[#17191E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{comprando ? 'Abriendo pago seguro…' : 'Comprar bono de 50 · 9 € + IVA'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
