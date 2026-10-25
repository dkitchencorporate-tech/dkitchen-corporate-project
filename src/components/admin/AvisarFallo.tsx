'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { avisarFalloAction } from '@/app/admin-dkitchen/avisos/actions';

/** Abre el diálogo desde cualquier sitio (menú de la cuenta). */
export const abrirAvisoFallo = () => window.dispatchEvent(new Event('dk:avisar-fallo'));

/**
 * «Avisar de un fallo» en todas las pantallas de Central (0061). 18/10 noche (karc0): sin botón flotante;
 * se abre desde el menú de la cuenta (la «D»), junto al Buzón. Guarda
 * la pantalla exacta (ruta + ancla) para que quien lo arregle vaya directo.
 */
export default function AvisarFallo() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [enviando, iniciar] = useTransition();
  useEffect(() => {
    const abrir = () => { setAbierto(true); setEstado(null); };
    window.addEventListener('dk:avisar-fallo', abrir);
    return () => window.removeEventListener('dk:avisar-fallo', abrir);
  }, []);

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
