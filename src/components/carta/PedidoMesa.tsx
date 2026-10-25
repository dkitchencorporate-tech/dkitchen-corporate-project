'use client';

import { useCallback, useMemo, useState } from 'react';
import useAtrasCierra from './useAtrasCierra';

export interface PlatoPedido { id: string; nombre: string; precio: string; seccion: string }

const MESA = /^[A-Za-z0-9-]{1,12}$/;
const numero = (p: string) => Number(String(p).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

/**
 * Pedido del comensal desde la mesa (G, 0099). Pide en la mesa y paga en la barra:
 * el pedido llega a la app del camarero como «por confirmar» y solo entra en la cuenta
 * (y en el TPV) cuando él lo confirma. Plan Sala; en las demos internas se simula y se
 * enseña cómo le llega al camarero. Los precios de aquí son orientativos: los pone la base.
 */
export default function PedidoMesa({ slug, color, platos, modo, mesa, setMesa, onCerrar }: {
  slug: string; color: string; platos: PlatoPedido[]; modo: 'real' | 'demo';
  mesa: string; setMesa: (m: string) => void; onCerrar: () => void;
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [nota, setNota] = useState('');
  const [estado, setEstado] = useState<'eligiendo' | 'enviando' | 'ok' | 'demo' | 'error'>('eligiendo');
  const [mensaje, setMensaje] = useState('');
  useAtrasCierra(true, onCerrar, 'pedido');

  const secciones = useMemo(() => {
    const m = new Map<string, PlatoPedido[]>();
    for (const p of platos) m.set(p.seccion, [...(m.get(p.seccion) ?? []), p]);
    return [...m.entries()];
  }, [platos]);
  const elegidos = platos.filter((p) => (cantidades[p.id] ?? 0) > 0);
  const unidades = elegidos.reduce((t, p) => t + cantidades[p.id], 0);
  const total = elegidos.reduce((t, p) => t + cantidades[p.id] * numero(p.precio), 0);

  const cambiar = useCallback((id: string, d: number) => {
    setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] ?? 0) + d)) }));
  }, []);

  async function enviar() {
    const m = mesa.trim();
    if (!MESA.test(m)) { setEstado('error'); setMensaje('Escribe el número de tu mesa.'); return; }
    setEstado('enviando');
    try {
      const r = await fetch('/api/mesa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, mesa: m, nota, lineas: elegidos.map((p) => ({ plato_id: p.id, cantidad: cantidades[p.id], nota: '' })) }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.resultado === 'ok') { setEstado('ok'); return; }
      if (j.resultado === 'demo') { setEstado('demo'); return; }
      setEstado('error');
      setMensaje(j.resultado === 'espera' ? 'Tu pedido anterior aún está pendiente. Espera a que lo confirme el camarero.'
        : j.resultado === 'limite' ? 'Ahora mismo hay muchos pedidos. Llama al camarero, por favor.'
        : j.resultado === 'datos' ? 'Algún plato ya no está disponible. Revisa tu pedido.'
        : 'No se pudo enviar. Llama al camarero, por favor.');
    } catch {
      setEstado('error'); setMensaje('Sin conexión. Inténtalo de nuevo.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md sm:items-center sm:p-4" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="pedido-titulo" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-[#FBF8F3] text-[#1a1a1a] shadow-2xl sm:rounded-[28px]">
        <header className="flex items-center justify-between gap-3 border-b border-black/10 px-6 pb-4 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color }}>Pide desde tu mesa</p>
            <h2 id="pedido-titulo" className="mt-1 text-xl font-semibold">{estado === 'ok' ? 'Pedido enviado' : estado === 'demo' ? 'Así le llega al camarero' : 'Tu pedido'}</h2>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-full p-2 text-black/40">✕</button>
        </header>

        {estado === 'ok' ? (
          <div className="space-y-4 px-6 py-6">
            <p className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800">✓ El camarero ya tiene tu pedido de la mesa {mesa}. Lo confirma enseguida y pasa a cocina.</p>
            <p className="text-sm text-black/60">Se paga en la barra o al pedir la cuenta, como siempre.</p>
            <button onClick={onCerrar} className="w-full rounded-2xl py-3.5 text-sm font-bold text-white" style={{ backgroundColor: color }}>Volver a la carta</button>
          </div>
        ) : estado === 'demo' ? (
          <div className="space-y-4 overflow-y-auto px-6 py-6">
            <p className="text-sm text-black/60">Esto es una demostración: no se ha enviado nada. En tu local, el pedido aparece así en el móvil del camarero, con aviso sonoro:</p>
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" style={{ borderLeft: `5px solid ${color}` }}>
              <div className="flex items-baseline justify-between"><p className="text-lg font-bold">Mesa {mesa || '4'}</p><p className="text-xs text-black/50">ahora</p></div>
              <ul className="space-y-1 text-sm">
                {elegidos.map((p) => <li key={p.id} className="flex justify-between gap-3"><span><strong>{cantidades[p.id]}×</strong> {p.nombre}</span><span className="tabular-nums text-black/60">{euros(cantidades[p.id] * numero(p.precio))}</span></li>)}
              </ul>
              {nota && <p className="rounded-xl bg-black/5 px-3 py-2 text-sm">«{nota}»</p>}
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <span className="rounded-xl py-3 text-center text-sm font-bold text-white" style={{ background: color }}>Confirmar · {euros(total)}</span>
                <span className="rounded-xl border border-black/15 px-4 py-3 text-sm font-semibold text-black/70">Rechazar</span>
              </div>
            </div>
            <p className="text-sm text-black/60">Con un toque entra en la cuenta de la mesa (y en tu TPV, si está conectado). El cliente paga en la barra. Incluido en el plan Sala.</p>
            <button onClick={onCerrar} className="w-full rounded-2xl py-3.5 text-sm font-bold text-white" style={{ backgroundColor: color }}>Volver a la carta</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {secciones.map(([seccion, lista]) => (
                <section key={seccion}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">{seccion}</h3>
                  <ul className="divide-y divide-black/10">
                    {lista.map((p) => {
                      const n = cantidades[p.id] ?? 0;
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium">{p.nombre}</p>
                            <p className="text-xs tabular-nums text-black/50">{euros(numero(p.precio))}</p>
                          </div>
                          {n === 0 ? (
                            <button onClick={() => cambiar(p.id, 1)} className="shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold" style={{ borderColor: color, color }}>Añadir</button>
                          ) : (
                            <div className="flex shrink-0 items-center gap-1 rounded-full text-white" style={{ backgroundColor: color }}>
                              <button onClick={() => cambiar(p.id, -1)} aria-label={`Quitar ${p.nombre}`} className="h-9 w-9 text-lg font-bold">−</button>
                              <span className="w-5 text-center text-sm font-bold tabular-nums">{n}</span>
                              <button onClick={() => cambiar(p.id, 1)} aria-label={`Añadir otro ${p.nombre}`} className="h-9 w-9 text-lg font-bold">+</button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
            <footer className="space-y-3 border-t border-black/10 bg-white px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-black/15 px-3 py-2.5">
                  <span className="text-xs font-medium text-black/55">Mesa</span>
                  <input value={mesa} onChange={(e) => setMesa(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 12))} inputMode="numeric" placeholder="Nº" aria-label="Número de mesa" className="w-12 bg-transparent text-right text-lg font-bold focus:outline-none" />
                </label>
                <input value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} placeholder="Nota (sin cebolla, al punto…)" aria-label="Nota para la cocina" className="min-w-0 rounded-xl border border-black/15 px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              {estado === 'error' && <p className="text-center text-sm text-red-700">{mensaje}</p>}
              <button disabled={unidades === 0 || estado === 'enviando'} onClick={enviar} className="w-full rounded-2xl py-4 text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: color }}>
                {estado === 'enviando' ? 'Enviando…' : unidades === 0 ? 'Elige tus platos' : `Enviar al camarero · ${unidades} ${unidades === 1 ? 'plato' : 'platos'} · ${euros(total)}`}
              </button>
              <p className="text-center text-[11px] text-black/45">{modo === 'demo' ? 'Demostración: no se envía nada.' : 'Lo confirma el camarero. Se paga en la barra.'}</p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
