import { TIPOS_BUZON, type AdjuntoBuzon } from '@/lib/buzon-tipos';
import { parsearAdjuntosJson } from '@/lib/media-central';

/** Validación común del formulario del buzón (Central y /socio). */
export function datosMensaje(
  f: FormData,
): { tipo: string; mensaje: string; pantalla: string | null; adjuntos: AdjuntoBuzon[] } | { error: string } {
  const tipo = String(f.get('tipo') ?? '');
  const mensaje = String(f.get('mensaje') ?? '').trim();
  const pantalla = String(f.get('pantalla') ?? '').trim().slice(0, 300) || null;
  const adjuntos = parsearAdjuntosJson(f.get('adjuntos'), 6, true);
  if (!(tipo in TIPOS_BUZON)) return { error: 'tipo' };
  if (mensaje.length < 3) return { error: 'corto' };
  if (mensaje.length > 4000) return { error: 'largo' };
  return { tipo, mensaje, pantalla, adjuntos };
}
