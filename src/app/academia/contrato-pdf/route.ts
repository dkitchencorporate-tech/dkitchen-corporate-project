import { exigirAcademia } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { contratoComercial, pdfContrato, textoContrato, huellaDe, type ContratoFirmado, type DatosAgente } from '@/lib/contrato-comercial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PDF del contrato firmado del propio comercial (0116). Se regenera desde lo firmado: misma huella. */
export async function GET() {
  const jwt = await exigirAcademia();
  const j = await comoCliente(jwt, async (c) => (await c.query<{ j: ContratoFirmado }>('SELECT dk.comercial_mi_contrato() AS j')).rows[0].j).catch(() => null);
  if (!j?.firmado || !j.datos) return new Response('Aún no has firmado tu contrato.', { status: 404 });
  const contrato = contratoComercial(j.datos as DatosAgente);
  const huella = huellaDe(textoContrato(contrato));
  const pdf = await pdfContrato(contrato, { simulacion: j.simulacion, firmadoEn: new Date(j.firmado_en!), huella: j.huella ?? huella, email: j.email ?? '' });
  return new Response(new Uint8Array(pdf), { headers: {
    'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
    'Content-Disposition': `attachment; filename="Contrato-agente-DKitchen-${j.version}${j.simulacion ? '-SIMULACION' : ''}.pdf"`,
    'X-Huella-Coincide': String(huella === j.huella),
  } });
}
