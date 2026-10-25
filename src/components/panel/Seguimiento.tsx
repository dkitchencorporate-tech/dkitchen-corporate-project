'use client';

import { useEffect } from 'react';

/**
 * Seguimiento en vivo de cuentas piloto (0078, 14/10/2026). Manda a /api/seguimiento
 * cada pantalla (con su tiempo), cada clic (texto del botón o enlace, nunca lo escrito
 * en campos), los errores (JavaScript, peticiones fallidas y avisos en rojo) y el
 * dispositivo. Si la cuenta no está en seguimiento, el servidor responde activo=false
 * y deja de enviar al primer lote.
 */
type Ev = { sesion: string; tipo: string; pantalla?: string; objetivo?: string; detalle?: string; ms?: number; t: number };
type Estado = { activo: boolean; cola: Ev[]; sesion: string; pantalla: string; desde: number };
type Ventana = Window & { __dkSeg?: Estado; __dkFetch?: typeof fetch };

export default function Seguimiento({ pestana }: { pestana: string }) {
  useEffect(() => {
    const w = window as Ventana;
    if (w.__dkSeg) return;
    const s: Estado = { activo: true, cola: [], sesion: Math.random().toString(36).slice(2, 10), pantalla: '', desde: Date.now() };
    w.__dkSeg = s;
    const pon = (e: Omit<Ev, 'sesion' | 't'>) => { if (s.activo && s.cola.length < 500) s.cola.push({ ...e, sesion: s.sesion, t: Date.now(), pantalla: e.pantalla ?? s.pantalla }); };
    const original = window.fetch.bind(window);
    w.__dkFetch = original;
    const enviar = (salida = false) => {
      if (!s.activo || s.cola.length === 0) return;
      const cuerpo = JSON.stringify({ eventos: s.cola.splice(0, 60) });
      if (salida && navigator.sendBeacon) { navigator.sendBeacon('/api/seguimiento', new Blob([cuerpo], { type: 'application/json' })); return; }
      original('/api/seguimiento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo, keepalive: true })
        .then((r) => r.json()).then((j) => { if (!j.activo) { s.activo = false; s.cola = []; } }).catch(() => {});
    };
    const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } };
    pon({ tipo: 'inicio', detalle: [
      /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'móvil' : 'escritorio',
      `${window.innerWidth}×${window.innerHeight}`,
      nav.connection?.effectiveType ? `red ${nav.connection.effectiveType}${nav.connection.downlink ? ` ${nav.connection.downlink} Mb/s` : ''}` : '',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.userAgent.slice(0, 160),
    ].filter(Boolean).join(' · ') });

    const texto = (el: Element) => {
      const h = el as HTMLElement;
      const t = (h.getAttribute('aria-label') || h.innerText || h.getAttribute('title') || h.getAttribute('placeholder') || h.getAttribute('name') || '').replace(/\s+/g, ' ').trim();
      return t.slice(0, 120) || h.tagName.toLowerCase();
    };
    const alClic = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest('button,a,[role=button],[role=tab],summary,label,select,input,textarea');
      if (!el) { pon({ tipo: 'clic', objetivo: '(zona sin botón)', detalle: (e.target as HTMLElement | null)?.tagName?.toLowerCase() }); return; }
      const tag = el.tagName.toLowerCase();
      const campo = tag === 'input' || tag === 'textarea' || tag === 'select';
      const tipoCampo = campo ? ((el as HTMLInputElement).type || tag) : '';
      pon({ tipo: 'clic', objetivo: campo ? `campo: ${texto(el)}` : texto(el),
        detalle: [tag + (tipoCampo ? `:${tipoCampo}` : ''), (el as HTMLButtonElement).disabled ? 'DESACTIVADO' : '', tag === 'a' ? (el.getAttribute('href') ?? '').slice(0, 120) : ''].filter(Boolean).join(' · ') });
    };
    const alError = (e: ErrorEvent) => pon({ tipo: 'error', objetivo: 'JavaScript', detalle: `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}` });
    const alRechazo = (e: PromiseRejectionEvent) => pon({ tipo: 'error', objetivo: 'Promesa', detalle: String((e.reason as Error | undefined)?.message ?? e.reason).slice(0, 300) });
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') { pon({ tipo: 'tiempo', objetivo: s.pantalla, ms: Date.now() - s.desde }); pon({ tipo: 'salida', detalle: 'sale o cambia de app' }); enviar(true); }
      else { s.desde = Date.now(); pon({ tipo: 'vista', objetivo: s.pantalla, detalle: 'vuelve' }); }
    };
    // Peticiones fallidas (4xx/5xx) del propio panel.
    window.fetch = async (...a: Parameters<typeof fetch>) => {
      const url = typeof a[0] === 'string' ? a[0] : a[0] instanceof URL ? a[0].href : a[0].url;
      const r = await original(...a).catch((er: Error) => { pon({ tipo: 'error', objetivo: 'Red', detalle: `${url.slice(0, 120)} · ${er.message}` }); throw er; });
      if (r.status >= 400 && !url.includes('/api/seguimiento')) pon({ tipo: 'error', objetivo: `HTTP ${r.status}`, detalle: url.replace(location.origin, '').slice(0, 200) });
      return r;
    };
    // Avisos de error que ve en pantalla (cajas rojas o role=alert).
    const vistos = new WeakSet<Element>();
    const obs = new MutationObserver(() => {
      document.querySelectorAll('[role=alert], [class*="bg-red"], [class*="text-red"]').forEach((el) => {
        const t = (el as HTMLElement).innerText?.trim();
        if (!t || vistos.has(el)) return;
        vistos.add(el); pon({ tipo: 'error', objetivo: 'Aviso en pantalla', detalle: t.slice(0, 300) });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', alClic, true);
    window.addEventListener('error', alError);
    window.addEventListener('unhandledrejection', alRechazo);
    document.addEventListener('visibilitychange', alOcultar);
    const reloj = setInterval(() => enviar(), 5000);
    const cambio = (e: Event) => {
      const nueva = String((e as CustomEvent).detail ?? '');
      if (!nueva || nueva === s.pantalla) return;
      if (s.pantalla) pon({ tipo: 'tiempo', objetivo: s.pantalla, ms: Date.now() - s.desde });
      s.pantalla = nueva; s.desde = Date.now();
      pon({ tipo: 'vista', objetivo: nueva, pantalla: nueva, detalle: location.pathname + location.search });
    };
    window.addEventListener('dk-pantalla', cambio);
    window.dispatchEvent(new CustomEvent('dk-pantalla', { detail: pestana }));
    return () => {
      enviar(true); clearInterval(reloj); obs.disconnect();
      document.removeEventListener('click', alClic, true); window.removeEventListener('error', alError);
      window.removeEventListener('unhandledrejection', alRechazo); document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('dk-pantalla', cambio); window.fetch = original; delete w.__dkSeg; delete w.__dkFetch;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { window.dispatchEvent(new CustomEvent('dk-pantalla', { detail: pestana })); }, [pestana]);
  return null;
}
