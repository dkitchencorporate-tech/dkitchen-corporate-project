import { comoVisitante } from '@/lib/db';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const RUTA = /^\/\S{0,299}$/;
const DESTINO = /^\S{1,300}$/;

/**
 * Medición propia (E3, 0107): una página vista con su tiempo, si fue la última de la visita y sus clics.
 * Solo la manda AnaliticaWeb tras «Aceptar» en el aviso de cookies; sin IP ni identificador guardados
 * (la IP solo frena abusos aquí). Validación y sumas en dk.medir; responde siempre 204.
 */
export async function POST(peticion: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('medir', ipDeLaPeticion(peticion)), 120, 600)) return new Response(null, { status: 204 });
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }
  const c = (await peticion.json().catch(() => null)) as { ruta?: string; segundos?: number; salida?: boolean; clics?: { destino?: string; zona?: string }[] } | null;
  const ruta = String(c?.ruta ?? '');
  if (!RUTA.test(ruta)) return new Response(null, { status: 204 });
  const clics = (Array.isArray(c?.clics) ? c.clics : [])
    .filter((k) => DESTINO.test(String(k?.destino ?? '')))
    .slice(0, 40)
    .map((k) => ({ destino: String(k.destino), zona: String(k.zona ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) }));
  const segundos = Math.min(3600, Math.max(0, Math.round(Number(c?.segundos) || 0)));
  try {
    await comoVisitante((db) => db.query('SELECT dk.medir($1::jsonb)', [JSON.stringify({ ruta, segundos, salida: c?.salida === true, clics })]));
  } catch (error) {
    console.error('Fallo guardando la medición:', error);
  }
  return new Response(null, { status: 204 });
}
