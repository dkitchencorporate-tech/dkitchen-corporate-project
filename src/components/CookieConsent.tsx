'use client';

import React, { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar si ya se aceptaron las cookies previamente
    const consent = localStorage.getItem('dkitchen_cookie_consent');
    if (!consent) {
      // Pequeño retraso para que no sea lo primero que vea de golpe
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('dkitchen_cookie_consent', 'all');
    setIsVisible(false);
  };

  const rejectNonEssential = () => {
    localStorage.setItem('dkitchen_cookie_consent', 'essential');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  // Compacto (29/09/2026): no tapa la web en el móvil; mismo consentimiento y misma clave.
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[9998] flex justify-center sm:inset-x-6 sm:bottom-6">
      <div role="dialog" aria-label="Cookies" className="pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#17191E]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:p-5">
        <p className="text-[13px] leading-relaxed text-white/70">
          Usamos cookies propias y de Meta para medir la web y mostrarte anuncios útiles. <a href="/privacy" className="text-white underline">Más información</a>
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={rejectNonEssential} className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold hover:border-white/40">Solo esenciales</button>
          <button onClick={acceptAll} className="flex-1 rounded-full bg-[#6E0C2B] px-4 py-2.5 text-sm font-semibold hover:bg-[#4A0819]">Aceptar</button>
        </div>
      </div>
    </div>
  );
}
