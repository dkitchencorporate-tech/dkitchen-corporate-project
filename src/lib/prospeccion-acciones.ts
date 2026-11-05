'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { comoCliente } from '@/lib/db';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { exigirAdmin } from '@/lib/guard-admin';
import { COOKIE_PUESTA } from '@/lib/socio-codigo';
import { claveDeLimite, limiteSuperado } from '@/lib/limite-frecuencia';
import {
  ejecutarAgenteDemoPropuesta,
  consultarAgenteProspeccion,
  type OpcionesAgenteDemoPropuesta,
  type ResultadoAgenteDemoPropuesta,
  type ModoConsultaAgenteProsp,
} from '@/lib/agente-prospeccion-ia';
import {
  esBaseCrm, esEstado, hoyMadrid, esCanal, esResultado, proponerRuta, listaProspectos,
  NIVELES, PRODUCTOS, PALANCAS, MATERIALES, MOTIVOS, OFERTAS, type BaseCrm,
} from '@/lib/prospeccion';

/**
 * Acciones del CRM de prospección (0058), compartidas por Central y /socio.
 * La autorización la decide la base en cada función (dk.prosp_rol: super admin
 * con 2FA o socio con 2FA; el socio solo toca lo suyo). Aquí solo se valida la
 * forma de los datos y a qué página volver.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const CAMPOS = ['nombre', 'tipo', 'zona', 'barrio', 'direccion', 'telefono', 'instagram', 'web', 'contacto', 'plataformas',
  'ticket_medio', 'mesas', 'competidores', 'notas', 'fuente', 'referido_por', 'place_id', 'puntuacion', 'muestra_url',
  'oferta', 'propuesta_texto', 'siguiente_accion', 'siguiente_fecha', 'apertura_prevista', 'nota_guia', 'comercial_id'] as const;

async function contexto(f: FormData) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  const base = String(f.get('base') ?? '');
  if (!esBaseCrm(base)) throw new Error('Origen no válido.');
  return { jwt, base: base as BaseCrm };
}

const idDe = (f: FormData, k = 'id') => {
  const id = String(f.get(k) ?? '');
  if (!UUID.test(id)) throw new Error('Identificador no válido.');
  return id;
};

/** Mensaje corto para el usuario a partir del error de Postgres (sin detalles internos). */
function aviso(e: unknown) {
  const m = (e as Error).message || '';
  if (/sin consentimiento/.test(m)) return 'consentimiento';
  if (/no contactar/.test(m)) return 'nocontactar';
  if (/reintento/.test(m)) return 'reintento';
  if (/fecha no válida/.test(m)) return 'fecha';
  if (/no autorizado/.test(m)) return 'permiso';
  if (/tope_demos_comercial/.test(m)) return 'tope_demos';
  if (/check constraint|invalid input|out of range|violates/.test(m)) return 'datos';
  if (/no encontrado/.test(m)) return 'slug';
  if (/motivo/.test(m)) return 'motivo';
  return 'error';
}

/** Alta (sin id) o edición de la ficha. Solo se envían los campos presentes en el formulario. */
export async function guardarProspectoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = f.get('id') ? idDe(f) : null;
  const datos: Record<string, string | boolean> = {};
  for (const k of CAMPOS) {
    if (!f.has(k)) continue;
    let v = String(f.get(k) ?? '').trim();
    if (k === 'instagram') v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
    if (k === 'muestra_url' && v && !/^https:\/\//.test(v)) v = 'https://' + v.replace(/^http:\/\//, '');
    if ((k === 'siguiente_fecha' || k === 'apertura_prevista') && v && !FECHA.test(v)) continue;
    datos[k] = v;
  }
  if (f.has('no_contactar_campo')) datos.no_contactar = f.get('no_contactar') === 'on';
  // 0114: canal, consentimiento / relación previa (LSSI) y preparación van por dk.prosp_canal.
  const canal: Record<string, string | boolean> = {};
  if (f.has('canal')) { const v = String(f.get('canal') ?? ''); if (v === '' || esCanal(v)) canal.canal = v; }
  if (f.has('consentimiento_campo')) { canal.consentimiento = f.get('consentimiento') === 'on'; canal.relacion_previa = f.get('relacion_previa') === 'on'; }
  if (f.has('preparacion')) canal.preparacion = String(f.get('preparacion') ?? '').slice(0, 1000);
  let nuevo: string;
  try {
    nuevo = await comoCliente(jwt, async (c) => {
      const pid = (await c.query<{ id: string }>('SELECT dk.prosp_guardar($1, $2) AS id', [id, datos])).rows[0].id;
      if (Object.keys(canal).length) await c.query('SELECT dk.prosp_canal($1, $2)', [pid, canal]);
      return pid;
    });
  } catch (e) {
    redirect(`${base}${id ? '/' + id : ''}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${nuevo}?ok=guardado`);
}

export async function estadoProspectoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const estado = String(f.get('estado') ?? '');
  if (!esEstado(estado)) redirect(`${base}/${id}?e=datos`);
  const motivo = String(f.get('motivo') ?? '') || null;
  const slug = String(f.get('slug') ?? '').trim() || null;
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_estado($1, $2, $3, $4)', [id, estado, estado === 'descartado' ? motivo : null, estado === 'cliente' ? slug : null]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${id}?ok=estado`);
}

