import 'server-only';
import { comoCliente, comoVisitante } from './db';

import { LANDING_VACIA, type Landing, type EstiloLanding } from './landing-tipos';
export { BLOQUES, LANDING_VACIA, type Landing, type EstiloLanding, type BloqueLanding } from './landing-tipos';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function desdeFila(f: any): Landing {
  return {
    activa: f.activa !== false,
    estilo: (f.estilo ?? 'noir') as EstiloLanding,
    titular: f.titular ?? null,
    subtitulo: f.subtitulo ?? null,
    historia: f.historia ?? null,
    fotoHistoriaUrl: f.foto_historia_url ?? null,
    galeria: Array.isArray(f.galeria) ? f.galeria : [],
    destacados: Array.isArray(f.destacados) ? f.destacados.map(String) : [],
    bloques: Array.isArray(f.bloques) && f.bloques.length ? f.bloques : LANDING_VACIA.bloques,
    faq: Array.isArray(f.faq) ? f.faq : [],
    ctaPrincipal: f.cta_principal ?? 'reservar',
    seoTitulo: f.seo_titulo ?? null,
    seoDescripcion: f.seo_descripcion ?? null,
  };
}

/** Panel: la landing de este local (o null si aún no se ha guardado nunca). */
export async function leerLanding(jwt: string, restauranteId: string): Promise<Landing | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM public.landing_local WHERE restaurante_id = $1', [restauranteId]);
    return rows[0] ? desdeFila(rows[0]) : null;
  });
}

export async function guardarLanding(jwt: string, restauranteId: string, l: Landing): Promise<void> {
  await comoCliente(jwt, (c) => c.query('SELECT dk.guardar_landing($1, $2::jsonb)', [restauranteId, JSON.stringify({
    activa: l.activa, estilo: l.estilo, titular: l.titular, subtitulo: l.subtitulo, historia: l.historia,
    foto_historia_url: l.fotoHistoriaUrl, galeria: l.galeria, destacados: l.destacados, bloques: l.bloques, faq: l.faq,
    cta_principal: l.ctaPrincipal, seo_titulo: l.seoTitulo, seo_descripcion: l.seoDescripcion,
  })]));
}

/** Página pública /l/<slug>: null si no hay landing guardada, está despublicada o el plan no la incluye. */
export async function landingPublica(slug: string): Promise<Landing | null> {
  try {
    return await comoVisitante(async (c) => {
      const { rows } = await c.query('SELECT dk.landing_publica($1) AS j', [slug]);
      return rows[0]?.j ? desdeFila(rows[0].j) : null;
    });
  } catch {
    return null; // sin base: la landing se pinta con los datos de la carta
  }
}
