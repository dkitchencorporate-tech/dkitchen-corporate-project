'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteAction } from '@/app/admin-dkitchen/qr/actions';

/** Alta manual de un cliente QR desde Central (demos o cortesía, sin pago). */
export default function NuevoCliente() {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const campo = 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-white/30';

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="rounded-lg bg-[#D9531E] px-4 py-2 text-sm font-bold hover:bg-[#B8451A]">Nuevo cliente</button>;
  }

  return (
    <form
      className="w-full space-y-3 rounded-2xl border border-white/10 bg-[#1c140b] p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError(null);
        iniciar(async () => {
          const r = await crearClienteAction({
            email: String(f.get('email')), contacto: String(f.get('contacto')), local: String(f.get('local')),
            plan: String(f.get('plan')), todo: f.get('modo') === 'gratis', demo: f.get('demo') === 'on',
          });
          if (r.error) setError(r.error); else if (r.id) router.push('/admin-dkitchen/qr/' + r.id + (f.get('modo') === 'pago' ? '#enlace' : ''));
        });
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Nuevo cliente</h2>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-white/50">Cancelar</button>
      </div>
      <p className="text-xs text-white/45">Para demos, clientes de cortesía o ventas cerradas en persona. El cliente recibe un correo para fijar su contraseña y entrar en su panel.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="local" required maxLength={80} placeholder="Nombre del local" className={campo} />
        <input name="contacto" required maxLength={80} placeholder="Nombre del contacto" className={campo} />
        <input name="email" type="email" required placeholder="Correo del cliente" className={campo} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <select name="plan" defaultValue="ampliado" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <option value="ampliado">Plan Ampliado</option><option value="basico">Plan Básico</option>
        </select>
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex items-center gap-2"><input type="radio" name="modo" value="pago" defaultChecked /> Preparar enlace de pago (precio a medida)</label>
          <label className="flex items-center gap-2"><input type="radio" name="modo" value="gratis" /> Darle todo gratis</label>
          <label className="flex items-center gap-2"><input type="radio" name="modo" value="solo" /> Solo crear la cuenta</label>
        </fieldset>
        <label className="flex items-center gap-2"><input type="checkbox" name="demo" /> Cargar carta de demostración</label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button disabled={pendiente} className="rounded-lg bg-[#D9531E] px-5 py-2.5 text-sm font-bold disabled:opacity-50">{pendiente ? 'Creando…' : 'Crear cliente'}</button>
    </form>
  );
}
