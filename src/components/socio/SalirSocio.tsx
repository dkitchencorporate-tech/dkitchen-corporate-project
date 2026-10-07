'use client';

import { authClient } from '@/lib/auth-client';

export default function SalirSocio() {
  const salir = async () => {
    await fetch('/socio/salir?cerrar=1', { method: 'GET', credentials: 'same-origin' }).catch(() => {});
    await authClient.signOut();
    window.location.href = '/panel/iniciar-sesion';
  };
  return <button type="button" onClick={salir} className="rounded-full px-3 py-2 font-medium text-vino hover:bg-papel">Salir</button>;
}
