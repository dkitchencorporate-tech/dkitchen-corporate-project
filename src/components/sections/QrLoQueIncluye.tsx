import Link from 'next/link';

/**
 * /qr — qué es y qué NO es el QR Menú, cómo crece y dónde empieza
 * DKitchen Signature. Solo se publican los precios de los planes; diseño y
 * módulos se contratan desde el panel (estrategia 28/09/2026).
 */

const PASOS = [
  ['Activas tu cuenta', 'Primer mes a 1 €. Entras en tu panel y subes tu carta: platos, precios, fotos y alérgenos.'],
  ['Imprimes tu QR una vez', 'El código apunta siempre a tu carta. Cambias lo que quieras y el QR de las mesas sigue valiendo.'],
  ['Tus clientes la miran', 'Escanean y ven tu carta en su móvil, en su idioma si lo activas. Piden a tu equipo, como siempre.'],
];

const CRECE = [
  ['Diseño', 'Tu carta empieza con un diseño limpio incluido. Si quieres que tenga tu sello, DKitchen la convierte en una Carta de Autor, o te la deja a punto sin cambiar el diseño.'],
  ['Idiomas', 'Eliges hasta tres idiomas y nosotros traducimos tu carta. Tus clientes cambian de idioma con un toque.'],
  ['Sala', 'Plano de tu local con zonas por camarero, app de sala en el móvil de tu equipo con informe por camarero y conexión con tu TPV.'],
];

const COMPARA: [string, string, string][] = [
  ['Qué es', 'Tu carta digital y herramientas para tu sala', 'Tu propia app con tu marca que gestiona el restaurante'],
  ['Tus clientes', 'Miran la carta y piden al camarero', 'Piden y pagan: en mesa, para recoger y a domicilio'],
  ['Cocina y cobros', 'Tu TPV de siempre sigue cobrando', 'Comandas a cocina, TPV propio e historial de ventas'],
  ['Propiedad', 'Servicio mensual, sin permanencia', 'Es tuya: entrada única y mantenimiento mensual'],
];

export default function QrLoQueIncluye() {
  return (
    <>
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D9531E]">Cómo funciona</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-[-0.02em] text-[#1A1714] md:text-4xl">Tres pasos y tu carta está en todas las mesas.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {PASOS.map(([t, d], i) => (
              <li key={t} className="border-t-2 border-gray-900 pt-5">
                <p className="text-sm font-bold text-gray-400">0{i + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-gray-900">{t}</h3>
                <p className="mt-2 leading-relaxed text-gray-600">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#F7F3EA] py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D9531E]">Crece a tu ritmo</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-[-0.02em] text-[#1A1714] md:text-4xl">Empieza con la carta. Añade solo lo que tu local necesite.</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-gray-900/10 bg-gray-900/10 md:grid-cols-3">
            {CRECE.map(([t, d]) => (
              <div key={t} className="bg-[#F7F3EA] p-6">
                <h3 className="text-lg font-bold text-gray-900">{t}</h3>
                <p className="mt-2 leading-relaxed text-gray-600">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-gray-500">Todo se activa desde tu panel, cuando lo necesites. Sin llamadas comerciales.</p>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D9531E]">Para que no haya dudas</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-[-0.02em] text-[#1A1714] md:text-4xl">QR Menú no es DKitchen Signature.</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-gray-600">
            El QR Menú es tu carta digital: tus clientes la miran y piden a tu equipo. Si lo que buscas es que pidan y paguen
            solos, con tu propia app, eso es DKitchen Signature.
          </p>
          <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200">
            <div className="grid grid-cols-2 bg-gray-50 text-xs font-bold uppercase tracking-wider">
              <p className="p-4 text-gray-500">QR Menú</p>
              <p className="border-l border-gray-200 p-4 text-[#D9531E]">DKitchen Signature</p>
            </div>
            {COMPARA.map(([k, a, b]) => (
              <div key={k} className="border-t border-gray-200">
                <p className="px-4 pt-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">{k}</p>
                <div className="grid grid-cols-2 text-sm md:text-base">
                  <p className="p-4 pt-1 text-gray-600">{a}</p>
                  <p className="border-l border-gray-200 p-4 pt-1 font-medium text-gray-900">{b}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/base-operativa" className="mt-6 inline-block font-bold text-gray-900 underline decoration-[#D9531E] decoration-2 underline-offset-4">
            Conocer DKitchen Signature
          </Link>
        </div>
      </section>
    </>
  );
}
