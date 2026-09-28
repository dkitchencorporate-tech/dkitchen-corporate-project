'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navegación de Central (rediseño 29/09/2026, paleta «Grafito y papel»):
 * barra lateral grafito en escritorio; en móvil, barra superior con menú lateral.
 */
const GRUPOS: { titulo: string; items: { nombre: string; href: string }[] }[] = [
  { titulo: 'QR Menú', items: [
    { nombre: 'Clientes', href: '/admin-dkitchen/qr' },
    { nombre: 'Soporte y QR físico', href: '/admin-dkitchen/soporte' },
  ] },
  { titulo: 'Ventas', items: [
    { nombre: 'Embudo de pago', href: '/admin-dkitchen/embudo' },
  ] },
  { titulo: 'Otras herramientas', items: [
    { nombre: 'Resumen general', href: '/admin-dkitchen/overview' },
    { nombre: 'Directorio de clientes', href: '/admin-dkitchen/clients' },
    { nombre: 'Eventos', href: '/admin-dkitchen/events-master' },
    { nombre: 'Proyectos', href: '/admin-dkitchen/pipeline' },
    { nombre: 'Manuales', href: '/manuals' },
  ] },
];

export default function AdminSidebar() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const activo = (href: string) => ruta === href || (href !== '/admin-dkitchen/qr' && ruta.startsWith(href)) || (href === '/admin-dkitchen/qr' && ruta.startsWith('/admin-dkitchen/qr'));

  const Menu = () => (
    <nav aria-label="Central" className="space-y-7">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">{g.titulo}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} onClick={() => setAbierto(false)} aria-current={activo(i.href) ? 'page' : undefined}
                  className={`block rounded-xl px-3 py-2 text-[15px] transition-colors ${activo(i.href) ? 'bg-white/10 font-semibold text-white' : 'text-white/60 hover:text-white'}`}>
                  {i.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const Marca = () => (
    <div>
      <p className="text-[17px] font-semibold tracking-tight text-white">D<span className="text-[#D9B25C]">Kitchen</span></p>
      <p className="mt-0.5 text-xs text-white/40">Central</p>
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-[#17191E] px-4 md:hidden">
        <Marca />
        <button onClick={() => setAbierto(true)} aria-expanded={abierto} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white">Menú</button>
      </header>
      <div className="h-14 md:hidden" aria-hidden="true" />

      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú de Central">
          <button aria-label="Cerrar menú" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col bg-[#17191E] px-3 py-5">
            <div className="mb-8 flex items-center justify-between px-3"><Marca /><button onClick={() => setAbierto(false)} className="text-sm text-white/50">Cerrar</button></div>
            <Menu />
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#17191E] px-3 py-7 md:flex">
        <div className="mb-10 px-3"><Marca /></div>
        <div className="flex-1 overflow-y-auto"><Menu /></div>
      </aside>
    </>
  );
}
