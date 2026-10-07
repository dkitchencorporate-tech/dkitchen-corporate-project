'use client';

import { useMemo, useState, useTransition } from 'react';
import { crearEnlaceAction } from '@/app/admin-dkitchen/qr/actions';
import { QR_MENU, PLANES_QR, nombrePlan } from '@/lib/pricing-config';

type Cat = { servicio: string; nombre: string; tipo: string; precio: number };
const PLANES: Record<string, number> = Object.fromEntries(PLANES_QR.map((p) => [p, QR_MENU.planes[p].mensual * 100]));
const eur = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const numero = (s: string) => Number(s.replace(',', '.'));

/**
 * Enlace de pago a medida en 3 pasos (rediseño 29/09/2026):
 * 1. Qué cobras · 2. Cuánto · 3. Enviar. El importe se guarda en la base
 * antes de ir al pago; al pagarlo se activa solo.
 */
export default function EnlacesPago({ restauranteId, catalogo }: { restauranteId: string; catalogo: Cat[] }) {
  const [paso, setPaso] = useState(1);
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
  const primerFinal = primer === '' ? normal.primer / 100 : numero(primer);
  const mensualFinal = mensual === '' ? normal.mensual / 100 : numero(mensual);
  const descuento = normal.primer ? Math.round((1 - (primerFinal * 100) / normal.primer) * 100) : 0;
  const campo = 'mt-1.5 w-full rounded-xl border border-acero bg-white px-4 py-3 text-[15px] outline-none focus:border-tinta';
  const hayAlgo = !!plan || servicios.length > 0;
  const importesOk = primerFinal >= 1 && Number.isFinite(mensualFinal) && mensualFinal >= 0;

  function reiniciar() { setPaso(1); setPlan(''); setServicios([]); setPrimer(''); setMensual(''); setNota(''); setResultado(null); }

  if (resultado?.url) {
    return (
      <div className="space-y-3 rounded-2xl border border-exito/30 bg-exito/[0.06] p-5 text-sm">
        <p className="font-semibold text-exito">Enlace listo{enviar ? ' y enviado por correo al cliente' : ''}.</p>
        <code className="block break-all rounded-xl bg-white p-3 text-xs">{resultado.url}</code>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigator.clipboard?.writeText(resultado.url!)} className="rounded-full border border-linea bg-white px-4 py-2 font-semibold">Copiar enlace</button>
          <a href={`https://wa.me/?text=${encodeURIComponent('Tu enlace de pago DKitchen: ' + resultado.url)}`} target="_blank" rel="noopener" className="rounded-full bg-[#25D366] px-4 py-2 font-semibold text-white">Enviar por WhatsApp</a>
          <button onClick={reiniciar} className="rounded-full px-4 py-2 font-semibold text-niebla">Preparar otro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {['Qué cobras', 'Cuánto', 'Enviar'].map((t, i) => (
          <li key={t} className={`flex items-center gap-2 ${paso === i + 1 ? 'font-semibold' : paso > i + 1 ? 'text-exito' : 'text-ceniza'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${paso === i + 1 ? 'bg-tinta text-white' : paso > i + 1 ? 'bg-exito text-white' : 'bg-papel'}`}>{paso > i + 1 ? '✓' : i + 1}</span>{t}
          </li>
        ))}
      </ol>

      {paso === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">Plan mensual
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={campo}>
              <option value="">Sin cambio de plan (solo servicios)</option>
              {PLANES_QR.map((p) => <option key={p} value={p}>Plan {nombrePlan(p)} · {QR_MENU.planes[p].mensual} €/mes</option>)}
            </select>
          </label>
          <div>
            <p className="text-sm font-medium">Servicios y módulos</p>
            <p className="text-xs text-ceniza">Marca todo lo que entra en este pago.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {catalogo.map((c) => {
                const on = servicios.includes(c.servicio);
                return (
                  <label key={c.servicio} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${on ? 'border-tinta bg-crema' : 'border-linea'}`}>
                    <input type="checkbox" checked={on} onChange={(e) => setServicios((l) => (e.target.checked ? [...l, c.servicio] : l.filter((x) => x !== c.servicio)))} />
                    <span className="min-w-0 flex-1 font-medium">{c.nombre}</span>
                    <span className="shrink-0 text-xs text-niebla">{eur(c.precio)}{c.tipo === 'mensual' ? '/mes' : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-crema p-4 text-sm">
            <p className="text-niebla">Precio normal</p>
            <p className="mt-1 font-semibold">Primer pago {eur(normal.primer)}{normal.mensual ? ` · después ${eur(normal.mensual)}/mes` : ' · pago único'}</p>
            <p className="mt-1 text-xs text-ceniza">Déjalo en blanco para cobrar el precio normal, o escribe otro importe para aplicar un descuento.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Primer pago (€)
              <input inputMode="decimal" value={primer} onChange={(e) => setPrimer(e.target.value)} placeholder={String(normal.primer / 100)} className={campo} />
              {primer !== '' && descuento > 0 && <span className="mt-1 block text-xs text-exito">{descuento}% de descuento sobre el precio normal</span>}
            </label>
            <label className="block text-sm font-medium">Cuota mensual después (€)
              <input inputMode="decimal" value={mensual} onChange={(e) => setMensual(e.target.value)} placeholder={String(normal.mensual / 100)} className={campo} />
              <span className="mt-1 block text-xs text-ceniza">0 = pago único, sin cuota.</span>
            </label>
          </div>
          {!importesOk && <p className="text-sm text-red-600">El primer pago debe ser de al menos 1 €.</p>}
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4">
          <dl className="divide-y divide-linea rounded-2xl border border-linea text-sm">
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-niebla">Qué incluye</dt><dd className="text-right font-medium">{[plan ? `Plan ${nombrePlan(plan)}` : null, ...servicios.map((s) => catalogo.find((c) => c.servicio === s)?.nombre)].filter(Boolean).join(' + ')}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-niebla">Primer pago</dt><dd className="font-semibold">{eur(Math.round(primerFinal * 100))}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-niebla">Después</dt><dd className="font-medium">{mensualFinal ? `${eur(Math.round(mensualFinal * 100))}/mes` : 'Pago único'}</dd></div>
          </dl>
          <label className="block text-sm font-medium">Mensaje para el cliente (opcional)
            <input value={nota} maxLength={300} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: precio especial de lanzamiento, válido esta semana" className={campo} />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enviar} onChange={(e) => setEnviar(e.target.checked)} /> Enviárselo por correo al crear el enlace</label>
          {resultado?.error && <p className="text-sm text-red-600">{resultado.error}</p>}
        </div>
      )}

      <div className="flex justify-between gap-3">
        {paso > 1 ? <button onClick={() => setPaso(paso - 1)} className="rounded-full border border-linea px-5 py-2.5 text-sm font-semibold">Atrás</button> : <span />}
        {paso < 3 ? (
          <button disabled={(paso === 1 && !hayAlgo) || (paso === 2 && !importesOk)} onClick={() => setPaso(paso + 1)} className="rounded-full bg-tinta px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-35">Continuar</button>
        ) : (
          <button disabled={pendiente} onClick={() => { setResultado(null); iniciar(async () => setResultado(await crearEnlaceAction({ restauranteId, plan, servicios, primer: primerFinal, mensual: mensualFinal, nota, enviar }))); }}
            className="rounded-full bg-vino px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pendiente ? 'Creando enlace…' : 'Crear enlace de pago'}</button>
        )}
      </div>
    </div>
  );
}
