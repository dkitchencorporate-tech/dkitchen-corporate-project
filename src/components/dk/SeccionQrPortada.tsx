import Link from 'next/link';
import { TextoRevelado, BotonMagnetico } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import VistaExplosionada from '@/components/dk/VistaExplosionada';
import { QR_MENU, PLANES_QR, puntosPlanQr } from '@/lib/pricing-config';

/**
 * Carta QR con sección propia en la portada (18/10/2026, karc0: «la QR es el
 * puente, necesita su sección sola y completa»). Envuelve la vista
 * explosionada: antes, qué es y cuánto cuesta empezar; después, los planes
 * (leídos de pricing-config) y el puente hacia Signature. No promete paso
 * automático de datos entre la carta y la app: se monta a partir de la carta.
 */
const HECHOS = [
  ['Nunca más imprentas', 'Cambias un precio en el móvil y está en todas las mesas.'],
  ['Los 14 alérgenos UE', 'Por plato y con el aviso legal que pide la ley.'],
  ['Reservas, camarero y TPV', 'Todos los planes traen un poco de cada cosa.'],
];

export default function SeccionQrPortada() {
  const local = QR_MENU.planes.ampliado;
  return (
    <div id="carta-qr" className="scroll-mt-20 bg-crema">
      <section className="pt-24 md:pt-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-vino">La puerta de entrada · Carta QR</p>
          <TextoRevelado texto={`Empieza por tu carta. El primer mes, ${QR_MENU.primerMes} €.`} className="font-display mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-tinta md:text-6xl" />
          <Aparecer retraso={0.1}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-niebla">Casi todos nuestros locales empiezan aquí: tu carta en el móvil de cada cliente, con tu estilo, sin reimprimir nunca más. Y cuando quieras crecer, es el puente hacia tu propia app.</p></Aparecer>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] border border-linea bg-linea md:grid-cols-3">
            {HECHOS.map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.06} className="bg-white p-7">
                <span className="acento-serif text-3xl leading-none text-vino">{i + 1}</span>
                <p className="mt-4 text-lg font-semibold text-tinta">{t}</p>
                <p className="mt-1.5 text-niebla">{d}</p>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <VistaExplosionada />

      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Aparecer><h3 className="font-display text-3xl font-semibold text-tinta md:text-4xl">Tres planes, por cantidades. Sin módulos sueltos.</h3></Aparecer>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANES_QR.map((id, i) => {
              const pl = QR_MENU.planes[id];
              const dest = id === local.id;
              return (
                <Aparecer key={id} retraso={i * 0.06} className={`relative flex flex-col rounded-[28px] border p-7 ${dest ? 'border-tinta bg-noche text-white shadow-[0_30px_80px_-30px_rgba(23,25,30,.6)]' : 'border-linea bg-white text-tinta'}`}>
                  {dest && <span className="absolute -top-3 left-7 rounded-full bg-vino px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Primer mes {QR_MENU.primerMes} €</span>}
                  <p className="font-display text-2xl font-semibold">{pl.nombre}</p>
                  <p className="mt-3"><span className="font-display text-4xl font-semibold">{pl.mensual} €</span><span className={dest ? 'text-white/60' : 'text-niebla'}> /mes + IVA</span></p>
                  <p className={`mt-3 text-sm ${dest ? 'text-white/65' : 'text-niebla'}`}>{pl.resumen}</p>
                  <ul className={`mt-5 flex-1 space-y-2 text-sm ${dest ? 'text-white/80' : 'text-grafito'}`}>
                    {puntosPlanQr(id).map((x) => <li key={x} className="flex gap-2"><span className="text-vino">✓</span>{x}</li>)}
                  </ul>
                  <Link href="/qr#planes" className={`mt-7 block rounded-full py-3.5 text-center text-[15px] font-semibold transition ${dest ? 'bg-vino text-white hover:bg-vino-hondo' : 'border border-tinta hover:bg-tinta hover:text-white'}`}>{dest ? `Empezar por ${QR_MENU.primerMes} €` : `Elegir ${pl.nombre}`}</Link>
                </Aparecer>
              );
            })}
          </div>
          <Aparecer className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-6">
            <Link href="/demos/carta" className="font-semibold underline decoration-vino decoration-2 underline-offset-4">Ver una carta de muestra en vivo →</Link>
            <Link href="/qr" className="font-semibold underline decoration-vino decoration-2 underline-offset-4">Todo sobre la carta QR →</Link>
          </Aparecer>

          <Aparecer className="mt-16">
            <div className="relative overflow-hidden rounded-[32px] bg-noche p-8 text-white md:p-12">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.45),transparent)]" />
              <p className="etiqueta-dk relative text-vino">El puente</p>
              <h3 className="font-display relative mt-3 max-w-3xl text-3xl font-semibold leading-[1.05] md:text-5xl">De tu carta QR a tu propia app, sin empezar de cero.</h3>
              <ol className="relative mt-10 grid gap-6 md:grid-cols-3">
                {[
                  ['Hoy', 'Carta QR', `Tu carta en todas las mesas. El plan ${local.nombre}, primer mes por ${QR_MENU.primerMes} €.`],
                  ['Cuando llenes más', 'Local y Sala', 'Más platos, mesas, camareros y comandas a tu TPV, sin cambiar de QR.'],
                  ['Cuando quieras tu marca', 'Signature', 'Tu app propia: pedidos y pagos sin comisiones. Te la montamos a partir de tu carta.'],
                ].map(([cuando, t, d], i) => (
                  <li key={t} className="border-t border-white/15 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">{String(i + 1).padStart(2, '0')} · {cuando}</p>
                    <p className="font-display mt-2 text-2xl font-semibold">{t}</p>
                    <p className="mt-2 text-white/65">{d}</p>
                  </li>
                ))}
              </ol>
              <div className="relative mt-10 flex flex-col gap-3 sm:flex-row">
                <BotonMagnetico href="/qr#planes" className="inline-flex justify-center rounded-full bg-vino px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)] hover:bg-vino-hondo">Empieza por {QR_MENU.primerMes} € →</BotonMagnetico>
                <Link href="/signature" className="inline-flex justify-center rounded-full border border-white/25 px-8 py-4 text-[15px] font-semibold hover:border-white/60">Ver Signature</Link>
              </div>
            </div>
          </Aparecer>
        </div>
      </section>
    </div>
  );
}