export async function anotarContactoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const fecha = String(f.get('fecha') ?? '');
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_anotar($1, $2, $3, $4, $5)', [
      id, String(f.get('tipo') ?? 'nota'), String(f.get('texto') ?? '').slice(0, 1000),
      String(f.get('siguiente') ?? '').slice(0, 200), FECHA.test(fecha) ? fecha : null]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${id}?ok=anotado`);
}

/** Ruta de hoy: cada campo orden_<id> con un número entra en la ruta, ordenado de menor a mayor. */
export async function guardarRutaAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const paradas: { id: string; n: number }[] = [];
  for (const [k, v] of f.entries()) {
    if (!k.startsWith('orden_')) continue;
    const id = k.slice(6); const n = Number(v);
    if (UUID.test(id) && String(v).trim() !== '' && Number.isFinite(n)) paradas.push({ id, n });
  }
  paradas.sort((a, b) => a.n - b.n);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_ruta($1, $2::uuid[])', [hoyMadrid(), paradas.map((p) => p.id)]));
  } catch (e) {
    redirect(`${base}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}?ok=ruta#ruta`);
}

/**
 * 0114 · Registro de un contacto en 3 toques (canal → resultado → Guardar). El comercial lo pone la base
 * (identidad de la sesión); la regla del correo (consentimiento o relación previa) también la impone la base.
 * `volver` = 'ruta' vuelve a la ruta del día; si no, a la ficha.
 */
export async function registrarContactoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const enRuta = f.get('volver') === 'ruta';
  const atras = (q: string) => (enRuta ? `${base}?${q}#ruta` : `${base}/${id}?${q}#registro`);
  const canal = String(f.get('canal') ?? '');
  const resultado = String(f.get('resultado') ?? '');
  if (!esCanal(canal) || !esResultado(resultado)) redirect(atras('e=datos'));
  const elegir = <T extends object>(k: string, dic: T) => { const v = String(f.get(k) ?? ''); return v in dic ? v : null; };
  const fecha = String(f.get('siguiente_fecha') ?? '');
  const num = (k: string) => { const v = Number(String(f.get(k) ?? '')); return String(f.get(k) ?? '') !== '' && Number.isFinite(v) ? v : null; };
  const flyer = String(f.get('flyer_codigo') ?? '').trim().toLowerCase();
  const datos = {
    canal, resultado,
    motivo: resultado === 'descartado' ? elegir('motivo', MOTIVOS) : null,
    objecion_nivel: elegir('objecion_nivel', NIVELES), objecion: String(f.get('objecion') ?? '').slice(0, 300),
    producto: elegir('producto', PRODUCTOS), palanca: elegir('palanca', PALANCAS),
    material: f.getAll('material').map(String).filter((m) => m in MATERIALES),
    flyer_codigo: /^[a-z0-9-]{2,40}$/.test(flyer) ? flyer : null,
    plantilla: canal !== 'fisico' ? String(f.get('plantilla') ?? '').slice(0, 80) : null,
    texto: String(f.get('texto') ?? '').slice(0, 1000), siguiente: String(f.get('siguiente') ?? '').slice(0, 200),
    siguiente_fecha: FECHA.test(fecha) ? fecha : null,
    consentimiento: f.get('consentimiento') === 'on', relacion_previa: f.get('relacion_previa') === 'on',
    lat: num('lat'), lng: num('lng'),
  };
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_registrar($1, $2)', [id, datos]));
  } catch (e) {
    redirect(atras(`e=${aviso(e)}`));
  }
  revalidatePath(base);
  revalidatePath(`${base}/${id}`);
  redirect(atras('ok=registrado'));
}

