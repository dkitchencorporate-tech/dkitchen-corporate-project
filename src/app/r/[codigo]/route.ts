import { NextResponse } from 'next/server';
import { resolverCodigo } from '@/lib/menu';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { resolverCodigoDeRespaldo } from '@/lib/cache-resiliencia';

/**
 * LO QUE HAY DETRÁS DEL QR IMPRESO
 *
 * El código impreso en la pegatina de la mesa apunta aquí, a `/r/{codigo}`, y
 * no directamente a la carta. Esa capa intermedia es lo que permite dos cosas
 * que de otro modo se excluyen entre sí:
 *
 *  1. **El QR impreso no caduca nunca.** El restaurante puede cambiar de nombre
 *     o de slug y las pegatinas ya pegadas siguen funcionando. Reimprimir
 *     cartelería es un coste real para el cliente y una llamada incómoda.
 *
 *  2. **Hay escaneos que contar.** El umbral de 600 al mes del marco
 *     Sostener / Evolucionar / Soltar necesita un sitio donde sumarse. Si el QR
 *     llevara directo a la carta, ese número no existiría.
 *
 * Precisamente por el punto 2 esta ruta necesita freno de frecuencia, y no por
 * costes: cada golpe con un código válido inserta una fila real en `escaneos`.
 * Sin freno, alguien podría inflar a voluntad la cifra que decide la relación
 * comercial con un cliente —o con un competidor— sin acercarse siquiera a
 * adivinar un código ajeno. El límite es generoso a propósito: una mesa entera
 * escaneando a la vez desde el wifi del local comparte la misma IP.
 *
 * El freno vive en Neon (`dk.limite_superado`, migración 0005), no en memoria
 * del proceso. Una primera versión sí la llevaba en memoria, y pasó todas las
 * pruebas locales; contra el despliegue real de Vercel, 35 peticiones seguidas
 * pasaron 35 de 35, porque cada función serverless tiene la suya propia y
 * nunca comparten el contador. Ver `src/lib/limite-frecuencia.ts`.
 *
 * PUNTO ÚNICO DE FALLO, y su respuesta: si Neon falla, esta ruta ya no
 * responde igual para todos los restaurantes a la vez. Antes de rendirse con
 * `/carta-no-disponible`, intenta resolver el código contra la caché de
 * resiliencia (`src/lib/cache-resiliencia.ts`), un espejo de sólo lectura en
 * Vercel Global Config, ajeno a Neon, sincronizado cada pocos minutos desde
 * fuera del despliegue. El escaneo resuelto así no se cuenta —esa tabla vive
 * solo en Neon—, y se sirve con hasta unos minutos de antigüedad. Es
 * degradación deliberada: un cliente sentado a la mesa ve su carta aunque
 * Neon esté caído, y el peor efecto real es un umbral de escaneos con una
 * cifra ligeramente por debajo de la real, no un servicio caído para todos.
 */

export const runtime = 'nodejs';
// Un redirector que se cachea deja de contar. Esta ruta se ejecuta siempre.
export const dynamic = 'force-dynamic';

// El mismo formato que impone la restricción de la tabla. Comprobarlo aquí
// evita ir a la base a preguntar por algo que no puede existir.
const CODIGO_VALIDO = /^[a-z0-9]{8,16}$/;

const LIMITE_POR_IP = 30;         // resoluciones de código
const VENTANA_SEGUNDOS = 60;      // por minuto

/**
 * Todas las respuestas de esta ruta llevan `Cache-Control: no-store`, sin
 * excepción. `dynamic = 'force-dynamic'` evita que Next.js la trate como
 * estática, pero eso decide cómo se genera la respuesta, no si un proxy o una
 * CDN intermedios pueden quedarse con una copia. Explícito y no implícito: es
 * la misma razón por la que la redirección va en 302 y no en 301 —si un
 * escaneo se sirve desde una caché, nunca llega a esta función y nunca se
 * cuenta—, y aquí no había ninguna cabecera que lo garantizara.
 */
function sinCache<T extends NextResponse>(respuesta: T): T {
  respuesta.headers.set('Cache-Control', 'no-store');
  return respuesta;
}

export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo: codigoOriginal } = await params;
  const codigo = codigoOriginal.toLowerCase();
  const origen = new URL(peticion.url).origin;

  if (!CODIGO_VALIDO.test(codigo)) {
    return sinCache(NextResponse.redirect(`${origen}/carta-no-disponible`, 302));
  }

  try {
    const clave = claveDeLimite('qr', ipDeLaPeticion(peticion));
    if (await limiteSuperado(clave, LIMITE_POR_IP, VENTANA_SEGUNDOS)) {
      return sinCache(
        new NextResponse('Demasiadas peticiones. Inténtalo de nuevo en un momento.', {
          status: 429,
          headers: { 'Retry-After': '30' },
        })
      );
    }
  } catch (error) {
    // Si el propio freno falla —Neon caído, por ejemplo— se deja pasar la
    // petición. Negar el servicio entero porque el contador no responde sería
    // peor que el riesgo que el contador está ahí para acotar.
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  let destino: { slug: string } | null = null;
  let sirvioDeRespaldo = false;
  try {
    destino = await resolverCodigo(
      codigo,
      peticion.headers.get('user-agent'),
      // El país lo sabe el borde de Vercel a partir de la petición. No hace
      // falta ningún tercero y no se guarda la IP: solo dos letras.
      peticion.headers.get('x-vercel-ip-country')
    );
  } catch (error) {
    // Neon no respondió. Antes de dejar a quien está en la mesa sin carta,
    // se intenta el espejo de sólo lectura. Si tampoco tiene el código, sí se
    // rinde a /carta-no-disponible: no hay nada más que ofrecer.
    console.error('No se pudo resolver el código de QR contra Neon, se intenta la caché de resiliencia:', error);
    destino = await resolverCodigoDeRespaldo(codigo);
    sirvioDeRespaldo = destino !== null;
    if (!destino) {
      return sinCache(NextResponse.redirect(`${origen}/carta-no-disponible`, 302));
    }
  }

  if (!destino) {
    // Un código inexistente y uno desactivado responden igual. Distinguirlos
    // permitiría recorrer el catálogo de clientes probando códigos.
    return sinCache(NextResponse.redirect(`${origen}/carta-no-disponible`, 302));
  }

  if (sirvioDeRespaldo) {
    console.warn(`Código ${codigo} resuelto desde la caché de resiliencia: Neon no respondió.`);
  }

  // 302 y no 301: la redirección permanente se queda guardada en el navegador,
  // y a partir de la segunda visita el teléfono iría directo a la carta sin
  // pasar por aquí. Los escaneos dejarían de contarse sin que nadie se entere.
  // QR de mesa (plan Ampliado): la mesa viaja hasta la carta para "Llamar al camarero".
  const mesa = new URL(peticion.url).searchParams.get('mesa');
  const sufijo = mesa && /^[A-Za-z0-9-]{1,12}$/.test(mesa) ? `?mesa=${encodeURIComponent(mesa)}` : '';
  return sinCache(NextResponse.redirect(`${origen}/m/${destino.slug}${sufijo}`, 302));
}
