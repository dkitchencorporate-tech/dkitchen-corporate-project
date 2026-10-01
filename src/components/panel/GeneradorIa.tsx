'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useEffect, useState, useTransition } from 'react';
import { generarImagenIaAction, saldoIaAction, comprarServicioAction } from '@/app/panel/actions';

/**
 * Creación de imágenes con IA (0038). Plato: mejorar la foto propia o crearla
 * desde el nombre. Banner: diseños recomendados a partir de la carta o lo que
 * el cliente describa, y retoques sobre la última versión hasta dar con lo que
 * quiere. Cada creación descuenta 1 imagen del saldo (3 gratis siempre; bono de
 * 50 por 9 € + IVA, pago único, sin caducidad).
 */
type Saldo = { restantes: number; gratisRestantes: number; compradas: number; usadas: number; hoy: number };

const IDEAS_BANNER = [
  'Menú del día con los platos de mi carta',
  'Mi plato estrella, en primer plano y muy apetecible',
  'Promoción de fin de semana, ambiente cálido',
  'Novedad en la carta, estilo elegante',
];

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
  const [error, setError] = useState('');
  const [pendiente, iniciar] = useTransition();
  const [comprando, setComprando] = useState(false);

  useEffect(() => {
    if (demo) { setSaldo({ restantes: 3, gratisRestantes: 3, compradas: 0, usadas: 0, hoy: 0 }); return; }
    saldoIaAction().then(setSaldo).catch(() => setSaldo(null));
  }, [demo]);

  function crear(desde: 'nuevo' | 'mejorar' | 'retocar', indicacion = texto) {
    setError('');
    if (demo) { setError('Esto es una demostración: en tu panel real aquí aparecería la imagen creada.'); return; }
    iniciar(async () => {
      try {
        const base = desde === 'mejorar' ? imagenActual : desde === 'retocar' ? actual : null;
        const r = await generarImagenIaAction({ modo, texto: indicacion, imagenBase: base ?? null, plato });
        if (!r.ok) throw new Error(r.error);
        setVersiones((v) => [r.url, ...v].slice(0, 8));
        setActual(r.url);
        setSaldo((s) => (s ? { ...s, restantes: r.restantes } : s));
      } catch (e) {
        setError(mensajeError(e, 'No se pudo crear la imagen.'));
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
  const boton = 'rounded-full bg-[#6E0C2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4A0819] disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Crear imagen con IA" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-[#F7F5F2] p-5 text-[#1B1D22] sm:rounded-[28px] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6E0C2B]">Crear con IA</p>
            <h3 className="font-display mt-1 text-2xl font-semibold">{modo === 'plato' ? `Foto de ${plato?.nombre?.trim() || 'tu plato'}` : 'Banner para tu carta'}</h3>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-full px-3 py-1 text-xl text-[#6B7079] hover:bg-white">×</button>
        </div>

        {/* Saldo, explicado claro (decisión de karc0) */}
        <div className="mt-4 rounded-2xl border border-[#E6E2DC] bg-white p-4 text-sm">
          {saldo ? (
            <p><strong className="text-lg">{saldo.restantes}</strong> {saldo.restantes === 1 ? 'imagen disponible' : 'imágenes disponibles'}
              <span className="text-[#6B7079]"> · {saldo.gratisRestantes > 0 ? `${saldo.gratisRestantes} de tus 3 gratis` : 'tus 3 gratis ya están usadas'}{saldo.compradas > 0 ? ` · ${saldo.compradas} compradas` : ''}</span></p>
          ) : <p className="text-[#6B7079]">Consultando tu saldo…</p>}
          <p className="mt-1.5 text-[13px] text-[#6B7079]">Tienes <strong>3 imágenes gratis</strong> siempre. Si necesitas más: <strong>bono de 50 imágenes por 9 € + IVA</strong>, pago único (no es una cuota), <strong>nunca caducan</strong> y las imágenes son tuyas. Pagas solo si lo necesitas. Máximo 20 al día.</p>
          {(sinSaldo || (saldo && saldo.restantes <= 1)) && (
            <button onClick={comprar} disabled={comprando} className="mt-3 rounded-full bg-[#17191E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{comprando ? 'Abriendo pago seguro…' : 'Comprar bono de 50 · 9 € + IVA'}</button>
          )}
        </div>

        {/* Opciones */}
        <div className="mt-5 space-y-3">
          {modo === 'plato' && imagenActual && (
            <button disabled={pendiente || sinSaldo} onClick={() => crear('mejorar', 'mejora la presentación')} className="w-full rounded-2xl border border-[#E6E2DC] bg-white p-4 text-left hover:border-[#6E0C2B]/40 disabled:opacity-50">
              <span className="font-semibold">Mejorar mi foto</span>
              <span className="block text-sm text-[#6B7079]">Mejora la luz, el color y la presentación de tu foto sin cambiar el plato.</span>
            </button>
          )}
          {modo === 'banner' && (
            <div>
              <p className="text-sm font-semibold">Diseños recomendados para tu carta</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {IDEAS_BANNER.map((i) => (
                  <button key={i} disabled={pendiente || sinSaldo} onClick={() => { setTexto(i); crear('nuevo', i); }} className="rounded-full border border-[#E6E2DC] bg-white px-3.5 py-2 text-[13px] hover:border-[#6E0C2B]/40 disabled:opacity-50">{i}</button>
                ))}
              </div>
            </div>
          )}
          <label className="block text-sm font-semibold">{modo === 'plato' ? 'O descríbela tú (opcional)' : 'O describe lo que quieres'}
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={400} rows={2}
              placeholder={modo === 'plato' ? 'Ej.: en plato de barro, vista desde arriba, con pan al lado' : 'Ej.: banner para el menú de mediodía a 12,90 €, tonos cálidos'}
              className="mt-1.5 w-full rounded-xl border border-[#E6E2DC] bg-white px-3 py-2.5 text-sm font-normal placeholder-[#9A9EA6] focus:border-[#6E0C2B] focus:outline-none" />
          </label>
          <button disabled={pendiente || sinSaldo || (modo === 'banner' && !texto.trim())} onClick={() => crear('nuevo')} className={boton}>
            {pendiente ? 'Creando… (hasta 1 minuto)' : modo === 'plato' ? 'Crear foto desde el nombre del plato' : 'Crear banner'}
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {/* Resultado e iteración */}
        {actual && (
          <div className="mt-6 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={actual} alt="Imagen creada" className={`w-full rounded-2xl object-cover ${modo === 'banner' ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} />
            <p className="text-xs text-[#6B7079]">En tu carta se mostrará con la nota «Imagen orientativa».</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { onUsar(actual); onCerrar(); }} className={boton}>Usar esta imagen</button>
              <button disabled={pendiente || sinSaldo || !texto.trim()} onClick={() => crear('retocar')} className="rounded-full border border-[#E6E2DC] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Retocar esta versión con mi descripción</button>
              <button disabled={pendiente || sinSaldo} onClick={() => crear('nuevo')} className="rounded-full border border-[#E6E2DC] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Otra versión</button>
            </div>
            <p className="text-xs text-[#9A9EA6]">Cada versión o retoque usa 1 imagen de tu saldo. Para retocar, cambia la descripción (p. ej. «más luz», «sin texto», «fondo de madera»).</p>
            {versiones.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {versiones.map((v) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <button key={v} onClick={() => setActual(v)} className={`shrink-0 overflow-hidden rounded-lg ring-2 ${v === actual ? 'ring-[#6E0C2B]' : 'ring-transparent'}`}><img src={v} alt="" className="h-14 w-20 object-cover" /></button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
