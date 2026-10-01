import Link from 'next/link';
import { DARK_KITCHEN, CUOTA_MARCA_MENSUAL, formatPrecio } from '@/lib/pricing-config';

const WHATSAPP_MARCA_EN_CAJA =
  'https://wa.me/34622652659?text=Hola,%20ya%20tengo%20cocina%20operativa%20y%20quiero%20sumar%20una%20marca%20virtual.';

/**
 * Ruta B — "Marca en Caja": el cliente ya tiene cocina operativa y solo quiere
 * sumar marca(s). Sin puerta de admisión ni comité, a diferencia de la Ruta A
 * (DarkKitchen.tsx / EnterpriseModal.tsx). Ver DKITCHEN_MIGRACION_COMPLETA.md,
 * Sección 2, Peldaño 4b.
 */
export default function MarcaEnCaja() {
  const { rutaB } = DARK_KITCHEN;

  return (
    <section className="py-16 md:py-24 bg-[#0A0A0A] text-white">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#6E0C2B] text-xs font-bold tracking-widest uppercase">
            Ruta B — Ya tengo cocina
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-balance">
            No partas de cero. Súmale marca a la cocina que ya tienes.
          </h2>
          <p className="text-lg text-gray-400 text-pretty">
            Sin comité de admisión, sin evaluación trimestral — eliges la marca del{' '}
            <Link href="/marcas" className="text-[#6E0C2B] font-semibold hover:underline">
              catálogo
            </Link>{' '}
            y en semanas tienes kit de marca, PWA de pedido y alta en delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Marca 1</p>
            <p className="text-3xl font-black">{formatPrecio(rutaB.desarrolloPorMarca.primera)}</p>
            <p className="text-sm text-gray-500 mt-1">o {formatPrecio(rutaB.desarrolloPorMarca.todoIncluidoPrimera)} todo incluido</p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Marca 2</p>
            <p className="text-3xl font-black">{formatPrecio(rutaB.desarrolloPorMarca.segunda)}</p>
            <p className="text-sm text-gray-500 mt-1">-20% sobre la primera</p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Marca 3 en adelante</p>
            <p className="text-3xl font-black">{formatPrecio(rutaB.desarrolloPorMarca.terceraEnAdelante)}</p>
            <p className="text-sm text-gray-500 mt-1">-30% sobre la primera</p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mb-12 max-w-2xl mx-auto">
          El componente de marketing (~{formatPrecio(rutaB.marketingPorMarca)} en ads geolocalizados + flyers) se mantiene
          íntegro por marca, sin descuento — cada marca prueba su propia tracción.
        </p>

        <div className="max-w-3xl mx-auto mb-12">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Cuota mensual por marca activa, según volumen medido en tu propia PWA
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="text-left py-2 font-bold">Marcas activas</th>
                  {CUOTA_MARCA_MENSUAL.tramosVolumen.map((t) => (
                    <th key={t.id} className="text-right py-2 font-bold">{t.etiqueta}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(CUOTA_MARCA_MENSUAL.tabla) as Array<keyof typeof CUOTA_MARCA_MENSUAL.tabla>).map((tramo) => (
                  <tr key={tramo} className="border-b border-white/5">
                    <td className="py-2 text-gray-300">{tramo} marcas</td>
                    {CUOTA_MARCA_MENSUAL.tramosVolumen.map((t) => (
                      <td key={t.id} className="text-right py-2 font-bold">
                        {formatPrecio(CUOTA_MARCA_MENSUAL.tabla[tramo][t.id as 'bajo' | 'medio' | 'alto'])}/marca
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4">
            No es comisión ni porcentaje — es cuota fija por escalón de carga operativa real, medida donde pasa el
            pedido: tu propia PWA. Puedes seguir vendiendo también en Glovo/Uber Eats/Just Eat sin ninguna atadura;
            esas ventas no cuentan para el umbral.
          </p>
        </div>

        <div className="text-center">
          <a
            href={WHATSAPP_MARCA_EN_CAJA}
            className="inline-flex bg-[#6E0C2B] text-white px-8 py-4 rounded-full font-black text-lg hover:bg-orange-600 transition-all shadow-xl hover:shadow-orange-500/30 hover:-translate-y-1"
          >
            Quiero sumar una marca
          </a>
          <p className="text-xs text-gray-500 mt-4 max-w-md mx-auto">
            Si pides 3+ marcas o 2+ locales de una sola vez, te derivamos a la evaluación de la Ruta A — el tamaño de
            la operación decide el nivel de cualificación, no si partes de cero.
          </p>
        </div>
      </div>
    </section>
  );
}