/** 0114 · «Estoy aquí»: sitúa el local con el GPS del móvil (o a mano). */
export async function situarAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const lat = Number(f.get('lat')); const lng = Number(f.get('lng'));
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('invalid input');
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_situar($1, $2, $3, $4)', [id, lat, lng, f.get('fuente') === 'manual' ? 'manual' : 'gps']));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${id}?ok=situado`);
}

/** 0114 · Ruta de hoy propuesta: hasta 8 locales pendientes, Baza y comarca primero, por cercanía. */
export async function proponerRutaAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  let n = 0;
  try {
    const lista = await listaProspectos(jwt, null, null);
    const pendientes = lista.filter((p) => p.mio && !p.no_contactar && ['por_revisar', 'por_visitar', 'muestra'].includes(p.estado));
    const ruta = proponerRuta(pendientes, 8);
    n = ruta.length;
    if (n) await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_ruta($1, $2::uuid[])', [hoyMadrid(), ruta.map((p) => p.id)]));
  } catch (e) {
    redirect(`${base}?e=${aviso(e)}#ruta`);
  }
  revalidatePath(base);
  redirect(`${base}?ok=${n ? 'ruta' : 'sinruta'}#ruta`);
}

export async function crearPropuestaAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_propuesta_token($1)', [id]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(`${base}/${id}`);
  redirect(`${base}/${id}?ok=propuesta#propuesta`);
}

export async function guardarMiContactoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_mi_contacto_guardar($1, $2)', [
      String(f.get('nombre_publico') ?? '').slice(0, 80), String(f.get('telefono') ?? '').slice(0, 20)]));
  } catch (e) {
    redirect(`${base}?e=${aviso(e)}`);
  }
  redirect(`${base}?ok=contacto`);
}

export async function reasignarAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const comercial = idDe(f, 'comercial');
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_prosp_reasignar($1, $2)', [id, comercial]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${id}?ok=reasignado`);
}

/**
 * 0117 · Reasignación por lote desde Central (6, 12 o selección manual) hacia un comercial,
 * fijando si van A pie (y opcionalmente ya en su ruta de hoy) o a su Zona de Prospección Digital.
 */
export async function reasignarLoteAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const comercial = idDe(f, 'comercial');
  const ids = f.getAll('ids').map(String).filter((id) => UUID.test(id));
  if (!ids.length) redirect(`${base}?e=datos`);
  const canalRaw = String(f.get('canal') ?? '');
  const canal = esCanal(canalRaw) ? canalRaw : null;
  const enRuta = f.get('en_ruta') === 'on' && (!canal || canal === 'fisico');
  try {
    await comoCliente(jwt, (c) =>
      c.query('SELECT dk.admin_prosp_reasignar_lote($1::uuid[], $2, $3, $4)', [ids, comercial, canal, enRuta]),
    );
  } catch (e) {
    redirect(`${base}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}?ok=lote`);
}

/**
 * 0117 · Crea o actualiza la demo completa del prospecto (Carta de Autor + Panel + Comandas + 15 créditos IA).
 * Si `abrir_editor` = '1', activa modo soporte (`COOKIE_PUESTA`) y redirige directo a `/panel?pestana=carta`
 * para que el comercial o Dirección pueda subir fotos de los platos al momento.
 */
