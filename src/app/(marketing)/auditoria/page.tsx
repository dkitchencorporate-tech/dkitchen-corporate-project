import type { Metadata } from 'next';
import { HeroPagina, Titulo, Dolores, Faq, Cierre } from '@/components/dk/Bloques';
import { Marquesina } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { InformeVivo } from '@/components/dk/PiezasProductos';

/** Auditoría de canales — rediseño 29/09/2026. Palabra clave: auditoría ficha Google restaurante. */
export const metadata: Metadata = {
  title: 'Auditoría de Google Maps y redes para restaurantes · 47 €',
  description: 'Diagnóstico 1 a 1 de tu ficha de Google, tus redes y la rentabilidad de tu carta: qué te está costando clientes hoy y cómo arreglarlo. Pago único de 47 €.',
  alternates: { canonical: 'https://dkitchencorporate.es/auditoria' },
};

const WA = '/pagar/auditoria';

export default function PaginaAuditoria() {
  return (
    <div className="bg-white text-[#17191E]">
      <HeroPagina etiqueta="Auditoría de canales"
        titulo="Te están buscando. ¿Te están encontrando?"
        sub="En una reunión 1 a 1 revisamos tu ficha de Google, tus redes y la rentabilidad de tu carta. Sales con un informe claro: qué te está costando clientes y cómo arreglarlo."
        ctas={[{ href: WA, t: 'Reservar mi auditoría · 47 € + IVA' }, { href: '#incluye', t: 'Qué incluye', secundario: true }]}
        nota="Pago único. Es un diagnóstico, no una gestión: sin garantía de resultado."
        visual={<InformeVivo />} />

      <Marquesina oscura items={['Ficha de Google', 'Reseñas', 'Fotos y categorías', 'Posición en tu zona', 'Redes sociales', 'Rentabilidad de la carta']} />

      <section className="bg-[#F7F5F2] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="El problema" texto="Lo que no ves en tu ficha, lo ve tu competencia." />
          <Dolores items={[
            ['Reseñas sin responder.', 'Cada una es una conversación que otro cliente lee antes de decidir.'],
            ['Fotos viejas o de móvil.', 'La gente elige por los ojos, antes de leer una sola línea.'],
            ['Apareces tarde en «restaurantes cerca».', 'Y el que sale primero se queda la mesa.'],
            ['Platos que venden mucho y dejan poco.', 'Sin escandallo, no sabes cuáles te hacen perder dinero.'],
          ]} cta={{ href: WA, t: 'Quiero saber dónde pierdo clientes →' }} />
        </div>
      </section>

      <section id="incluye" className="scroll-mt-20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Cómo funciona" texto="Tres pasos. Una reunión. Un plan." />
          <ol className="mt-14 grid gap-8 md:grid-cols-3">
            {([['Revisión', 'Tu ficha de Google (reseñas, fotos, categorías, posición en tu zona) y tus redes activas.'], ['Informe con tus datos', 'Cada fallo explicado con datos de tu propio negocio, no un informe genérico.'], ['Análisis de tu carta', 'Rentabilidad y escandallo con los datos que nos das al reservar, en la misma reunión.']] as [string, string][]).map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.08}><li className="border-t-2 border-[#17191E] pt-5"><p className="font-display text-sm font-semibold text-[#6E0C2B]">0{i + 1}</p><p className="mt-1 text-xl font-semibold">{t}</p><p className="mt-2 text-[#6B7079]">{d}</p></li></Aparecer>
            ))}
          </ol>
          <Aparecer className="mt-16 grid items-center gap-8 rounded-[32px] bg-[#0A080C] p-8 text-white md:grid-cols-2 md:p-12">
            <div>
              <p className="etiqueta-dk text-[#6E0C2B]">Oferta de lanzamiento</p>
              <p className="mt-3 flex items-baseline gap-4"><span className="font-display text-3xl text-white/40 line-through">297 €</span><span className="font-display text-7xl font-semibold">47 €</span><span className="self-end pb-3 text-lg text-white/60">+ IVA</span></p>
              <p className="mt-2 text-white/60">Pago único · reunión 1 a 1 incluida</p>
            </div>
            <div className="md:text-right"><a href={WA} className="inline-block rounded-full bg-[#6E0C2B] px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)]">Reservar mi auditoría</a></div>
          </Aparecer>
        </div>
      </section>

      <Faq preguntas={[
        ['¿Me garantizáis más clientes?', 'No. Es un diagnóstico: te decimos qué falla y cómo arreglarlo. La ejecución es tuya o, si lo prefieres, la hacemos con otro de nuestros servicios.'],
        ['¿Qué necesito para la reunión?', 'Acceso a ver tu ficha de Google y tus redes, y los datos básicos de tu carta (precios y coste de los platos principales).'],
        ['¿Y si el problema es más grande que un parche?', 'Te lo diremos. Si hace falta algo estructural, el paso natural es tu propia app con DKitchen Signature.'],
      ]} />

      <Cierre titulo="Tus clientes ya te están buscando." sub="Por 47 € sabrás exactamente por qué algunos no llegan." cta={{ href: WA, t: 'Reservar mi auditoría' }} secundario={{ href: '/signature', t: 'Ver DKitchen Signature' }} />
    </div>
  );
}
