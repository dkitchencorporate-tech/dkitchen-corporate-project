'use client';

import { useEffect, useId, useState } from 'react';
import { ANTELACION_DIAS } from '@/lib/experience-formatos';

/**
 * Configurador de cada landing de Experience (06/10/2026): tipo de cocina,
 * fecha (mínimo 21 días), aforo y precio de la entrada → resumen → pago en
 * /pagar/experience. El formato, la fecha y el aforo viajan al pago en
 * `modelo` (letras, números, espacios y guiones); todo queda además en el
 * navegador (con versión y hora) para rellenar el briefing tras pagar.
 *
 * Revisión de diseño (06/10): la fecha se calcula en hora de Madrid y solo en
 * el navegador (la página es estática: calcularla en el build daba un día
 * desfasado y un aviso de hidratación); sliders con valor accesible y área
 * táctil de 44 px; resumen anunciado al lector de pantalla.
 */
const COCINAS = ['Mediterránea', 'Española tradicional', 'Italiana', 'Asiática', 'Latina', 'Hamburguesas o alitas', 'Tapas y bar', 'Cafetería o brunch', 'De autor', 'Otra'];

/** Fecha YYYY-MM-DD en hora de Madrid, `dias` a partir de hoy. */
const fechaMadrid = (dias: number) => {
  const d = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};

export default function Configurador({ codigo, nombre, aforo, entrada, precio, precioClienteQr }: {
  codigo: string; nombre: string; aforo: [number, number]; entrada: [number, number]; precio: number; precioClienteQr: number;
}) {
  const id = useId();
  const [minima, setMinima] = useState('');
  const [maxima, setMaxima] = useState('');
  const [cocina, setCocina] = useState(COCINAS[0]);
  const [fecha, setFecha] = useState('');
  const [plazas, setPlazas] = useState(Math.round((aforo[0] + aforo[1]) / 10) * 5);
  const [precioEntrada, setPrecioEntrada] = useState(Math.round((entrada[0] + entrada[1]) / 2));

  useEffect(() => {
    const m = fechaMadrid(ANTELACION_DIAS);
    setMinima(m); setMaxima(fechaMadrid(365)); setFecha(m);
  }, []);

  const fechaValida = !!minima && fecha >= minima && fecha <= maxima;
  const taquilla = plazas * precioEntrada;
  const euros = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const continuar = () => {
    if (!fechaValida) return;
    try {
      localStorage.setItem('dk_experience_config', JSON.stringify({ v: 1, ts: Date.now(), formato: nombre, codigo, cocina, fecha, plazas, precioEntrada }));
    } catch { /* sin almacenamiento: el briefing se rellena a mano */ }
    window.location.href = `/pagar/experience?modelo=${encodeURIComponent(`${codigo} ${fecha} ${plazas}p`)}`;
  };

  const campo = 'mt-1.5 w-full rounded-xl border border-[#8B8F97] bg-white px-4 py-3 text-[15px] text-[#17191E] outline-none focus-visible:border-[#6E0C2B] focus-visible:ring-2 focus-visible:ring-[#6E0C2B]/60';
  const deslizador = 'mt-2 h-11 w-full cursor-pointer accent-[#6E0C2B]';
  const ayuda = 'mt-1 block text-xs font-normal text-[#5C616A]';

  return (
    <div className="grid gap-8 rounded-[28px] border border-[#E4E1DC] bg-white p-5 shadow-[0_30px_80px_-40px_rgba(62,5,21,.45)] md:grid-cols-2 md:p-10">
      <div className="space-y-5">
        <label className="block text-sm font-semibold">Tu tipo de cocina
          <select value={cocina} onChange={(e) => setCocina(e.target.value)} className={campo}>
            {COCINAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <div>
          <label htmlFor={`${id}-fecha`} className="block text-sm font-semibold">Fecha deseada</label>
          <input id={`${id}-fecha`} type="date" min={minima || undefined} max={maxima || undefined} value={fecha} onChange={(e) => setFecha(e.target.value)}
            aria-invalid={!!minima && !fechaValida} aria-describedby={`${id}-fecha-ayuda`} className={campo} />
          <span id={`${id}-fecha-ayuda`} className={ayuda}>Mínimo {ANTELACION_DIAS} días de antelación para preparar el concepto, la web y la campaña.</span>
          {!!minima && !fechaValida && <p role="alert" className="mt-1 text-xs font-semibold text-[#B3261E]">Elige una fecha a partir del {new Date(`${minima}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.</p>}
        </div>
        <div>
          <label htmlFor={`${id}-aforo`} className="block text-sm font-semibold">Aforo: {plazas} personas</label>
          <input id={`${id}-aforo`} type="range" step={5} min={Math.max(5, Math.floor(aforo[0] / 10) * 5)} max={aforo[1] * 2} value={plazas} onChange={(e) => setPlazas(Number(e.target.value))}
            aria-valuetext={`${plazas} personas`} aria-describedby={`${id}-aforo-ayuda`} className={deslizador} />
          <span id={`${id}-aforo-ayuda`} className={ayuda}>Lo habitual en este formato: de {aforo[0]} a {aforo[1]} personas.</span>
        </div>
        <div>
          <label htmlFor={`${id}-entrada`} className="block text-sm font-semibold">Precio de la entrada: {euros(precioEntrada)}</label>
          <input id={`${id}-entrada`} type="range" min={Math.max(5, Math.floor(entrada[0] / 2))} max={entrada[1] * 2} value={precioEntrada} onChange={(e) => setPrecioEntrada(Number(e.target.value))}
            aria-valuetext={euros(precioEntrada)} aria-describedby={`${id}-entrada-ayuda`} className={deslizador} />
          <span id={`${id}-entrada-ayuda`} className={ayuda}>Orientativo para este formato: de {euros(entrada[0])} a {euros(entrada[1])}. Lo decides tú.</span>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-[22px] bg-[#0A080C] p-5 text-white md:p-8">
        <div role="status" aria-live="polite">
          <p className="etiqueta-dk text-[#D9B25C]">Tu evento</p>
          <p className="font-display mt-2 text-3xl font-semibold">{nombre}</p>
          <p className="mt-1 text-white/70">{cocina} · {fechaValida ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'elige una fecha válida'}</p>
          <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="min-w-0 text-white/70">Taquilla estimada si llenas</dt><dd className="shrink-0 whitespace-nowrap text-right font-semibold tabular-nums">{euros(taquilla)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="min-w-0 text-white/70">Comisión de DKitchen sobre la taquilla</dt><dd className="shrink-0 whitespace-nowrap text-right font-semibold">0 €</dd></div>
            <div className="flex justify-between gap-4"><dt className="min-w-0 text-white/70">Montaje del evento (pago único)</dt><dd className="shrink-0 whitespace-nowrap text-right font-semibold tabular-nums">{precio} € + IVA</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-white/60">Con la carta QR de DKitchen, tu primer evento cuesta {precioClienteQr} € + IVA. La taquilla es una estimación: depende de las entradas que vendas y la cobras con tu propia pasarela. Los anuncios los pagas tú directamente a Meta o Google.</p>
        </div>
        <button type="button" onClick={continuar} disabled={!fechaValida} className="mt-8 min-h-12 rounded-full bg-[#6E0C2B] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#4A0819] disabled:opacity-40">
          Reservar este evento →
        </button>
      </div>
    </div>
  );
}
