'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteAction } from '@/app/admin-dkitchen/qr/actions';
import { QR_MENU, nombrePlan } from '@/lib/pricing-config';

/**
 * Alta manual de un cliente QR desde Central, en 3 pasos con instrucciones
 * (rediseño 29/09/2026): 1. Datos · 2. Qué recibe · 3. Revisar y crear.
 */
type Modo = 'pago' | 'gratis' | 'demo' | 'solo';
const MODOS: { id: Modo; titulo: string; texto: string }[] = [
  { id: 'pago', titulo: 'Preparar un enlace de pago', texto: 'Creas la cuenta y a continuación le preparas un enlace con el precio que acordéis (plan, módulos, descuento).' },
  { id: 'gratis', titulo: 'Prueba con todo incluido', texto: 'Plan Sala (el máximo de platos, mesas, equipo y comandas al TPV) sin coste durante el tiempo que elijas. El cliente elige su plantilla y colores; la Carta de Autor se paga aparte. Al acabar, se le invita a quedarse; si no paga, su panel pasa a solo lectura. Siempre con fecha de fin: no hay regalos sin fecha.' },
  { id: 'demo', titulo: 'Cuenta demo interna', texto: 'Para enseñar el producto o grabar vídeos (tus propias demos). Todo incluido sin fecha, pero NO cuenta en ingresos, en el parte ni en las alertas. Sale en la pestaña «Demo» de Clientes.' },
  { id: 'solo', titulo: 'Solo crear la cuenta', texto: 'Cuenta con el plan elegido y nada más. Podrás añadir servicios o un enlace de pago desde su ficha.' },
];

