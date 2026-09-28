import Link from 'next/link';

const PREGUNTAS: [string, string][] = [
  ['¿Qué pasa después del primer mes a 1 €?', 'Se cobra tu plan (9 € o 25 € al mes) a la misma tarjeta. Si no quieres seguir, lo cancelas antes desde tu panel.'],
  ['¿Mis clientes pueden pedir desde la carta?', 'No. La carta QR es para mirar: tus clientes piden a tu equipo como siempre y tu TPV sigue cobrando. Si quieres que pidan y paguen solos, eso es DKitchen Signature.'],
  ['¿Tengo que reimprimir el QR si cambio la carta?', 'Nunca. El QR apunta siempre a tu carta; los cambios se ven al momento.'],
  ['¿Puedo cambiar de plan?', 'Sí, cuando quieras y desde tu panel, sin perder tu carta ni tu QR.'],
  ['¿Los QR físicos van aparte?', 'Sí. Se piden desde tu panel una vez activada la cuenta; no están incluidos en la cuota.'],
];

/** Preguntas frecuentes y cierre de /qr (rediseño 29/09/2026). */
export default function PreguntasQr() {
  return (
    <>
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-[1fr_1.4fr] md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D9531E]">Preguntas</p>
            <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-[#1A1714]">Lo que suelen preguntarnos.</h2>
          </div>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {PREGUNTAS.map(([p, r]) => (
              <details key={p} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold text-[#1A1714]">
                  {p}
                  <span aria-hidden="true" className="text-2xl font-light text-black/40 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-xl leading-relaxed text-black/60">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0F0B08] py-24 text-center text-white md:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,83,30,.22),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-6">
          <h2 className="text-4xl font-bold leading-[1.05] tracking-[-0.02em] md:text-6xl">Tu carta digital, hoy mismo.</h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">Actívala por 1 € y súbela en una tarde. Si algo no te convence, lo dejas.</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#planes" className="rounded-full bg-white px-8 py-4 text-[15px] font-semibold text-[#0F0B08]">Ver planes</a>
            <Link href="/base-operativa" className="rounded-full border border-white/20 px-8 py-4 text-[15px] font-semibold">Conocer DKitchen Signature</Link>
          </div>
        </div>
      </section>
    </>
  );
}
