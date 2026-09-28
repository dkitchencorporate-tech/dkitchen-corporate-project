import type { Metadata } from 'next';
import { FondoVivo, Marquesina, TextoRevelado } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import FormularioPartner from './FormularioPartner';

export const metadata: Metadata = {
  title: 'Programa de partners · Gana comisiones vendiendo DKitchen a hostelería',
  description: 'Para comerciales de TPV, distribuidores HORECA e independientes: suma DKitchen a tu cartera y gana comisiones por cada restaurante que traigas.',
  alternates: { canonical: 'https://dkitchencorporate.es/partners' },
};

const PERFILES = [
  ['Comerciales de TPV', 'Tu cliente ya confía en ti para cobrar. Ofrécele la carta digital y los módulos de sala que se conectan con su TPV.'],
  ['Distribuidores HORECA', 'Visitas bares y restaurantes cada semana. Añade un producto digital a tu ruta sin cambiar tu forma de trabajar.'],
  ['Independientes y agencias', 'Si trabajas con hostelería, tienes clientes que necesitan su carta al día, su propia app o eventos que llenen el local.'],
];
const PASOS = [
  ['Te das de alta', 'Nos cuentas quién eres y con qué clientes trabajas. Te contactamos lo antes posible.'],
  ['Presentas DKitchen', 'Con material de venta, demos y precios claros. Tú abres la puerta; nosotros te ayudamos a cerrar.'],
  ['Cobras', 'Comisión por cada cliente que traigas. Las condiciones exactas te las detallamos en la llamada.'],
];

export default function Partners() {
  return (
    <div className="bg-white text-[#17191E]">
      <section className="relative overflow-hidden bg-[#0A080C] pb-24 pt-36 text-white md:pb-32 md:pt-44">
        <FondoVivo />
        <div className="relative mx-auto max-w-5xl px-6 md:px-8">
          <Aparecer><p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6E0C2B]">Programa de partners</p></Aparecer>
          <TextoRevelado como="h1" texto="Vendes a hostelería. Gana también con DKitchen." className="font-display mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] md:text-8xl" />
          <Aparecer retraso={0.3}><p className="mt-7 max-w-xl text-lg text-white/65">Un producto que tus clientes necesitan, precios fáciles de explicar y comisiones por cada restaurante que traigas.</p></Aparecer>
          <Aparecer retraso={0.4}><a href="#solicitud" className="mt-9 inline-block rounded-full bg-[#6E0C2B] px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)]">Quiero ser partner</a></Aparecer>
        </div>
      </section>

      <Marquesina items={['Carta digital QR', 'Apps propias', 'Módulos de sala', 'Eventos', 'Dark kitchen', 'Comisiones por cliente']} />

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <TextoRevelado texto="Para quién es." className="font-display text-4xl font-semibold md:text-6xl" />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PERFILES.map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.08} className="rounded-[28px] border border-[#E6E6E2] bg-[#F7F5F2] p-7">
                <p className="font-display text-2xl font-semibold">{t}</p>
                <p className="mt-3 text-[#6B7079]">{d}</p>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F5F2] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <TextoRevelado texto="Así funciona." className="font-display text-4xl font-semibold md:text-6xl" />
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {PASOS.map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.08}>
                <li className="border-t-2 border-[#17191E] pt-5">
                  <p className="font-display text-sm font-semibold text-[#6E0C2B]">0{i + 1}</p>
                  <p className="mt-1 text-xl font-semibold">{t}</p>
                  <p className="mt-2 text-[#6B7079]">{d}</p>
                </li>
              </Aparecer>
            ))}
          </ol>
        </div>
      </section>

      <section id="solicitud" className="scroll-mt-24 py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[1fr_1.2fr] md:px-8">
          <div>
            <TextoRevelado texto="Hablemos." className="font-display text-5xl font-semibold md:text-7xl" />
            <p className="mt-5 text-lg text-[#6B7079]">Déjanos tus datos y te llamamos para contarte las condiciones y darte el material de venta.</p>
            <a href="https://wa.me/34622652659?text=Hola,%20quiero%20ser%20partner%20de%20DKitchen." className="mt-8 inline-block font-semibold">O escríbenos por WhatsApp <span className="text-[#6E0C2B]">→</span></a>
          </div>
          <FormularioPartner />
        </div>
      </section>
    </div>
  );
}
