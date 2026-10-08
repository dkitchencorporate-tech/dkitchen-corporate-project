'use client';

import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { avisarFalloAction } from '@/app/admin-dkitchen/avisos/actions';

/**
 * Botón «Avisar de un fallo» en todas las pantallas de Central (0061). Guarda
 * la pantalla exacta (ruta + ancla) para que quien lo arregle vaya directo.
 */
export default function AvisarFallo() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  function enviar() {
    setEstado(null);
    iniciar(async () => {
      const pantalla = ruta + (typeof window !== 'undefined' ? window.location.search + window.location.hash : '');
      const r = await avisarFalloAction({ pantalla, mensaje: texto });
      if (r.ok) { setEstado({ ok: true }); setTexto(''); } else setEstado({ error: r.error });
    });
  }

  return (
    <>
      <button onClick={() => { setAbierto(true); setEstado(null); }}
        className="fixed bottom-24 right-4 z-30 rounded-full border border-linea bg-white px-4 py-2 text-xs font-semibold text-vino shadow-[0_8px_24px_rgba(10,8,12,.12)] hover:border-vino md:bottom-5 md:right-5">
        Avisar de un fallo
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Avisar de un fallo">
          <button aria-label="Cerrar" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-3 left-3 right-3 rounded-[28px] bg-white p-5 shadow-2xl md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2">
            <h2 className="font-display text-xl font-semibold">Avisar de un fallo</h2>
            <p className="mt-1 text-sm text-niebla">Se guarda con esta pantalla (<span className="font-mono text-xs">{ruta}</span>) y llega por correo. Cuenta qué intentabas hacer y qué ha pasado.</p>
            {estado?.ok ? (
              <p className="mt-4 rounded-2xl bg-exito/10 p-4 text-sm text-exito">Aviso enviado. Se revisa al empezar la próxima sesión de trabajo.</p>
            ) : (
              <>
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={3000} autoFocus
                  placeholder="Ej.: en la ficha de Casa Brasa, al pulsar «Archivar» no pasa nada."
                  className="mt-4 w-full rounded-xl border border-acero bg-white px-4 py-3 text-[15px] outline-none focus:border-tinta" />
                {estado?.error && <p className="mt-2 text-sm text-red-600">{estado.error}</p>}
              </>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAbierto(false)} className="rounded-full border border-linea px-5 py-2.5 text-sm font-semibold">{estado?.ok ? 'Cerrar' : 'Cancelar'}</button>
              {!estado?.ok && (
                <button onClick={enviar} disabled={enviando || texto.trim().length < 3} className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  {enviando ? 'Enviando…' : 'Enviar aviso'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
