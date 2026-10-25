'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { registrarEventoWeb } from '@/lib/data-source';

function AnalyticsPixelLogic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 0. EXCLUIR DASHBOARD ADMINISTRATIVO
    if (pathname.startsWith('/admin-dkitchen')) return;
    // Ni en la carta pública de un restaurante: no es nuestra web (ver su /legal#cookies).
    if (pathname.startsWith('/m/')) return;

    const trackView = async () => {
      // 1. Gestionar Session ID
      let sessionId = localStorage.getItem('dkitchen_session_id');
      if (!sessionId) {
        sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('dkitchen_session_id', sessionId);
      }

      // 2. Geolocalización: retirada (V-10)
      //
      // Aquí se llamaba a ipapi.co en cada visita. Eso entrega la dirección IP
      // de quien navega —un dato personal— a una empresa ajena, sin haberlo
      // pedido y sin que aparezca en la política de privacidad. A cambio de
      // nada: el resultado no se guardaba en ninguna parte.
      //
      // Cuando haga falta saber el país, lo sabe el propio borde de Vercel a
      // partir de la petición, sin terceros y sin almacenar la IP.

      // 3. Capturar UTMs
      const utm_source = searchParams.get('utm_source');
      const utm_medium = searchParams.get('utm_medium');
      const utm_campaign = searchParams.get('utm_campaign');

      // 4. Determinar Device Type
      const ua = navigator.userAgent;
      let deviceType = 'desktop';
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) deviceType = 'tablet';
      else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) deviceType = 'mobile';

      // 5. Preparar Data
      const payload = {
        session_id: sessionId,
        path: pathname,
        referrer: document.referrer || null,
        utm_source,
        utm_medium,
        utm_campaign,
        device_type: deviceType,
        metadata: {
          user_agent: ua,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
          language: navigator.language,
          timestamp: new Date().toISOString(),
          event: 'page_view'
        }
      };

      // 6. Registro (sin destino mientras no haya base de datos conectada)
      await registrarEventoWeb(payload);
    };

    trackView();
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsPixel() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPixelLogic />
    </Suspense>
  );
}
