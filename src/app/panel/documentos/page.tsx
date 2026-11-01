import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { stripe, stripeConfigurado } from '@/lib/payments/stripe';
import { documentosDelCliente } from '@/lib/documentos-cliente';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis documentos · DKitchen', robots: { index: false, follow: false } };

/**
 * Mis documentos (01/11/2026, automatización de Alex): todas las facturas pagadas y los contratos
 * firmados del cliente, sea cual sea el servicio. El cliente de Stripe se busca por el correo de la
 * cuenta con sesión (el mismo con el que se crea cada cobro), así entran QR, Signature, Experience y extras.
 */
export default async function MisDocumentos() {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  const yo = jwt ? await identidadActual().catch(() => null) : null;
  if (!jwt || !yo?.email) redirect('/panel/iniciar-sesion');

  let docs: Awaited<ReturnType<typeof documentosDelCliente>> | null = [];
  if (stripeConfigurado()) {
    try {
      const l = await stripe('GET', '/customers', { email: yo.email.toLowerCase(), limit: 1 });
      const cliente = (l.data as { id: string }[])[0]?.id;
      docs = cliente ? await documentosDelCliente(cliente) : [];
    } catch (e) {
      console.error('Mis documentos: no se pudieron leer', e);
      docs = null;
    }
  }

  return (
    <main className="min-h-screen bg-crema px-4 py-10 text-tinta sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/panel" className="text-sm font-semibold text-vino underline-offset-2 hover:underline">← Volver al panel</Link>
        <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-vino/50 blur-3xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Tu cuenta</p>
          <h1 className="font-display relative mt-2 text-3xl font-semibold">Mis documentos</h1>
          <p className="relative mt-2 text-sm text-white/70">Tus facturas y tus contratos firmados, siempre a mano. Se añaden solos con cada pago.</p>
        </header>

        {docs === null && <p className="rounded-[22px] border border-linea bg-white p-6 text-center text-sm text-pizarra">No se pudieron cargar tus documentos ahora. Inténtalo en unos minutos.</p>}
        {docs && !docs.length && <p className="rounded-[22px] border border-linea bg-white p-6 text-center text-sm text-pizarra">Todavía no hay pagos en tu cuenta. Cuando pagues, aquí aparecerán tu factura y tu contrato.</p>}
        {docs && docs.length > 0 && (
          <ul className="divide-y divide-linea overflow-hidden rounded-[22px] border border-linea bg-white">
            {docs.map((d) => (
              <li key={d.factura} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="font-semibold">Factura {d.numero}</p>
                  <p className="text-sm text-pizarra">{d.fecha} · {d.total}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.pdf && <a href={d.pdf} className="rounded-full border border-acero px-4 py-2 text-sm font-semibold hover:border-vino">Factura (PDF)</a>}
                  {d.contrato && <a href={d.contrato} className="rounded-full bg-vino px-4 py-2 text-sm font-semibold text-white hover:bg-vino-hondo">Contrato</a>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
