'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Medición de la web (08/10/2026, decisión de karc0):
 * - Vercel Web Analytics + Speed Insights: sin cookies ni datos personales, cuentan todas las visitas.
 * - Google Analytics 4: SOLO si el visitante pulsa «Aceptar» en el aviso de cookies
 *   (Consent Mode v2: todo denegado hasta entonces y el script de Google ni se descarga).
 * - Píxel de Meta (13/10/2026): igual que GA4, SOLO tras «Aceptar» y solo si existe NEXT_PUBLIC_META_PIXEL_ID
 *   (el ID del píxel es público; sin él no se carga nada). Eventos: PageView, Lead y Purchase con dkMeta().
 * Fuera de nuestra web: la carta pública de un restaurante (/m/…) es del cliente, y los
 * paneles privados no se miden.
 */
const GA_ID = 'G-132VTP0EY7';
const META_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '').trim();
const SIN_MEDICION = ['/m/', '/admin-dkitchen', '/panel', '/sala', '/socio', '/r/'];
const ZONA_ETIQUETA: Record<string, string> = { HEADER: 'menu', NAV: 'menu', FOOTER: 'pie' };

declare global {
  interface Window { fbq?: (...a: unknown[]) => void; _fbq?: unknown; dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; va?: (...a: unknown[]) => void; vaq?: unknown[]; si?: (...a: unknown[]) => void; siq?: unknown[] }
}

function cargarGa() {
  if (document.getElementById('dk-ga4')) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
  const s = document.createElement('script');
  s.id = 'dk-ga4'; s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

function cargarMeta() {
  if (!/^\d{6,20}$/.test(META_ID) || document.getElementById('dk-meta')) return;
  // Cola estándar de Meta: las llamadas se guardan hasta que carga fbevents.js, que la vacía.
  type Fbq = ((...a: unknown[]) => void) & { queue: unknown[]; loaded: boolean; version: string; push: unknown; callMethod?: (...a: unknown[]) => void };
  const fbq = ((...a: unknown[]) => { if (fbq.callMethod) fbq.callMethod(...a); else fbq.queue.push(a); }) as Fbq;
  fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
  window.fbq = fbq; window._fbq = fbq;
  const s = document.createElement('script');
  s.id = 'dk-meta'; s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  window.fbq('init', META_ID);
  window.fbq('track', 'PageView');
}

/** Evento de Meta (Lead, Purchase…). No hace nada si no hay consentimiento o no hay píxel. */
export function dkMeta(evento: 'Lead' | 'Purchase' | 'InitiateCheckout' | 'CompleteRegistration', datos?: Record<string, unknown>) {
  try { window.fbq?.('track', evento, datos ?? {}); } catch { /* sin píxel */ }
}

export default function AnaliticaWeb() {
  const ruta = usePathname() ?? '/';
  const medir = !SIN_MEDICION.some((p) => ruta.startsWith(p));

  useEffect(() => {
    if (!medir) return;
    const comprobar = () => { try { if (localStorage.getItem('dkitchen_cookie_consent') === 'all') { cargarGa(); cargarMeta(); } } catch { /* sin almacenamiento */ } };
    comprobar();
    window.addEventListener('dk-consentimiento', comprobar);
    return () => window.removeEventListener('dk-consentimiento', comprobar);
  }, [medir]);

  // Navegación interna: PageView en cada cambio de ruta (la primera la manda cargarMeta).
  useEffect(() => { if (medir && document.getElementById('dk-meta')) window.fbq?.('track', 'PageView'); }, [ruta, medir]);

  // Medición propia (E3, 0107), solo con «Aceptar»: tiempo en la página, clics (destino + zona) y si la
  // visita terminó aquí. Se envía al cambiar de página o al cerrarla, sin datos personales.
  useEffect(() => {
    if (!medir) return;
    let consiente = false;
    try { consiente = localStorage.getItem('dkitchen_cookie_consent') === 'all'; } catch { /* sin almacenamiento */ }
    if (!consiente) return;
    const t0 = Date.now();
    let visible = 0, desde = document.visibilityState === 'visible' ? t0 : 0, enviado = false, internoEn = 0;
    const clics: { destino: string; zona: string }[] = [];
    const alClic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || clics.length >= 40) return;
      let u: URL;
      try { u = new URL(a.href, location.href); } catch { return; }
      if (!/^https?:$/.test(u.protocol)) return;
      const interno = u.host === location.host;
      if (interno) internoEn = Date.now();
      const zonaEl = a.closest('[data-zona], section[id], header, nav, footer');
      const zona = zonaEl?.getAttribute('data-zona') || (zonaEl?.tagName === 'SECTION' ? zonaEl.id : zonaEl ? ZONA_ETIQUETA[zonaEl.tagName] ?? '' : 'contenido');
      clics.push({ destino: interno ? (u.pathname.replace(/\/+$/, '') || '/') : `${u.hostname}${u.pathname}`.slice(0, 300), zona: zona.slice(0, 40) });
    };
    const alVer = () => {
      if (document.visibilityState === 'visible') desde = Date.now();
      else if (desde) { visible += Date.now() - desde; desde = 0; }
    };
    const enviar = (salida: boolean) => {
      if (enviado) return;
      enviado = true;
      if (desde) visible += Date.now() - desde;
      const cuerpo = JSON.stringify({ ruta, segundos: Math.round(visible / 1000), salida, clics });
      try { navigator.sendBeacon('/api/medir', new Blob([cuerpo], { type: 'application/json' })); } catch { /* sin envío */ }
    };
    const alSalir = () => enviar(Date.now() - internoEn > 3000);
    document.addEventListener('click', alClic, true);
    document.addEventListener('visibilitychange', alVer);
    window.addEventListener('pagehide', alSalir);
    return () => {
      document.removeEventListener('click', alClic, true);
      document.removeEventListener('visibilitychange', alVer);
      window.removeEventListener('pagehide', alSalir);
      enviar(false); // cambio de página dentro de la web
    };
  }, [ruta, medir]);

  if (!medir) return null;
  return (
    <>
      <Script id="dk-vercel-cola" strategy="afterInteractive">
        {'window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};'}
      </Script>
      <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
      <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
    </>
  );
}
