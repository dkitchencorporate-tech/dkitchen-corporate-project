'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteAction } from '@/app/admin-dkitchen/qr/actions';

/**
 * Alta manual de un cliente QR desde Central, en 3 pasos con instrucciones
 * (rediseño 29/09/2026): 1. Datos · 2. Qué recibe · 3. Revisar y crear.
 */
type Modo = 'pago' | 'gratis' | 'solo';
const MODOS: { id: Modo; titulo: string; texto: string }[] = [
  { id: 'pago', titulo: 'Preparar un enlace de pago', texto: 'Creas la cuenta y a continuación le preparas un enlace con el precio que acordéis (plan, módulos, descuento).' },
  { id: 'gratis', titulo: 'Darle todo gratis', texto: 'Plan Ampliado, Carta de Autor, idiomas y Pack Sala sin coste. Para demos comerciales o cortesías.' },
  { id: 'solo', titulo: 'Solo crear la cuenta', texto: 'Cuenta con el plan elegido y nada más. Podrás añadir servicios o un enlace de pago desde su ficha.' },
];

export default function NuevoCliente() {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(1);
  const [d, setD] = useState({ local: '', contacto: '', email: '', plan: 'ampliado', modo: 'pago' as Modo, demo: false });
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const campo = 'mt-1.5 w-full rounded-xl border border-[#E6E6E2] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#17191E]';
  const correoOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email);
  const paso1Ok = d.local.trim().length >= 2 && d.contacto.trim().length >= 2 && correoOk;

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="rounded-full bg-[#17191E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">Nuevo cliente</button>;
  }

  function crear() {
    setError(null);
    iniciar(async () => {
      const r = await crearClienteAction({ email: d.email, contacto: d.contacto, local: d.local, plan: d.plan, todo: d.modo === 'gratis', demo: d.demo });
      if (r.error) setError(r.error); else if (r.id) router.push('/admin-dkitchen/qr/' + r.id + (d.modo === 'pago' ? '#enlace' : ''));
    });
  }

  const Paso = ({ n, t }: { n: number; t: string }) => (
    <li className={`flex items-center gap-2 text-sm ${paso === n ? 'font-semibold text-[#1B1D22]' : paso > n ? 'text-[#2F8F6B]' : 'text-[#9A9EA6]'}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${paso === n ? 'bg-[#17191E] text-white' : paso > n ? 'bg-[#2F8F6B] text-white' : 'bg-[#EDEDEA]'}`}>{paso > n ? '✓' : n}</span>{t}
    </li>
  );

  return (
    <div className="w-full rounded-[22px] border border-[#E6E6E2] bg-white p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Nuevo cliente</h2>
          <p className="mt-1 text-sm text-[#6B7079]">Para demos, cortesías o ventas cerradas en persona. El cliente recibe un correo para crear su contraseña.</p>
        </div>
        <button onClick={() => { setAbierto(false); setPaso(1); }} className="text-sm text-[#6B7079]">Cancelar</button>
      </div>
      <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-2"><Paso n={1} t="Datos" /><Paso n={2} t="Qué recibe" /><Paso n={3} t="Revisar" /></ol>

      {paso === 1 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">Nombre del local
            <input value={d.local} maxLength={80} onChange={(e) => setD({ ...d, local: e.target.value })} placeholder="Ej.: Casa Brasa" className={campo} />
            <span className="mt-1 block text-xs text-[#9A9EA6]">Con él se genera la dirección de su carta.</span>
          </label>
          <label className="block text-sm font-medium">Persona de contacto
            <input value={d.contacto} maxLength={80} onChange={(e) => setD({ ...d, contacto: e.target.value })} className={campo} />
          </label>
          <label className="block text-sm font-medium">Correo del cliente
            <input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} className={campo} />
            <span className="mt-1 block text-xs text-[#9A9EA6]">Cada correo es un cliente. Para demos propias: tu+demo1@gmail.com.</span>
          </label>
          <label className="block text-sm font-medium">Plan
            <select value={d.plan} onChange={(e) => setD({ ...d, plan: e.target.value })} className={campo}>
              <option value="ampliado">Ampliado · 25 €/mes</option><option value="basico">Básico · 9 €/mes</option>
            </select>
          </label>
        </div>
      )}

      {paso === 2 && (
        <div className="mt-6 space-y-3">
          {MODOS.map((m) => (
            <label key={m.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${d.modo === m.id ? 'border-[#17191E] bg-[#F7F7F5]' : 'border-[#E6E6E2]'}`}>
              <input type="radio" name="modo" checked={d.modo === m.id} onChange={() => setD({ ...d, modo: m.id })} className="mt-1" />
              <span><span className="block font-semibold">{m.titulo}</span><span className="mt-0.5 block text-sm text-[#6B7079]">{m.texto}</span></span>
            </label>
          ))}
          <label className="flex cursor-pointer gap-3 rounded-2xl border border-dashed border-[#D6D6D1] p-4">
            <input type="checkbox" checked={d.demo} onChange={(e) => setD({ ...d, demo: e.target.checked })} className="mt-1" />
            <span><span className="block font-semibold">Cargar una carta de ejemplo</span><span className="mt-0.5 block text-sm text-[#6B7079]">4 secciones y 14 platos con alérgenos, para enseñar el producto desde el primer minuto.</span></span>
          </label>
        </div>
      )}

      {paso === 3 && (
        <dl className="mt-6 divide-y divide-[#ECECE8] rounded-2xl border border-[#E6E6E2] text-sm">
          {([
            ['Local', d.local], ['Contacto', d.contacto], ['Correo', d.email], ['Plan', d.plan === 'ampliado' ? 'Ampliado' : 'Básico'],
            ['Qué recibe', MODOS.find((m) => m.id === d.modo)!.titulo], ['Carta de ejemplo', d.demo ? 'Sí' : 'No'],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-[#6B7079]">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
          ))}
        </dl>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-between gap-3">
        {paso > 1 ? <button onClick={() => setPaso(paso - 1)} className="rounded-full border border-[#E6E6E2] px-5 py-2.5 text-sm font-semibold">Atrás</button> : <span />}
        {paso < 3 ? (
          <button disabled={paso === 1 && !paso1Ok} onClick={() => setPaso(paso + 1)} className="rounded-full bg-[#17191E] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-35">Continuar</button>
        ) : (
          <button disabled={pendiente} onClick={crear} className="rounded-full bg-[#E8592A] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pendiente ? 'Creando…' : d.modo === 'pago' ? 'Crear y preparar el pago' : 'Crear cliente'}</button>
        )}
      </div>
    </div>
  );
}
