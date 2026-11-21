export type TipoAdjuntoMedia = 'imagen' | 'video';

export interface AdjuntoMedia {
  url: string;
  tipo: TipoAdjuntoMedia;
  nombre?: string;
}

export const BLOB_URL_REGEX = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s"<>]+$/;

export function parsearAdjuntosJson(raw: unknown, max: number, permitirVideo: boolean): AdjuntoMedia[] {
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      arr = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];

  const salida: AdjuntoMedia[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const url = typeof obj.url === 'string' ? obj.url.trim() : '';
    const tipo = obj.tipo === 'video' ? 'video' : obj.tipo === 'imagen' ? 'imagen' : null;
    if (!tipo || (!permitirVideo && tipo === 'video')) continue;
    if (url.length < 20 || url.length > 500 || !BLOB_URL_REGEX.test(url)) continue;

    const nombreRaw = typeof obj.nombre === 'string' ? obj.nombre.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 160) : '';
    salida.push(nombreRaw ? { url, tipo, nombre: nombreRaw } : { url, tipo });
    if (salida.length >= max) break;
  }
  return salida;
}
