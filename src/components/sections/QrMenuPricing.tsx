import { QR_MENU, formatPrecio } from '@/lib/pricing-config';
import ActivarPlanBoton from './ActivarPlanBoton';
import TiltCard from '@/components/motion/TiltCard';

export default function QrMenuPricing() {
  const { basico, ampliado } = QR_MENU.planes;

  return (
    <section className="py-16 md:py-24 bg-[#FDFCF8]">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-vino text-sm font-bold tracking-widest uppercase">
            QR Menú
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-balance">
            Imprime una vez. Cambia tu carta las veces que quieras.
          </h2>
          <p className="text-lg md:text-xl text-gray-600 text-pretty">
            {formatPrecio(QR_MENU.setup.precio)} de montaje (regalado en modo promocional) + tu plan mensual.
            Primer mes a {formatPrecio(QR_MENU.primerMes)} simbólico, tarjeta registrada desde la compra — a partir
            del segundo mes se factura el precio completo del plan que elijas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <TiltCard className="bg-white rounded-3xl border-2 border-gray-100 p-8 flex flex-col">
            <h3 className="text-2xl font-black mb-1">{basico.nombre}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black">{formatPrecio(basico.mensual)}</span>
              <span className="text-gray-500 font-bold">/mes</span>
            </div>
            <ul className="space-y-3 text-gray-700 flex-1">
              <li>✓ Menú digital sobre {basico.plantillas} plantillas fijas</li>
              <li>✓ Autogestión de productos, precios y fotos</li>
              <li>✓ URL estable — el QR físico nunca deja de funcionar</li>
              <li>✓ Hasta {basico.topeProductos} productos</li>
              <li className="text-gray-400">QR de acceso genérico, sin personalización</li>
            </ul>
            <ActivarPlanBoton
              plan="basico"
              etiqueta="Activar Carta"
              className="mt-8 text-center bg-gray-900 text-white px-6 py-3.5 rounded-full font-bold hover:bg-black transition-colors"
            />
          </TiltCard>

          <TiltCard className="bg-white rounded-3xl border-2 border-vino p-8 flex flex-col relative shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-vino text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
              Más elegido
            </div>
            <h3 className="text-2xl font-black mb-1">{ampliado.nombre}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black">{formatPrecio(ampliado.mensual)}</span>
              <span className="text-gray-500 font-bold">/mes</span>
            </div>
            <ul className="space-y-3 text-gray-700 flex-1">
              <li>✓ Todo lo del plan Carta</li>
              <li>✓ QR con logo, color de marca y marco (nivel de corrección alto)</li>
              <li>✓ Promociones y ofertas visibles en el menú</li>
              <li>✓ Botón de &quot;llamar al camarero&quot;</li>
              <li>✓ Sincronización con tu ficha de Google Business</li>
              <li>✓ Motor de reservas propio, incluido sin coste extra</li>
              <li>✓ Botón de reseñas para pedir valoraciones tras la visita</li>
              <li>✓ Hasta {ampliado.topeProductos} productos</li>
            </ul>
            <ActivarPlanBoton
              plan="ampliado"
              etiqueta="Activar Local"
              className="mt-8 text-center bg-vino text-white px-6 py-3.5 rounded-full font-bold hover:bg-orange-600 transition-colors shadow-lg"
            />
          </TiltCard>
        </div>

        <p className="text-center text-gray-500 text-sm mt-10 max-w-2xl mx-auto">
          Los QR físicos (pegatina, vinilo, atril o metacrilato) se piden desde tu propio panel una vez activada la
          cuenta, como compra aparte — nunca están incluidos en la cuota mensual.
        </p>
      </div>
    </section>
  );
}
