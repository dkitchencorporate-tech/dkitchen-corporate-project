import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { estadoInterno } from '@/lib/guard-admin';
import { esComercialActual } from '@/lib/rol-central';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

type Destino = 'buzon' | 'redes';

const IMAGENES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const VIDEOS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const MAX_FORMDATA = 3_800_000;
const MAX_VIDEO_CLIENT = 25_000_000;
const MAX_IMAGEN_CLIENT = 5_000_000;
const PATHNAME_SEGURO = /^(buzon|redes)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|mp4|webm|mov)$/;

async function verificarAcceso(destino: Destino): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) return { ok: false, status: 401, error: 'No autorizado' };

  const interno = await estadoInterno(jwt);
  if (destino === 'redes') {
    if (interno.tipo !== 'admin' || interno.estado !== 'ok') {
      return { ok: false, status: 401, error: 'No autorizado' };
    }
    if (await esComercialActual(jwt)) {
      return { ok: false, status: 403, error: 'Solo Dirección' };
    }
    return { ok: true };
  }

  if ((interno.tipo === 'admin' || interno.tipo === 'socio') && interno.estado === 'ok') {
    return { ok: true };
  }
  return { ok: false, status: 401, error: 'No autorizado' };
}

function normalizarDestino(raw: unknown): Destino | null {
  return raw === 'buzon' || raw === 'redes' ? raw : null;
}

/**
 * Subida segura de capturas, fotos y vídeos internos para Buzón (admin/socio) y
 * Analítica de Redes (solo Dirección). Admite multipart (< 3,8 MB) y token
 * firmado @vercel/blob/client para vídeos de hasta 25 MB.
 */
export async function POST(req: Request) {
  const ct = req.headers.get('content-type') ?? '';

  if (ct.includes('application/json')) {
    const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
    if (!body || typeof body !== 'object' || !('type' in body)) {
      return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
    }

    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          let destino: Destino | null = null;
          if (clientPayload) {
            try {
              const parsed = JSON.parse(clientPayload) as { destino?: unknown };
              destino = normalizarDestino(parsed?.destino);
            } catch {
              destino = null;
            }
          }
          if (!destino) throw new Error('Destino no válido');

          const acceso = await verificarAcceso(destino);
          if (!acceso.ok) throw new Error(acceso.error);

          if (await limiteSuperado(claveDeLimite('central-media', ipDeLaPeticion(req)), 60, 3600)) {
            throw new Error('Demasiadas subidas en una hora');
          }

          if (!PATHNAME_SEGURO.test(pathname) || !pathname.startsWith(`${destino}/`)) {
            throw new Error('Ruta de archivo no permitida');
          }
          const esVideoPath = /\.(mp4|webm|mov)$/.test(pathname);
          if (destino === 'redes' && esVideoPath) {
            throw new Error('Analítica de redes solo admite imágenes');
          }

          return {
            allowedContentTypes: destino === 'redes'
              ? Object.keys(IMAGENES)
              : [...Object.keys(IMAGENES), ...Object.keys(VIDEOS)],
            maximumSizeInBytes: destino === 'redes' ? MAX_IMAGEN_CLIENT : MAX_VIDEO_CLIENT,
            addRandomSuffix: true,
            allowOverwrite: false,
            validUntil: Date.now() + 5 * 60 * 1000,
          };
        },
      });
      return NextResponse.json(jsonResponse);
    } catch (e) {
      const msg = (e as Error).message || 'No se pudo autorizar la subida';
      const status = /No autorizado/i.test(msg) ? 401 : /Solo Dirección/i.test(msg) ? 403 : /Demasiadas/i.test(msg) ? 429 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Formulario no válido' }, { status: 400 });
  }

  const destino = normalizarDestino(form.get('destino'));
  if (!destino) {
    return NextResponse.json({ error: 'Destino no válido' }, { status: 400 });
  }

  const acceso = await verificarAcceso(destino);
  if (!acceso.ok) {
    return NextResponse.json({ error: acceso.error }, { status: acceso.status });
  }

  if (await limiteSuperado(claveDeLimite('central-media', ipDeLaPeticion(req)), 60, 3600)) {
    return NextResponse.json({ error: 'Has subido demasiados archivos. Espera un poco.' }, { status: 429 });
  }

  const archivo = form.get('f');
  if (!(archivo instanceof File) || archivo.size < 100 || archivo.size > MAX_FORMDATA) {
    return NextResponse.json({ error: 'Archivo no válido o superior a 3,8 MB.' }, { status: 400 });
  }

  const extImg = IMAGENES[archivo.type];
  const extVid = destino === 'buzon' ? VIDEOS[archivo.type] : undefined;
  const ext = extImg ?? extVid;
  if (!ext) {
    return NextResponse.json(
      { error: destino === 'redes' ? 'Formato no admitido. Usa JPG, PNG o WebP.' : 'Formato no admitido. Usa JPG, PNG, WebP, MP4, WebM o MOV.' },
      { status: 400 },
    );
  }

  try {
    const { url } = await put(`${destino}/${crypto.randomUUID()}.${ext}`, archivo, {
      access: 'public',
      contentType: archivo.type,
    });
    const nombreLimpio = (archivo.name || `archivo.${ext}`).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 160);
    return NextResponse.json({
      url,
      tipo: extVid ? 'video' : 'imagen',
      nombre: nombreLimpio,
    });
  } catch (e) {
    console.error('Central subir-media:', (e as Error).message);
    return NextResponse.json({ error: 'No se pudo guardar el archivo' }, { status: 500 });
  }
}
