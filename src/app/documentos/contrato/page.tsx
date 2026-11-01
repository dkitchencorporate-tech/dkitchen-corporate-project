import type { Metadata } from 'next';
import Link from 'next/link';
import { leerRefPago } from '@/lib/payments/stripe';
import { CONTRATOS, PUBLICOS, contratoDe, type Contrato } from '@/lib/contratos';
import { cobroDocumentado, contratoRellenado } from '@/lib/documentos-cliente';
import HojaContrato from '@/components/contratos/HojaContrato';
import BotonImprimir from '@/components/contratos/BotonImprimir';

export const metadata: Metadata = { title: 'Tu contrato · DKitchen', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Contratos para el cliente (01/11/2026, automatización de Alex).
 * - ?r=<referencia firmada de la factura>: los contratos que firmó con ese pago, rellenados con sus
 *   datos, los del pago y la aceptación. La referencia va firmada (HMAC): nadie puede ver uno ajeno.
 * - ?modelo=<id>: la plantilla que se acepta antes de pagar (solo las públicas).
 */
export default async function ContratoCliente({ searchParams }: { searchParams: Promise<{ r?: string; c?: string; modelo?: string }> }) {
  const sp = await searchParams;
  const factura = leerRefPago(sp.r);
  const cobro = factura?.startsWith('in_') ? await cobroDocumentado(factura) : null;
  const modelo = !sp.r && sp.modelo && PUBLICOS.has(sp.modelo as Contrato['id']) ? contratoDe(sp.modelo) : null;

  if (!cobro && !modelo) {
    return (
      <main className="min-h-screen bg-crema px-6 py-24 text-tinta">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-3xl font-semibold">Este enlace no es válido</h1>
          <p className="mt-4 text-pizarra">Puede que esté incompleto o que el pago todavía no se haya confirmado. Tus contratos están siempre en tu panel, en «Mis documentos».</p>
          <Link href="/panel" className="mt-8 inline-block rounded-full bg-vino px-7 py-3.5 text-sm font-semibold text-white">Ir a mi panel</Link>
        </div>
      </main>
    );
  }

  const ids = cobro ? cobro.contratos : [modelo!.id];
  const actual = (ids.includes(sp.c as Contrato['id']) ? sp.c : ids[0]) as Contrato['id'];
  const hoja = cobro ? contratoRellenado(cobro, actual) : modelo!;

  return (
    <main className="min-h-screen bg-crema px-4 py-10 text-tinta sm:px-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-[210mm] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div className="min-w-0">
            <Link href="/" className="font-display text-2xl font-bold">D<span className="text-vino">Kitchen</span></Link>
            <p className="mt-2 text-sm text-pizarra">{cobro ? `Pago del ${cobro.fecha} · ${cobro.total} · factura ${cobro.numero}` : 'Modelo de contrato: así queda, con tus datos, al pagar.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cobro?.pdf && <a href={cobro.pdf} className="rounded-full border border-acero px-5 py-2.5 text-sm font-semibold hover:border-vino">Descargar la factura</a>}
            <BotonImprimir />
          </div>
        </header>
        {ids.length > 1 && (
          <nav aria-label="Contratos de este pago" className="flex flex-wrap gap-2 print:hidden">
            {ids.map((id) => (
              <Link key={id} href={`/documentos/contrato?r=${encodeURIComponent(sp.r ?? '')}&c=${id}`} aria-current={id === actual ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${id === actual ? 'bg-tinta text-white' : 'bg-white text-tinta ring-1 ring-linea hover:ring-vino'}`}>
                {CONTRATOS.find((x) => x.id === id)?.titulo}
              </Link>
            ))}
          </nav>
        )}
        <HojaContrato c={hoja} firmado={cobro?.firmado} />
      </div>
    </main>
  );
}