export async function crearDemoProspectoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const plantilla = String(f.get('plantilla') ?? 'taberna');
  const color = String(f.get('color') ?? '#b08d57');
  const fondo = String(f.get('fondo') ?? 'papel');
  const abrirEditor = f.get('abrir_editor') === '1';
  const volverLista = f.get('volver') === 'lista';
  let res: { restaurante_id: string; slug: string } | null = null;
  try {
    res = await comoCliente(jwt, async (c) => {
      const r = await c.query<{ d: { restaurante_id: string; slug: string } }>(
        'SELECT dk.prosp_crear_demo($1, $2, $3, $4) AS d',
        [id, plantilla, color, fondo],
      );
      return r.rows[0]?.d ?? null;
    });
  } catch (e) {
    redirect(volverLista ? `${base}?e=${aviso(e)}` : `${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  revalidatePath(`${base}/${id}`);
  if (abrirEditor && res?.restaurante_id && UUID.test(res.restaurante_id)) {
    (await cookies()).set(COOKIE_PUESTA, res.restaurante_id, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 14400,
    });
    redirect('/panel?pestana=carta');
  }
  redirect(volverLista ? `${base}?ok=demo` : `${base}/${id}?ok=demo#demo`);
}

/**
 * 0117 · Abre el editor completo (`/panel`) sobre el restaurante demo del prospecto
 * para subir fotos reales de los platos al momento, usar IA o ajustar la carta y mesas.
 */
export async function abrirEditorDemoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const restauranteId = idDe(f, 'restaurante_id');
  const pestanaRaw = String(f.get('pestana') ?? 'carta');
  const pestana = ['carta', 'sala', 'promociones', 'ajustes'].includes(pestanaRaw) ? pestanaRaw : 'carta';
  const ok = await comoCliente(jwt, async (c) => {
    const r = await c.query<{ ok: boolean }>('SELECT dk.gestiona($1) AS ok', [restauranteId]);
    return Boolean(r.rows[0]?.ok);
  }).catch(() => false);
  if (!ok) redirect(`${base}?e=permiso`);
  (await cookies()).set(COOKIE_PUESTA, restauranteId, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 14400,
  });
  redirect(`/panel?pestana=${pestana}`);
}

/**
 * 0117 · Guarda la propuesta automatizada con plantilla, oferta e inclusión automática del link de la demo,
 * y genera el token de `/propuesta/[token]` en un solo paso.
 */
export async function guardarPropuestaPlantillaAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const texto = String(f.get('propuesta_texto') ?? '').trim();
  const ofertaRaw = String(f.get('oferta') ?? 'qr_1');
  const oferta = ofertaRaw in OFERTAS ? ofertaRaw : 'qr_1';
  const muestraUrl = String(f.get('muestra_url') ?? '').trim() || null;
  try {
    await comoCliente(jwt, (c) =>
      c.query('SELECT dk.prosp_guardar_propuesta_completa($1, $2, $3, $4)', [id, texto, oferta, muestraUrl]),
    );
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}#propuesta`);
  }
  revalidatePath(`${base}/${id}`);
  redirect(`${base}/${id}?ok=propuesta#propuesta`);
}

const TIPOS_IMAGEN_CARTA = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Sube una foto de la carta física o pantalla del prospecto a Vercel Blob para que el Agente IA
 * extraiga automáticamente sus secciones, platos, precios y alérgenos.
 */
export async function subirFotoCartaProspectoAction(
  formulario: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const jwt = await obtenerJwtDeSesion().catch(() => null);
    if (!jwt) return { ok: false, error: 'Sesión caducada. Vuelve a iniciar sesión.' };
    const prospectoId = String(formulario.get('prospecto_id') ?? '');
    if (!UUID.test(prospectoId)) return { ok: false, error: 'Prospecto no válido.' };
    const archivo = formulario.get('archivo');
    if (!(archivo instanceof File)) return { ok: false, error: 'No se recibió ninguna foto.' };
    if (!TIPOS_IMAGEN_CARTA.has(archivo.type)) return { ok: false, error: 'Formato no admitido (usa JPG, PNG o WebP).' };
    if (archivo.size > 1_500_000) return { ok: false, error: 'La foto supera el tamaño máximo (1,5 MB).' };

    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_exigir($1)', [prospectoId]));

    const ext = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
    const { url } = await put(`prospeccion/cartas/${prospectoId}/${randomUUID()}.${ext}`, archivo, {
      access: 'public',
      contentType: archivo.type,
    });
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo subir la foto de la carta.' };
  }
}

/**
 * Ejecuta el Agente IA Unificado (Prospecto -> Foto de Carta -> Demo con Logo + Banner + 5-6 fotos IA -> Propuesta lista).
 */
