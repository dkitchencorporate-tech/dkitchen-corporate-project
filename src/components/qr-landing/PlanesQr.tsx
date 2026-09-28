import ActivarPlanBoton from '@/components/sections/ActivarPlanBoton';
import { TextoRevelado } from '@/components/dk/Movimiento';

/**
 * Precios de /qr (rediseño 29/09/2026): Ampliado más grande, elevado y con la
 * etiqueta destacada; gancho de 1 € y garantías reales debajo.
 */
const BASICO = ['Carta digital con fotos, precios y alérgenos', 'La cambias cuando quieras, desde el móvil', 'Cuatro estilos, fondos y colores', 'QR que nunca reimprimes', 'Estadísticas de escaneos'];
const AMPLIADO = ['Todo lo del plan Básico', 'Reservas con aviso al momento', 'Llamada al camarero y petición de la cuenta', 'Banners de promociones en la carta', 'Botón de reseñas de Google', 'QR individual por mesa', 'Base para los módulos de sala'];
const GARANTIAS = ['Primer mes por 1 €', 'Sin permanencia', 'Cancelas desde tu panel', 'Alérgenos según el Reglamento UE', 'Soporte en español'];

const Check = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`mt-0.5 shrink-0 ${className}`} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export default function PlanesQr() {
  return (
    <section id="planes" className="scroll-mt-24 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">Precios</p>
          <TextoRevelado texto="Empieza por 1 €. Quédate si te sirve." className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl" />
          <p className="mt-5 text-lg text-[#6B7079]">Menos de lo que cuesta reimprimir una carta. Y la cambias todas las veces que quieras.</p>
        </div>

        <div className="mt-16 grid items-center gap-6 lg:grid-cols-[1fr_1.15fr]">
          <article className="flex flex-col rounded-[32px] border border-[#E6E6E2] bg-[#F7F7F5] p-8 md:p-10">
            <h3 className="text-lg font-semibold text-[#17191E]">Básico</h3>
            <p className="mt-1 text-sm text-[#6B7079]">Tu carta digital, sin complicaciones.</p>
            <p className="mt-8 text-[#17191E]"><span className="font-display text-6xl font-semibold">9 €</span><span className="ml-1 text-[#6B7079]">/mes</span></p>
            <p className="mt-1 text-sm text-[#6B7079]">Primer mes: 1 €</p>
            <ul className="mt-8 flex-1 space-y-3 text-[15px] text-[#3F434B]">{BASICO.map((f) => <li key={f} className="flex gap-3"><Check />{f}</li>)}</ul>
            <ActivarPlanBoton plan="basico" etiqueta="Empezar con Básico"
              className="mt-10 w-full rounded-full border border-[#17191E] py-4 text-[15px] font-semibold text-[#17191E] transition hover:bg-[#17191E] hover:text-white" />
          </article>

          <article className="relative flex flex-col overflow-hidden rounded-[36px] bg-[#17191E] p-8 text-white shadow-[0_40px_100px_rgba(23,25,30,.35)] md:p-12 lg:-my-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(232,89,42,.4),transparent)]" />
            <div className="relative -mx-8 -mt-8 mb-8 bg-[#E8592A] px-8 py-3 text-center text-sm font-bold uppercase tracking-[0.2em] md:-mx-12 md:-mt-12">El más elegido</div>
            <h3 className="relative text-xl font-semibold">Ampliado</h3>
            <p className="relative mt-1 text-sm text-white/55">Tu carta y tu sala, conectadas.</p>
            <p className="relative mt-8"><span className="font-display text-7xl font-semibold">25 €</span><span className="ml-1 text-white/50">/mes</span></p>
            <p className="relative mt-1 text-sm text-white/55">Primer mes: 1 €</p>
            <ul className="relative mt-8 grid flex-1 gap-3 text-[15px] text-white/80 sm:grid-cols-2">{AMPLIADO.map((f) => <li key={f} className="flex gap-3"><Check className="text-[#E8592A]" />{f}</li>)}</ul>
            <ActivarPlanBoton plan="ampliado" etiqueta="Empezar con Ampliado por 1 €"
              className="relative mt-10 w-full rounded-full bg-[#E8592A] py-5 text-base font-semibold text-white transition hover:bg-[#CF4A1F]" />
          </article>
        </div>

        <ul className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-[#3F434B]">
          {GARANTIAS.map((g) => <li key={g} className="flex items-center gap-2"><Check className="text-[#2F8F6B]" />{g}</li>)}
        </ul>
        <p className="mt-6 text-center text-sm text-[#9A9EA6]">¿Quieres una carta diseñada a mano por nuestro equipo? La Carta de Autor se añade desde tu panel.</p>
      </div>
    </section>
  );
}
