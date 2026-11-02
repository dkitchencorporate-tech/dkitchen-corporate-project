/**
 * Titular de DKitchen (01/11/2026, tarea fc61230e). Hoy: Elisabet, autónoma; después, la empresa de Alex.
 * Los datos NO viven en el repositorio (es público): se leen de las variables de Vercel
 * DK_TITULAR_NOMBRE, DK_TITULAR_NIF y DK_TITULAR_DOMICILIO. Cambiar de titular = cambiar las
 * variables y volver a desplegar; los legales (/aviso-legal, /terms, /privacy) y los contratos lo toman solos.
 * Sin variables, los textos dicen dónde pedir los datos (estado anterior).
 */
export type Titular = { nombre: string; nif: string; domicilio: string | null };

export const CORREO_TITULAR = 'dkitchen@dkitchencorporate.es';

export function titular(): Titular | null {
  const nombre = process.env.DK_TITULAR_NOMBRE?.trim();
  const nif = process.env.DK_TITULAR_NIF?.trim();
  const domicilio = process.env.DK_TITULAR_DOMICILIO?.trim();
  // 02/11 (Alex): nombre con iniciales y NIF; el domicilio puede no publicarse (se facilita por correo).
  return nombre && nif ? { nombre, nif, domicilio: domicilio || null } : null;
}

/** Frase para «Quién presta el servicio» / «Responsable». */
export function quienEs(): string {
  const t = titular();
  return t
    ? `${t.nombre}, con NIF ${t.nif}${t.domicilio ? ` y domicilio en ${t.domicilio}` : ` (domicilio y demás datos a petición en ${CORREO_TITULAR})`}, que opera con el nombre comercial DKitchen`
    : `DKitchen (nombre comercial; los datos completos del titular figuran en cada factura y se facilitan a quien los solicite escribiendo a ${CORREO_TITULAR})`;
}
