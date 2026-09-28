import type { Metadata } from 'next';
import Link from 'next/link';
import { FondoVivo, TextoRevelado } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';

/** Preguntas frecuentes — rediseño 29/09/2026, agrupadas por producto y con datos estructurados. */
export const metadata: Metadata = {
  title: 'Preguntas frecuentes · Carta QR, app propia, eventos y dark kitchen · DKitchen',
  description: 'Precios, permanencia, propiedad de tus datos, comisiones y cómo trabajamos. Todas las dudas antes de empezar con DKitchen.',
  alternates: { canonical: 'https://dkitchencorporate.es/faq' },
};

const GRUPOS: { t: string; href: string; p: [string, string][] }[] = [
  { t: 'General', href: '/', p: [
    ['¿Tengo que saber de tecnología?', 'No. Lo montamos y lo conectamos todo nosotros, y enseñamos a tu equipo a usarlo. Tú sigues llevando tu restaurante.'],
    ['¿De quién son la web, el dominio y los datos de mis clientes?', 'Tuyos desde el primer día. No registramos tu dominio a nuestro nombre ni nos quedamos con tus clientes.'],
    ['¿Hay comisiones por venta o costes ocultos?', 'No. Nunca cobramos un porcentaje de tus ventas. Cada servicio tiene un precio publicado.'],
    ['¿Cómo nos comunicamos?', 'Por un canal directo contigo, sin intermediarios, y con soporte en español.'],
  ] },
  { t: 'Carta QR', href: '/qr', p: [
    ['¿Qué pasa después del primer mes a 1 €?', 'Se cobra tu plan (9 € o 25 € al mes). Puedes cancelar antes desde tu panel, sin permanencia.'],
    ['¿Pierdo la carta de papel?', 'No tiene por qué. Muchos locales combinan las dos: la digital para cambiar al momento y la física como apoyo en mesa.'],
    ['¿Y si me voy?', 'Te llevas tu carta y tus datos. No los retenemos.'],
  ] },
  { t: 'DKitchen Signature', href: '/base-operativa', p: [
    ['¿Cuánto cuesta?', '700 € de entrada en pago único, o en 2 cuotas de 375 € (750 € en total). Los 2 primeros meses de mantenimiento van incluidos; después, 69 €/mes sin permanencia.'],
    ['¿Tengo que dejar las plataformas de delivery?', 'No. Tu app es el canal donde no pagas comisión; puedes seguir en las plataformas para captar clientes nuevos.'],
  ] },
  { t: 'Experience y Dark Kitchen', href: '/experience', p: [
    ['¿Quién se queda el dinero de las entradas?', 'Tú, el 100 %. Cobras con tu propia pasarela y nosotros nunca tocamos ese dinero.'],
    ['¿Aceptáis cualquier proyecto de dark kitchen?', 'No. Hacemos una evaluación previa y, si los números no salen, te lo decimos antes de que gastes un euro.'],
  ] },
];

export default function PaginaFAQ() {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: GRUPOS.flatMap((g) => g.p).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return (
    <div className="bg-white text-[#17191E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="relative overflow-hidden bg-[#0A080C] pb-20 pt-36 text-white md:pt-44">
        <FondoVivo />
        <div className="relative mx-auto max-w-5xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">Preguntas frecuentes</p>
          <TextoRevelado como="h1" texto="Sin letra pequeña." className="font-display mt-4 text-6xl font-semibold leading-[0.98] md:text-8xl" />
          <p className="mt-6 max-w-xl text-lg text-white/65">Todo lo que suelen preguntarnos antes de empezar. Si falta algo, escríbenos y te respondemos en persona.</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        {GRUPOS.map((g, i) => (
          <Aparecer key={g.t} retraso={0.05} className={i ? 'mt-16' : ''}>
            <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
              <div><p className="font-display text-3xl font-semibold">{g.t}</p><Link href={g.href} className="mt-2 inline-block text-sm font-semibold text-[#6E0C2B]">Ver {g.t === 'General' ? 'la portada' : g.t} →</Link></div>
              <div className="divide-y divide-[#E6E6E2] border-y border-[#E6E6E2]">
                {g.p.map(([q, a]) => (
                  <details key={q} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold">{q}<span aria-hidden="true" className="text-2xl font-light text-[#9A9EA6] transition-transform group-open:rotate-45">+</span></summary>
                    <p className="mt-3 leading-relaxed text-[#6B7079]">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Aparecer>
        ))}
        <div className="mt-20 rounded-[28px] bg-[#0A080C] p-8 text-white md:flex md:items-center md:justify-between md:p-10">
          <p className="font-display text-3xl font-semibold">¿Te queda alguna duda?</p>
          <a href="https://wa.me/34622652659?text=Hola,%20tengo%20una%20duda%20sobre%20DKitchen." className="mt-6 inline-block rounded-full bg-[#6E0C2B] px-7 py-4 font-semibold md:mt-0">Pregúntanos por WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
