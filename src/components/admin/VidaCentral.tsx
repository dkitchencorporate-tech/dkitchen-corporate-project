'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Central viva (31/10/2026): entrada escalonada de tarjetas, cifras que cuentan,
 * aparición al hacer scroll y barra de carga entre pantallas. Solo lee el DOM de
 * [data-cv-main]; no cambia datos ni estructura. Estilos en central-viva.css.
 */
const TARJETAS = ':is(.rounded-2xl, .rounded-3xl, [class*="rounded-[2"]):is(.border, .bg-white, [class*="bg-tinta"], [class*="bg-noche"]), h1, table tbody tr';
const NUMERO = /^\d{1,3}(?:\.\d{3})+$|^\d+$/;

function sinMovimiento() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function contar(el: HTMLElement) {
  const nodo = el.firstChild;
  if (!nodo || nodo.nodeType !== Node.TEXT_NODE) return;
  const texto = (nodo.nodeValue ?? '').trim();
  if (!NUMERO.test(texto)) return;
  const final = Number(texto.replace(/\./g, ''));
  if (!Number.isFinite(final) || final === 0 || final > 10_000_000) return;
  const conPuntos = texto.includes('.');
  const fmt = (n: number) => (conPuntos ? n.toLocaleString('es-ES') : String(n));
  el.classList.add('cv-cifra');
  const dur = Math.min(1100, 500 + final * 12);
  const t0 = performance.now();
  let escrito = fmt(0);
  const paso = (t: number) => {
    // Si React cambió el valor mientras contábamos, se respeta el suyo.
    if (el.firstChild !== nodo || nodo.nodeValue !== escrito) return;
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    escrito = fmt(Math.round(final * e));
    nodo.nodeValue = escrito;
    if (p < 1) requestAnimationFrame(paso);
    else { nodo.nodeValue = texto; el.classList.add('cv-cifra-lista'); }
  };
  nodo.nodeValue = escrito;
  requestAnimationFrame(paso);
}

function animarPantalla(raiz: HTMLElement) {
  if (sinMovimiento()) return () => {};
  const vistos = new Set<Element>();
  const todos = Array.from(raiz.querySelectorAll<HTMLElement>(TARJETAS)).filter((el) => {
    // Solo el nivel exterior: una tarjeta dentro de otra ya entra con su madre.
    const madre = el.parentElement?.closest(TARJETAS);
    return !madre || !raiz.contains(madre);
  });
  let i = 0;
  const entrar = (el: HTMLElement) => {
    if (vistos.has(el)) return;
    vistos.add(el);
    el.classList.remove('cv-oculto');
    el.style.setProperty('--cv-i', String(Math.min(i++, 14)));
    el.classList.add('cv-entra');
    el.addEventListener('animationend', () => { el.classList.remove('cv-entra'); el.style.removeProperty('--cv-i'); }, { once: true });
  };
  const alto = window.innerHeight;
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => { if (en.isIntersecting) { entrar(en.target as HTMLElement); observador.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  todos.slice(0, 120).forEach((el) => {
    if (el.getBoundingClientRect().top < alto) entrar(el);
    else { el.classList.add('cv-oculto'); observador.observe(el); }
  });
  // Cifras grandes (indicadores): cuentan desde 0.
  raiz.querySelectorAll<HTMLElement>('p, span, div, strong, dd').forEach((el) => {
    if (el.childNodes.length !== 1) return;
    const tam = parseFloat(getComputedStyle(el).fontSize);
    if (tam >= 22) contar(el);
  });
  return () => {
    observador.disconnect();
    todos.forEach((el) => el.classList.remove('cv-oculto'));
  };
}

export default function VidaCentral() {
  const ruta = usePathname();
  const [estado, setEstado] = useState<'quieto' | 'carga' | 'fin'>('quieto');
  const primera = useRef(true);

  // Pantalla nueva: entrada, cifras y cierre de la barra de carga.
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>('[data-cv-main]');
    if (!raiz) return;
    let limpiar = () => {};
    let hecho = false;
    // Con loading.tsx llega primero el esqueleto: se anima cuando ya está el contenido real.
    const intentar = () => {
      if (hecho || raiz.querySelector('[aria-busy="true"]')) return;
      hecho = true; vigia.disconnect(); limpiar = animarPantalla(raiz);
    };
    const vigia = new MutationObserver(() => intentar());
    vigia.observe(raiz, { childList: true, subtree: true });
    const id = requestAnimationFrame(intentar);
    if (!primera.current) setEstado('fin');
    primera.current = false;
    const t = window.setTimeout(() => setEstado('quieto'), 500);
    return () => { cancelAnimationFrame(id); vigia.disconnect(); window.clearTimeout(t); limpiar(); };
  }, [ruta]);

  // Clic en un enlace interno de Central: arranca la barra.
  useEffect(() => {
    const alPulsar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/admin-dkitchen')) return;
      if (url.pathname === location.pathname) return;
      setEstado('carga');
    };
    document.addEventListener('click', alPulsar, true);
    return () => document.removeEventListener('click', alPulsar, true);
  }, []);

  if (estado === 'quieto') return null;
  return <div className="cv-barra" data-estado={estado} aria-hidden="true" />;
}