export async function ejecutarAgenteDemoPropuestaAction(
  op: OpcionesAgenteDemoPropuesta & { base?: string }
): Promise<({ ok: true } & ResultadoAgenteDemoPropuesta) | { ok: false; error: string }> {
  try {
    const jwt = await obtenerJwtDeSesion().catch(() => null);
    if (!jwt) return { ok: false, error: 'Sesión caducada. Vuelve a iniciar sesión.' };
    if (!UUID.test(op?.prospectoId ?? '')) return { ok: false, error: 'Prospecto no válido.' };

    const res = await ejecutarAgenteDemoPropuesta(jwt, op);

    const base = esBaseCrm(op.base) ? op.base : '/admin-dkitchen/prospeccion';
    revalidatePath(base);
    revalidatePath(`${base}/${op.prospectoId}`);
    revalidatePath(`/m/${res.slug}`);
    return { ok: true, ...res };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (/tope_demos_comercial/.test(m)) {
      return {
        ok: false,
        error: 'Has alcanzado tu cupo máximo de 10 demos comerciales. Pide a Dirección ampliar tu cupo o reutiliza una demo existente.',
      };
    }
    if (/creacion de demos desactivada/.test(m)) {
      return { ok: false, error: 'La creación de demos está desactivada en tu perfil comercial.' };
    }
    return { ok: false, error: m || 'No se pudo completar el flujo del Agente IA.' };
  }
}

/**
 * Asistente y Chat IA comercial dentro de Prospección / Propuestas:
 * Dirección sin límite; Comerciales hasta 80 consultas/día.
 */
export async function consultarAgenteProspeccionAction(d: {
  prospectoId: string;
  modo: ModoConsultaAgenteProsp;
  texto: string;
  demoSlug?: string | null;
  propuestaToken?: string | null;
}): Promise<{ ok: true; respuesta: string } | { ok: false; error: string }> {
  try {
    const jwt = await obtenerJwtDeSesion().catch(() => null);
    if (!jwt) return { ok: false, error: 'Sesión caducada.' };
    if (!UUID.test(d?.prospectoId ?? '')) return { ok: false, error: 'Prospecto no válido.' };

    const cuota = await comoCliente(jwt, async (c) => {
      const r = await c.query<{ c: { sin_limite?: boolean } }>('SELECT dk.prosp_cuota_ia() AS c');
      return r.rows[0]?.c;
    }).catch(() => ({ sin_limite: false }));

    if (!cuota?.sin_limite) {
      if (await limiteSuperado(claveDeLimite('prosp-ia-chat', d.prospectoId), 80, 24 * 60 * 60)) {
        return { ok: false, error: 'Has usado mucho el asistente de IA hoy en este prospecto. Mañana podrás seguir.' };
      }
    }

    const r = await consultarAgenteProspeccion(jwt, d);
    return { ok: true, respuesta: r.respuesta };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'El asistente IA no ha respondido.' };
  }
}

/** 0118: Acciones en lote para prospectos (dk.admin_lote_accion). */
export async function loteAccionProspectosAction(datos: { base: string; ids: string[]; accion: string; valor?: string }) {
  // 05/11: doble cerrojo (sesión de Central + dk.exigir_direccion() en la base)
  const jwt = await exigirAdmin();
  if (!Array.isArray(datos.ids) || datos.ids.length === 0) {
    return { ok: false, afectados: 0, error: 'No hay prospectos seleccionados.' };
  }
  const idsValidos = datos.ids.filter((id) => UUID.test(id));
  if (idsValidos.length === 0) {
    return { ok: false, afectados: 0, error: 'Identificadores no válidos.' };
  }
  try {
    const afectados = await comoCliente(jwt, async (c) => {
      const res = await c.query<{ n: number }>(
        'SELECT dk.admin_lote_accion($1, $2, $3, $4) AS n',
        ['prospectos', idsValidos, datos.accion, datos.valor ?? null]
      );
      return res.rows[0]?.n ?? 0;
    });
    revalidatePath(datos.base || '/admin-dkitchen/prospeccion');
    return { ok: true, afectados };
  } catch (err: any) {
    return { ok: false, afectados: 0, error: err.message || 'Error al ejecutar la acción en lote.' };
  }
}
