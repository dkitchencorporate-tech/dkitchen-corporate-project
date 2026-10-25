import Image from 'next/image';
import Link from 'next/link';
import ActivarPlanBoton from '@/components/sections/ActivarPlanBoton';
import { estadoFundador } from '@/lib/fundador';
import { FUNDADOR, QR_MENU } from '@/lib/pricing-config';

/**
 * Tarjeta de venta de Fundador (18/10/2026, revisión de karc0: «ahora nos interesa
 * promover Fundador: los primeros pagan el trimestre»). Va en la portada (bajo la carta
 * QR), en /qr y en /precios. Solo se pinta si el programa está abierto (dk.fundador_estado).
 * Foto de la web (sin coste de IA) y alta directa con el modal de condiciones.
 */
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';

export default async function TarjetaFundador({ className = '' }: { className?: string }) {
  const e = await estadoFundador();
  if (!e?.abierto) return null;
  const sala = QR_MENU.planes.sala;
  const pct = Math.round((1 - FUNDADOR.mensual / sala.mensual) * 100);
  return (
    <section id="fundador" className={`scroll-mt-20 ${className}`}>
      <div className="relative grid overflow-hidden rounded-[32px] bg-noche text-white shadow-[0_40px_100px_-40px_rgba(23,25,30,.7)] md:grid-cols-[1.1fr_1fr]">
        <div className="relative z-10 p-8 md:p-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-oro px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-noche">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vino" /> Oferta de lanzamiento · plazas limitadas
          </p>
          <h2 className="font-display mt-5 text-5xl font-semibold leading-[0.95] md:text-7xl">Fundador</h2>
          <p className="font-display mt-4 text-2xl font-semibold leading-tight md:text-3xl">
            Todo el plan {sala.nombre} por <span className="text-oro">{eur(FUNDADOR.mensual)}/mes</span>, de por vida.
          </p>
          <p className="mt-2 text-white/65">En vez de <span className="line-through decoration-2">{eur(sala.mensual)}</span>. Se paga por trimestre ({eur(FUNDADOR.trimestre)} + IVA) y el precio se queda contigo mientras sigas en {sala.nombre}.</p>
          <ul className="mt-6 grid gap-2 text-[15px] text-white/85 sm:grid-cols-2">
            {['El plan más completo: 120 platos y 30 mesas', 'Carta en 3 idiomas', 'Pedido desde la mesa (en camino)', 'Lo nuevo de Sala, al mismo precio'].map((x) => (
              <li key={x} className="flex gap-2"><span className="text-oro">✓</span>{x}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ActivarPlanBoton plan="fundador" etiqueta="Hacerme Fundador →" className="inline-flex justify-center rounded-full bg-vino px-8 py-4 text-[15px] font-semibold text-white shadow-[0_10px_40px_rgba(163,24,74,.45)] transition hover:bg-vino-hondo" />
            <Link href="/fundador" className="text-sm font-semibold text-white/75 underline decoration-oro underline-offset-4">Ver qué incluye y las condiciones</Link>
          </div>
        </div>
        <div className="relative min-h-[260px] md:min-h-full">
          <Image src="/images/experience/experience-mesa-del-chef-16x9.webp" alt="Sala de un restaurante en pleno servicio" fill sizes="(min-width:768px) 45vw, 100vw" className="object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-noche via-noche/30 to-transparent md:bg-gradient-to-r" />
          <div className="absolute bottom-6 right-6 rounded-3xl bg-oro px-5 py-4 text-noche shadow-2xl">
            <p className="font-display text-4xl font-semibold leading-none">−{pct} %</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide">de por vida</p>
          </div>
        </div>
      </div>
    </section>
  );
}
