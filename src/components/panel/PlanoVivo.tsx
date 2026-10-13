'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import type { MesasEnVivo as Datos } from '@/lib/comandero';
import type { ElementoPlano } from '@/lib/sala';
import type { LlamadaCamarero } from '@/lib/llamadas-camarero';
import { atenderLlamadaAction, guardarMesaAction, llamadasPendientesAction, rondaRevisadaAction } from '@/app/panel/actions';
import { EVENTO_LLAMADAS } from './AlarmaLlamadas';

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const COLORES_ZONA = ['#7A0F31', '#2F8F6B', '#1F4E79', '#C58B2A', '#5B3E8A'];

type MesaViva = Datos['mesas'][number];
type Estado = 'llama' | 'pedido' | 'abierta' | 'libre';

/**
 * PLANO EN VIVO (13/10, karc0): la sala del local como la enseña la web.
 * Cada mesa se ve libre, abierta (con importe y minutos) y PARPADEA solo mientras
 * pasa algo: una llamada sin atender (rojo) o una ronda nueva por pasar (vino).
 * Al tocar una mesa: asignar camarero, atender, marcar la ronda, ver la cuenta o tomar un pedido.
 */
export default function PlanoVivo({
  datos, elementos, camareros, onCambio, onVerCuenta, onPedido,
}: {
  datos: Datos; elementos: ElementoPlano[]; camareros: { id: string; nombre: string; activo: boolean }[];
  onCambio: () => void; onVerCuenta: (cuentaId: string) => void; onPedido: (mesa: string) => void;
}) {
  const [llamadas, setLlamadas] = useState<LlamadaCamarero[]>([]);
  const [sel, setSel] = useState<MesaViva | null>(null);

  const refrescar = useCallback(async () => {
    try { setLlamadas(await llamadasPendientesAction()); } catch { /* siguiente ciclo */ }
  }, []);
  useEffect(() => {
    refrescar();
    const t = setInterval(refrescar, 5000);
    window.addEventListener(EVENTO_LLAMADAS, refrescar);
    return () => { clearInterval(t); window.removeEventListener(EVENTO_LLAMADAS, refrescar); };
  }, [refrescar]);

  const estado = (m: MesaViva): Estado =>
    llamadas.some((l) => l.mesa === m.numero) ? 'llama'
    : datos.rondas_entrantes.some((r) => r.mesa === m.numero) ? 'pedido'
    : datos.cuentas.some((k) => k.mesa === m.numero) ? 'abierta' : 'libre';

  const zonas = elementos.filter((e) => e.tipo === 'zona');
  const otros = elementos.filter((e) => e.tipo !== 'zona');

  if (datos.mesas.length === 0) {
    return (
      <a href="/panel?pestana=sala" className="block rounded-[28px] border-2 border-dashed border-linea bg-white p-6 text-center text-sm">
        <span className="block text-lg font-semibold">Dibuja tu sala</span>
        <span className="text-niebla">Coloca tus mesas y zonas una vez y aquí verás en directo cuál llama, cuál pide y de quién es cada una →</span>
      </a>
    );
  }

  return (
    <section className="space-y-3">
      <style>{`
        @keyframes dk-llama{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.75);transform:scale(1)}50%{box-shadow:0 0 0 12px rgba(220,38,38,0);transform:scale(1.07)}}
        @keyframes dk-pide{0%,100%{box-shadow:0 0 0 0 rgba(122,15,49,.7)}50%{box-shadow:0 0 0 12px rgba(122,15,49,0)}}
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-niebla">Tu sala en directo</h3>
        <p className="flex flex-wrap gap-3 text-[11px] text-niebla">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-600 align-middle" />Llama</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-vino align-middle" />Pedido nuevo</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-tinta align-middle" />Ocupada</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-linea bg-white align-middle" />Libre</span>
        </p>
      </div>

      <div className="relative w-full overflow-hidden rounded-[28px] border border-linea bg-white"
        style={{ aspectRatio: '4 / 3', backgroundImage: 'linear-gradient(#0000000a 1px,transparent 1px),linear-gradient(90deg,#0000000a 1px,transparent 1px)', backgroundSize: '6% 8%' }}>
        {zonas.map((z, i) => {
          const c = z.color ?? COLORES_ZONA[i % COLORES_ZONA.length];
          const cam = camareros.find((x) => x.id === z.camareroId)?.nombre;
          return (
            <div key={z.id ?? i} className="absolute rounded-2xl border-2 border-dashed" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.ancho}%`, height: `${z.alto}%`, borderColor: `${c}66` }}>
              <span className="absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[11px] font-semibold sm:text-xs" style={{ background: `${c}1A`, color: c }}>
                {z.etiqueta ?? 'Zona'}{cam ? ` · ${cam}` : ''}
              </span>
            </div>
          );
        })}
        {otros.map((e, i) => (
          <div key={e.id ?? `o${i}`} className="absolute flex items-center justify-center rounded-lg bg-[#3B3440] text-[10px] font-semibold uppercase tracking-wider text-white/80"
            style={{ left: `${e.x}%`, top: `${e.y}%`, width: `${e.ancho}%`, height: `${e.alto}%` }}>
            {e.ancho > 12 ? e.etiqueta ?? '' : ''}
          </div>
        ))}
        {datos.mesas.map((m) => {
          const s = estado(m);
          const cuenta = datos.cuentas.find((k) => k.mesa === m.numero);
          const fondo = s === 'llama' ? 'bg-red-600 text-white' : s === 'pedido' ? 'bg-[linear-gradient(135deg,#8E1840,#4A0618)] text-white' : s === 'abierta' ? 'bg-tinta text-white' : 'bg-[#EEECE8] text-tinta';
          return (
            <button key={m.id} type="button" onClick={() => setSel(m)} aria-label={`Mesa ${m.numero}`}
              className={`absolute flex flex-col items-center justify-center shadow-[0_4px_12px_-4px_rgba(0,0,0,.25)] transition hover:scale-105 ${m.forma === 'redonda' ? 'rounded-full' : 'rounded-xl'} ${fondo}`}
              style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.ancho}%`, height: `${m.alto}%`, animation: s === 'llama' ? 'dk-llama 1s ease-in-out infinite' : s === 'pedido' ? 'dk-pide 1.4s ease-in-out infinite' : undefined }}>
              <span className="text-sm font-black leading-none sm:text-lg">{m.numero}</span>
              {cuenta && s !== 'llama' && <span className="mt-0.5 hidden text-[10px] font-semibold opacity-80 sm:block">{cuenta.minutos}′</span>}
              {s === 'llama' && <span className="mt-0.5 text-[9px] font-bold uppercase sm:text-[10px]">Llama</span>}
            </button>
          );
        })}
      </div>

      {sel && (
        <FichaMesa mesa={sel} estado={estado(sel)} datos={datos} llamadas={llamadas} camareros={camareros}
          onCerrar={() => setSel(null)}
          onHecho={() => { onCambio(); refrescar(); window.dispatchEvent(new Event(EVENTO_LLAMADAS)); }}
          onVerCuenta={(id) => { setSel(null); onVerCuenta(id); }}
          onPedido={() => { setSel(null); onPedido(sel.numero); }} />
      )}
    </section>
  );
}

function FichaMesa({ mesa, estado, datos, llamadas, camareros, onCerrar, onHecho, onVerCuenta, onPedido }: {
  mesa: MesaViva; estado: Estado; datos: Datos; llamadas: LlamadaCamarero[]; camareros: { id: string; nombre: string; activo: boolean }[];
  onCerrar: () => void; onHecho: () => void; onVerCuenta: (id: string) => void; onPedido: () => void;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cuenta = datos.cuentas.find((k) => k.mesa === mesa.numero);
  const rondas = datos.rondas_entrantes.filter((r) => r.mesa === mesa.numero);
  const llamada = llamadas.filter((l) => l.mesa === mesa.numero);
  const actual = camareros.find((c) => c.nombre === mesa.camarero)?.id ?? '';
  const [camarero, setCamarero] = useState(actual);

  function asignar(id: string) {
    setCamarero(id); setError(null);
    iniciar(async () => {
      try {
        await guardarMesaAction({ id: mesa.id, numero: mesa.numero, zona: mesa.zona, forma: mesa.forma as 'cuadrada', plazas: mesa.plazas, x: mesa.x, y: mesa.y, camareroId: id || null });
        onHecho();
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo asignar.'); setCamarero(actual); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={`Mesa ${mesa.numero}`} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-[28px] bg-white p-6 text-tinta shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-niebla">{mesa.zona} · {mesa.plazas} plazas</p>
            <h3 className="text-3xl font-black">Mesa {mesa.numero}</h3>
            <p className="text-sm text-niebla">{estado === 'llama' ? 'Está llamando' : estado === 'pedido' ? 'Pedido nuevo por pasar' : cuenta ? `Abierta · ${cuenta.minutos} min · ${euros(cuenta.importe)}` : 'Libre'}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-black/5">✕</button>
        </div>

        {llamada.length > 0 && (
          <button disabled={pendiente} onClick={() => iniciar(async () => { for (const l of llamada) await atenderLlamadaAction(l.id).catch(() => {}); onHecho(); onCerrar(); })}
            className="w-full rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white disabled:opacity-50">Voy · marcar llamada atendida</button>
        )}
        {rondas.map((r) => (
          <div key={r.id} className="rounded-2xl border-l-8 border-vino bg-vino/5 p-3">
            <ul className="text-sm">{r.lineas.map((l, i) => <li key={i}><strong>{l.cantidad} ×</strong> {l.nombre}{l.nota ? ` · ${l.nota}` : ''}</li>)}</ul>
            <button disabled={pendiente} onClick={() => iniciar(async () => { await rondaRevisadaAction(r.id); onHecho(); })} className="mt-2 rounded-full bg-vino px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Pasada ✓</button>
          </div>
        ))}

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-niebla">Camarero de la mesa</span>
          <select value={camarero} disabled={pendiente} onChange={(e) => asignar(e.target.value)} className="mt-1 w-full rounded-xl border border-acero bg-white px-3 py-3 text-sm">
            <option value="">Sin asignar</option>
            {camareros.filter((c) => c.activo || c.id === camarero).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {camareros.length === 0 && <a href="/panel?pestana=equipo" className="mt-1 block text-xs font-semibold text-vino">Da de alta a tu equipo en Servicio → Equipo →</a>}
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          {cuenta && <button onClick={() => onVerCuenta(cuenta.id)} className="rounded-2xl border border-linea py-3.5 text-sm font-bold">Ver cuenta</button>}
          <button onClick={onPedido} className={`rounded-2xl bg-vino py-3.5 text-sm font-bold text-white ${cuenta ? '' : 'col-span-2'}`}>{cuenta ? '+ Añadir' : 'Tomar pedido'}</button>
        </div>
      </div>
    </div>
  );
}
