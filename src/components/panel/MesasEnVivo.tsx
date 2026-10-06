'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import type { Cuenta, MesasEnVivo as Datos } from '@/lib/comandero';
import {
  mesasEnVivoAction, cuentaDetalleAction, rondaRevisadaAction, cerrarCuentaAction, anularLineaAction, anularCuentaAction,
} from '@/app/panel/actions';

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const haceMin = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

/**
 * Mesas en vivo (comandero, 0045): lo que pasa en sala ahora mismo. Cuentas
 * abiertas con importe y minutos, rondas que hay que pasar a mano (sin TPV o
 * con fallo del TPV), y el detalle de cada mesa, donde SOLO el encargado
 * puede anular líneas (con motivo, sin borrar). Sondeo cada 10 s, sin websockets.
 */
export default function MesasEnVivo() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const r = await mesasEnVivoAction();
    if (r.ok) { setDatos(r.datos); setError(null); } else setError(r.error);
  }, []);
  useEffect(() => { cargar(); const t = setInterval(cargar, 10000); return () => clearInterval(t); }, [cargar]);

  if (error && !datos) return <p className="rounded-2xl border border-linea bg-white p-5 text-sm text-red-600">{error}</p>;
  if (!datos) return <p className="rounded-2xl border border-linea bg-white p-5 text-sm text-niebla">Cargando mesas en vivo…</p>;

  const total = datos.cuentas.reduce((s, k) => s + Number(k.importe), 0);

  return (
    <section className="space-y-4 rounded-2xl border border-linea bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Mesas en vivo</h3>
          <p className="text-sm text-niebla">{datos.cuentas.length} {datos.cuentas.length === 1 ? 'mesa abierta' : 'mesas abiertas'} · {euros(total)} en sala · se actualiza cada 10 s</p>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {datos.rondas_entrantes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-niebla">
            {datos.tpv ? 'Rondas que el TPV no recibió' : 'Rondas para pasar'} ({datos.rondas_entrantes.length})
          </h4>
          {datos.rondas_entrantes.map((r) => (
            <RondaEntrante key={r.id} ronda={r} onHecho={cargar} />
          ))}
        </div>
      )}

      {datos.cuentas.length === 0 ? (
        <p className="rounded-xl bg-papel p-4 text-center text-sm text-niebla">Ninguna mesa abierta ahora mismo. Los camareros abren mesas desde su app.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {datos.cuentas.map((k) => (
            <li key={k.id}>
              <button onClick={() => setAbierta(k.id)} className="w-full rounded-xl border border-linea p-3 text-left hover:border-vino">
                <p className="flex justify-between font-bold"><span>Mesa {k.mesa}</span><span>{euros(k.importe)}</span></p>
                <p className={`text-xs ${k.minutos >= 90 ? 'font-bold text-amber-700' : 'text-niebla'}`}>{k.minutos} min · {k.rondas} {k.rondas === 1 ? 'ronda' : 'rondas'}{k.comensales ? ` · ${k.comensales} pax` : ''}</p>
                {k.abierta_por && <p className="truncate text-xs text-ceniza">{k.abierta_por}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {abierta && <DetalleCuenta id={abierta} onCerrar={() => { setAbierta(null); cargar(); }} />}
    </section>
  );
}

function RondaEntrante({ ronda, onHecho }: { ronda: Datos['rondas_entrantes'][number]; onHecho: () => void }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border-l-4 border-vino bg-crema p-3">
      <div className="min-w-0 text-sm">
        <p className="font-bold">Mesa {ronda.mesa} <span className="font-normal text-niebla">· {ronda.camarero ?? 'camarero'} · hace {haceMin(ronda.creado_en)} min</span></p>
        <ul className="mt-1 text-grafito">
          {ronda.lineas.map((l, i) => <li key={i}>{l.cantidad} × {l.nombre}{l.nota ? <span className="text-niebla"> — {l.nota}</span> : null}</li>)}
        </ul>
        {ronda.estado === 'error_tpv' && <p className="mt-1 text-xs text-red-600">El TPV no la recibió{ronda.detalle_tpv ? `: ${ronda.detalle_tpv}` : ''}</p>}
      </div>
      <button disabled={pendiente} onClick={() => iniciar(async () => { await rondaRevisadaAction(ronda.id); onHecho(); })}
        className="rounded-full bg-vino px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Pasada ✓</button>
    </div>
  );
}

function DetalleCuenta({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [anulando, setAnulando] = useState<string | null>(null); // id de línea o 'cuenta'
  const [motivo, setMotivo] = useState('');
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const cargar = useCallback(async () => {
    const r = await cuentaDetalleAction(id);
    if (r.ok) setCuenta(r.datos); else setAviso({ ok: false, texto: r.error });
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const ejecutar = (fn: () => Promise<{ ok: boolean; error?: string; datos?: unknown }>, ok: string, salir = false) => iniciar(async () => {
    const r = await fn();
    if (!r.ok) { setAviso({ ok: false, texto: r.error ?? 'No se pudo completar.' }); return; }
    if (r.datos === false) { setAviso({ ok: false, texto: 'La mesa ya no está abierta.' }); await cargar(); return; }
    setAviso({ ok: true, texto: ok }); setAnulando(null); setMotivo(''); setConfirmarCierre(false);
    if (salir) onCerrar(); else await cargar();
  });

  const abiertaCuenta = cuenta?.estado === 'abierta';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Detalle de la mesa" onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white text-carbon sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-linea p-4">
          <div>
            <h3 className="text-lg font-bold">Mesa {cuenta?.mesa ?? '…'}</h3>
            {cuenta && <p className="text-sm text-niebla">{euros(cuenta.importe)} · {cuenta.minutos} min{cuenta.comensales ? ` · ${cuenta.comensales} pax` : ''}{cuenta.abierta_por ? ` · abrió ${cuenta.abierta_por}` : ''}</p>}
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-1 text-ceniza">✕</button>
        </div>
        {aviso && <p className={`px-4 pt-3 text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
        <ul className="flex-1 divide-y divide-linea overflow-y-auto px-4">
          {cuenta?.lineas.map((l) => (
            <li key={l.id} className={`py-2.5 text-sm ${l.anulada ? 'text-ceniza' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={l.anulada ? 'line-through' : ''}>{l.cantidad} × {l.nombre}{l.camarero ? <span className="text-xs text-ceniza"> · {l.camarero}</span> : null}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className={`font-semibold ${l.anulada ? 'line-through' : ''}`}>{euros(l.cantidad * Number(l.precio))}</span>
                  {abiertaCuenta && !l.anulada && <button onClick={() => { setAnulando(l.id); setMotivo(''); }} className="text-xs text-red-600">Anular</button>}
                </span>
              </div>
              {l.nota && <p className="text-xs text-niebla">{l.nota}</p>}
              {l.anulada && <p className="text-xs">Anulada: {l.motivo_anulacion}</p>}
              {anulando === l.id && (
                <Motivo motivo={motivo} setMotivo={setMotivo} pendiente={pendiente} onCancelar={() => setAnulando(null)}
                  onConfirmar={() => ejecutar(() => anularLineaAction(l.id, motivo), 'Línea anulada.')} />
              )}
            </li>
          ))}
        </ul>
        {cuenta && (
          <div className="space-y-2 border-t border-linea p-4">
            <p className="text-center text-[11px] text-ceniza">{cuenta.aviso}. El cobro y el ticket se hacen en tu TPV.</p>
            {abiertaCuenta ? (
              <>
                {confirmarCierre ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setConfirmarCierre(false)} className="rounded-full border border-linea-fuerte py-2.5 text-sm font-bold">Cancelar</button>
                    <button disabled={pendiente} onClick={() => ejecutar(() => cerrarCuentaAction(cuenta.id), 'Mesa cerrada.', true)} className="rounded-full bg-green-700 py-2.5 text-sm font-bold text-white">Sí, cobrada en el TPV</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmarCierre(true)} className="w-full rounded-full bg-vino py-2.5 text-sm font-bold text-white">Cerrar mesa (cobrada fuera)</button>
                )}
                {anulando === 'cuenta' ? (
                  <Motivo motivo={motivo} setMotivo={setMotivo} pendiente={pendiente} onCancelar={() => setAnulando(null)}
                    onConfirmar={() => ejecutar(() => anularCuentaAction(cuenta.id, motivo), 'Cuenta anulada.', true)} />
                ) : (
                  <button onClick={() => { setAnulando('cuenta'); setMotivo(''); }} className="w-full text-xs text-red-600">Anular la cuenta entera (abierta por error)</button>
                )}
              </>
            ) : (
              <p className="text-center text-sm text-niebla">Esta cuenta ya está {cuenta.estado}.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Motivo({ motivo, setMotivo, pendiente, onCancelar, onConfirmar }: {
  motivo: string; setMotivo: (v: string) => void; pendiente: boolean; onCancelar: () => void; onConfirmar: () => void;
}) {
  const valido = motivo.trim().length >= 3;
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-crema p-2 sm:flex-row">
      <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 200))} placeholder="Motivo (plato devuelto, error al pedir…)"
        className="min-w-0 flex-1 rounded-lg border border-acero bg-white px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button onClick={onCancelar} className="rounded-lg px-3 py-2 text-sm">Cancelar</button>
        <button disabled={!valido || pendiente} onClick={onConfirmar} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Anular</button>
      </div>
    </div>
  );
}
