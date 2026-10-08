'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Medición de la web (08/10/2026, decisión de karc0):
 * - Vercel Web Analytics + Speed Insights: sin cookies ni datos personales, cuentan todas las visitas.
 * - Google Analytics 4: SOLO si el visitante pulsa «Aceptar» en el aviso de cookies
 *   (Consent Mode v2: todo denegado hasta entonces y el script de Google ni se descarga).
 * Fuera de nuestra web: la carta pública de un restaurante (/m/…) es del cliente, y los
 * paneles privados no se miden.
 */
const GA_ID = 'G-132VTP0EY7';
const SIN_MEDICION = ['/m/', '/admin-dkitchen', '/panel', '/sala', '/socio', '/r/'];

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; va?: (...a: unknown[]) => void; vaq?: unknown[]; si?: (...a: unknown[]) => void; siq?: unknown[] }
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

export default function AnaliticaWeb() {
  const ruta = usePathname() ?? '/';
  const medir = !SIN_MEDICION.some((p) => ruta.startsWith(p));

  useEffect(() => {
    if (!medir) return;
    const comprobar = () => { try { if (localStorage.getItem('dkitchen_cookie_consent') === 'all') cargarGa(); } catch { /* sin almacenamiento */ } };
    comprobar();
    window.addEventListener('dk-consentimiento', comprobar);
    return () => window.removeEventListener('dk-consentimiento', comprobar);
  }, [medir]);

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
