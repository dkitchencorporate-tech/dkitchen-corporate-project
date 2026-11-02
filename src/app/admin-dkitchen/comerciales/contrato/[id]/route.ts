import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { contratoComercial, pdfContrato, textoContrato, huellaDe, type ContratoFirmado, type DatosAgente } from '@/lib/contrato-comercial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Central → Comerciales (0116): PDF del contrato firmado de un comercial (solo dirección: lo exige la base).
 * «muestra» = vista previa con datos de ejemplo, para comprobar el documento sin firmar nada.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const jwt = await exigirAdmin();
  const { id } = await params;
  if (id === 'muestra') {
    const esDir = await comoCliente(jwt, async (c) => (await c.query<{ d: boolean }>('SELECT dk.es_direccion() AS d')).rows[0]?.d === true).catch(() => false);
    if (!esDir) return new Response('Solo dirección.', { status: 403 });
    const contrato = contratoComercial({ nombre: 'Nombre Apellido Ejemplo', nif: '12345678Z', domicilio: 'Calle Mayor 1, 18800 Baza (Granada)', zona: 'Baza y comarca' });
    const pdf = await pdfContrato(contrato, { simulacion: true, firmadoEn: new Date(), huella: huellaDe(textoContrato(contrato)), email: 'ejemplo@dkitchencorporate.es', ip: '0.0.0.0' });
    return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline; filename="Contrato-agente-MUESTRA.pdf"' } });
  }
  if (!UUID.test(id)) return new Response('No válido.', { status: 400 });
  const j = await comoCliente(jwt, async (c) => (await c.query<{ j: ContratoFirmado | null }>('SELECT dk.admin_contrato_comercial($1) AS j', [id])).rows[0].j).catch(() => null);
  if (!j?.datos) return new Response('No encontrado o sin permiso.', { status: 404 });
  const contrato = contratoComercial(j.datos as DatosAgente);
  const pdf = await pdfContrato(contrato, { simulacion: j.simulacion, firmadoEn: new Date(j.firmado_en!), huella: j.huella ?? '', email: j.email ?? '', ip: j.ip });
  return new Response(new Uint8Array(pdf), { headers: {
    'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
    'Content-Disposition': `inline; filename="Contrato-agente-${j.version}${j.simulacion ? '-SIMULACION' : ''}.pdf"`,
    'X-Huella-Coincide': String(huellaDe(textoContrato(contrato)) === j.huella),
  } });
}
