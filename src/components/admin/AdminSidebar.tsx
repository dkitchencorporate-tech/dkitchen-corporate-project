'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icono } from '@/components/panel/Iconos';
import MenuCuenta, { OpcionesCuenta, type Cuenta } from '@/components/admin/MenuCuenta';

/**
 * Navegación de Central. 18/10/2026 (decisión de karc0): 6 zonas con submenú en vez de
 * 5 espacios + 15 herramientas sueltas en «Más». Cada zona agrupa lo que se usa junto y
 * se nutre entre sí (p. ej. Ventas: prospección, oportunidades, embudo, campañas,
 * competencia). El raíl enseña las zonas; las pestañas de la zona van arriba (SubmenuZona).
 */
type Item = { nombre: string; href: string };
type Zona = { id: string; nombre: string; icono: string; items: Item[] };
export const ZONAS: Zona[] = [
  { id: 'inicio', nombre: 'Inicio', icono: 'inicio', items: [{ nombre: 'Inicio', href: '/admin-dkitchen/inicio' }] },
  { id: 'clientes', nombre: 'Clientes', icono: 'carta', items: [
    { nombre: 'Clientes', href: '/admin-dkitchen/qr' }, { nombre: 'Proyectos', href: '/admin-dkitchen/proyectos' },
    { nombre: 'Eventos (Experience)', href: '/admin-dkitchen/entradas' }, { nombre: 'Fundador', href: '/admin-dkitchen/fundador' }] },
  { id: 'ventas', nombre: 'Ventas', icono: 'destello', items: [
    { nombre: 'Prospección', href: '/admin-dkitchen/prospeccion' }, { nombre: 'Oportunidades', href: '/admin-dkitchen/oportunidades' },
    { nombre: 'Embudo', href: '/admin-dkitchen/embudo' }, { nombre: 'Campañas y QR', href: '/admin-dkitchen/campanas' }, { nombre: 'Ofertas', href: '/admin-dkitchen/ofertas' },
    { nombre: 'Competencia', href: '/admin-dkitchen/competencia' }, { nombre: 'Socios', href: '/admin-dkitchen/socios' }] },
  { id: 'soporte', nombre: 'Soporte', icono: 'ayuda', items: [
    { nombre: 'Tickets y QR físicos', href: '/admin-dkitchen/soporte' }, { nombre: 'Avisos de fallo', href: '/admin-dkitchen/avisos' },
    { nombre: 'Buzón', href: '/admin-dkitchen/buzon' }] },
  { id: 'lanzamiento', nombre: 'Lanzamiento', icono: 'flecha', items: [
    { nombre: 'Ruta', href: '/admin-dkitchen/ruta' }, { nombre: 'Mapa de la web', href: '/admin-dkitchen/mapa' }, { nombre: 'Mis tareas', href: '/admin-dkitchen/tareas' },
    { nombre: 'Decisiones', href: '/admin-dkitchen/decisiones' }, { nombre: 'Partes diarios', href: '/admin-dkitchen/partes' }, { nombre: 'Planificación', href: '/admin-dkitchen/planificacion' }] },
  { id: 'conocimiento', nombre: 'Conocimiento', icono: 'negocio', items: [
    { nombre: 'Manual de Central', href: '/admin-dkitchen/manual' }, { nombre: 'Documentos', href: '/admin-dkitchen/documentos' },
    { nombre: 'Reportes', href: '/admin-dkitchen/reportes' }, { nombre: 'Equipo', href: '/admin-dkitchen/administradores' }] },
];

/** 18/10 (karc0): avisos con número (lo que te toca a ti) por pestaña, sumados por zona en el raíl. */
export type Avisos = Record<string, number>;
const avisosZona = (z: Zona, av: Avisos) => z.items.reduce((s, i) => s + (av[i.href] ?? 0), 0);
function Aviso({ n, claro }: { n: number; claro?: boolean }) {
  if (!n) return null;
  return <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums leading-none ${claro === undefined ? 'bg-oro text-noche ring-2 ring-noche' : claro ? 'ml-1.5 bg-vino text-white' : 'ml-1.5 bg-oro text-noche'}`}>{n > 99 ? '99+' : n}</span>;
}

const activoEn = (ruta: string, href: string) => ruta === href || ruta.startsWith(href + '/');
export const zonaDe = (ruta: string) => ZONAS.find((z) => z.items.some((i) => activoEn(ruta, i.href))) ?? null;

/** Pestañas de la zona actual, arriba del contenido (solo si la zona tiene más de una). */
export function SubmenuZona({ avisos = {} }: { avisos?: Avisos }) {
  const ruta = usePathname();
  const z = zonaDe(ruta);
  if (!z || z.items.length < 2) return null;
  return (
    <nav aria-label={`Zona ${z.nombre}`} className="sticky top-0 z-30 border-b border-linea bg-crema/90 px-4 py-2.5 backdrop-blur sm:px-6 lg:px-10">
      {/* 19/10 (karc0 en el móvil): las pestañas se cortaban sin aviso → degradado a la derecha y la activa, centrada */}
      <div className="flex items-center gap-1.5 overflow-x-auto pr-6 text-sm [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] md:pr-0 md:[mask-image:none]">
        <span className="mr-1 hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-vino sm:mr-2 sm:inline">{z.nombre}</span>
        {z.items.map((i) => {
          const a = activoEn(ruta, i.href);
          return <Link key={i.href} href={i.href} ref={a ? (n) => { n?.scrollIntoView({ inline: 'center', block: 'nearest' }); } : undefined} aria-current={a ? 'page' : undefined} className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 font-medium sm:px-3.5 ${a ? 'bg-tinta text-white' : 'text-carbon hover:bg-white'}`}>{i.nombre}<Aviso n={avisos[i.href] ?? 0} claro={!a} /></Link>;
        })}
      </div>
    </nav>
  );
}