export default function NuevoCliente() {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(1);
  const [d, setD] = useState({ local: '', contacto: '', email: '', plan: 'ampliado', modo: 'pago' as Modo, cartaEjemplo: false, dias: '15' });
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const campo = 'mt-1.5 w-full rounded-xl border border-acero bg-white px-4 py-3 text-[15px] outline-none focus:border-tinta';
  const correoOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email);
  const paso1Ok = d.local.trim().length >= 2 && d.contacto.trim().length >= 2 && correoOk;

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="rounded-full bg-tinta px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">Nuevo cliente</button>;
  }

  function crear() {
    setError(null);
    iniciar(async () => {
      const r = await crearClienteAction({ email: d.email, contacto: d.contacto, local: d.local, plan: d.plan, todo: d.modo === 'gratis', dias: Number(d.dias), demoInterna: d.modo === 'demo', cartaEjemplo: d.cartaEjemplo });
      if (r.error) setError(r.error); else if (r.id) router.push('/admin-dkitchen/qr/' + r.id + (d.modo === 'pago' ? '#enlace' : ''));
    });
  }

  const Paso = ({ n, t }: { n: number; t: string }) => (
    <li className={`flex items-center gap-2 text-sm ${paso === n ? 'font-semibold text-carbon' : paso > n ? 'text-exito' : 'text-ceniza'}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${paso === n ? 'bg-tinta text-white' : paso > n ? 'bg-exito text-white' : 'bg-papel'}`}>{paso > n ? '✓' : n}</span>{t}
    </li>
  );

  return (
    <div className="w-full rounded-[22px] border border-linea bg-white p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Nuevo cliente</h2>
          <p className="mt-1 text-sm text-niebla">Para ventas cerradas en persona, pruebas con fecha o tus demos internas. El cliente recibe un correo para crear su contraseña.</p>
        </div>
        <button onClick={() => { setAbierto(false); setPaso(1); }} className="text-sm text-niebla">Cancelar</button>
      </div>
      <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-2"><Paso n={1} t="Datos" /><Paso n={2} t="Qué recibe" /><Paso n={3} t="Revisar" /></ol>

      {paso === 1 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">Nombre del local
            <input value={d.local} maxLength={80} onChange={(e) => setD({ ...d, local: e.target.value })} placeholder="Ej.: Casa Brasa" className={campo} />
            <span className="mt-1 block text-xs text-ceniza">Con él se genera la dirección de su carta.</span>
          </label>
          <label className="block text-sm font-medium">Persona de contacto
            <input value={d.contacto} maxLength={80} onChange={(e) => setD({ ...d, contacto: e.target.value })} className={campo} />
          </label>
          <label className="block text-sm font-medium">Correo del cliente
            <input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} className={campo} />
            <span className="mt-1 block text-xs text-ceniza">Cada correo es un cliente. Para demos propias: tu+demo1@gmail.com.</span>
          </label>
          <label className="block text-sm font-medium">Plan
            <select value={d.plan} onChange={(e) => setD({ ...d, plan: e.target.value })} className={campo}>
              {(['ampliado', 'basico', 'sala'] as const).map((p) => <option key={p} value={p}>{nombrePlan(p)} · {QR_MENU.planes[p].mensual} €/mes</option>)}
            </select>
          </label>
        </div>
      )}

      {paso === 2 && (
        <div className="mt-6 space-y-3">
          {MODOS.map((m) => (
            <label key={m.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${d.modo === m.id ? 'border-tinta bg-crema' : 'border-linea'}`}>
              <input type="radio" name="modo" checked={d.modo === m.id} onChange={() => setD({ ...d, modo: m.id })} className="mt-1" />
              <span><span className="block font-semibold">{m.titulo}</span><span className="mt-0.5 block text-sm text-niebla">{m.texto}</span></span>
            </label>
          ))}
          {d.modo === 'gratis' && (
            <label className="block rounded-2xl bg-crema p-4 text-sm font-medium">Duración de la prueba
              <select value={d.dias} onChange={(e) => setD({ ...d, dias: e.target.value })} className={campo}>
                <option value="7">7 días</option><option value="15">15 días</option><option value="30">30 días</option>
              </select>
              <span className="mt-1 block text-xs text-ceniza">Si paga antes de que acabe, no paga nada hasta el día 12 siguiente al final de la prueba.</span>
            </label>
          )}
          <label className="flex cursor-pointer gap-3 rounded-2xl border border-dashed border-linea-fuerte p-4">
            <input type="checkbox" checked={d.cartaEjemplo} onChange={(e) => setD({ ...d, cartaEjemplo: e.target.checked })} className="mt-1" />
            <span><span className="block font-semibold">Cargar una carta de ejemplo</span><span className="mt-0.5 block text-sm text-niebla">4 secciones y 14 platos con alérgenos, para enseñar el producto desde el primer minuto.</span></span>
          </label>
        </div>
      )}

      {paso === 3 && (
        <dl className="mt-6 divide-y divide-linea rounded-2xl border border-linea text-sm">
          {([
            ['Local', d.local], ['Contacto', d.contacto], ['Correo', d.email], ['Plan', nombrePlan(d.plan)],
            ['Qué recibe', MODOS.find((m) => m.id === d.modo)!.titulo + (d.modo === 'gratis' ? ` · ${d.dias} días` : '')], ['Carta de ejemplo', d.cartaEjemplo ? 'Sí' : 'No'],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-niebla">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
          ))}
        </dl>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-between gap-3">
        {paso > 1 ? <button onClick={() => setPaso(paso - 1)} className="rounded-full border border-linea px-5 py-2.5 text-sm font-semibold">Atrás</button> : <span />}
        {paso < 3 ? (
          <button disabled={paso === 1 && !paso1Ok} onClick={() => setPaso(paso + 1)} className="rounded-full bg-tinta px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-35">Continuar</button>
        ) : (
          <button disabled={pendiente} onClick={crear} className="rounded-full bg-vino px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pendiente ? 'Creando…' : d.modo === 'pago' ? 'Crear y preparar el pago' : 'Crear cliente'}</button>
        )}
      </div>
    </div>
  );
}
