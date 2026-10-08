import type { Metadata } from 'next';
import Link from 'next/link';
import OrdenBumpAuditoria from '@/components/OrdenBumpAuditoria';
import PasosPago from '@/components/pago/PasosPago';
import ReenviarAcceso from '@/components/pago/ReenviarAcceso';
import OfertaPuestaAPunto from '@/components/pago/OfertaPuestaAPunto';

export const metadata: Metadata = {
  title: 'Pago confirmado | DKitchen',
  robots: { index: false, follow: false },
};

const WHATSAPP = 'https://wa.me/34622652659?text=Hola,%20acabo%20de%20activar%20mi%20carta%20QR%20y%20tengo%20una%20duda.';

/**
 * Paso 3 del alta QR y Fundador (08/10, fallo 4 de la entrada 122): qué hacer
 * ahora, en 3 pasos y con el correo usado a la vista; «Reenviar correo» y
 * WhatsApp si algo falla. La Auditoría se ofrece DESPUÉS de los pasos.
 */
export default async function BienvenidaQr({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; nombre?: string; restaurante?: string; auditoria?: string; r?: string; puesta?: string }>;
}) {
  const { email = '', nombre = '', restaurante = '', auditoria, r = '', puesta } = await searchParams;
  const nombreCorto = nombre.trim().split(/\s+/)[0] ?? '';

  const pasos = [
    {
      titulo: 'Abre tu correo',
      texto: (
        <>
          Te hemos enviado <strong className="text-tinta">«Crea tu contraseña de DKitchen»</strong> desde dkitchen@dkitchencorporate.es
          {email ? <> a <strong className="break-all text-tinta">{email}</strong></> : null}. Llega en 1 o 2 minutos; si no lo ves, mira en spam o promociones.
        </>
      ),
      extra: <ReenviarAcceso email={email} />,
    },
    {
      titulo: 'Crea tu contraseña',
      texto: <>Pulsa el botón del correo y elige una contraseña de 8 caracteres o más. El enlace caduca pronto: si se te pasa, pide otro con «Reenviar el correo».</>,
    },
    {
      titulo: 'Entra en tu panel y monta tu carta',
      texto: <>El montaje guiado te lleva paso a paso: subes la carta (vale una foto), revisas los platos y descargas tu QR para las mesas.</>,
      extra: (
        <Link href="/panel/iniciar-sesion" className="mt-3 inline-flex rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-vino-hondo">
          Ir a mi panel
        </Link>
      ),
    },
  ];

  return (
    <div className="bg-crema text-tinta">
      <section className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 md:pt-16">
        <PasosPago actual={3} />

        <div className="mt-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-vino text-2xl text-white" aria-hidden="true">✓</div>
          <h1 className="font-display mt-5 text-3xl font-semibold md:text-4xl">
            Pago confirmado{nombreCorto ? `, ${nombreCorto}` : ''}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-pizarra">
            {restaurante ? <><strong className="text-tinta">{restaurante}</strong> ya está dado de alta en DKitchen.</> : 'Tu local ya está dado de alta en DKitchen.'}{' '}
            Te quedan 3 pasos para tener la carta en las mesas.
          </p>
        </div>

        <ol className="mt-10 space-y-4">
          {pasos.map((p, i) => (
            <li key={p.titulo} className="flex gap-4 rounded-[24px] border border-linea bg-white p-5 sm:p-6">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-vino text-sm font-semibold text-vino">{i + 1}</span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold">{p.titulo}</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-pizarra">{p.texto}</p>
                {p.extra}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-center text-[13px] leading-relaxed text-pizarra">
          También te llega «Bienvenido a DKitchen» con el resumen de tu plan, y la factura de Stripe con el IVA desglosado.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 rounded-[24px] bg-papel px-5 py-6 text-center">
          <p className="text-[15px] font-semibold">¿No te llega el correo o algo no cuadra?</p>
          <p className="text-[13px] text-pizarra">Escríbenos y lo resolvemos al momento.</p>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="rounded-full bg-tinta px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black">
            Escribir por WhatsApp
          </a>
        </div>

        {puesta === 'ok' ? (
          <div className="mt-10 rounded-[24px] border border-linea bg-white p-6 text-center">
            <p className="font-semibold text-vino">Puesta a punto contratada.</p>
            <p className="mt-1 text-sm text-pizarra">Te escribimos hoy para pedirte la carta y los datos de tu TPV e impresoras. Tú no tienes que montar nada.</p>
          </div>
        ) : r && !auditoria ? (
          <>
            <p className="mt-14 text-center"><span className="etiqueta-dk text-vino">Una oferta antes de empezar</span></p>
            <OfertaPuestaAPunto r={r} />
          </>
        ) : null}

        {auditoria === 'ok' ? (
          <div className="mt-10 rounded-[24px] border border-linea bg-white p-6 text-center">
            <p className="font-semibold text-vino">Auditoría reservada.</p>
            <p className="mt-1 text-sm text-pizarra">Te escribimos en breve para agendar tu reunión 1 a 1.</p>
          </div>
        ) : (
          <>
            <p className="mt-14 text-center"><span className="etiqueta-dk text-pizarra">Cuando tengas la carta en marcha</span></p>
            <OrdenBumpAuditoria email={email} nombreContacto={nombre} restauranteNombre={restaurante} />
          </>
        )}

        <p className="mt-10 text-center">
          <Link href="/" className="text-sm text-pizarra underline-offset-2 hover:underline">Volver al inicio</Link>
        </p>
      </section>
    </div>
  );
}
