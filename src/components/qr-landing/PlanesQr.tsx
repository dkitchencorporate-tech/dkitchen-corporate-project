import ActivarPlanBoton from '@/components/sections/ActivarPlanBoton';

/** Precios de /qr (rediseño 29/09/2026): dos planes, sin tilt ni emojis. */
const BASICO = [
  'Carta digital con fotos, precios y alérgenos',
  'Tú la cambias cuando quieras, desde el móvil',
  'QR que nunca reimprimes',
  'Estadísticas de escaneos',
  'Soporte desde tu panel',
];
const AMPLIADO = [
  'Todo lo del plan Básico',
  'Reservas con aviso por correo',
  'Llamada al camarero y petición de la cuenta desde la mesa',
  'Banners de promociones en la carta',
  'Botón de reseñas de Google',
  'QR individual por mesa',
];

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="mt-1 shrink-0" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export default function PlanesQr() {
  return (
    <section id="planes" className="scroll-mt-24 bg-[#F7F3EA] py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D9531E]">Planes</p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-[#1A1714] md:text-5xl">Empieza por 1 €. Quédate si te sirve.</h2>
          <p className="mt-4 text-lg text-black/55">El primer mes cuesta 1 €. Después pagas tu plan cada mes y cancelas cuando quieras.</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <article className="flex flex-col rounded-[28px] border border-black/10 bg-white p-8 md:p-10">
            <h3 className="text-lg font-semibold text-[#1A1714]">Básico</h3>
            <p className="mt-1 text-sm text-black/50">Tu carta digital, sin complicaciones.</p>
            <p className="mt-8 text-[#1A1714]"><span className="text-6xl font-bold tracking-tight">9 €</span><span className="ml-1 text-black/45">/mes</span></p>
            <ul className="mt-8 flex-1 space-y-3 text-[15px] text-black/70">{BASICO.map((f) => <li key={f} className="flex gap-3"><Check />{f}</li>)}</ul>
            <ActivarPlanBoton plan="basico" etiqueta="Empezar con Básico"
              className="mt-10 w-full rounded-full border border-[#1A1714] py-4 text-[15px] font-semibold text-[#1A1714] transition hover:bg-[#1A1714] hover:text-white" />
          </article>

          <article className="relative flex flex-col overflow-hidden rounded-[28px] bg-[#0F0B08] p-8 text-white md:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(217,83,30,.35),transparent)]" />
            <div className="relative flex items-center justify-between">
              <h3 className="text-lg font-semibold">Ampliado</h3>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E0703F]">El más elegido</span>
            </div>
            <p className="relative mt-1 text-sm text-white/50">Tu carta y tu sala, conectadas.</p>
            <p className="relative mt-8"><span className="text-6xl font-bold tracking-tight">25 €</span><span className="ml-1 text-white/45">/mes</span></p>
            <ul className="relative mt-8 flex-1 space-y-3 text-[15px] text-white/75">{AMPLIADO.map((f) => <li key={f} className="flex gap-3"><Check />{f}</li>)}</ul>
            <ActivarPlanBoton plan="ampliado" etiqueta="Empezar con Ampliado"
              className="relative mt-10 w-full rounded-full bg-[#D9531E] py-4 text-[15px] font-semibold text-white transition hover:bg-[#C2481A]" />
          </article>
        </div>

        <p className="mt-8 text-sm text-black/45">Los QR físicos (pegatina, vinilo, atril o metacrilato) se piden desde tu panel como compra aparte.</p>
      </div>
    </section>
  );
}
