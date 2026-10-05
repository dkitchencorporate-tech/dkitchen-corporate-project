'use client';

import { useMemo, useState } from 'react';

/**
 * Configurador de cada landing de Experience (06/10/2026): tipo de cocina,
 * fecha (mínimo 21 días), aforo y precio de la entrada → resumen → pago en
 * /pagar/experience. El formato, la fecha y el aforo viajan al pago en
 * `modelo` (solo letras, números y guiones); todo queda además en el
 * navegador para rellenar el briefing tras pagar.
 */
const COCINAS = ['Mediterránea', 'Española tradicional', 'Italiana', 'Asiática', 'Latina', 'Hamburguesas o alitas', 'Tapas y bar', 'Cafetería o brunch', 'De autor', 'Otra'];
const ANTELACION_DIAS = 21;

const fechaMinima = () => {
  const d = new Date();
  d.setDate(d.getDate() + ANTELACION_DIAS);
  return d.toISOString().slice(0, 10);
};

export default function Configurador({ codigo, nombre, aforo, entrada, precio, precioClienteQr }: {
  codigo: string; nombre: string; aforo: [number, number]; entrada: [number, number]; precio: number; precioClienteQr: number;
}) {
  const minima = useMemo(fechaMinima, []);
  const [cocina, setCocina] = useState(COCINAS[0]);
  const [fecha, setFecha] = useState(minima);
  const [plazas, setPlazas] = useState(Math.round((aforo[0] + aforo[1]) / 2));
  const [precioEntrada, setPrecioEntrada] = useState(Math.round((entrada[0] + entrada[1]) / 2));

  const fechaValida = fecha >= minima;
  const taquilla = plazas * precioEntrada;
  const euros = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const continuar = () => {
    try {
      localStorage.setItem('dk_experience_config', JSON.stringify({ formato: nombre, codigo, cocina, fecha, plazas, precioEntrada }));
    } catch { /* sin almacenamiento: el briefing se rellena a mano */ }
    window.location.href = `/pagar/experience?modelo=${encodeURIComponent(`${codigo} ${fecha} ${plazas}p`)}`;
  };

  const campo = 'mt-1.5 w-full rounded-xl border border-[#E4E1DC] bg-white px-4 py-3 text-[15px] text-[#17191E] outline-none focus:border-[#6E0C2B] focus:ring-2 focus:ring-[#6E0C2B]/15';

  return (
    <div className="grid gap-8 rounded-[28px] border border-[#E4E1DC] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(62,5,21,.45)] md:grid-cols-2 md:p-10">
      <div className="space-y-5">
        <label className="block text-sm font-semibold">Tu tipo de cocina
          <select value={cocina} onChange={(e) => setCocina(e.target.value)} className={campo}>
            {COCINAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Fecha deseada
          <input type="date" min={minima} value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
          <span className={`mt-1 block text-xs font-normal ${fechaValida ? 'text-[#6B7079]' : 'text-[#B3261E]'}`}>Mínimo {ANTELACION_DIAS} días de antelación para preparar el concepto, la web y la campaña.</span>
        </label>
        <label className="block text-sm font-semibold">Aforo: {plazas} personas
          <input type="range" min={Math.max(6, Math.floor(aforo[0] / 2))} max={aforo[1] * 2} value={plazas} onChange={(e) => setPlazas(Number(e.target.value))} className="mt-3 w-full accent-[#6E0C2B]" />
          <span className="block text-xs font-normal text-[#6B7079]">Lo habitual en este formato: de {aforo[0]} a {aforo[1]} personas.</span>
        </label>
        <label className="block text-sm font-semibold">Precio de la entrada: {euros(precioEntrada)}
          <input type="range" min={Math.max(5, Math.floor(entrada[0] / 2))} max={entrada[1] * 2} value={precioEntrada} onChange={(e) => setPrecioEntrada(Number(e.target.value))} className="mt-3 w-full accent-[#6E0C2B]" />
          <span className="block text-xs font-normal text-[#6B7079]">Orientativo para este formato: de {euros(entrada[0])} a {euros(entrada[1])}. Lo decides tú.</span>
        </label>
      </div>

      <div className="flex flex-col justify-between rounded-[22px] bg-[#0A080C] p-6 text-white md:p-8">
        <div>
          <p className="etiqueta-dk text-[#D9B25C]">Tu evento</p>
          <p className="font-display mt-2 text-3xl font-semibold">{nombre}</p>
          <p className="mt-1 text-white/60">{cocina} · {fechaValida ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'elige una fecha válida'}</p>
          <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-white/60">Taquilla estimada si llenas</dt><dd className="font-semibold tabular-nums">{euros(taquilla)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Comisión de DKitchen sobre la taquilla</dt><dd className="font-semibold">0 €</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Montaje del evento (pago único)</dt><dd className="font-semibold tabular-nums">{precio} € + IVA</dd></div>
          </dl>
          <p className="mt-3 text-xs text-white/45">Con la carta QR de DKitchen, tu primer evento cuesta {precioClienteQr} € + IVA. La taquilla es una estimación: depende de las entradas que vendas. Los anuncios los pagas tú directamente a Meta o Google.</p>
        </div>
        <button type="button" onClick={continuar} disabled={!fechaValida} className="mt-8 rounded-full bg-[#6E0C2B] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#570922] disabled:opacity-40">
          Reservar este evento →
        </button>
      </div>
    </div>
  );
}
