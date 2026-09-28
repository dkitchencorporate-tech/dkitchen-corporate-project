import 'server-only';
import { comoCliente, comoVisitante } from '@/lib/db';
import type { Carta } from '@/lib/menu';

/** Pack de idiomas (0027): hasta 3 idiomas, pago único. */
export const IDIOMAS: Record<string, { nombre: string; bandera: string }> = {
  en: { nombre: 'English', bandera: '🇬🇧' },
  fr: { nombre: 'Français', bandera: '🇫🇷' },
  de: { nombre: 'Deutsch', bandera: '🇩🇪' },
  it: { nombre: 'Italiano', bandera: '🇮🇹' },
  pt: { nombre: 'Português', bandera: '🇵🇹' },
  ca: { nombre: 'Català', bandera: '🏴' },
};

/** Textos fijos de la carta en cada idioma. */
export const TEXTOS: Record<string, Record<string, string>> = {
  es: { alergenos: 'Alérgenos', otros: 'Otros platos', resena: '¿Te ha gustado? Déjanos tu reseña en Google', reservar: 'Reservar mesa', volver: 'Volver a la carta', aviso: 'Si tienes una alergia o intolerancia, consúltalo con el personal antes de pedir.' },
  en: { alergenos: 'Allergens', otros: 'Other dishes', resena: 'Enjoyed it? Leave us a Google review', reservar: 'Book a table', volver: 'Back to the menu', aviso: 'If you have an allergy or intolerance, please ask our staff before ordering.' },
  fr: { alergenos: 'Allergènes', otros: 'Autres plats', resena: 'Vous avez aimé ? Laissez-nous un avis Google', reservar: 'Réserver une table', volver: 'Retour à la carte', aviso: 'En cas d’allergie ou d’intolérance, demandez à notre personnel avant de commander.' },
  de: { alergenos: 'Allergene', otros: 'Weitere Gerichte', resena: 'Hat es geschmeckt? Bewerte uns auf Google', reservar: 'Tisch reservieren', volver: 'Zurück zur Karte', aviso: 'Bei Allergien oder Unverträglichkeiten fragen Sie bitte vor der Bestellung unser Personal.' },
  it: { alergenos: 'Allergeni', otros: 'Altri piatti', resena: 'Ti è piaciuto? Lasciaci una recensione su Google', reservar: 'Prenota un tavolo', volver: 'Torna al menù', aviso: 'In caso di allergie o intolleranze, chiedi al personale prima di ordinare.' },
  pt: { alergenos: 'Alergénios', otros: 'Outros pratos', resena: 'Gostou? Deixe-nos uma avaliação no Google', reservar: 'Reservar mesa', volver: 'Voltar ao menu', aviso: 'Se tiver alguma alergia ou intolerância, consulte o nosso pessoal antes de pedir.' },
  ca: { alergenos: 'Al·lèrgens', otros: 'Altres plats', resena: 'T’ha agradat? Deixa’ns una ressenya a Google', reservar: 'Reservar taula', volver: 'Tornar a la carta', aviso: 'Si tens alguna al·lèrgia o intolerància, consulta-ho amb el personal abans de demanar.' },
};

/** Aplica las traducciones de un idioma a la carta (lo no traducido queda en español). */
export async function traducirCarta(carta: Carta, idioma: string): Promise<Carta> {
  if (!idioma || idioma === 'es' || !IDIOMAS[idioma]) return carta;
  const filas = await comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT entidad_id, campo, texto FROM dk.traducciones_carta($1, $2)', [carta.slug, idioma]);
    return rows as { entidad_id: string; campo: 'nombre' | 'descripcion'; texto: string }[];
  }).catch(() => []);
  if (filas.length === 0) return carta;
  const t = new Map(filas.map((f) => [`${f.entidad_id}:${f.campo}`, f.texto]));
  const plato = <P extends { id: string; nombre: string; descripcion: string | null }>(p: P): P => ({
    ...p, nombre: t.get(`${p.id}:nombre`) ?? p.nombre, descripcion: t.get(`${p.id}:descripcion`) ?? p.descripcion,
  });
  return {
    ...carta,
    secciones: carta.secciones.map((s) => ({ ...s, nombre: t.get(`${s.id}:nombre`) ?? s.nombre, platos: s.platos.map(plato) })),
    sueltos: carta.sueltos.map(plato),
  };
}

// ------------------------------------------------------------------ dueño
export interface Traduccion { entidad: 'plato' | 'seccion'; entidadId: string; idioma: string; campo: 'nombre' | 'descripcion'; texto: string }

export async function listarTraducciones(jwt: string, restauranteId: string): Promise<Traduccion[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT entidad, entidad_id, idioma, campo, texto FROM traducciones WHERE restaurante_id = $1', [restauranteId]);
    return rows.map((r) => ({ entidad: r.entidad, entidadId: r.entidad_id, idioma: r.idioma, campo: r.campo, texto: r.texto }));
  });
}

export async function fijarIdiomas(jwt: string, idiomas: string[]) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.fijar_idiomas($1)', [idiomas]));
}

export async function guardarTraducciones(jwt: string, restauranteId: string, lista: Traduccion[]) {
  await comoCliente(jwt, async (c) => {
    for (const t of lista) {
      if (t.texto.trim()) {
        await c.query(
          `INSERT INTO traducciones (restaurante_id, entidad, entidad_id, idioma, campo, texto) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (entidad_id, idioma, campo) DO UPDATE SET texto = EXCLUDED.texto`,
          [restauranteId, t.entidad, t.entidadId, t.idioma, t.campo, t.texto.trim().slice(0, 300)]
        );
      } else {
        await c.query('DELETE FROM traducciones WHERE entidad_id = $1 AND idioma = $2 AND campo = $3', [t.entidadId, t.idioma, t.campo]);
      }
    }
  });
}
