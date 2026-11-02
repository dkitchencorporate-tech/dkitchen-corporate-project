import 'server-only';
import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont } from 'pdf-lib';
import { contratoDe, rellenar, type Contrato } from '@/lib/contratos';

/**
 * Contrato del comercial (0116, decisiones de Alex 02/11/2026): se firma AL ENTRAR en Academia, antes de formarse.
 * Comisión: 20 % de lo cobrado (sin IVA) durante los 12 primeros meses de cada cliente. La casilla = firma
 * electrónica simple: la base guarda fecha, IP, navegador, versión y la huella SHA-256 del texto exacto firmado,
 * y el PDF se regenera siempre desde esos datos (mismo texto → misma huella).
 */
export const COMISION_COMERCIAL = '20 % de lo cobrado (sin IVA) durante los 12 primeros meses de cada cliente';
export type DatosAgente = { nombre: string; nif: string; domicilio: string; zona: string };
export type ContratoFirmado = {
  firmado: boolean; id?: string; version?: string; huella?: string; datos?: DatosAgente; comision?: string;
  simulacion: boolean; firmado_en?: string; email?: string; nombre?: string; rol?: string; ip?: string;
};

const fechaLarga = (d: Date) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }).format(d);

export function contratoComercial(datos: DatosAgente, firmadoEn?: Date): Contrato {
  const base = contratoDe('comercial');
  return rellenar(base, {
    'nombre del agente': datos.nombre || '[[nombre del agente]]',
    NIF: datos.nif || '[[NIF]]',
    'dirección': datos.domicilio || '[[dirección]]',
    zona: datos.zona || 'España (sin zona exclusiva)',
    'fecha de firma': firmadoEn ? fechaLarga(firmadoEn) : 'la de la firma electrónica',
  });
}

/** Texto canónico (lo que se firma y se hashea). */
export function textoContrato(c: Contrato): string {
  return [
    `${c.titulo} · ${c.version} · ${c.fecha}`,
    'REUNIDOS', ...c.partes,
    ...c.clausulas.flatMap((k) => [`${k.n}. ${k.titulo}`, ...k.texto]),
    'ANEXO A', ...c.anexo.map((a) => `${a.campo}: ${a.valor}`),
  ].join('\n');
}
export const huellaDe = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex');

/** Helvetica (WinAnsi) no tiene todos los signos: se cambian los que faltan por equivalentes legibles. */
const limpio = (s: string) => s
  .replace(/[→⟶]/g, '->').replace(/[≥]/g, '>=').replace(/[≤]/g, '<=').replace(/[−–]/g, '-').replace(/[—]/g, '-')
  .replace(/[   ]/g, ' ').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ€‘’“”«»…•]/g, '');

function partir(texto: string, f: PDFFont, tam: number, ancho: number): string[] {
  const out: string[] = [];
  for (const parrafo of limpio(texto).split('\n')) {
    let linea = '';
    for (const palabra of parrafo.split(/\s+/)) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (f.widthOfTextAtSize(prueba, tam) > ancho && linea) { out.push(linea); linea = palabra; } else linea = prueba;
    }
    out.push(linea);
  }
  return out;
}

export async function pdfContrato(c: Contrato, meta: { simulacion: boolean; firmadoEn: Date; huella: string; email: string; ip?: string | null }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${c.titulo} · ${c.version}`); doc.setAuthor('DKitchen'); doc.setCreator('Central DKitchen');
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const vino = rgb(0.43, 0.05, 0.17), gris = rgb(0.4, 0.38, 0.36), tinta = rgb(0.1, 0.09, 0.08);
  const A4: [number, number] = [595.28, 841.89], M = 56, ANCHO = A4[0] - 2 * M;
  let p = doc.addPage(A4), y = A4[1] - M;
  const marca = () => {
    if (meta.simulacion) {
      p.drawText('SIMULACION - SIN VALOR LEGAL', { x: 70, y: 300, size: 46, font: fb, color: rgb(0.85, 0.2, 0.2), opacity: 0.12, rotate: degrees(35) });
    }
    p.drawText(limpio(`DKitchen · ${c.titulo} · ${c.version}`), { x: M, y: 28, size: 7.5, font: f, color: gris });
    p.drawText(`Página ${doc.getPageCount()}`, { x: A4[0] - M - 40, y: 28, size: 7.5, font: f, color: gris });
  };
  marca();
  const salto = (alto: number) => { if (y - alto < M) { p = doc.addPage(A4); y = A4[1] - M; marca(); } };
  const escribir = (t: string, o: { font?: PDFFont; tam?: number; color?: typeof tinta; antes?: number; interlinea?: number } = {}) => {
    const font = o.font ?? f, tam = o.tam ?? 9.5, il = o.interlinea ?? tam * 1.42;
    y -= o.antes ?? 0;
    for (const l of partir(t, font, tam, ANCHO)) { salto(il); p.drawText(l, { x: M, y: y - tam, size: tam, font, color: o.color ?? tinta }); y -= il; }
  };
  escribir('DKITCHEN', { font: fb, tam: 9, color: vino });
  escribir(c.titulo, { font: fb, tam: 17, antes: 4 });
  escribir(`${c.tipo} · ${c.version} · texto del ${c.fecha}`, { tam: 9, color: gris, antes: 2 });
  if (meta.simulacion) escribir('SIMULACIÓN: firma de prueba de la titular para comprobar el recorrido del comercial. Sin valor legal.', { font: fb, tam: 9.5, color: rgb(0.7, 0.1, 0.1), antes: 6 });
  escribir('REUNIDOS', { font: fb, tam: 10.5, antes: 12 });
  for (const parte of c.partes) escribir(parte, { antes: 4 });
  for (const k of c.clausulas) {
    escribir(`${k.n}. ${k.titulo}`, { font: fb, tam: 10.5, antes: 10 });
    for (const t of k.texto) escribir(t, { antes: 3 });
  }
  escribir('ANEXO A · Datos de este contrato', { font: fb, tam: 10.5, antes: 12 });
  for (const a of c.anexo) escribir(`${a.campo}: ${a.valor}`, { antes: 2 });
  salto(150);
  escribir('FIRMA ELECTRÓNICA', { font: fb, tam: 10.5, antes: 14 });
  escribir(`Firmado por el Agente marcando la casilla «He leído el contrato y lo acepto» en la Academia de DKitchen, con la cuenta ${meta.email}.`, { antes: 4 });
  escribir(`Fecha y hora: ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'Europe/Madrid' }).format(meta.firmadoEn)} (hora de Madrid)`, { antes: 3 });
  if (meta.ip) escribir(`IP: ${meta.ip}`, { antes: 2 });
  escribir(`Huella SHA-256 del texto firmado: ${meta.huella}`, { tam: 8, color: gris, antes: 3 });
  escribir('DKitchen acepta este contrato con el alta del Agente en Central. El texto de arriba es exactamente el que se firmó: cualquier cambio altera la huella.', { tam: 8.5, color: gris, antes: 6 });
  return doc.save();
}
