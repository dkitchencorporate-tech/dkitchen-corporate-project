import ActivarPlanBoton from '@/components/sections/ActivarPlanBoton';
import { TextoRevelado } from '@/components/dk/Movimiento';
import { QR_MENU } from '@/lib/pricing-config';

/**
 * Precios de /qr. Planes por cantidades (decisión A de karc0, 07/10; 0050):
 * Carta 9 €, Local 29 € (el que se impulsa, único con el primer mes a 1 €)
 * y Sala 69 € con todo incluido. Cifras de pricing-config; topes, de la base.
 */
const { basico: C, ampliado: L, sala: S } = QR_MENU.planes;
const CARTA = [`Hasta ${C.topes.productos} productos`, 'Fotos, precios y alérgenos', `${C.topes.reservasMes} reservas al mes desde la carta`, `Aviso del camarero en tu panel (${C.topes.mesas} mesas)`, '1 banner de promoción', 'QR que nunca reimprimes'];
const LOCAL = [`Hasta ${L.topes.productos} productos`, `Plano con ${L.topes.mesas} mesas`, `App de sala para ${L.topes.camareros} camareros`, `${L.topes.reservasMes} reservas al mes con aviso`, 'Llamada al camarero y petición de la cuenta', '3 banners programables', 'Botón de reseñas de Google', 'TPV y Comandero Pro como extras'];
const SALA = [`Hasta ${S.topes.productos} productos y ${S.topes.mesas} mesas`, `${S.topes.camareros} personas en el equipo, con encargados`, `${S.topes.reservasMes} reservas al mes`, 'Conexión con tu TPV incluida', 'Comandero Pro incluido', 'Carta en hasta 3 idiomas'];
const GARANTIAS = ['Local: primer mes por 1 €', 'Sin permanencia', 'Cancelas desde tu panel', 'Alérgenos según el Reglamento UE', 'Soporte en español'];

const Check = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`mt-0.5 shrink-0 ${className}`} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

function Lateral({ id, nombre, lema, mensual, funciones }: { id: 'basico' | 'sala'; nombre: string; lema: string; mensual: number; funciones: string[] }) {
  return (
    <article className="flex flex-col rounded-[32px] border border-linea bg-crema p-8 md:p-10">
      <h3 className="text-lg font-semibold text-tinta">{nombre}</h3>
      <p className="mt-1 text-sm text-niebla">{lema}</p>
      <p className="mt-8 text-tinta"><span className="font-display text-6xl font-semibold">{mensual} €</span><span className="ml-1 text-niebla">/mes + IVA</span></p>
      <p className="mt-1 text-sm text-niebla">Sin permanencia</p>
      <ul className="mt-8 flex-1 space-y-3 text-[15px] text-grafito">{funciones.map((f) => <li key={f} className="flex gap-3"><Check />{f}</li>)}</ul>
      <ActivarPlanBoton plan={id} etiqueta={`Empezar con ${nombre}`}
        className="mt-10 w-full rounded-full border border-tinta py-4 text-[15px] font-semibold text-tinta transition hover:bg-tinta hover:text-white" />
    </article>
  );
}

export default function PlanesQr() {
  return (
    <section id="planes" className="scroll-mt-24 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="etiqueta-dk text-vino">Precios</p>
          <TextoRevelado texto="Empieza por 1 €. Quédate si te sirve." className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-tinta md:text-6xl" />
          <p className="mt-5 text-lg text-niebla">Planes por tamaño, no por módulos: cada uno trae un poco de todo, ajustado a tu local.</p>
        </div>

        <div className="mt-16 grid items-center gap-6 lg:grid-cols-[1fr_1.2fr_1fr]">
          <div className="order-2 lg:order-1"><Lateral id="basico" nombre={C.nombre} lema="Para un bar pequeño que empieza." mensual={C.mensual} funciones={CARTA} /></div>

          <article className="relative order-1 flex flex-col overflow-hidden rounded-[36px] bg-tinta p-8 text-white shadow-[0_40px_100px_rgba(23,25,30,.35)] md:p-12 lg:order-2 lg:-my-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.4),transparent)]" />
            <div className="relative -mx-8 -mt-8 mb-8 bg-vino px-8 py-3 text-center text-sm font-bold uppercase tracking-[0.2em] md:-mx-12 md:-mt-12">El más elegido</div>
            <h3 className="relative text-xl font-semibold">{L.nombre}</h3>
            <p className="relative mt-1 text-sm text-white/55">Tu carta y tu sala, conectadas.</p>
            <p className="relative mt-8"><span className="font-display text-7xl font-semibold">{L.mensual} €</span><span className="ml-1 text-white/50">/mes + IVA</span></p>
            <p className="relative mt-1 text-sm text-white/55">Primer mes: {QR_MENU.primerMes} € + IVA</p>
            <ul className="relative mt-8 flex-1 space-y-3 text-[15px] text-white/80">{LOCAL.map((f) => <li key={f} className="flex gap-3"><Check className="text-vino" />{f}</li>)}</ul>
            <ActivarPlanBoton plan="ampliado" etiqueta={`Empezar con ${L.nombre} por ${QR_MENU.primerMes} €`}
              className="relative mt-10 w-full rounded-full bg-vino py-5 text-base font-semibold text-white transition hover:bg-vino-hondo" />
          </article>

          <div className="order-3"><Lateral id="sala" nombre={S.nombre} lema="Todo incluido para una sala con equipo." mensual={S.mensual} funciones={SALA} /></div>
        </div>

        <ul className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-grafito">
          {GARANTIAS.map((g) => <li key={g} className="flex items-center gap-2"><Check className="text-exito" />{g}</li>)}
        </ul>
        <p className="mt-6 text-center text-sm text-ceniza">Si te quedas corto, el panel te avisa antes de llegar al límite (te dejamos un 10 % de margen) y subes de plan en un minuto. La llamada al camarero nunca se corta.</p>
      </div>
    </section>
  );
}
