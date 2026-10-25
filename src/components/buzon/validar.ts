import { TIPOS_BUZON } from '@/lib/buzon-tipos';

/** Validación común del formulario del buzón (Central y /socio). */
export function datosMensaje(f: FormData): { tipo: string; mensaje: string; pantalla: string | null } | { error: string } {
  const tipo = String(f.get('tipo') ?? '');
  const mensaje = String(f.get('mensaje') ?? '').trim();
  const pantalla = String(f.get('pantalla') ?? '').trim().slice(0, 300) || null;
  if (!(tipo in TIPOS_BUZON)) return { error: 'tipo' };
  if (mensaje.length < 3) return { error: 'corto' };
  if (mensaje.length > 4000) return { error: 'largo' };
  return { tipo, mensaje, pantalla };
}
