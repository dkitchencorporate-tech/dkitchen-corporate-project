import Link from 'next/link';
import { TextoRevelado } from '@/components/dk/Movimiento';
import { QR_MENU } from '@/lib/pricing-config';

/**
 * Carta QR frente a DKitchen Signature (30/09/2026). Regla de karc0: Signature
 * siempre muy por encima de QR, aunque el cliente QR contrate todo. Solo se
 * marca en Signature lo que existe de verdad en el motor (ver
 * SIGNATURE_VS_QR_2026-09-30.md en la carpeta del proyecto).
 * Variantes: «qr» (en /qr), «signature» (en /base-operativa), «portada» (compacta).
 */
type Fila = { t: string; qr: boolean | string; sig: boolean | string; clave?: boolean };
const GRUPOS: { g: string; filas: Fila[] }[] = [
  { g: 'La base', filas: [
    { t: 'Carta digital con fotos que cambias al momento', qr: true, sig: true },
  ] },
  { g: 'Tu app', filas: [
    { t: 'App propia instalable en el móvil, con tu marca', qr: false, sig: true, clave: true },
    { t: 'Notificaciones push a tus clientes', qr: false, sig: true },
  ] },
  { g: 'Pedidos y cobro', filas: [
    { t: 'Pedidos a domicilio y para recoger, con carrito', qr: false, sig: true, clave: true },
    { t: 'Seguimiento del pedido en tiempo real', qr: false, sig: true },
    { t: 'Pago online (Stripe, SumUp o Revolut Pay, a tu elección), datáfono o efectivo', qr: false, sig: true, clave: true },
    { t: 'Cero comisiones por pedido (frente a las plataformas)', qr: 'No vende', sig: true, clave: true },
  ] },
  { g: 'Tus clientes', filas: [
    { t: 'Base de clientes propia, con correo verificado', qr: false, sig: true, clave: true },
    { t: 'Club de fidelización con puntos canjeables', qr: false, sig: true },
    { t: 'Campañas por correo a tus clientes', qr: false, sig: true },
    { t: 'Ventas sugeridas al pedir (sube el ticket medio)', qr: false, sig: true },
  ] },
  { g: 'Tu local', filas: [
    { t: 'Kiosko de autoservicio y TPV propio', qr: false, sig: true },
    { t: 'Comandas impresas en cocina (impresora térmica)', qr: false, sig: true },
  ] },
  { g: 'Tu negocio', filas: [
    { t: 'Panel de ventas: pedidos, historial y analítica', qr: 'Solo visitas', sig: true },
    { t: 'La app es tuya: pago único y mantenimiento', qr: 'Cuota mensual', sig: true },
  ] },
];
const PORTADA = ['App propia instalable en el móvil, con tu marca', 'Pedidos a domicilio y para recoger, con carrito', 'Cero comisiones por pedido (frente a las plataformas)', 'Base de clientes propia, con correo verificado', 'Club de fidelización con puntos canjeables', 'Kiosko de autoservicio y TPV propio'];

function Marca({ v, oscuro }: { v: boolean | string; oscuro?: boolean }) {
  if (typeof v === 'string') return <span className={`text-[13px] ${oscuro ? 'text-white/85' : 'text-[#6B7079]'}`}>{v}</span>;
  return v ? (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${oscuro ? 'bg-[#D9B25C] text-[#0A080C]' : 'bg-[#17191E] text-white'}`} aria-label="Sí">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  ) : <span className="text-[#B8B4AE]" aria-label="No">—</span>;
}

export default function ComparativaQr({ variante = 'qr' }: { variante?: 'qr' | 'signature' | 'portada' }) {
  const compacta = variante === 'portada';
  const grupos = compacta ? [{ g: '', filas: GRUPOS.flatMap((x) => x.filas).filter((f) => PORTADA.includes(f.t)) }] : GRUPOS;
  const titulo = variante === 'signature' ? 'Mucho más que una carta. Tu negocio entero.'
    : compacta ? 'De carta QR a app propia.'
    : 'Tu carta digital, o tu propio negocio digital.';
  return (
    <section className={`${variante === 'signature' ? 'bg-white' : 'bg-[#F7F5F2]'} py-24 md:py-32`}>
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <p className="etiqueta-dk text-[#6E0C2B]">{variante === 'signature' ? 'Signature frente a la carta QR' : 'El siguiente nivel'}</p>
        <TextoRevelado texto={titulo} className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl" />
        <p className="mt-5 max-w-2xl text-lg text-[#6B7079]">
          La carta QR es tu carta digital. <strong className="text-[#17191E]">Signature es tu propio negocio digital:</strong> tu app, tus pedidos, tus clientes y tus datos, sin comisiones.
          {!compacta && <> Aunque contrates la carta QR con todo (plan Ampliado a {QR_MENU.planes.ampliado.mensual} € + IVA, idiomas y módulos de sala), Signature sigue estando en otra liga.</>}
        </p>

        <div className="mt-12 overflow-hidden rounded-[28px] border border-[#E6E6E2] bg-white">
          <div className="grid grid-cols-[1fr_92px_112px] items-end text-[13px] font-semibold sm:grid-cols-[1fr_150px_170px]">
            <p className="p-5 text-[#9A9EA6]">{compacta ? '' : 'Qué incluye'}</p>
            <p className="p-5 text-center text-[#6B7079]">Carta QR<span className="block text-[11px] font-normal">con todo</span></p>
            <p className="bg-[#0A080C] p-5 text-center text-white">Signature<span className="block text-[11px] font-normal text-[#D9B25C]">tu app</span></p>
          </div>
          {grupos.map((grupo) => (
            <div key={grupo.g || 'portada'}>
              {grupo.g && (
                <div className="grid grid-cols-[1fr_92px_112px] border-t border-[#ECECE8] sm:grid-cols-[1fr_150px_170px]">
                  <p className="px-5 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A9EA6]">{grupo.g}</p><span /><span className="bg-[#0A080C]" />
                </div>
              )}
              {grupo.filas.map((f) => (
                <div key={f.t} className="grid grid-cols-[1fr_92px_112px] items-center border-t border-[#F1F0EC] sm:grid-cols-[1fr_150px_170px]">
                  <p className={`px-5 py-3.5 text-[14.5px] ${f.clave ? 'font-semibold text-[#17191E]' : 'text-[#3F434B]'}`}>{f.t}</p>
                  <p className="py-3.5 text-center"><Marca v={f.qr} /></p>
                  <p className="h-full bg-[#0A080C] py-3.5 text-center"><span className="inline-flex h-full items-center"><Marca v={f.sig} oscuro /></span></p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {variante === 'signature' ? (
            <a href="#precio" className="inline-flex rounded-full bg-[#6E0C2B] px-7 py-4 text-[15px] font-semibold text-white shadow-[0_10px_40px_rgba(163,24,74,.35)]">Quiero mi app →</a>
          ) : (
            <Link href="/base-operativa" className="inline-flex rounded-full bg-[#17191E] px-7 py-4 text-[15px] font-semibold text-white">Conocer DKitchen Signature →</Link>
          )}
          {variante !== 'signature' && <p className="text-sm text-[#6B7079]">Empieza con la carta por 1 € y da el salto cuando tu negocio lo pida.</p>}
        </div>
      </div>
    </section>
  );
}
