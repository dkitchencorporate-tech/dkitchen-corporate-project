import 'server-only';
import { headers } from 'next/headers';
import { comoCliente } from '@/lib/db';
import { generarImagen, limpiarTextoIa, saldoIa } from '@/lib/ia';
import { leerCartaDeFotos, type SeccionLeida } from '@/lib/carta-foto-ia';
import { CODIGOS_ALERGENOS } from '@/lib/alergenos';
import { PLANTILLAS_PROPUESTA, plantillaSegunTipo, construirTextoPropuesta } from '@/lib/prospeccion-catalogo';
import { guardarPortada } from '@/lib/mi-restaurante';
import { listarMiCarta, editarPlato } from '@/lib/menu-propietario';
import { crearPromocion, listarPromociones } from '@/lib/promociones';

async function ejecutarConConcurrencia(tareas: (() => Promise<void>)[], limite: number): Promise<void> {
  if (tareas.length === 0) return;
  let indice = 0;
  const trabajadores = Array.from({ length: Math.min(limite, tareas.length) }, async () => {
    while (indice < tareas.length) {
      const actual = indice++;
      await tareas[actual]();
    }
  });
  await Promise.all(trabajadores);
}

const MODELO_AGENTE = 'google/gemini-3-flash';

async function llamarTextoAgente(sistema: string, usuario: string, maxTokens = 550): Promise<string> {
  const token = process.env.AI_GATEWAY_API_KEY || (await headers()).get('x-vercel-oidc-token') || process.env.VERCEL_OIDC_TOKEN;
  if (!token) throw new Error('IA no configurada');
  const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELO_AGENTE,
      max_tokens: maxTokens,
      temperature: 0.35,
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: usuario },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Gateway texto HTTP ${res.status}`);
  const j = await res.json();
  const out = (j?.choices?.[0]?.message?.content ?? '').trim();
  if (!out) throw new Error('Sin respuesta de texto');
  return out.replace(/^["«]|["»]$/g, '').trim();
}

/**
 * Unifica el tipo de prospecto y la plantilla de propuesta con el diseño óptimo de la demo
 * (composición de autor, color de marca y fondo).
 */
export function estiloUnificadoProspecto(tipo?: string | null, plantillaPropuestaId?: string | null): {
  plantilla: 'taberna' | 'gastro' | 'urbano' | 'editorial' | 'premium';
  color: string;
  fondo: 'papel' | 'oscuro' | 'blanco';
  plantillaPropuestaId: string;
  oferta: string;
} {
  const baseProp = PLANTILLAS_PROPUESTA.find((x) => x.id === plantillaPropuestaId) ?? plantillaSegunTipo(tipo);
  const t = (tipo ?? '').toLowerCase();

  if (baseProp.id === 'signature_delivery' || ['hamburgueseria', 'pizzeria'].includes(t)) {
    return { plantilla: 'urbano', color: '#9A3412', fondo: 'oscuro', plantillaPropuestaId: baseProp.id, oferta: baseProp.oferta };
  }
  if (['cafeteria', 'pasteleria', 'heladeria'].includes(t)) {
    return { plantilla: 'editorial', color: '#1C3128', fondo: 'papel', plantillaPropuestaId: baseProp.id, oferta: baseProp.oferta };
  }
  if (baseProp.id === 'qr_autor_gastro' || ['restaurante', 'asador', 'marisqueria'].includes(t)) {
    return { plantilla: 'gastro', color: '#6E0C2B', fondo: 'papel', plantillaPropuestaId: baseProp.id, oferta: baseProp.oferta };
  }
  if (baseProp.id === 'experience_evento') {
    return { plantilla: 'premium', color: '#1E3A5F', fondo: 'oscuro', plantillaPropuestaId: baseProp.id, oferta: baseProp.oferta };
  }
  return { plantilla: 'taberna', color: '#6E0C2B', fondo: 'papel', plantillaPropuestaId: baseProp.id, oferta: baseProp.oferta };
}

export interface OpcionesAgenteDemoPropuesta {
  prospectoId: string;
  fotosCartaUrls?: string[];
  plantillaDemo?: string;
  colorDemo?: string;
  fondoDemo?: string;
  plantillaPropuestaId?: string;
  oferta?: string;
  generarLogoIa?: boolean;
  generarBannerIa?: boolean;
  cantidadPlatosIa?: number; // 0 a 6 (por defecto 5 o 6 en principal)
  instruccionExtra?: string;
}

export interface ResultadoAgenteDemoPropuesta {
  restauranteId: string;
  slug: string;
  propuestaToken: string;
  platosCreadosDeFoto: number;
  logoGenerado: boolean;
  bannerGenerado: boolean;
  platosConFotoIa: number;
  propuestaTexto: string;
  restantesIa: number | null;
  aviso?: string | null;
}

/**
 * Selecciona los platos principales / destacados de la carta para generar sus 5 o 6 imágenes con IA
 * y ponerlas en primera línea de impacto comercial.
 */
function elegirPlatosPrincipales<T extends { id: string; seccionId: string | null; nombre: string; descripcion: string | null; precio: string | number }>(
  secciones: { id: string; nombre: string }[],
  platos: T[],
  cantidad: number
): T[] {
  if (cantidad <= 0 || platos.length === 0) return [];
  const mapaSec = new Map(secciones.map((s) => [s.id, s.nombre.toLowerCase()]));
  const esBebida = (p: T) => {
    const sec = p.seccionId ? (mapaSec.get(p.seccionId) ?? '') : '';
    return /bebida|bodega|vino|cerveza|refresco|agua|cafe|café|infusion/i.test(sec) || /^agua\b|^cerveza\b|^copa de vino|^refresco/i.test(p.nombre);
  };
  const esPrincipal = (p: T) => {
    const sec = p.seccionId ? (mapaSec.get(p.seccionId) ?? '') : '';
    return /principal|carne|pescado|arroz|brasa|hamburguesa|burger|pizza|especial|estrella|recomendad|autor|tapa|compartir/i.test(sec);
  };

  const candidatos = platos.filter((p) => !esBebida(p));
  const lista = candidatos.length >= cantidad ? candidatos : platos;

  const ordenados = [...lista].sort((a, b) => {
    const pa = esPrincipal(a) ? 1 : 0;
    const pb = esPrincipal(b) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (Number(b.precio) || 0) - (Number(a.precio) || 0);
  });

  return ordenados.slice(0, cantidad);
}

/**
 * Ejecuta el flujo unificado del Agente IA:
 * Prospecto -> (Opcional: lee foto de su carta real) -> Crea/actualiza Demo de Autor ->
 * Genera Logo + Banner/Portada + 5-6 fotos IA en platos principales -> Genera y guarda Propuesta con link de Demo.
 */
export async function ejecutarAgenteDemoPropuesta(
  jwt: string,
  op: OpcionesAgenteDemoPropuesta
): Promise<ResultadoAgenteDemoPropuesta> {
  // 1. Leer datos básicos del prospecto
  const prosp = await comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{
      id: string;
      nombre: string;
      tipo: string;
      zona: string;
      contacto: string | null;
      telefono: string | null;
      direccion: string | null;
      instagram: string | null;
      nota_guia: string | null;
    }>(
      `SELECT id, nombre, tipo, zona, contacto, telefono, direccion, instagram, nota_guia
         FROM public.prospectos
        WHERE id = $1`,
      [op.prospectoId]
    );
    return rows[0] ?? null;
  });
  if (!prosp) throw new Error('No se encontró el prospecto.');

  // 2. Unificar estilo de demo + plantilla de propuesta según el perfil del prospecto
  const unificado = estiloUnificadoProspecto(prosp.tipo, op.plantillaPropuestaId);
  const plantillaDemo = op.plantillaDemo || unificado.plantilla;
  const colorDemo = op.colorDemo || unificado.color;
  const fondoDemo = op.fondoDemo || unificado.fondo;
  const oferta = op.oferta || unificado.oferta;

  // 3. Crear o recuperar la demo del prospecto (respeta tope de 10 demos para comerciales; sin límite para Dirección)
  const demo = await comoCliente(jwt, async (c) => {
    const r = await c.query<{ d: { restaurante_id: string; slug: string; propuesta_token: string } }>(
      'SELECT dk.prosp_crear_demo($1, $2, $3, $4) AS d',
      [op.prospectoId, plantillaDemo, colorDemo, fondoDemo]
    );
    return r.rows[0].d;
  });
  const restauranteId = demo.restaurante_id;
  const slug = demo.slug;

  let platosCreadosDeFoto = 0;
  let logoGenerado = false;
  let bannerGenerado = false;
  let platosConFotoIa = 0;
  const avisos: string[] = [];

  // 4. Si se subieron fotos de la carta del prospecto, leer la carta real con IA y sustituir todo en una sola transacción
  const fotos = (op.fotosCartaUrls ?? []).filter((u) => typeof u === 'string' && u.startsWith('https://')).slice(0, 4);
  if (fotos.length > 0) {
    try {
      const seccionesLeidas: SeccionLeida[] = await leerCartaDeFotos(fotos);
      const totalPlatosLeidos = seccionesLeidas.reduce((acc, s) => acc + (s.platos?.length ?? 0), 0);
      if (seccionesLeidas.length > 0 && totalPlatosLeidos > 0) {
        platosCreadosDeFoto = await comoCliente(jwt, async (c) => {
          await c.query('DELETE FROM menu_items WHERE restaurante_id = $1', [restauranteId]);
          await c.query('DELETE FROM menu_secciones WHERE restaurante_id = $1', [restauranteId]);
          let creados = 0;
          let ordenSec = 0;
          let ordenPlato = 0;
          for (const s of seccionesLeidas.slice(0, 20)) {
            const nombreSec = (s.nombre || 'Carta').trim().slice(0, 60);
            const platosValidos = (s.platos ?? [])
              .filter((p) => typeof p.nombre === 'string' && p.nombre.trim().length > 0)
              .slice(0, 60);
            if (!nombreSec || platosValidos.length === 0) continue;
            const { rows: secRows } = await c.query<{ id: string }>(
              'INSERT INTO menu_secciones (restaurante_id, nombre, orden) VALUES ($1, $2, $3) RETURNING id',
              [restauranteId, nombreSec, ordenSec++]
            );
            const seccionId = secRows[0].id;
            for (const p of platosValidos) {
              const precioNum =
                p.precio != null && Number.isFinite(Number(p.precio)) && Number(p.precio) >= 0
                  ? Math.round(Number(p.precio) * 100) / 100
                  : 0;
              await c.query(
                `INSERT INTO menu_items (restaurante_id, seccion_id, nombre, descripcion, precio, foto_url, alergenos, disponible, orden)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
                [
                  restauranteId,
                  seccionId,
                  p.nombre.trim().slice(0, 80),
                  (p.descripcion || '').trim().slice(0, 300) || null,
                  precioNum,
                  null,
                  (p.alergenos ?? []).filter((a) => CODIGOS_ALERGENOS.includes(a)),
                  ordenPlato++,
                ]
              );
              creados++;
            }
          }
          return creados;
        });
      } else {
        avisos.push('No se detectaron platos claros en la foto; se mantiene la carta base para editar.');
      }
    } catch (e) {
      avisos.push(e instanceof Error ? e.message : 'No se pudo leer la foto de la carta; se mantiene la carta base.');
    }
  }

  // 5. Generación paralela controlada (concurrencia 3): Logo + Portada + platos principales + redacción de propuesta
  const quiereLogo = op.generarLogoIa !== false;
  const quiereBanner = op.generarBannerIa !== false;
  const cantPlatosIa = Math.max(0, Math.min(6, op.cantidadPlatosIa ?? 5));

  const contextoMarca = `Nombre del restaurante: «${prosp.nombre}» (${prosp.tipo} en ${prosp.zona}); estilo ${plantillaDemo}, color de marca ${colorDemo}`;
  const extraPrompt = limpiarTextoIa(op.instruccionExtra, 120);

  const cartaActual = await listarMiCarta(jwt, restauranteId).catch(() => ({ secciones: [], platos: [] }));
  const nombresDestacados = cartaActual.platos.slice(0, 5).map((p) => p.nombre).join(', ');

  const demoUrl = `https://dkitchencorporate.es/m/${slug}`;
  const panelUrl = `https://dkitchencorporate.es/demo/panel?local=${slug}`;
  const baseConstruida = construirTextoPropuesta(unificado.plantillaPropuestaId, {
    nombre: prosp.nombre,
    zona: prosp.zona,
    demoUrl,
    panelUrl,
  });
  let propuestaTexto = baseConstruida.texto;

  const muestraPlatos = cartaActual.platos.slice(0, 4).map((p) => p.nombre).join(', ');
  const promesaPropuesta = (async () => {
    try {
      const enriquecido = await llamarTextoAgente(
        `Eres el asesor senior de hostelería de DKitchen Corporate en España. Adapta esta propuesta comercial para el local «${prosp.nombre}» (${prosp.tipo} en ${prosp.zona}).
Reglas estrictas:
- Español de España natural, directo, cercano de tú a tú entre hosteleros, orientado a concertar 10 minutos o activar su prueba.
- Menciona de forma natural alguno de sus platos reales (${muestraPlatos || 'sus especialidades'}) que ya hemos cargado en su demo interactiva.
- Conserva OBLIGATORIAMENTE los enlaces exactos a la carta demo (${demoUrl}) y al simulador de comandas (${panelUrl}).
- PROHIBIDO usar emojis, emoticonos o mencionar "IA" / "inteligencia artificial" en textos para el cliente.
- Sin markdown (** ni #), máximo 1200 caracteres.`,
        `Plantilla base:\n${propuestaTexto}\n\nNotas del prospecto: ${prosp.nota_guia ?? 'sin notas'}\nInstrucción adicional: ${extraPrompt || 'ninguna'}`
      );
      if (enriquecido && enriquecido.length >= 80) {
        propuestaTexto = enriquecido.slice(0, 1500);
      }
    } catch {
      // Si falla el enriquecimiento de texto, se usa la plantilla rellenada con los links reales
    }
  })();

  const tareasImagen: (() => Promise<void>)[] = [];

  if (quiereLogo) {
    tareasImagen.push(async () => {
      try {
        const rLogo = await generarImagen(
          jwt,
          { id: restauranteId, nombre: prosp.nombre },
          {
            modo: 'logo',
            texto: limpiarTextoIa(extraPrompt || `Emblema gastronómico elegante y limpio para ${prosp.nombre} (${prosp.tipo})`),
            contexto: contextoMarca,
            nombre: prosp.nombre,
          }
        );
        await comoCliente(jwt, (c) =>
          c.query(
            'UPDATE public.restaurantes SET logo_url = $2, color_marca = COALESCE($3, color_marca) WHERE id = $1',
            [restauranteId, rLogo.url, colorDemo]
          )
        );
        logoGenerado = true;
      } catch (e) {
        avisos.push(`Logo: ${e instanceof Error ? e.message : 'no generado'}`);
      }
    });
  }

  if (quiereBanner) {
    tareasImagen.push(async () => {
      try {
        const rBanner = await generarImagen(
          jwt,
          { id: restauranteId, nombre: prosp.nombre },
          {
            modo: 'portada',
            texto: limpiarTextoIa(
              extraPrompt ||
                `Mesa y ambiente gastronómico apetecible de ${prosp.nombre} (${prosp.tipo} en ${prosp.zona})${nombresDestacados ? ` con platos como ${nombresDestacados}` : ''}`
            ),
            contexto: contextoMarca,
            nombre: prosp.nombre,
          }
        );
        await guardarPortada(jwt, restauranteId, rBanner.url, true);
        const promos = await listarPromociones(jwt, restauranteId).catch(() => []);
        if (promos.length === 0) {
          await crearPromocion(jwt, restauranteId, {
            titulo: `Especialidades de ${prosp.nombre}`,
            texto: 'Descubre nuestros platos recomendados recién hechos para ti.',
            imagenUrl: rBanner.url,
            botonTexto: null,
            botonSeccion: null,
            botonDestino: 'ninguno',
            botonPlato: null,
            inicio: null,
            fin: null,
            dias: null,
            horaInicio: null,
            horaFin: null,
            prioridad: 1,
            activa: true,
          }).catch(() => {});
        }
        bannerGenerado = true;
      } catch (e) {
        avisos.push(`Portada: ${e instanceof Error ? e.message : 'no generada'}`);
      }
    });
  }

  if (cantPlatosIa > 0) {
    const principales = elegirPlatosPrincipales(cartaActual.secciones, cartaActual.platos, cantPlatosIa);
    let limitePlatosAlcanzado = false;
    for (const plato of principales) {
      tareasImagen.push(async () => {
        if (limitePlatosAlcanzado) return;
        try {
          const desc = plato.descripcion ? ` (${plato.descripcion})` : '';
          const rPlato = await generarImagen(
            jwt,
            { id: restauranteId, nombre: prosp.nombre },
            {
              modo: 'plato',
              texto: limpiarTextoIa(`${plato.nombre}${desc}. Emplatado realista de restaurante en ${prosp.zona}`),
              contexto: `${contextoMarca}. Plato: ${plato.nombre}${desc}`,
              nombre: prosp.nombre,
            }
          );
          await editarPlato(jwt, plato.id, {
            fotoUrl: rPlato.url,
          });
          await comoCliente(jwt, (c) =>
            c.query("UPDATE public.menu_items SET etiqueta = 'recomendado' WHERE id = $1", [plato.id])
          ).catch(() => {});
          platosConFotoIa++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'límite alcanzado';
          avisos.push(`Foto «${plato.nombre}»: ${msg}`);
          if (/l[ií]mite|saldo|pausa|usado todas/i.test(msg)) {
            limitePlatosAlcanzado = true;
          }
        }
      });
    }
  }

  await Promise.all([ejecutarConConcurrencia(tareasImagen, 3), promesaPropuesta]);

  const propuestaToken = await comoCliente(jwt, async (c) => {
    const r = await c.query<{ t: string }>(
      'SELECT dk.prosp_guardar_propuesta_completa($1, $2, $3, $4) AS t',
      [op.prospectoId, propuestaTexto, oferta, demoUrl]
    );
    return r.rows[0].t;
  });
  const saldoFinal = await saldoIa(jwt, restauranteId).catch(() => null);

  return {
    restauranteId,
    slug,
    propuestaToken,
    platosCreadosDeFoto,
    logoGenerado,
    bannerGenerado,
    platosConFotoIa,
    propuestaTexto,
    restantesIa: saldoFinal?.restantes ?? null,
    aviso: avisos.length > 0 ? avisos.join(' · ') : null,
  };
}