export default function AdminSidebar({ cuenta, avisos = {} }: { cuenta: Cuenta; avisos?: Avisos }) {
  const [mas, setMas] = useState(false);
  const ruta = usePathname();
  const actual = zonaDe(ruta)?.id;
  const enMovil = ZONAS.filter((z) => z.id !== 'conocimiento');

  return (
    <>
      <aside className="sticky top-0 z-[45] hidden h-screen w-[88px] shrink-0 flex-col items-center bg-noche py-5 text-white md:flex">
        <Link href="/admin-dkitchen/inicio" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] font-display text-lg font-semibold text-oro" title="DKitchen · Central">D</Link>
        <nav aria-label="Central" className="mt-8 flex flex-1 flex-col gap-1.5">
          {ZONAS.map((z) => {
            const a = actual === z.id;
            return (
              <Link key={z.id} href={z.items[0].href} aria-current={a ? 'page' : undefined} title={z.items.map((i) => i.nombre).join(' · ')}
                className={`relative flex w-[72px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10px] font-medium transition-colors ${a ? 'text-white' : 'text-white/45 hover:text-white'}`}>
                {a && <motion.span layoutId="central-rail" className="absolute inset-0 rounded-2xl bg-white/[0.08] ring-1 ring-oro/30" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className={`relative ${a ? 'text-oro' : ''}`}><Icono n={z.icono} /></span>
                {avisosZona(z, avisos) > 0 && <span className="absolute right-1.5 top-1 z-10 leading-none"><Aviso n={avisosZona(z, avisos)} /></span>}
                <span className="relative">{z.nombre}</span>
              </Link>
            );
          })}
        </nav>
        <MenuCuenta cuenta={cuenta} />
      </aside>

      <nav aria-label="Central" className="fixed inset-x-3 bottom-3 z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto flex max-w-md rounded-[26px] bg-noche/95 p-1.5 shadow-[0_16px_40px_rgba(10,8,12,.35)] backdrop-blur-xl">
          {enMovil.map((z) => {
            const a = actual === z.id;
            return (
              <li key={z.id} className="flex-1">
                <Link href={z.items[0].href} aria-current={a ? 'page' : undefined} className={`relative flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10px] font-medium ${a ? 'text-white' : 'text-white/50'}`}>
                  {a && <motion.span layoutId="central-barra" className="absolute inset-0 rounded-[20px] bg-white/[0.1]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={`relative ${a ? 'text-oro' : ''}`}><Icono n={z.icono} /></span>
                {avisosZona(z, avisos) > 0 && <span className="absolute right-1.5 top-1 z-10 leading-none"><Aviso n={avisosZona(z, avisos)} /></span>}
                  <span className="relative">{z.nombre}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button onClick={() => setMas(true)} className={`flex w-full flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10px] font-medium ${actual === 'conocimiento' ? 'text-white' : 'text-white/50'}`}><span className="text-lg leading-5">···</span>Más</button>
          </li>
        </ul>
      </nav>

      {mas && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Más">
          <button aria-label="Cerrar" onClick={() => setMas(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-3 left-3 right-3 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
            <p className="text-xs text-niebla">Tu cuenta</p>
            <div className="mt-3"><OpcionesCuenta cuenta={cuenta} alElegir={() => setMas(false)} /></div>
            <hr className="my-4 border-linea" />
            <p className="text-xs text-niebla">Conocimiento</p>
            <ul className="mt-3 grid gap-1.5">
              {ZONAS.find((z) => z.id === 'conocimiento')!.items.map((m) => (
                <li key={m.href}><Link href={m.href} onClick={() => setMas(false)} className={`block rounded-2xl px-4 py-3 text-sm font-medium ${activoEn(ruta, m.href) ? 'bg-tinta text-white' : 'bg-papel text-carbon'}`}>{m.nombre}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
