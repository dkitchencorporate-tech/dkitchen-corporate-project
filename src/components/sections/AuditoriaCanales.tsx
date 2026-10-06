import Link from 'next/link';
import Hero3DLazy from '@/components/motion/Hero3DLazy';
import { AUDITORIA_CANALES, formatPrecio } from '@/lib/pricing-config';

const WHATSAPP_AUDITORIA_CANALES =
  'https://wa.me/34622652659?text=Hola,%20quiero%20reservar%20mi%20Auditor%C3%ADa%20de%20canales%20externos.';

const PASOS = [
  {
    numero: '1',
    titulo: 'Revisión',
    texto: 'Revisamos tu ficha de Google (respuesta a reseñas, fotos, categorías, posicionamiento de proximidad) y tus redes activas.',
  },
  {
    numero: '2',
    titulo: 'Informe cuantificado',
    texto: 'Te entregamos un informe con cada brecha cuantificada — no genérico, con datos de tu propio negocio.',
  },
  {
    numero: '3',
    titulo: 'Siguiente paso natural',
    texto: 'Si el diagnóstico revela que necesitas algo más serio que un parche, el paso natural es Núcleo Operativo.',
  },
];

export default function AuditoriaCanales() {
  return (
    <>
      {/* HERO propio, tratamiento de declaración (Parte 6, Sección 5): fondo
          distinto y tipografía grande de "afirmación", no de tarjeta de
          producto genérica. */}
      <header className="bg-[#171008] text-white pt-32 pb-20 md:pt-40 md:pb-24 text-center px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-orange-400 text-sm font-bold tracking-widest uppercase mb-8">
          Auditoría de canales externos
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] max-w-3xl mx-auto text-balance">
          Un diagnóstico,<br/>no una promesa.
        </h1>

        {/* Elemento 3D del hero (Parte 7, Sección 2.3): un dial que gira
            hasta señalar la zona "en riesgo" al entrar en viewport. */}
        <Hero3DLazy preset="auditoria" className="w-full h-48 md:h-64 mt-6" />

        <p className="text-lg md:text-xl text-gray-400 text-pretty max-w-2xl mx-auto mt-8">
          Diagnóstico de pago único sobre tu Google Business Profile y tus redes sociales: qué te está costando
          dinero ahora mismo en presencia digital, con acciones concretas — sin garantía de resultado, porque es
          un informe, no una gestión.
        </p>
      </header>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          {/* FEATURE-SPLIT — los 3 pasos como línea de tiempo (Parte 6, Sección 5) */}
          <div className="relative pl-10 space-y-10 mb-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-orange-200">
            {PASOS.map((p) => (
              <div key={p.numero} className="relative">
                <span className="absolute -left-10 flex items-center justify-center w-8 h-8 rounded-full bg-vino text-white shrink-0 text-lg font-bold">
                  {p.numero}
                </span>
                <p className="text-xs font-black uppercase tracking-widest text-vino mb-1">{p.titulo}</p>
                <p className="text-gray-700 text-lg">{p.texto}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mb-16">
            Incluye, además del diagnóstico de presencia digital, una capa de análisis de rentabilidad/escandallo de tu
            carta con los datos que aportas al reservar — no es un informe automático aparte, es parte de la misma
            reunión 1 a 1.
          </p>

          {/* PRICING-BLOCK (Parte 6, Sección 5; precio confirmado en Parte 8,
              Sección 3): producto 1 a 1 con reunión, no automatizado — el
              precio se muestra, la reserva sigue siendo por contacto directo. */}
          <div className="max-w-md mx-auto bg-white border-2 border-vino rounded-3xl p-8 text-center shadow-xl">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Pago único · sin garantía de resultado</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-2xl text-gray-400 line-through">{formatPrecio(AUDITORIA_CANALES.precioAncla)}</span>
              <span className="text-5xl font-black text-gray-900">{formatPrecio(AUDITORIA_CANALES.precioOferta)}</span>
            </div>
            <p className="text-gray-600 mb-8">Oferta especial de lanzamiento — producto 1 a 1, con reunión incluida.</p>
            <a
              href={WHATSAPP_AUDITORIA_CANALES}
              className="inline-flex w-full justify-center bg-vino text-white px-8 py-4 rounded-full font-black text-lg hover:bg-orange-600 transition-all shadow-lg"
            >
              Reservar mi Auditoría
            </a>
          </div>

          {/* CTA-FINAL — puente visual explícito hacia Núcleo Operativo (Parte 6,
              Sección 5), no solo mencionado dentro del paso 3. */}
          <div className="mt-16 bg-[#FDFCF8] border border-orange-100 rounded-3xl p-8 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-vino mb-2">¿Y si hace falta más que un parche?</p>
            <p className="text-gray-700 text-lg mb-6">
              Cuando el diagnóstico revela algo estructural, el siguiente paso es Núcleo Operativo: la PWA completa
              como sistema operativo del negocio.
            </p>
            <Link
              href="/signature"
              className="inline-flex items-center gap-2 text-gray-900 font-black hover:text-vino transition-colors"
            >
              Ver Núcleo Operativo →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
