import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { descifrar } from '@/lib/cifrado';
import { destinoTpv, resultadoTpv } from '@/lib/sala';
import { panelDestinoTpv, panelResultadoTpv } from '@/lib/comandero';

/**
 * Envío de lo registrado en sala al TPV del local (Conexión TPV, 0027).
 * Datos en JSON; el fabricante del TPV los transforma a su formato.
 *
 * Seguridad (SSRF): solo https, y el host debe resolver a IPs públicas (se
 * bloquean redes privadas, localhost, link-local y metadatos de nube). La
 * credencial se descifra solo aquí, en el instante del envío. Tiempo máximo 8 s.
 */

function ipPrivada(ip: string): boolean {
  if (isIP(ip) === 6) {
    const l = ip.toLowerCase();
    return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l === '::';
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function destinoSeguro(url: string): Promise<boolean> {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const ips = await lookup(u.hostname, { all: true }).catch(() => []);
  return ips.length > 0 && ips.every((i) => !ipPrivada(i.address));
}

type DestinoTpv = { endpoint_url: string; credencial_cifrada: string | null; restaurante: string; mesa: string; lineas: unknown; creado_en: string };
type Guardar = (ok: boolean, detalle: string) => Promise<void>;

/** Camarero (app de sala, por token). */
export async function enviarRegistroAlTpv(token: string, registroId: string) {
  return enviar(await destinoTpv(token, registroId), registroId, (ok, d) => resultadoTpv(token, registroId, ok, d));
}

/** Encargado (panel, por sesión): «Reenviar al TPV» de una ronda que no llegó (0046). */
export async function reenviarRegistroAlTpv(jwt: string, registroId: string) {
  return enviar(await panelDestinoTpv(jwt, registroId), registroId, (ok, d) => panelResultadoTpv(jwt, registroId, ok, d));
}

async function enviar(d: DestinoTpv | null, registroId: string, guardar: Guardar): Promise<{ enviado: boolean; motivo?: string }> {
  if (!d) return { enviado: false, motivo: 'sin_conexion' };
  if (!(await destinoSeguro(d.endpoint_url))) {
    await guardar(false, 'Destino no permitido (debe ser https público).');
    return { enviado: false, motivo: 'destino_no_permitido' };
  }
  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'DKitchen-Sala/1.0' };
  if (d.credencial_cifrada) {
    try { cabeceras.Authorization = descifrar(d.credencial_cifrada); }
    catch { await guardar(false, 'Credencial ilegible.'); return { enviado: false, motivo: 'credencial' }; }
  }
  const cuerpo = {
    origen: 'dkitchen-sala',
    version: 1,
    restaurante: d.restaurante,
    mesa: d.mesa,
    registrado_en: new Date(d.creado_en).toISOString(),
    referencia: registroId,
    lineas: (d.lineas as { plato_id: string; nombre: string; cantidad: number; nota: string }[]).map((l) => ({
      producto: l.nombre, referencia_producto: l.plato_id, cantidad: l.cantidad, nota: l.nota || undefined,
    })),
  };
  try {
    const r = await fetch(d.endpoint_url, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo), redirect: 'error', signal: AbortSignal.timeout(8000) });
    await guardar(r.ok, r.ok ? `HTTP ${r.status}` : `El TPV respondió HTTP ${r.status}`);
    return { enviado: r.ok, motivo: r.ok ? undefined : `http_${r.status}` };
  } catch (e) {
    await guardar(false, `Sin respuesta del TPV: ${(e as Error).name}`);
    return { enviado: false, motivo: 'sin_respuesta' };
  }
}
