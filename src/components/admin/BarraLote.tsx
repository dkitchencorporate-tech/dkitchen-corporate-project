'use client';

import React, { useState } from 'react';

export interface OpcionEstado {
  valor: string;
  etiqueta: string;
}

export interface ComercialOpcion {
  id: string;
  nombre: string;
}

interface Props {
  seleccionados: string[];
  totalVisibles?: number;
  onSeleccionarTodos?: () => void;
  onLimpiar: () => void;
  opcionesEstado?: OpcionEstado[];
  onMoverEstado?: (nuevoEstado: string) => Promise<void>;
  comerciales?: ComercialOpcion[];
  onReasignar?: (comercialId: string) => Promise<void>;
  onArchivar?: () => Promise<void>;
  onDesarchivar?: () => Promise<void>;
  onBorrar?: () => Promise<void>;
  cargando?: boolean;
}

export default function BarraLote({
  seleccionados,
  totalVisibles,
  onSeleccionarTodos,
  onLimpiar,
  opcionesEstado = [],
  onMoverEstado,
  comerciales = [],
  onReasignar,
  onArchivar,
  onDesarchivar,
  onBorrar,
  cargando = false,
}: Props) {
  const [mostrarModalBorrar, setMostrarModalBorrar] = useState(false);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [ejecutando, setEjecutando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const n = seleccionados.length;
  if (n === 0) return null;

  const handleMover = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val || !onMoverEstado) return;
    try {
      setEjecutando(true);
      setErrorAccion(null);
      await onMoverEstado(val);
      e.target.value = '';
    } catch (err: any) {
      setErrorAccion(err.message || 'Error al mover elementos');
    } finally {
      setEjecutando(false);
    }
  };

  const handleReasignar = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val || !onReasignar) return;
    try {
      setEjecutando(true);
      setErrorAccion(null);
      await onReasignar(val);
      e.target.value = '';
    } catch (err: any) {
      setErrorAccion(err.message || 'Error al reasignar elementos');
    } finally {
      setEjecutando(false);
    }
  };

  const handleArchivar = async () => {
    if (!onArchivar) return;
    try {
      setEjecutando(true);
      setErrorAccion(null);
      await onArchivar();
    } catch (err: any) {
      setErrorAccion(err.message || 'Error al archivar');
    } finally {
      setEjecutando(false);
    }
  };

  const handleDesarchivar = async () => {
    if (!onDesarchivar) return;
    try {
      setEjecutando(true);
      setErrorAccion(null);
      await onDesarchivar();
    } catch (err: any) {
      setErrorAccion(err.message || 'Error al restaurar');
    } finally {
      setEjecutando(false);
    }
  };

  const handleConfirmarBorrado = async () => {
    if (confirmacionTexto.trim() !== String(n)) return;
    if (!onBorrar) return;
    try {
      setEjecutando(true);
      setErrorAccion(null);
      await onBorrar();
      setMostrarModalBorrar(false);
      setConfirmacionTexto('');
    } catch (err: any) {
      setErrorAccion(err.message || 'Error al eliminar');
    } finally {
      setEjecutando(false);
    }
  };

  const ocupado = cargando || ejecutando;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-noche/95 px-3 py-3 text-white backdrop-blur shadow-[0_-10px_30px_rgba(0,0,0,0.5)] sm:px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          {/* Izquierda: Contador y Seleccionar todos / Limpiar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-vino px-3 py-1 text-xs font-bold text-white shadow-sm">
              <span className="h-2 w-2 rounded-full bg-oro animate-pulse" />
              {n} {n === 1 ? 'seleccionado' : 'seleccionados'}
            </span>
            {totalVisibles && totalVisibles > n && onSeleccionarTodos && (
              <button
                type="button"
                onClick={onSeleccionarTodos}
                disabled={ocupado}
                className="min-h-[36px] rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/15 transition disabled:opacity-50"
              >
                Seleccionar todos ({totalVisibles})
              </button>
            )}
            <button
              type="button"
              onClick={onLimpiar}
              disabled={ocupado}
              className="min-h-[36px] text-xs text-white/60 hover:text-white underline px-1 transition disabled:opacity-50"
            >
              Desmarcar
            </button>
          </div>

          {/* Error si ocurre */}
          {errorAccion && (
            <p className="w-full text-xs text-red-300 sm:w-auto font-medium">
              ⚠ {errorAccion}
            </p>
          )}

          {/* Derecha: Barra de Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mover a estado/pestaña */}
            {opcionesEstado.length > 0 && onMoverEstado && (
              <div className="relative">
                <select
                  defaultValue=""
                  onChange={handleMover}
                  disabled={ocupado}
                  aria-label="Mover seleccionados a"
                  className="min-h-[40px] rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white focus:border-oro focus:outline-none hover:bg-white/20 transition disabled:opacity-50"
                >
                  <option value="" disabled className="bg-noche text-white">
                    Mover a...
                  </option>
                  {opcionesEstado.map((op) => (
                    <option key={op.valor} value={op.valor} className="bg-noche text-white">
                      {op.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reasignar a comercial (CRM / Prospección) */}
            {comerciales.length > 0 && onReasignar && (
              <div className="relative">
                <select
                  defaultValue=""
                  onChange={handleReasignar}
                  disabled={ocupado}
                  aria-label="Reasignar a comercial"
                  className="min-h-[40px] rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white focus:border-oro focus:outline-none hover:bg-white/20 transition disabled:opacity-50"
                >
                  <option value="" disabled className="bg-noche text-white">
                    Reasignar a...
                  </option>
                  {comerciales.map((c) => (
                    <option key={c.id} value={c.id} className="bg-noche text-white">
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Archivar */}
            {onArchivar && (
              <button
                type="button"
                onClick={handleArchivar}
                disabled={ocupado}
                className="min-h-[40px] rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50"
              >
                📦 Archivar
              </button>
            )}

            {/* Restaurar / Desarchivar */}
            {onDesarchivar && (
              <button
                type="button"
                onClick={handleDesarchivar}
                disabled={ocupado}
                className="min-h-[40px] rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50"
              >
                ↩ Restaurar
              </button>
            )}

            {/* Borrar permanentemente (solo pruebas / demos) */}
            {onBorrar && (
              <button
                type="button"
                onClick={() => setMostrarModalBorrar(true)}
                disabled={ocupado}
                className="min-h-[40px] rounded-xl bg-red-600/80 hover:bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                🗑 Borrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación estricta para borrado */}
      {mostrarModalBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-linea bg-white p-6 text-carbon shadow-2xl">
            <h3 className="font-display text-xl font-bold text-red-600">
              ¿Eliminar {n} {n === 1 ? 'elemento' : 'elementos'} permanentemente?
            </h3>
            <p className="mt-2 text-sm text-grafito leading-relaxed">
              Esta acción borrará definitivamente las pruebas o demos seleccionadas (con sus cartas, códigos QR y registros asociados).
              <strong className="block mt-1 text-carbon">Los clientes con suscripción activa nunca serán eliminados por blindaje.</strong>
            </p>
            <div className="mt-4 rounded-xl bg-papel p-3 text-xs text-niebla">
              Para confirmar, escribe el número <strong className="text-carbon font-mono text-sm">{n}</strong>:
            </div>
            <input
              type="text"
              autoFocus
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              placeholder={`Escribe ${n}`}
              className="mt-3 w-full rounded-xl border border-linea bg-white px-3 py-2 text-center text-base font-bold font-mono focus:border-red-600 focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarModalBorrar(false);
                  setConfirmacionTexto('');
                }}
                disabled={ocupado}
                className="min-h-[44px] rounded-xl border border-linea px-4 py-2 text-xs font-semibold hover:bg-papel transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarBorrado}
                disabled={confirmacionTexto.trim() !== String(n) || ocupado}
                className="min-h-[44px] rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-40"
              >
                {ocupado ? 'Eliminando...' : `Sí, eliminar ${n}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
