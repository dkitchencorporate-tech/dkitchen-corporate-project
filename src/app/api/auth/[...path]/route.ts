import { auth } from '@/lib/auth';

/**
 * Ruta proxy de Neon Auth — recibe toda petición de autenticación del
 * cliente (/api/auth/*) y la reenvía a NEON_AUTH_BASE_URL identificada como
 * proxy de servidor de Next.js, evitando el problema de origen que dan las
 * llamadas directas desde el navegador (ver src/lib/auth.ts).
 */
const manejador = auth.handler();

export const GET = manejador.GET;

/**
 * Alta pública cerrada (27/09/2026). Las cuentas de cliente las crea el
 * servidor tras el pago (src/lib/neon-auth.ts → crearCuentaCliente, que llama
 * a Neon Auth directamente, no a este proxy). Nadie debe poder registrarse
 * desde la web: se responde 404 igual que a una ruta inexistente.
 */
export async function POST(peticion: Request, contexto: { params: Promise<{ path: string[] }> }) {
  const { path } = await contexto.params;
  if (path.some((tramo) => tramo.toLowerCase().startsWith('sign-up'))) {
    return new Response(null, { status: 404 });
  }
  return manejador.POST(peticion as never, contexto as never);
}
