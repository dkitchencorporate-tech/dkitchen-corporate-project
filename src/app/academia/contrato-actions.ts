'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { exigirAcademia } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { contratoDe } from '@/lib/contratos';
import { COMISION_COMERCIAL, contratoComercial, textoContrato, huellaDe, pdfContrato, type ContratoFirmado } from '@/lib/contrato-comercial';
import { enviarCorreoCliente, enviarCorreoInterno, escaparHtml } from '@/lib/email';

/**
 * Firma del contrato del comercial (0116): la casilla + el botón = firma electrónica simple. La base valida
 * NIF y domicilio, guarda la prueba y decide si es simulación. Después llega el PDF por correo.
 */
const NIF = /^([0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[A-HJ-NP-SUVW][0-9]{7}[0-9A-J])$/;
const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';
function nifValido(n: string): boolean {
  if (!NIF.test(n)) return false;
  if (/^[0-9]{8}[A-Z]$/.test(n)) return LETRAS[Number(n.slice(0, 8)) % 23] === n[8];
  if (/^[XYZ]/.test(n)) return LETRAS[Number('XYZ'.indexOf(n[0]) + n.slice(1, 8)) % 23] === n[8];
  return true; // CIF: la forma ya está comprobada; la base vuelve a validar
}

export async function firmarContratoAction(f: FormData) {
  const jwt = await exigirAcademia();
  const datos = {
    nombre: String(f.get('nombre') ?? '').trim().replace(/\s+/g, ' ').slice(0, 120),
    nif: String(f.get('nif') ?? '').trim().toUpperCase().replace(/[\s.-]/g, '').slice(0, 12),
    domicilio: String(f.get('domicilio') ?? '').trim().replace(/\s+/g, ' ').slice(0, 240),
    zona: String(f.get('zona') ?? '').trim().slice(0, 120),
  };
  if (f.get('acepto') !== 'si') redirect('/academia?e=acepto#contrato');
  if (datos.nombre.length < 5) redirect('/academia?e=nombre#contrato');
  if (!nifValido(datos.nif)) redirect('/academia?e=nif#contrato');
  if (datos.domicilio.length < 10) redirect('/academia?e=domicilio#contrato');

  const contrato = contratoComercial(datos);
  const huella = huellaDe(textoContrato(contrato));
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || null;
  const navegador = (h.get('user-agent') ?? '').slice(0, 300);
  let j: ContratoFirmado | null = null;
  try {
    j = await comoCliente(jwt, async (c) => (await c.query<{ j: ContratoFirmado }>('SELECT dk.comercial_firmar($1, $2, $3::jsonb, $4, $5, $6) AS j',
      [contratoDe('comercial').version, huella, JSON.stringify(datos), COMISION_COMERCIAL, ip, navegador])).rows[0].j);
  } catch (e) {
    const m = String((e as Error)?.message ?? '');
    redirect(`/academia?e=${/NIF/.test(m) ? 'nif' : /domicilio/.test(m) ? 'domicilio' : /nombre/.test(m) ? 'nombre' : 'base'}#contrato`);
  }
  if (j?.firmado && j.email) {
    try {
      const pdf = await pdfContrato(contrato, { simulacion: j.simulacion, firmadoEn: new Date(j.firmado_en!), huella, email: j.email, ip });
      const nombreArchivo = `Contrato-agente-DKitchen-${contrato.version}${j.simulacion ? '-SIMULACION' : ''}.pdf`;
      await enviarCorreoCliente(j.email, j.simulacion ? 'Tu contrato de agente (SIMULACIÓN) · DKitchen' : 'Tu contrato de agente firmado · DKitchen',
        `<p>Hola, ${escaparHtml(datos.nombre.split(' ')[0])}:</p>
         <p>Tu contrato de agente comercial independiente con DKitchen ha quedado <strong>firmado</strong>${j.simulacion ? ' <strong>como simulación (sin valor legal)</strong>' : ''}. Te lo adjuntamos en PDF.</p>
         <p>Comisión: <strong>${escaparHtml(COMISION_COMERCIAL)}</strong>. Puedes descargarlo cuando quieras desde la Academia.</p>
         <p>Siguiente paso: la formación. Al aprobarla, dirección te habilita para vender.</p>`,
        { titulo: 'Contrato firmado', boton: { texto: 'Ir a la Academia', url: 'https://dkitchencorporate.es/academia' }, adjuntos: [{ filename: nombreArchivo, content: Buffer.from(pdf), contentType: 'application/pdf' }] });
      await enviarCorreoInterno(`CONTRATO DE AGENTE FIRMADO${j.simulacion ? ' (SIMULACIÓN)' : ''}: ${datos.nombre}`,
        `<p><strong>${escaparHtml(datos.nombre)}</strong> (${escaparHtml(j.email)}) ha firmado el contrato de agente ${escaparHtml(contrato.version)}${j.simulacion ? ' como <strong>simulación</strong>' : ''}.</p><p>Lo tienes en Central → Ventas → Comerciales, con su PDF.</p>`,
        { adjuntos: [{ filename: nombreArchivo, content: Buffer.from(pdf), contentType: 'application/pdf' }] }).catch(() => {});
    } catch (e) {
      console.error('Contrato comercial: firmado, pero no se pudo enviar el PDF', e);
      redirect('/academia?firmado=1&correo=no');
    }
  }
  redirect('/academia?firmado=1');
}
