import type { Metadata } from 'next';
import type { Carta } from '@/lib/menu';

/** Imagen para compartir: portada del local, si no la primera foto de un plato y, en último caso, su logo. */
export function imagenCarta(carta: Carta): string | null {
  return carta.portadaUrl || [...carta.secciones.flatMap((s) => s.platos), ...carta.sueltos].find((p) => p.fotoUrl)?.fotoUrl || carta.logoUrl || null;
}

/** Enlace de reseñas: el que guardó el local o, si no hay, su ficha buscada en Google Maps. */
export function urlResenas(carta: Carta): string {
  return carta.urlResenas || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([carta.nombre, carta.direccion].filter(Boolean).join(' '))}`;
}

/**
 * Tarjeta de compartir PROPIA de cada local (13/10, karc0): al pegar el enlace en WhatsApp o redes
 * sale la foto, el nombre y la descripción del restaurante, nunca la marca DKitchen.
 */
export function metadatosCarta(carta: Carta, ruta: string, tipo: 'carta' | 'local'): Metadata {
  const titulo = tipo === 'carta' ? `Carta de ${carta.nombre}` : carta.nombre;
  const descripcion = carta.descripcion?.trim()
    || (tipo === 'carta' ? `Mira la carta de ${carta.nombre}${carta.direccion ? ` (${carta.direccion})` : ''}: platos, precios y alérgenos.` : `${carta.nombre}${carta.direccion ? ` · ${carta.direccion}` : ''}. Reserva tu mesa y mira la carta.`);
  const imagen = imagenCarta(carta);
  return {
    title: { absolute: titulo },
    description: descripcion,
    robots: { index: true, follow: true },
    alternates: { canonical: ruta },
    openGraph: { title: titulo, description: descripcion, type: 'website', url: ruta, siteName: carta.nombre, locale: 'es_ES', images: imagen ? [{ url: imagen, alt: carta.nombre }] : [] },
    twitter: { card: imagen ? 'summary_large_image' : 'summary', title: titulo, description: descripcion, images: imagen ? [imagen] : [] },
    icons: carta.logoUrl ? { icon: carta.logoUrl, apple: carta.logoUrl } : undefined,
    appleWebApp: { title: carta.nombre },
  };
}
