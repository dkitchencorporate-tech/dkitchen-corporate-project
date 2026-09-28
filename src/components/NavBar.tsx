'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Menú flotante de la web (rediseño 29/09/2026, paleta Grafito y papel):
 * píldora grafito con desenfoque que se compacta al bajar, indicador de
 * sección que se desliza y CTA siempre visible. En móvil, menú a pantalla
 * completa con entrada escalonada.
 */
const ENLACES = [
  { href: '/qr', etiqueta: 'Carta QR' },
  { href: '/base-operativa', etiqueta: 'Signature' },
  { href: '/experience', etiqueta: 'Experience' },
  { href: '/dark-kitchen', etiqueta: 'Dark Kitchen' },
  { href: '/casos-de-exito', etiqueta: 'Casos' },
  { href: '/blog', etiqueta: 'Blog' },
] as const;

export default function NavBar() {
  const [abierto, setAbierto] = useState(false);
  const [compacto, setCompacto] = useState(false);
  const ruta = usePathname();

  useEffect(() => {
    const alBajar = () => setCompacto(window.scrollY > 40);
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => window.removeEventListener('scroll', alBajar);
  }, []);
  useEffect(() => { document.body.style.overflow = abierto ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [abierto]);

  const activo = (h: string) => ruta === h || ruta.startsWith(h + '/');

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-[100] flex justify-center px-3 transition-all duration-500 ${compacto ? 'pt-3' : 'pt-5'}`}>
        <nav aria-label="Principal"
          className={`flex w-full items-center justify-between gap-4 rounded-full border border-white/10 bg-[#17191E]/80 text-white shadow-[0_10px_40px_rgba(23,25,30,.25)] backdrop-blur-xl transition-all duration-500 ${compacto ? 'max-w-4xl py-2 pl-5 pr-2' : 'max-w-6xl py-3 pl-6 pr-3'}`}>
          <Link href="/" className="font-display shrink-0 text-xl font-bold" aria-label="DKitchen, inicio">
            D<span className="text-[#E8592A]">Kitchen</span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <Link href={e.href} aria-current={activo(e.href) ? 'page' : undefined}
                  className={`relative block rounded-full px-4 py-2 text-sm transition-colors ${activo(e.href) ? 'text-[#17191E]' : 'text-white/70 hover:text-white'}`}>
                  {activo(e.href) && <motion.span layoutId="nav-web" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <span className="relative">{e.etiqueta}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link href="/panel/iniciar-sesion" className="hidden rounded-full px-4 py-2 text-sm text-white/70 hover:text-white sm:block">Entrar</Link>
            <Link href="/qr#planes" className="rounded-full bg-[#E8592A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#CF4A1F]">Empieza por 1 €</Link>
            <button onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto} className="rounded-full p-2.5 text-white lg:hidden">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h16M4 16h16" /></svg>
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {abierto && (
          <motion.div className="fixed inset-0 z-[110] flex flex-col bg-[#17191E] px-6 pb-10 pt-6 text-white lg:hidden" role="dialog" aria-modal="true" aria-label="Menú"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-bold">D<span className="text-[#E8592A]">Kitchen</span></span>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="rounded-full p-2.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <ul className="mt-14 space-y-2">
              {ENLACES.map((e, i) => (
                <motion.li key={e.href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
                  <Link href={e.href} onClick={() => setAbierto(false)} className={`font-display block py-2 text-4xl font-semibold ${activo(e.href) ? 'text-[#E8592A]' : ''}`}>{e.etiqueta}</Link>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto space-y-3">
              <Link href="/qr#planes" onClick={() => setAbierto(false)} className="block rounded-full bg-[#E8592A] py-4 text-center font-semibold">Empieza por 1 €</Link>
              <Link href="/panel/iniciar-sesion" onClick={() => setAbierto(false)} className="block rounded-full border border-white/15 py-4 text-center font-semibold">Entrar en mi panel</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
