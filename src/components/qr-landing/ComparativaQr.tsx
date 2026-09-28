import Link from 'next/link';
import { TextoRevelado } from '@/components/dk/Movimiento';

/** QR Menú ≠ DKitchen Signature: sube de peldaño al cliente sin confundir productos. */
const FILAS: [string, string, string][] = [
  ['Qué es', 'Tu carta digital y herramientas de sala', 'Tu propia app con tu marca que gestiona el restaurante'],
  ['Tus clientes', 'Miran la carta y piden al camarero', 'Piden y pagan: en mesa, recogida y domicilio'],
  ['Cocina y cobros', 'Tu TPV de siempre sigue cobrando', 'Comandas a cocina, TPV propio e historial de ventas'],
  ['Propiedad', 'Servicio mensual, sin permanencia', 'Es tuya: entrada única y mantenimiento mensual'],
];

export default function ComparativaQr() {
  return (
    <section className="bg-[#F7F7F5] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">El siguiente nivel</p>
        <TextoRevelado texto="Empieza con la carta. Crece hasta tu propia app." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl" />
        <div className="mt-12 overflow-hidden rounded-[28px] border border-[#E6E6E2] bg-white">
          <div className="grid grid-cols-2 text-sm font-semibold">
            <p className="p-5 text-[#6B7079]">Carta QR</p>
            <p className="bg-[#17191E] p-5 text-white">DKitchen Signature</p>
          </div>
          {FILAS.map(([k, a, b]) => (
            <div key={k} className="border-t border-[#ECECE8]">
              <p className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A9EA6]">{k}</p>
              <div className="grid grid-cols-2 text-[15px]">
                <p className="p-5 pt-1.5 text-[#3F434B]">{a}</p>
                <p className="p-5 pt-1.5 font-medium text-[#17191E]">{b}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/base-operativa" className="mt-8 inline-flex items-center gap-2 font-semibold text-[#17191E]">
          Conocer DKitchen Signature <span aria-hidden="true" className="text-[#E8592A]">→</span>
        </Link>
      </div>
    </section>
  );
}
