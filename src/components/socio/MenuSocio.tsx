'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { authClient } from '@/lib/auth-client';

/** Menú de cuenta del socio (0065): buzón para Claude y cerrar sesión. */
export default function MenuSocio({ cuenta }: { cuenta: { nombre: string; email: string } }) {
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const salir = async () => {
    setSaliendo(true);
    await fetch('/socio/salir?cerrar=1', { method: 'GET', credentials: 'same-origin' }).catch(() => {});
    await authClient.signOut().catch(() => {});
    window.location.href = '/panel/iniciar-sesion';
  };
  const ini = (cuenta.nombre || cuenta.email).trim().slice(0, 1).toUpperCase();
  return (
    <>
      <button onClick={() => setAbierto(true)} aria-haspopup="dialog" aria-expanded={abierto} aria-label="Tu cuenta" title={cuenta.email}
        className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tinta font-display text-sm font-semibold text-oro">{ini}</button>
      {abierto && createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tu cuenta">
          <button aria-label="Cerrar" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-3 bottom-3 rounded-[28px] bg-white p-5 text-carbon shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-16 sm:w-80" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
            <p className="truncate text-sm font-semibold">{cuenta.nombre}</p>
            <p className="truncate text-xs text-niebla">{cuenta.email}</p>
            <ul className="mt-4 grid gap-1.5">
              <li><Link href="/socio/buzon" onClick={() => setAbierto(false)} className="block rounded-2xl bg-papel px-4 py-3 text-sm font-medium">Buzón para Claude</Link></li>
              <li><button onClick={salir} disabled={saliendo} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-vino hover:bg-vino/5 disabled:opacity-50">{saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></li>
            </ul>
          </div>
        </div>, document.body
      )}
    </>
  );
}
