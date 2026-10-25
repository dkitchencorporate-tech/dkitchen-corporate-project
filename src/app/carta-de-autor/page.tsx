import type { Metadata } from 'next';
import Image from 'next/image';
import ActivarPlanBoton from '@/components/sections/ActivarPlanBoton';
import QueMeLlamen from '@/components/carta-de-autor/QueMeLlamen';
import { QR_MENU } from '@/lib/pricing-config';

/**
 * Página de una pantalla para los anuncios de Meta (13/10/2026, decisión de karc0):
 * dolor → promesa → 3 pruebas → precio con garantía → pagar 1 € o «Que me llamen».
 * Sin menú ni distracciones; noindex (es la página de aterrizaje de la campaña).
 */
const L = QR_MENU.planes.ampliado;

export const metadata: Metadata = {
  title: `Tu carta de autor, montada por nosotros · ${QR_MENU.primerMes} € el primer mes`,
  description: `Carta digital QR de autor para tu bar o restaurante. Nos mandas una foto de tu carta y te la dejamos funcionando. ${QR_MENU.primerMes} € + IVA el primer mes y garantía de 30 días.`,
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://dkitchencorporate.es/carta-de-autor' },
};

const PRUEBAS: [string, string][] = [
  ['Cambias un precio en el móvil', 'y ya está en todas las mesas. Sin reimprimir.'],
  ['Fotos y alérgenos en cada plato', 'Lo que se ve, se pide.'],
  ['La mesa avisa al camarero', 'Suena en su móvil y sabe a cuál ir.'],
];

export default async function CartaDeAutor({ searchParams }: { searchParams: Promise<{ utm_source?: string }> }) {
  const sp = await searchParams;
  const origen = String(sp.utm_source ?? 'anuncio').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'anuncio';
  return (
    <main className="relative isolate min-h-[100svh] overflow-hidden bg-noche text-white">
      <Image src="/images/carta-de-autor/barra-movil.png" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-[50%_38%] opacity-80 lg:object-[50%_45%]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,8,7,.82)_0%,rgba(11,8,7,.25)_32%,rgba(11,8,7,.55)_55%,rgba(11,8,7,.96)_78%,#0B0807_100%)] lg:bg-[linear-gradient(90deg,rgba(11,8,7,.97)_0%,rgba(11,8,7,.9)_45%,rgba(11,8,7,.2)_100%)]" />

      <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-between px-4 pb-32 pt-5 sm:px-6 lg:justify-center lg:pb-12 lg:gap-10 lg:py-12">
        <header className="flex items-center justify-between">
          <span className="font-display text-2xl font-semibold">DKitchen<span className="text-oro">.</span></span>
        </header>

        <section className="mt-[20svh] max-w-xl lg:mt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-oro">Carta digital QR · plan {L.nombre}</p>
          <h1 className="font-display mt-2 text-[2.05rem] font-semibold leading-[0.98] tracking-tight sm:text-6xl">
            Mándanos una foto de tu carta. <span className="text-oro">Te la dejamos funcionando.</span>
          </h1>
          <ul className="mt-4 space-y-1.5 sm:space-y-2.5">
            {PRUEBAS.map(([t, s]) => (
              <li key={t} className="flex gap-2.5 text-[13.5px] leading-snug sm:text-[15px] text-white/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-oro text-[11px] font-bold text-noche">✓</span>
                <span><strong className="text-white">{t}</strong> {s}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            <p className="shrink-0 whitespace-nowrap font-display text-5xl font-semibold leading-none text-oro sm:text-6xl">{QR_MENU.primerMes} €</p>
            <p className="text-[13px] leading-snug text-white/80 sm:text-sm"><strong className="text-white">+ IVA el primer mes</strong><br />después {L.mensual} € + IVA/mes · sin permanencia</p>
          </div>
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[13px] sm:text-sm text-white/85 backdrop-blur">
            <strong className="text-oro">Garantía de 30 días:</strong> si no te convence, te devolvemos el euro y te llevas tu carta en PDF.
          </p>

          <div data-barra-inferior="on" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/10 bg-noche/90 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:mt-6 lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <ActivarPlanBoton plan="ampliado" etiqueta={`Empezar por ${QR_MENU.primerMes} €`}
              className="w-full rounded-full bg-oro px-3 py-3.5 text-[15px] font-bold lg:px-6 lg:py-4 lg:text-base text-noche shadow-[0_12px_40px_rgba(242,193,78,.35)] transition hover:brightness-105" />
            <QueMeLlamen origen={origen} />
          </div>
          <p className="mt-3 text-xs text-white/55">
            <a href="/demo/carta?plantilla=tapas&muestra=local" className="underline decoration-oro/60 underline-offset-4 hover:text-white">Ver una carta de ejemplo</a>
            {' · '}<a href="/terms" className="hover:text-white">Condiciones</a>{' · '}<a href="/privacy" className="hover:text-white">Privacidad</a>
          </p>
        </section>
      </div>
    </main>
  );
}
