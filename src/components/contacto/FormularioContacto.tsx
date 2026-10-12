'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Formulario previo a WhatsApp (0071), en 4 pasos cortos para el móvil:
 * 1 quién eres · 2 tu negocio · 3 qué te interesa · 4 tu consulta y cuándo escribirte.
 * Al enviar, el servidor guarda el contacto y devuelve el WhatsApp con el mensaje ya escrito.
 */
type Interes = 'carta' | 'signature' | 'experience' | 'no_se';
const TIPOS = ['Restaurante', 'Bar de tapas', 'Cafetería', 'Pizzería o hamburguesería', 'Kebab o comida rápida', 'Pub o discoteca', 'Otro'];
const INTERESES: [Interes, string, string][] = [
  ['carta', 'Carta digital QR', 'Desde 1 € el primer mes'],
  ['signature', 'App propia de pedidos', 'Signature, con precio de fundador'],
  ['experience', 'Un evento para llenar un día flojo', 'Experience'],
  ['no_se', 'Aún no lo sé', 'Aconsejadme según mi local'],
];
const ATAJOS: Record<Interes, string[]> = {
  carta: ['Quiero ver una demo con mi carta', '¿Funciona con mi TPV?', '¿Cuánto tardáis en montarla?'],
  signature: ['Quiero ver cómo quedaría mi app', '¿Cómo funciona el precio de fundador?', '¿Cuánto me ahorro en comisiones?'],
  experience: ['Tengo un día flojo y quiero llenarlo', '¿Qué formatos de evento hay?', '¿Cuánto cuesta un evento?'],
  no_se: ['Quiero que vengáis a mi local', 'Quiero vender más sin pagar comisiones', 'Quiero modernizar la carta'],
};
const FRANJAS: [string, string][] = [['manana', 'Mañana'], ['tarde', 'Tarde'], ['noche', 'Noche'], ['cuando_sea', 'Cuando sea']];

const chip = (activo: boolean) =>
  `rounded-2xl border px-4 py-3 text-left text-[15px] transition ${activo ? 'border-oro bg-oro/15 text-white' : 'border-white/15 bg-white/[0.05] text-white/80 hover:border-white/40'}`;
const campo = 'w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-oro focus:outline-none';

export default function FormularioContacto({ origen, interesInicial }: { origen: string; interesInicial: Interes | null }) {
  const [paso, setPaso] = useState(1);
  const [d, setD] = useState({ nombre: '', negocio: '', tipo: '', localidad: '', interes: (interesInicial ?? '') as Interes | '', consulta: '', franja: 'cuando_sea', web: '' });
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const pon = (k: keyof typeof d, v: string) => setD((x) => ({ ...x, [k]: v }));

  const puede = paso === 1 ? d.nombre.trim().length >= 2 : paso === 2 ? Boolean(d.tipo) : paso === 3 ? Boolean(d.interes) : d.consulta.trim().length >= 3 && acepto;

  async function enviar() {
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/contacto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, origen }) });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'No se pudo enviar.');
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar.');
      setEnviando(false);
    }
  }

  return (
    <div className="mt-10 rounded-[28px] border border-white/12 bg-white/[0.05] p-6 backdrop-blur md:p-8">
      <div className="flex items-center gap-2" aria-label={`Paso ${paso} de 4`}>
        {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= paso ? 'bg-oro' : 'bg-white/15'}`} />)}
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/50">Paso {paso} de 4</p>

      {paso === 1 && (
        <div className="mt-5 space-y-4">
          <label htmlFor="c-nombre" className="block text-lg font-semibold">¿Cómo te llamas?</label>
          <input id="c-nombre" autoFocus className={campo} placeholder="Tu nombre" value={d.nombre} onChange={(e) => pon('nombre', e.target.value)} maxLength={80} />
          <input className={campo} placeholder="Nombre de tu local (opcional)" value={d.negocio} onChange={(e) => pon('negocio', e.target.value)} maxLength={100} />
          <input className="hidden" tabIndex={-1} autoComplete="off" value={d.web} onChange={(e) => pon('web', e.target.value)} aria-hidden="true" />
        </div>
      )}

      {paso === 2 && (
        <div className="mt-5 space-y-4">
          <p className="text-lg font-semibold">¿Qué tipo de negocio tienes?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TIPOS.map((t) => <button key={t} type="button" className={chip(d.tipo === t)} onClick={() => pon('tipo', t)}>{t}</button>)}
          </div>
          <input className={campo} placeholder="Localidad (por ejemplo, Baza)" value={d.localidad} onChange={(e) => pon('localidad', e.target.value)} maxLength={60} />
        </div>
      )}

      {paso === 3 && (
        <div className="mt-5 space-y-3">
          <p className="text-lg font-semibold">¿Qué te interesa?</p>
          {INTERESES.map(([k, t, s]) => (
            <button key={k} type="button" className={`${chip(d.interes === k)} w-full`} onClick={() => pon('interes', k)}>
              <span className="block font-semibold">{t}</span>
              <span className="block text-sm text-white/55">{s}</span>
            </button>
          ))}
        </div>
      )}

      {paso === 4 && (
        <div className="mt-5 space-y-4">
          <p className="text-lg font-semibold">¿Cuál es tu consulta?</p>
          <div className="flex flex-wrap gap-2">
            {ATAJOS[(d.interes || 'no_se') as Interes].map((a) => (
              <button key={a} type="button" className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/75 hover:border-oro" onClick={() => pon('consulta', a)}>{a}</button>
            ))}
          </div>
          <textarea className={`${campo} min-h-[110px]`} placeholder="Escríbela con tus palabras" value={d.consulta} onChange={(e) => pon('consulta', e.target.value)} maxLength={600} />
          <p className="text-sm font-semibold text-white/80">¿Cuándo te viene mejor que te escribamos?</p>
          <div className="flex flex-wrap gap-2">
            {FRANJAS.map(([k, t]) => <button key={k} type="button" className={chip(d.franja === k)} onClick={() => pon('franja', k)}>{t}</button>)}
          </div>
          <label className="flex items-start gap-3 text-sm text-white/65">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
            <span>Acepto que DKitchen guarde estos datos para atender mi consulta (<Link href="/privacy" className="underline">privacidad</Link>).</span>
          </label>
        </div>
      )}

      {error && <p className="mt-4 rounded-2xl bg-vino/30 p-3 text-sm">{error}</p>}

      <div className="mt-7 flex gap-3">
        {paso > 1 && <button type="button" onClick={() => setPaso(paso - 1)} className="rounded-full border border-white/20 px-5 py-3.5 text-sm font-semibold">Atrás</button>}
        {paso < 4 ? (
          <button type="button" disabled={!puede} onClick={() => setPaso(paso + 1)} className="flex-1 rounded-full bg-vino py-3.5 text-base font-semibold text-white disabled:opacity-40">Seguir</button>
        ) : (
          <button type="button" disabled={!puede || enviando} onClick={enviar} className="flex-1 rounded-full bg-[#1F8A5B] py-3.5 text-base font-semibold text-white disabled:opacity-40">
            {enviando ? 'Abriendo WhatsApp…' : 'Hablar con un asesor por WhatsApp'}
          </button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-white/45">Se abrirá WhatsApp con tu mensaje ya escrito. Solo tienes que pulsar enviar.</p>
    </div>
  );
}
