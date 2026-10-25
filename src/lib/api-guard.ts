import { NextResponse } from 'next/server';
import { BACKEND_CONFIGURED } from './data-source';

/**
 * Cierra las rutas que gastan cuota de IA mientras no haya autenticación real.
 *
 * Estas rutas estaban protegidas por la verificación de administrador de Supabase.
 * Al retirar Supabase se quedaron sin guardia, y son rutas que llaman a Gemini:
 * dejarlas abiertas significaría que cualquiera puede consumir la cuota. Se
 * cierran con un 503 hasta que Neon aporte autenticación de verdad.
 */
export function bloqueoSinBackend(): NextResponse | null {
  if (BACKEND_CONFIGURED) return null;

  return NextResponse.json(
    {
      status: 'backend_no_configurado',
      message:
        'Esta función está desactivada hasta que se conecte la base de datos y la autenticación.',
    },
    { status: 503 }
  );
}
