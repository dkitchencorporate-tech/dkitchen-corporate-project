import 'server-only';
import { comoCliente } from '@/lib/db';

export type ServicioComercial = 'qr' | 'signature' | 'experience' | 'auditoria';
export type ZonaComercial = 'inicio' | 'clientes' | 'servicios' | 'prospeccion' | 'oportunidades' | 'propuestas' | 'academia' | 'soporte' | 'buzon';

export interface ConfigComercial {
  rolAdmin: 'direccion' | 'comercial' | 'en_formacion';
  esComercial: boolean;
  servicios: ServicioComercial[];
  zonas: ZonaComercial[];
  puedeCrearDemos: boolean;
}

const SERVICIOS_TODOS: ServicioComercial[] = ['qr', 'signature', 'experience', 'auditoria'];
const ZONAS_TODAS: ZonaComercial[] = ['inicio', 'clientes', 'servicios', 'prospeccion', 'oportunidades', 'propuestas', 'academia', 'soporte', 'buzon'];

/**
 * Configuración y permisos del usuario actual en Central (dk.mi_config_comercial, 0116/0117).
 * Falla cerrado: si hay cualquier error o aún no existe la función, trata como comercial restringido.
 */
export async function miConfigComercial(jwt: string): Promise<ConfigComercial> {
  try {
    return await comoCliente(jwt, async (c) => {
      try {
        const { rows } = await c.query<{ x: Record<string, unknown> }>('SELECT dk.mi_config_comercial() AS x');
        const x = rows[0]?.x;
        if (x) {
          const rolAdmin = x.rol_admin === 'direccion' ? 'direccion' : x.rol_admin === 'en_formacion' ? 'en_formacion' : 'comercial';
          const esComercial = rolAdmin !== 'direccion';
          const servicios = Array.isArray(x.servicios) ? (x.servicios.filter((s) => SERVICIOS_TODOS.includes(s as ServicioComercial)) as ServicioComercial[]) : SERVICIOS_TODOS;
          const zonas = Array.isArray(x.zonas) ? (x.zonas.filter((z) => ZONAS_TODAS.includes(z as ZonaComercial)) as ZonaComercial[]) : ZONAS_TODAS;
          return {
            rolAdmin,
            esComercial,
            servicios: servicios.length ? servicios : ['qr'],
            zonas: zonas.length ? zonas : ['inicio', 'clientes', 'prospeccion'],
            puedeCrearDemos: x.puede_crear_demos !== false,
          };
        }
      } catch {
        // Respaldo si la migración aún no se aplicó en esta rama
      }
      const r = (await c.query<{ r: string | null }>('SELECT dk.rol_admin_actual() AS r')).rows[0]?.r;
      const rolAdmin = r === 'direccion' ? 'direccion' : r === 'en_formacion' ? 'en_formacion' : 'comercial';
      return {
        rolAdmin,
        esComercial: rolAdmin !== 'direccion',
        servicios: SERVICIOS_TODOS,
        zonas: ZONAS_TODAS,
        puedeCrearDemos: true,
      };
    });
  } catch {
    return {
      rolAdmin: 'comercial',
      esComercial: true,
      servicios: ['qr'],
      zonas: ['inicio', 'clientes', 'prospeccion'],
      puedeCrearDemos: false,
    };
  }
}

/** Rol de quien usa Central en esta sesión (dk.rol_admin_actual, 0110). Falla cerrado: sin dato = comercial. */
export async function esComercialActual(jwt: string): Promise<boolean> {
  const cfg = await miConfigComercial(jwt);
  return cfg.esComercial;
}
