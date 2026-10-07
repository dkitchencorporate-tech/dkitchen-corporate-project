import React from 'react';
import Link from 'next/link';
import { exigirSocio } from '@/lib/guard-admin';
import SalirSocio from '@/components/socio/SalirSocio';

export const metadata = { title: 'DKitchen · Socio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Central limitado del socio (0052). Acceso aparte y recortado, nunca el
 * panel de mando de Central (regla de acceso de karc0 del 07/10).
 */
export default async function SocioLayout({ children }: { children: React.ReactNode }) {
  await exigirSocio();
  return (
    <div className="min-h-screen bg-crema text-carbon">
      <header className="sticky top-0 z-30 border-b border-linea bg-crema/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/socio" className="text-[15px] font-bold">D<span className="text-vino">Kitchen</span> · Socio</Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/socio" className="rounded-full px-3 py-2 font-medium hover:bg-papel">Mis clientes</Link>
            <Link href="/socio/kit" className="rounded-full px-3 py-2 font-medium hover:bg-papel">Kit de venta</Link>
            <SalirSocio />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:py-10">{children}</main>
    </div>
  );
}
