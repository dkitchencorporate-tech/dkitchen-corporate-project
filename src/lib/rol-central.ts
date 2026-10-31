import 'server-only';
import { comoCliente } from '@/lib/db';

/** Rol de quien usa Central en esta sesión (dk.rol_admin_actual, 0110). Falla cerrado: sin dato = comercial. */
export async function esComercialActual(jwt: string): Promise<boolean> {
  try {
    return await comoCliente(jwt, async (c) => (await c.query<{ r: string | null }>('SELECT dk.rol_admin_actual() AS r')).rows[0]?.r !== 'direccion');
  } catch {
    return true;
  }
}
