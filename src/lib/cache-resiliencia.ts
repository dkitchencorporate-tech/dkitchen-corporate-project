import 'server-only';
import { get } from '@vercel/global-config';
import { obtenerCarta, type Carta } from '@/lib/menu';

/**
 * CACHÉ DE RESILIENCIA DEL MOTOR DE QR
 *
 * MOTIVO, sin adornos: `/r/{codigo}` y `/m/{slug}` viven en el mismo
 * despliegue y consultan la misma base. Si Neon tiene un incidente, hasta
 * ahora el resultado era el mismo para *todos* los restaurantes a la vez:
 * cada QR impreso de cada cliente deja de resolver en el mismo instante. Es
 * el riesgo que la propia referencia usada al diseñar el motor señala como
 * crítico (javiggil.com/56fc9cb32b97: "si tu redirect se cae, todos los
 * códigos impresos dejan de funcionar de golpe"), y aquí se aplicaba igual.
 *
 * Este módulo es la mitad de solo lectura de la respuesta. Guarda, fuera de
 * Neon, una copia de lo que ya es público —la carta de cada restaurante
 * activo y el código de cada QR activo— en Vercel Global Config: la misma
 * infraestructura del despliegue, no un tercero nuevo, con "uptime casi
 * idéntico al del propio despliegue" según la documentación de Vercel. No es
 * una segunda fuente de verdad: es un espejo de sólo lectura de datos que
 * cualquier desconocido con el QR físico ya podía ver.
 *
 * REGLA QUE ESTO NO ROMPE: el despliegue sigue sin tener autoridad de
 * escritura sobre nada. La variable `GLOBAL_CONFIG` que usa este módulo es un
 * token de sólo lectura -no puede escribir una sola clave-, generado aparte
 * del que escribe la caché. Quien escribe vive fuera del despliegue, en un
 * flujo de GitHub Actions (ver .github/workflows/sincronizar-cache-resiliencia.yml
 * y db/sincronizar-cache-resiliencia.mjs): si alguien comprometiera esta
 * aplicación en producción, no obtendría con eso ninguna capacidad de escribir
 * en la caché, exactamente igual que no obtendría el propietario de Neon.
 *
 * DEGRADACIÓN, dicha con precisión: la caché se sincroniza cada pocos
 * minutos, así que lo que sirve durante una caída de Neon puede tener
 * segundos u pocos minutos de antigüedad -un plato recién agotado podría
 * seguir apareciendo un rato-, y un escaneo resuelto desde aquí NO se cuenta
 * en `escaneos`, porque esa tabla vive solo en Neon. Es una degradación
 * deliberada y documentada: se prefiere servir el menú con datos ligeramente
 * desactualizados y sin contar ese escaneo, antes que dejar a un cliente
 * sentado en una mesa sin poder ver la carta.
 */

interface RestauranteRespaldo {
  slug: string;
}

/** Carta de respaldo, con la misma forma que devuelve `obtenerCarta()`. */
export async function obtenerCartaDeRespaldo(slug: string): Promise<Carta | null> {
  try {
    const carta = await get<Carta>(`carta-${slug.toLowerCase()}`);
    return carta ?? null;
  } catch (error) {
    // Si hasta la caché de resiliencia falla, no hay nada más que intentar.
    console.error('La caché de resiliencia no respondió al pedir una carta:', error);
    return null;
  }
}

/** A qué restaurante apunta un código de QR, según la última sincronización. */
export async function resolverCodigoDeRespaldo(
  codigo: string
): Promise<RestauranteRespaldo | null> {
  try {
    const destino = await get<RestauranteRespaldo>(`qr-${codigo.toLowerCase()}`);
    return destino ?? null;
  } catch (error) {
    console.error('La caché de resiliencia no respondió al resolver un código:', error);
    return null;
  }
}

/** true si el despliegue tiene configurada la caché de resiliencia. */
export const HAY_CACHE_DE_RESILIENCIA = Boolean(process.env.GLOBAL_CONFIG);

export interface CartaConOrigen {
  carta: Carta;
  /**
   * true cuando lo servido viene del espejo, no de Neon. La página lo usa
   * para avisar, sin alarmar, de que los datos pueden tener unos minutos.
   */
  desdeRespaldo: boolean;
}

/**
 * Carta con conmutación automática: Neon primero, la caché de resiliencia
 * solo si Neon falla. Es el punto de entrada que deben usar las páginas —
 * `/m/{slug}` puede recibir tráfico directo de un buscador sin pasar nunca
 * por `/r/{codigo}`, así que necesita su propio respaldo, independiente del
 * de la redirección.
 */
export async function obtenerCartaConRespaldo(slug: string): Promise<CartaConOrigen | null> {
  try {
    const carta = await obtenerCarta(slug);
    return carta ? { carta, desdeRespaldo: false } : null;
  } catch (error) {
    console.error('No se pudo leer la carta de Neon, se intenta la caché de resiliencia:', error);
    const carta = await obtenerCartaDeRespaldo(slug);
    return carta ? { carta, desdeRespaldo: true } : null;
  }
}