export type ModoConsultaAgenteProsp =
  | 'mejorar_propuesta'
  | 'guion_llamada'
  | 'mensaje_whatsapp'
  | 'responder_objecion'
  | 'chat_libre';

/**
 * Chat y asistente IA para comerciales y Dirección dentro de Prospección / Propuestas.
 */
export async function consultarAgenteProspeccion(
  jwt: string,
  d: {
    prospectoId: string;
    modo: ModoConsultaAgenteProsp;
    texto: string;
    demoSlug?: string | null;
    propuestaToken?: string | null;
  }
): Promise<{ respuesta: string }> {
  const prosp = await comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{
      nombre: string;
      tipo: string;
      zona: string;
      contacto: string | null;
      nota_guia: string | null;
      oferta: string | null;
      propuesta_texto: string | null;
    }>(
      `SELECT nombre, tipo, zona, contacto, nota_guia, oferta, propuesta_texto
         FROM public.prospectos WHERE id = $1`,
      [d.prospectoId]
    );
    return rows[0] ?? null;
  });
  if (!prosp) throw new Error('Prospecto no encontrado.');

  const urlCarta = d.demoSlug ? `https://dkitchencorporate.es/m/${d.demoSlug}` : null;
  const urlPanel = d.demoSlug ? `https://dkitchencorporate.es/demo/panel?local=${d.demoSlug}` : null;
  const urlPropuesta = d.propuestaToken ? `https://dkitchencorporate.es/propuesta/${d.propuestaToken}` : null;

  const contexto = [
    `Local: ${prosp.nombre} (${prosp.tipo} en ${prosp.zona})`,
    prosp.contacto ? `Contacto: ${prosp.contacto}` : '',
    prosp.nota_guia ? `Notas: ${prosp.nota_guia}` : '',
    urlCarta ? `Carta demo viva: ${urlCarta}` : '',
    urlPanel ? `Simulador de sala/comandas: ${urlPanel}` : '',
    urlPropuesta ? `Enlace propuesta: ${urlPropuesta}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const instruccionesModo: Record<ModoConsultaAgenteProsp, string> = {
    mejorar_propuesta:
      'Mejora y haz más persuasivo el texto de la propuesta comercial para este local. Conserva los enlaces de su demo interactiva si aparecen. Devuelve SOLO el texto listo para guardar en la propuesta (sin comillas ni markdown, sin emojis ni mencionar IA, máx. 1200 caracteres).',
    guion_llamada:
      'Escribe un guion de llamada o visita presencial de 45 segundos para impactar al dueño enseñándole su demo con sus propios platos y el simulador de comandas en vivo. Claro, directo, de tú a tú hostelero, sin markdown ni emojis ni mencionar IA.',
    mensaje_whatsapp:
      'Redacta un mensaje corto de WhatsApp o Instagram DM (máximo 5 líneas) para enviarle ahora mismo al dueño con el enlace de su propuesta y su demo interactiva ya montada. Sin markdown, sin emojis ni mencionar IA.',
    responder_objecion:
      'Da al comercial 2 respuestas cortas, elegantes y efectivas para rebatir la objeción del hostelero apoyándose en la demo en vivo y el mes de prueba desde 1 €.',
    chat_libre:
      'Ayuda al comercial o a Dirección con lo que pide sobre este prospecto, su demo o su propuesta. Español de España, práctico, directo y sin markdown ni emojis.',
  };

  const respuesta = await llamarTextoAgente(
    `Eres Agente DK, asesor senior de prospección y hostelería de DKitchen Corporate.\nPROHIBIDO usar emojis, emoticonos o mencionar "IA" / "inteligencia artificial" en textos para el cliente.\n${instruccionesModo[d.modo]}\n\nDATOS DEL PROSPECTO:\n${contexto}`,
    d.texto.trim() || prosp.propuesta_texto || `Prepara el texto para ${prosp.nombre}.`,
    650
  );

  return { respuesta };
}
