import type { Metadata } from 'next';
import DigitalPresenceValue from '@/components/sections/DigitalPresenceValue';
import QrMenuPricing from '@/components/sections/QrMenuPricing';
import FeatureSplit from '@/components/sections/FeatureSplit';
import ObjectionHandling from '@/components/sections/ObjectionHandling';
import SiguientePeldano from '@/components/sections/SiguientePeldano';
import QrLoQueIncluye from '@/components/sections/QrLoQueIncluye';

export const metadata: Metadata = {
  title: 'QR Menú | DKitchen',
  description:
    'Carta digital con QR estable: imprime una vez y cambia tu carta las veces que quieras. Plan Básico 9€/mes o Ampliado 25€/mes, primer mes a 1€.',
  alternates: { canonical: 'https://dkitchencorporate.es/qr' },
};

export default function PaginaQr() {
  return (
    <div className="bg-white">
      <DigitalPresenceValue />

      {/* FEATURE-SPLIT — URL estable (Parte 6, Sección 3): el diferenciador
          técnico más fuerte del producto, hoy perdido como un bullet suelto. */}
      <FeatureSplit icono={<svg viewBox="0 0 21 21" className="h-24 w-24 md:h-32 md:w-32" aria-hidden="true" shapeRendering="crispEdges"><path fill="#1A1714" d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0z"/><path fill="#FDFCF8" d="M1 1h5v5H1zM15 1h5v5h-5zM1 15h5v5H1z"/><path fill="#1A1714" d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 0h2v2H9zM8 3h3v2H8zM9 8h3v3H9zM14 9h2v3h-2zM17 8h3v2h-3zM8 13h2v4H8zM12 14h3v2h-3zM16 13h2v2h-2zM13 17h2v3h-2zM17 17h3v3h-3zM3 9h3v2H3z"/><path fill="#D9531E" d="M11 11h2v2h-2z"/></svg>} titulo="Cambias el menú. Tu QR sigue funcionando igual." fondo="crema">
        <p className="mb-4">
          El código QR apunta a una URL estable, no a tu carta directamente. Cuando cambias precios, fotos o platos
          desde tu panel, el QR físico ya impreso sigue apuntando al mismo sitio — nunca hay que reimprimir nada.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4">
            <p className="font-bold text-gray-900 mb-1">Con DKitchen</p>
            <p className="text-gray-600">Cambias el menú → tu QR sigue funcionando igual.</p>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4">
            <p className="font-bold text-gray-500 mb-1">La alternativa habitual</p>
            <p className="text-gray-500">Cambias el menú → reimprimes el QR en cada mesa, otra vez.</p>
          </div>
        </div>
      </FeatureSplit>

      <QrLoQueIncluye />

      <QrMenuPricing />

      <ObjectionHandling
        preguntas={[
          {
            pregunta: '¿Qué pasa después del primer mes a 1€?',
            respuesta: 'Se cobra automáticamente el plan completo (9€ o 25€/mes) a la misma tarjeta. Puedes cancelar antes desde tu panel si no quieres continuar.',
          },
          {
            pregunta: '¿Puedo cambiar de plan luego?',
            respuesta: 'Sí, subir de Básico a Ampliado (o al revés) se hace desde tu panel en cualquier momento, sin perder tu carta ni tu QR.',
          },
          {
            pregunta: '¿Mis clientes pueden pedir desde la carta?',
            respuesta: 'No. La carta QR es para mirar: tus clientes piden a tu equipo como siempre y tu TPV sigue cobrando. Si quieres que pidan y paguen solos, eso es DKitchen Signature.',
          },
          {
            pregunta: '¿Los QR físicos van aparte?',
            respuesta: 'Sí, es una compra separada desde tu panel una vez activada la cuenta — nunca están incluidos en la cuota mensual.',
          },
        ]}
      />

      <SiguientePeldano siguiente="base-operativa" />
    </div>
  );
}
