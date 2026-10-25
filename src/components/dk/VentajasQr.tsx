import Link from 'next/link';
import Aparecer from '@/components/qr-landing/Aparecer';
import { QR_MENU, SERVICIOS_QR } from '@/lib/pricing-config';

/**
 * Lo que hace distinta la carta QR (18/10/2026, revisión de karc0): carta montada desde
 * una foto, fotos de plato perfeccionadas con IA (orientativas), pedido desde la mesa,
 * reseñas de TODA la mesa y plan a medida (Enterprise) sin pasar a Signature. Con guiños
 * a Signature (app propia) y Experience (días flojos). Textos pensados también para SEO.
 */
const CARTAS = [
  { n: '01', t: 'Te la montamos desde una foto', d: 'Nos mandas una foto de tu carta (o el PDF) y la pasamos a digital con tus platos, tus precios y tu estilo. No tienes que teclear nada.', l: { href: '/carta-de-autor', t: 'Mandar mi foto' } },
  { n: '02', t: 'Fotos de tus platos, perfeccionadas con IA', d: `Partimos de tus fotos y las dejamos de carta: idénticas o muy cercanas a tu plato real, siempre como imagen orientativa. ${SERVICIOS_QR.imagenesGratisIa} gratis siempre y bonos de ${SERVICIOS_QR.imagenesBonoIa} por ${SERVICIOS_QR.bonoIa} €.` },
  { n: '03', t: 'Tu cliente pide desde la mesa', d: `Desde el plan ${QR_MENU.planes.ampliado.nombre}, el comensal pide desde su móvil sin esperar al camarero; tu camarero lo confirma con un toque y entra en la cuenta de la mesa y en tu TPV. Se paga en la barra, como siempre.` },
  { n: '04', t: 'Reseñas de toda la mesa, no solo del que paga', d: `Un botón dedicado en la carta invita a cada comensal a dejar su reseña en Google, sea una mesa de 1 o de 100. Más reseñas, mejor posición en Google Maps. En los planes ${QR_MENU.planes.ampliado.nombre} y ${QR_MENU.planes.sala.nombre}.` },
];

export default function VentajasQr({ oscuro = false }: { oscuro?: boolean }) {
  const t = oscuro ? 'text-white' : 'text-tinta';
  const sub = oscuro ? 'text-white/65' : 'text-niebla';
  const tarjeta = oscuro ? 'border-white/10 bg-white/[0.04]' : 'border-linea bg-white';
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {CARTAS.map((c, i) => (
          <Aparecer key={c.n} retraso={(i % 2) * 0.06} className={`rounded-[28px] border p-7 ${tarjeta}`}>
            <span className="acento-serif text-3xl leading-none text-vino">{c.n}</span>
            <h3 className={`font-display mt-3 text-2xl font-semibold ${t}`}>{c.t}</h3>
            <p className={`mt-2 ${sub}`}>{c.d}</p>
            {c.l && <Link href={c.l.href} className="mt-4 inline-block text-sm font-semibold text-vino underline decoration-2 underline-offset-4">{c.l.t} →</Link>}
          </Aparecer>
        ))}
      </div>
      <Aparecer className={`mt-4 grid gap-4 rounded-[28px] border p-7 md:grid-cols-[1.4fr_1fr] md:items-center ${tarjeta}`}>
        <div>
          <p className="etiqueta-dk text-vino">Plan a medida · Enterprise</p>
          <h3 className={`font-display mt-2 text-2xl font-semibold ${t}`}>¿Varios locales, mucho volumen o algo especial?</h3>
          <p className={`mt-2 ${sub}`}>Si te quedas corto con {QR_MENU.planes.sala.nombre} o necesitas funciones a medida, te hacemos un plan QR personalizado, sin tener que pasar a una app propia. Se paga por capacidad de uso.</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Link href="/contacto?interes=enterprise" className="rounded-full bg-tinta px-6 py-3 text-center text-sm font-semibold text-white">Pedir mi plan a medida</Link>
          <p className={`text-xs ${sub}`}>¿Quieres tu propia app? <Link href="/signature" className="underline">Signature</Link> · ¿Días flojos? <Link href="/experience" className="underline">Experience</Link></p>
        </div>
      </Aparecer>
    </div>
  );
}
