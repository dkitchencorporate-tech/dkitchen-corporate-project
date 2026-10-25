import 'server-only';
import { NextResponse } from 'next/server';
import { comoAprovisionamiento } from '@/lib/db';
import { frenoDeAltas } from '@/lib/limite-frecuencia';
import { vendedorDeLaPeticion, type Vendedor } from '@/lib/socio';

/**
 * Datos del formulario de alta (QR y Fundador comparten modal desde el 08/10):
 * validación, código de asesor, freno de altas y correo ya registrado, en ese
 * orden de respuesta. El código de asesor y el correo se consultan a la vez
 * (una sola espera a Neon); el resultado del correo solo se devuelve si el
 * freno deja pasar, para que no sirva para averiguar correos a ciegas.
 */

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export interface DatosAlta {
  restauranteNombre: string;
  nombreContacto: string;
  email: string;
  telefono: string;
  direccion: { calle: string; localidad: string; cp: string };
  slugBase: string;
  origen: string;
  vendedor: Vendedor | null;
}

export function normalizarSlug(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || 'restaurante'
  );
}

/**
 * true si el correo ya es un usuario de DKitchen (0063). Si la base falla, deja
 * seguir: el webhook también lo detecta y avisa (al cliente y a dkitchen@).
 */
export async function correoTieneCuenta(email: string): Promise<boolean> {
  try {
    return await comoAprovisionamiento(async (c) =>
      (await c.query<{ v: boolean }>('SELECT dk.correo_tiene_cuenta($1) AS v', [email])).rows[0]?.v === true);
  } catch (error) {
    console.error('No se pudo comprobar si el correo ya tiene cuenta:', error);
    return false;
  }
}

const error = (texto: string, estado = 400, campo?: string) =>
  NextResponse.json(campo ? { error: texto, campo } : { error: texto }, { status: estado });

export async function leerAlta(request: Request, prefijoFreno: string): Promise<{ ok: true; datos: DatosAlta; body: Record<string, unknown> } | { ok: false; respuesta: NextResponse }> {
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return { ok: false, respuesta: error('Cuerpo de la petición inválido.') };
  }

  const restauranteNombre = String(body.restauranteNombre ?? '').trim();
  const nombreContacto = String(body.nombreContacto ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const telefono = String(body.telefono ?? '').replace(/[^0-9+]/g, '');
  const calle = String(body.direccion ?? '').trim();
  const localidad = String(body.localidad ?? '').trim();
  const cp = String(body.cp ?? '').trim();

  if (!restauranteNombre || restauranteNombre.length > 80) return { ok: false, respuesta: error('El nombre del restaurante no es válido.') };
  if (!nombreContacto || nombreContacto.length > 80) return { ok: false, respuesta: error('Tu nombre no es válido.') };
  if (!CORREO_VALIDO.test(email) || email.length > 254) return { ok: false, respuesta: error('El correo no es válido.', 400, 'email') };
  if (!/^\+?[0-9]{9,15}$/.test(telefono)) return { ok: false, respuesta: error('El teléfono no es válido.') };
  if (calle.length < 4 || calle.length > 160 || !localidad || localidad.length > 80 || !/^[0-9]{5}$/.test(cp)) {
    return { ok: false, respuesta: error('Revisa la dirección del local (calle, código postal de 5 cifras y localidad).') };
  }

  // Código de comercial antes del freno: con código válido el límite es más alto (H32).
  const escrito = String(body.vendedor ?? '').trim();
  const [vendedor, yaTieneCuenta] = await Promise.all([
    vendedorDeLaPeticion(body.vendedor, body.vendedorDelEnlace).catch((e) => {
      console.error('No se pudo comprobar el código de comercial:', e);
      return null;
    }),
    correoTieneCuenta(email),
  ]);
  // Código escrito y no válido: se avisa en vez de ignorarlo en silencio (08/10, karc0).
  if (escrito && !vendedor) {
    return { ok: false, respuesta: error('Ese código de asesor no existe. Revísalo o déjalo en blanco (los códigos de descuento se ponen en el paso siguiente).', 400, 'vendedor') };
  }

  try {
    if (await frenoDeAltas(request, prefijoFreno, vendedor?.codigo ?? null)) {
      return { ok: false, respuesta: error('Demasiadas solicitudes seguidas. Inténtalo en unos minutos.', 429) };
    }
  } catch (e) {
    console.error('No se pudo comprobar el freno de frecuencia:', e);
  }

  // Fallo 1 de la entrada 122: con un correo que ya tiene cuenta, el alta no se puede crear sola tras pagar.
  if (yaTieneCuenta) {
    return { ok: false, respuesta: error('Este correo ya tiene cuenta en DKitchen. Entra en tu panel o usa otro correo para este local.', 409, 'email') };
  }

  return {
    ok: true,
    body,
    datos: {
      restauranteNombre, nombreContacto, email, telefono,
      direccion: { calle, localidad, cp },
      slugBase: normalizarSlug(restauranteNombre),
      origen: new URL(request.url).origin,
      vendedor,
    },
  };
}
