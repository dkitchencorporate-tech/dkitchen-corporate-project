'use client';

import { useMemo, useState, useTransition } from 'react';
import { crearEnlaceAction } from '@/app/admin-dkitchen/qr/actions';

type Cat = { servicio: string; nombre: string; tipo: string; precio: number };
const PLANES: Record<string, number> = { basico: 900, ampliado: 2500 };
const eur = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

/**
 * Enlace de pago a medida: plan y/o servicios, con el precio que decida
 * DKitchen (normal, descuento o acuerdo). Se envía por correo al cliente o se
 * copia para WhatsApp. El importe se guarda en la base antes de ir a Whop.
 */
export default function EnlacesPago({ restauranteId, catalogo }: { restauranteId: string; catalogo: Cat[] }) {
  const [plan, setPlan] = useState('');
  const [servicios, setServicios] = useState<string[]>([]);
  const normal = useMemo(() => {
    let unico = 0, mensual = plan ? PLANES[plan] : 0;
    for (const s of servicios) { const c = catalogo.find((x) => x.servicio === s); if (!c) continue; if (c.tipo === 'mensual') mensual += c.precio; else unico += c.precio; }
    return { primer: unico + mensual, mensual };
  }, [plan, servicios, catalogo]);
  const [primer, setPrimer] = useState('');
  const [mensual, setMensual] = useState('');
  const [nota, setNota] = useState('');
  const [enviar, setEnviar] = useState(true);
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ url?: string; error?: string } | null>(null);
  const campo = 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white';
  const primerFinal = primer === '' ? normal.primer / 100 : Number(primer.replace(',', '.'));
  const mensualFinal = mensual === '' ? normal.mensual / 100 : Number(mensual.replace(',', '.'));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7079]">Qué se cobra</p>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={campo}>
            <option value="">Sin plan (solo servicios)</option>
            <option value="basico">Plan Básico · 9 €/mes</option>
            <option value="ampliado">Plan Ampliado · 25 €/mes</option>
          </select>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {catalogo.map((c) => (
              <label key={c.servicio} className="flex items-center gap-2 rounded-lg border border-[#E6E6E2] px-3 py-2 text-sm">
                <input type="checkbox" checked={servicios.includes(c.servicio)}
                  onChange={(e) => setServicios((l) => (e.target.checked ? [...l, c.servicio] : l.filter((x) => x !== c.servicio)))} />
                <span className="flex-1">{c.nombre}</span>
                <span className="text-xs text-[#6B7079]">{eur(c.precio)}{c.tipo === 'mensual' ? '/mes' : ''}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7079]">Cuánto</p>
          <p className="text-sm text-[#6B7079]">Precio normal: primer pago {eur(normal.primer)}{normal.mensual ? ` · después ${eur(normal.mensual)}/mes` : ''}. Cámbialo para aplicar un descuento o lo acordado.</p>
          <label className="block text-sm">Primer pago (€)
            <input inputMode="decimal" value={primer} onChange={(e) => setPrimer(e.target.value)} placeholder={(normal.primer / 100).toString()} className={campo} />
          </label>
          <label className="block text-sm">Cuota mensual después (€, 0 = pago único)
            <input inputMode="decimal" value={mensual} onChange={(e) => setMensual(e.target.value)} placeholder={(normal.mensual / 100).toString()} className={campo} />
          </label>
          <label className="block text-sm">Mensaje para el cliente (opcional)
            <input value={nota} maxLength={300} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: precio especial de lanzamiento" className={campo} />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enviar} onChange={(e) => setEnviar(e.target.checked)} /> Enviárselo por correo ahora</label>
        </div>
      </div>
      {resultado?.error && <p className="text-sm text-red-600">{resultado.error}</p>}
      {resultado?.url && (
        <div className="space-y-2 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
          <p className="font-semibold text-green-700">Enlace listo{enviar ? ' y enviado por correo' : ''}.</p>
          <code className="block break-all rounded bg-white p-2 text-xs">{resultado.url}</code>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigator.clipboard?.writeText(resultado.url!)} className="rounded-lg bg-[#EDEDEA] px-3 py-1.5 font-semibold">Copiar</button>
            <a href={`https://wa.me/?text=${encodeURIComponent('Tu enlace de pago DKitchen: ' + resultado.url)}`} target="_blank" rel="noopener" className="rounded-lg bg-[#EDEDEA] px-3 py-1.5 font-semibold">Enviar por WhatsApp</a>
          </div>
        </div>
      )}
      <button disabled={pendiente || (!plan && servicios.length === 0)}
        onClick={() => { setResultado(null); iniciar(async () => setResultado(await crearEnlaceAction({ restauranteId, plan, servicios, primer: primerFinal, mensual: mensualFinal, nota, enviar }))); }}
        className="rounded-lg bg-[#E8592A] px-5 py-2.5 text-sm font-bold disabled:opacity-40">
        {pendiente ? 'Creando enlace…' : `Crear enlace · ${eur(Math.round((primerFinal || 0) * 100))}${mensualFinal ? ` + ${eur(Math.round(mensualFinal * 100))}/mes` : ''}`}
      </button>
    </div>
  );
}
