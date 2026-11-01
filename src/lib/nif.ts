/**
 * NIF español (01/11/2026, facturas completas): DNI, NIE y CIF con su dígito de control.
 * Lo usan el navegador (aviso inmediato) y el servidor (validación que manda).
 */
const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function normalizarNif(v: string): string {
  return String(v ?? '').toUpperCase().replace(/[\s.\-]/g, '').replace(/^ES(?=[0-9A-Z]{9}$)/, '');
}

export function nifValido(v: string): boolean {
  const n = normalizarNif(v);
  if (/^\d{8}[A-Z]$/.test(n)) return LETRAS[Number(n.slice(0, 8)) % 23] === n[8];
  if (/^[XYZ]\d{7}[A-Z]$/.test(n)) return LETRAS[Number('XYZ'.indexOf(n[0]) + n.slice(1, 8)) % 23] === n[8];
  if (/^[KLM]\d{7}[A-Z]$/.test(n)) return LETRAS[Number(n.slice(1, 8)) % 23] === n[8];
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(n)) {
    const d = n.slice(1, 8).split('').map(Number);
    const pares = d[1] + d[3] + d[5];
    const impares = [d[0], d[2], d[4], d[6]].reduce((s, x) => { const y = x * 2; return s + Math.floor(y / 10) + (y % 10); }, 0);
    const control = (10 - ((pares + impares) % 10)) % 10;
    const letra = 'JABCDEFGHI'[control];
    const c = n[8];
    if ('PQRSNW'.includes(n[0])) return c === letra;
    if ('ABEH'.includes(n[0])) return c === String(control);
    return c === String(control) || c === letra;
  }
  return false;
}

/** Datos fiscales del cliente para una factura completa. */
export type DatosFiscales = { razon: string; nif: string; calle: string; cp: string; localidad: string };

/** Valida y limpia; devuelve el texto del error o los datos listos. */
export function validarDatosFiscales(d: Partial<Record<keyof DatosFiscales, unknown>>): { ok: true; datos: DatosFiscales } | { ok: false; error: string } {
  const t = (x: unknown, max: number) => String(x ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
  const datos = { razon: t(d.razon, 120), nif: normalizarNif(t(d.nif, 20)), calle: t(d.calle, 160), cp: t(d.cp, 5), localidad: t(d.localidad, 80) };
  if (datos.razon.length < 2) return { ok: false, error: 'Escribe la razón social o tu nombre completo.' };
  if (!nifValido(datos.nif)) return { ok: false, error: 'Ese NIF/CIF no es válido. Revísalo (8 números y una letra, o la letra de la sociedad y 8 caracteres).' };
  if (datos.calle.length < 4) return { ok: false, error: 'Escribe la dirección fiscal (calle y número).' };
  if (!/^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(datos.cp)) return { ok: false, error: 'El código postal tiene que tener 5 cifras.' };
  if (datos.localidad.length < 2) return { ok: false, error: 'Escribe la localidad.' };
  return { ok: true, datos };
}

/** Por encima de este total (IVA incluido) la factura tiene que ser completa (RD 1619/2012, art. 4). */
export const TOPE_SIMPLIFICADA_CENTIMOS = 40000;
