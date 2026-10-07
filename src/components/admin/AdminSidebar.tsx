'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icono } from '@/components/panel/Iconos';

/**
 * Navegación de Central (29/09/2026): mismo modelo que el panel del cliente.
 * Raíl de iconos en escritorio y barra flotante en móvil con los espacios
 * principales; las herramientas antiguas quedan en «Más».
 */
const ESPACIOS = [
  { nombre: 'Inicio', href: '/admin-dkitchen/inicio', icono: 'inicio' },
  { nombre: 'Clientes', href: '/admin-dkitchen/qr', icono: 'carta' },
  { nombre: 'Soporte', href: '/admin-dkitchen/soporte', icono: 'ayuda' },
  { nombre: 'Embudo', href: '/admin-dkitchen/embudo', icono: 'negocio' },
];
const MAS = [
  { nombre: 'Partes diarios', href: '/admin-dkitchen/partes' },
  { nombre: 'Fundador', href: '/admin-dkitchen/fundador' },
  { nombre: 'Socios', href: '/admin-dkitchen/socios' },
  { nombre: 'Resumen general', href: '/admin-dkitchen/overview' },
  { nombre: 'Directorio de clientes', href: '/admin-dkitchen/clients' },
  { nombre: 'Eventos', href: '/admin-dkitchen/events-master' },
  { nombre: 'Proyectos', href: '/admin-dkitchen/pipeline' },
  { nombre: 'Manuales', href: '/manuals' },
];

export default function AdminSidebar() {
  const [mas, setMas] = useState(false);
  const ruta = usePathname();
  const activo = (href: string) => ruta === href || ruta.startsWith(href + '/');
  const enMas = MAS.some((m) => activo(m.href));

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col items-center bg-noche py-5 text-white md:flex">
        <Link href="/admin-dkitchen/inicio" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] font-display text-lg font-semibold text-oro" title="DKitchen · Central">D</Link>
        <nav aria-label="Central" className="mt-8 flex flex-1 flex-col gap-1.5">
          {ESPACIOS.map((e) => {
            const a = activo(e.href);
            return (
              <Link key={e.href} href={e.href} aria-current={a ? 'page' : undefined}
                className={`relative flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10.5px] font-medium transition-colors ${a ? 'text-white' : 'text-white/45 hover:text-white'}`}>
                {a && <motion.span layoutId="central-rail" className="absolute inset-0 rounded-2xl bg-white/[0.08] ring-1 ring-oro/30" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className={`relative ${a ? 'text-oro' : ''}`}><Icono n={e.icono} /></span>
                <span className="relative">{e.nombre}</span>
              </Link>
            );
          })}
          <button onClick={() => setMas(true)} className={`relative flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10.5px] font-medium ${enMas ? 'text-white' : 'text-white/45 hover:text-white'}`}>
            <span className="text-lg leading-5">···</span>Más
          </button>
        </nav>
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">Central</p>
      </aside>

      <nav aria-label="Central" className="fixed inset-x-3 bottom-3 z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto flex max-w-md rounded-[26px] bg-noche/95 p-1.5 shadow-[0_16px_40px_rgba(10,8,12,.35)] backdrop-blur-xl">
          {ESPACIOS.map((e) => {
            const a = activo(e.href);
            return (
              <li key={e.href} className="flex-1">
                <Link href={e.href} aria-current={a ? 'page' : undefined} className={`relative flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10.5px] font-medium ${a ? 'text-white' : 'text-white/50'}`}>
                  {a && <motion.span layoutId="central-barra" className="absolute inset-0 rounded-[20px] bg-white/[0.1]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={`relative ${a ? 'text-oro' : ''}`}><Icono n={e.icono} /></span>
                  <span className="relative">{e.nombre}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button onClick={() => setMas(true)} className="flex w-full flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10.5px] font-medium text-white/50"><span className="text-lg leading-5">···</span>Más</button>
          </li>
        </ul>
      </nav>

      {mas && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Más herramientas">
          <button aria-label="Cerrar" onClick={() => setMas(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-3 left-3 right-3 rounded-[28px] bg-white p-5 shadow-2xl md:bottom-6 md:left-[100px] md:right-auto md:w-80">
            <p className="text-xs text-niebla">Otras herramientas</p>
            <ul className="mt-3 grid gap-1.5">
              {MAS.map((m) => (
                <li key={m.href}><Link href={m.href} onClick={() => setMas(false)} className={`block rounded-2xl px-4 py-3 text-sm font-medium ${activo(m.href) ? 'bg-tinta text-white' : 'bg-papel text-carbon'}`}>{m.nombre}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
