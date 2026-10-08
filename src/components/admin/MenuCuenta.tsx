'use client';

import Link from 'next/link';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Icono } from '@/components/panel/Iconos';

export type Cuenta = { nombre: string; email: string };

/** Opciones de la cuenta en Central (0065): administradores, buzón para Claude y cerrar sesión. */
export function OpcionesCuenta({ cuenta, alElegir }: { cuenta: Cuenta; alElegir?: () => void }) {
  const [saliendo, setSaliendo] = useState(false);
  const salir = async () => {
    setSaliendo(true);
    await authClient.signOut().catch(() => {});
    window.location.href = '/panel/iniciar-sesion';
  };
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta font-display text-base font-semibold text-oro">{inicial(cuenta)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{cuenta.nombre}</p>
          <p className="truncate text-xs text-niebla">{cuenta.email}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-1.5">
        <li><Link href="/admin-dkitchen/administradores" onClick={alElegir} className="block rounded-2xl bg-papel px-4 py-3 text-sm font-medium">Administradores</Link></li>
        <li><Link href="/admin-dkitchen/buzon" onClick={alElegir} className="block rounded-2xl bg-papel px-4 py-3 text-sm font-medium">Buzón para Claude</Link></li>
        <li>
          <button onClick={salir} disabled={saliendo} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-vino hover:bg-vino/5 disabled:opacity-50">
            <Icono n="salir" className="h-4 w-4" />{saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </li>
      </ul>
    </div>
  );
}

export const inicial = (c: Cuenta) => (c.nombre || c.email).trim().slice(0, 1).toUpperCase();

/** Botón redondo con la inicial al pie del raíl de escritorio; abre las opciones encima. */
export default function MenuCuenta({ cuenta }: { cuenta: Cuenta }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button onClick={() => setAbierto(true)} aria-haspopup="dialog" aria-expanded={abierto} title={`Tu cuenta (${cuenta.email})`}
        className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[10.5px] font-medium text-white/45 hover:text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] font-display text-sm font-semibold text-oro ring-1 ring-oro/30">{inicial(cuenta)}</span>
        Cuenta
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tu cuenta">
          <button aria-label="Cerrar" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-6 left-[100px] w-80 rounded-[28px] bg-white p-5 text-carbon shadow-2xl">
            <OpcionesCuenta cuenta={cuenta} alElegir={() => setAbierto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
