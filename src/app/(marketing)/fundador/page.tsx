import type { Metadata } from 'next';
import Link from 'next/link';
import { QR_MENU, FUNDADOR } from '@/lib/pricing-config';
import { estadoFundador } from '@/lib/fundador';
import ContadorFundador from '@/components/fundador/ContadorFundador';
import ActivarPlanBoton from '@/components/sections/ActivarPlanBoton';

export const metadata: Metadata = {
  title: 'Fundador · DKitchen Corporate',
  description: `Plan ${QR_MENU.planes.sala.nombre} al 40 % de por vida para los primeros ${FUNDADOR.plazas} locales.`,
  robots: { index: false, follow: false },
};

// Landing privada (flyer y socio): no está en el menú ni en el sitemap. El estado vivo sale de la base.
export const dynamic = 'force-dynamic';

const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';
const S = QR_MENU.planes.sala;
const INCLUYE = [
  `Carta digital con hasta ${S.topes.productos} productos, fotos y alérgenos`,
  `Plano con ${S.topes.mesas} mesas y llamada al camarero`,
  `App de sala para ${S.topes.camareros} personas, con encargados`,
  `${S.topes.reservasMes} reservas al mes con aviso al momento`,
  'Conexión con tu TPV y Comandero Pro',
  'Carta en hasta 3 idiomas',
];
const REGLAS = [
  'El precio se mantiene de por vida mientras sigas activo en el plan Sala y sin impagos.',
  'Se pierde si te das de baja o si bajas a un plan inferior. No es transferible.',
  'Se cobra por trimestre, por adelantado. Sin permanencia: si te vas, no se renueva (lo pagado no se devuelve).',
  'Los módulos nuevos que añadamos a Sala te llegan con el mismo 40 %.',
];

export default async function Fundador() {
  const e = await estadoFundador();
  const abierto = e?.abierto === true;
  return (
    <div className="bg-crema px-6 pb-24 pt-36 text-tinta md:pt-44">
      <div className="mx-auto max-w-5xl">
        <p className="etiqueta-dk text-vino">Oferta Fundador · solo {FUNDADOR.plazas} locales</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-6xl">Todo DKitchen para tu sala, al 40 % de por vida.</h1>
        <p className="mt-5 max-w-2xl text-lg text-niebla">
          Plan {S.nombre} completo por <strong className="text-tinta">{eur(FUNDADOR.mensual)}/mes</strong> en lugar de {eur(S.mensual)}.
          Lo pagas por trimestre: {eur(FUNDADOR.trimestre)} + IVA.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <section className="rounded-[28px] border border-linea bg-white p-7 md:p-9">
            <h2 className="text-lg font-semibold">Qué incluye</h2>
            <ul className="mt-5 space-y-3 text-[15px] text-grafito">
              {INCLUYE.map((x) => <li key={x} className="flex gap-3"><span aria-hidden="true" className="text-vino">✓</span>{x}</li>)}
            </ul>
            <h2 className="mt-9 text-lg font-semibold">Reglas claras</h2>
            <ul className="mt-4 space-y-2 text-sm text-niebla">{REGLAS.map((x) => <li key={x}>· {x}</li>)}</ul>
            <p className="mt-4 text-sm text-niebla">Texto completo en las <Link href="/terms#fundador" className="underline">condiciones del servicio</Link>.</p>
          </section>

          <aside className="flex flex-col gap-5 rounded-[28px] bg-tinta p-7 text-white md:p-9">
            <p className="text-sm text-white/60">Precio Fundador</p>
            <p><span className="font-display text-6xl font-semibold">{eur(FUNDADOR.trimestre)}</span><span className="ml-1 text-white/55">/trimestre + IVA</span></p>
            <p className="-mt-3 text-sm text-white/55">{eur(FUNDADOR.mensual)} al mes · antes {eur(S.mensual)}</p>
            {e && <ContadorFundador oscuro quedan={e.quedan} plazas={e.plazas} cierraEn={e.cierraEn} />}
            {abierto ? (
              <ActivarPlanBoton plan="fundador" etiqueta="Quiero ser Fundador"
                className="w-full rounded-full bg-vino py-4 text-base font-semibold text-white transition hover:bg-vino-hondo" />
            ) : (
              <div className="rounded-2xl bg-white/10 p-5 text-sm text-white/80">
                {e?.motivo === 'sin_abrir' ? 'La oferta Fundador aún no está abierta. Vuelve pronto.' : 'La oferta Fundador está cerrada.'}{' '}
                Puedes empezar con el plan {QR_MENU.planes.ampliado.nombre} por {QR_MENU.primerMes} € el primer mes.
                <Link href="/qr#planes" className="mt-3 block font-semibold text-white underline">Ver planes</Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
