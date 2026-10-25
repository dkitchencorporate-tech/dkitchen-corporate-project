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
/** 18/10 (karc0): cada extra explica qué es y qué pasa al pagarlo; ni el pack de idiomas antiguo (idiomas por plan, 0086) ni la Carta de Autor (ya incluida en el diseño) se ofrecen. La Puesta a punto se vende con descuento. */
const EXTRAS: Record<string, { que: string; despues: string }> = {
  bono_ia: { que: '50 fotos de plato generadas con IA a partir de sus fotos o del nombre del plato (3 gratis siempre).', despues: 'Al pagarlo, queda en sus extras contratados y el bono se suma a su Estudio de fotos.' },
  idioma_extra: { que: 'Un idioma más traducido por DKitchen, además de los que trae su plan.', despues: 'Al pagarlo, se suma solo a los idiomas que puede activar; la traducción la hacemos desde «Entrar en su panel» → Idiomas.' },
  setup_esencial: { que: 'Puesta a punto: carta cargada, conexión con su TPV, formación del equipo y fotos con IA.', despues: 'Al pagarlo, aparece en Extras contratados con su checklist de montaje (carta, fotos, TPV, formación).' },
  setup_experto: { que: 'Carta de Autor: diseño de carta a medida, fotos y textos cuidados por DKitchen.', despues: 'Al pagarlo, aparece en Extras contratados con su checklist; el diseño lo coordinamos desde esta ficha.' },
};

export default function EnlacesPago({ restauranteId, catalogo: todo, demo = false, planActual = null, pagando = false }: { restauranteId: string; catalogo: Cat[]; demo?: boolean; planActual?: string | null; pagando?: boolean }) {
  // 08/10 (karc0): los módulos mensuales sueltos quedaron sustituidos por los planes por cantidades
  // (Carta/Local/Sala). Aquí solo se ofrecen extras de pago único.
  const catalogo = todo.filter((c) => c.tipo !== 'mensual' && c.servicio !== 'idiomas' && c.servicio !== 'setup_experto');
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
          <div>
            <p className="text-sm font-medium">{demo ? 'Convertir esta demo en cliente' : pagando ? 'Cambiar de plan' : 'Activación rápida'}</p>
            <p className="text-xs text-ceniza">{pagando ? 'Ya paga su plan: aquí solo ves los cambios posibles. Subir de plan se cobra a precio normal (el 1 € del primer mes es solo para clientes nuevos).' : `Un toque prepara el cobro con el precio de la web. Al pagarlo, la cuenta pasa a cliente activo sola${demo ? ' y deja de ser demo' : ''}.`}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {PLANES_QR.map((p) => {
                const pl = QR_MENU.planes[p];
                const hoy = pl.primerMesSimbolico && !pagando ? QR_MENU.primerMes : pl.mensual;
                const actual = pagando && planActual === p;
                const sube = pagando && planActual ? PLANES_QR.indexOf(p) > PLANES_QR.indexOf(planActual as typeof p) : false;
                if (actual) return (
                  <div key={p} className="rounded-xl border-2 border-exito/50 bg-exito/5 px-4 py-3 text-left text-sm">
                    <span className="block font-semibold">Plan {pl.nombre} <span className="ml-1 rounded-full bg-exito px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Plan actual</span></span>
                    <span className="block text-xs text-niebla">Ya lo paga: {eur(pl.mensual * 100)}/mes + IVA</span>
                  </div>
                );
                return (
                  <button key={p} type="button" onClick={() => { setPlan(p); setServicios([]); setPrimer(String(hoy)); setMensual(String(pl.mensual)); setPaso(3); }}
                    className="rounded-xl border border-linea px-4 py-3 text-left text-sm transition hover:border-tinta hover:bg-crema">
                    <span className="block font-semibold">{pagando ? (sube ? 'Subir a' : 'Bajar a') : 'Plan'} {pl.nombre}</span>
                    <span className="block text-xs text-niebla">Hoy {eur(hoy * 100)} + IVA · después {eur(pl.mensual * 100)}/mes</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="border-t border-linea pt-4 text-sm font-medium">O a medida</p>
          <label className="block text-sm font-medium">Plan mensual
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={campo}>
              <option value="">Sin cambio de plan (solo extras)</option>
              {PLANES_QR.filter((p) => !(pagando && planActual === p)).map((p) => <option key={p} value={p}>Plan {nombrePlan(p)} · {QR_MENU.planes[p].mensual} €/mes</option>)}
            </select>
          </label>
          <div>
            <p className="text-sm font-medium">Extras de pago único</p>
            <p className="text-xs text-ceniza">Opcional. Lo que va incluido en cada plan ya no se cobra aparte.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {catalogo.map((c) => {
                const on = servicios.includes(c.servicio);
                return (
                  <label key={c.servicio} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${on ? 'border-tinta bg-crema' : 'border-linea'}`}>
                    <input type="checkbox" checked={on} onChange={(e) => setServicios((l) => (e.target.checked ? [...l, c.servicio] : l.filter((x) => x !== c.servicio)))} />
                    <span className="min-w-0 flex-1"><span className="block font-medium">{c.nombre}</span>{EXTRAS[c.servicio] && <><span className="mt-0.5 block text-xs text-niebla">{EXTRAS[c.servicio].que}</span><span className="mt-0.5 block text-[11px] text-exito">{EXTRAS[c.servicio].despues}</span></>}</span>
                    <span className="shrink-0 self-start text-xs text-niebla">{eur(c.precio)}{c.tipo === 'mensual' ? '/mes' : ''}</span>
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
