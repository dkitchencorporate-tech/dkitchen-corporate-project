'use client';

import { upload } from '@vercel/blob/client';
import { comprimirImagen } from '@/lib/comprimir-imagen';
import type { AdjuntoMedia } from '@/lib/media-central';

const MAX_VIDEO = 25_000_000;
const MAX_FORMDATA = 3_500_000;

function nuevoUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function tipoInferido(file: File): string {
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.mp4')) return 'video/mp4';
  if (n.endsWith('.webm')) return 'video/webm';
  if (n.endsWith('.mov')) return 'video/quicktime';
  return '';
}

export async function subirMediaCentral(file: File, destino: 'buzon' | 'redes'): Promise<AdjuntoMedia> {
  const mime = tipoInferido(file);
  const nombreLimpio = (file.name || 'archivo').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 160);

  if (mime.startsWith('image/')) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      throw new Error('Usa imágenes JPG, PNG o WebP.');
    }
    const comprimida = await comprimirImagen(file, 1600);
    const fd = new FormData();
    fd.set('destino', destino);
    fd.set('f', new File([comprimida], nombreLimpio.replace(/\.[a-z0-9]+$/i, '') + '.jpg', { type: 'image/jpeg' }));
    const res = await fetch('/api/central/subir-media', { method: 'POST', body: fd });
    const json = (await res.json().catch(() => null)) as { url?: string; tipo?: 'imagen' | 'video'; nombre?: string; error?: string } | null;
    if (!res.ok || !json?.url) throw new Error(json?.error || 'No se pudo subir la imagen.');
    return { url: json.url, tipo: 'imagen', nombre: json.nombre || nombreLimpio };
  }

  if (mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/quicktime') {
    if (destino === 'redes') {
      throw new Error('Analítica de redes admite únicamente capturas de imagen.');
    }
    if (file.size > MAX_VIDEO) {
      throw new Error('El vídeo supera el máximo de 25 MB.');
    }
    const ext = mime === 'video/webm' ? 'webm' : mime === 'video/quicktime' ? 'mov' : 'mp4';

    if (file.size <= MAX_FORMDATA) {
      const fd = new FormData();
      fd.set('destino', destino);
      fd.set('f', new File([file], nombreLimpio || `video.${ext}`, { type: mime }));
      const res = await fetch('/api/central/subir-media', { method: 'POST', body: fd });
      const json = (await res.json().catch(() => null)) as { url?: string; nombre?: string; error?: string } | null;
      if (!res.ok || !json?.url) throw new Error(json?.error || 'No se pudo subir el vídeo.');
      return { url: json.url, tipo: 'video', nombre: json.nombre || nombreLimpio };
    }

    const blob = await upload(`${destino}/${nuevoUuid()}.${ext}`, file, {
      access: 'public',
      handleUploadUrl: '/api/central/subir-media',
      clientPayload: JSON.stringify({ destino }),
      contentType: mime,
      multipart: file.size > 5 * 1024 * 1024,
    });
    return { url: blob.url, tipo: 'video', nombre: nombreLimpio || `video.${ext}` };
  }

  throw new Error(
    destino === 'redes'
      ? 'Formato no admitido. Usa imágenes JPG, PNG o WebP.'
      : 'Formato no admitido. Usa imágenes JPG, PNG o WebP, o vídeo MP4, WebM o MOV.',
  );
}
