import 'server-only';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

/**
 * Logo con el nombre SIEMPRE bien escrito (14/10/2026, piloto Casa Caracas: la IA escribió
 * «Vasa Caracas»). La IA solo dibuja el símbolo, sin letras; el nombre lo pone el servidor
 * con tipografía real debajo del símbolo, sobre el mismo color de fondo. Así no hay faltas
 * nunca, y las correcciones («más rojo», «otro símbolo») se aplican al símbolo guardado aparte.
 */
const LADO = 1024;
let fuente: ArrayBuffer | null | undefined;

async function fuenteSerif(): Promise<ArrayBuffer | null> {
  if (fuente !== undefined) return fuente;
  try {
    // Sin cabecera de navegador moderno, Google Fonts sirve TTF (satori no lee WOFF2).
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700', { signal: AbortSignal.timeout(6000) })).text();
    const url = css.match(/src: url\((https:[^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
    fuente = url ? await (await fetch(url, { signal: AbortSignal.timeout(6000) })).arrayBuffer() : null;
  } catch {
    fuente = null;
  }
  return fuente;
}

/** Color de fondo del símbolo (media de las 4 esquinas) y si es oscuro. */
async function fondo(png: Buffer): Promise<{ hex: string; oscuro: boolean }> {
  const img = sharp(png);
  const { width = LADO, height = LADO } = await img.metadata();
  const t = 12;
  const esquinas = [[0, 0], [width - t, 0], [0, height - t], [width - t, height - t]];
  const medias = await Promise.all(esquinas.map(async ([left, top]) => (await sharp(png).extract({ left, top, width: t, height: t }).stats()).channels.slice(0, 3).map((c) => c.mean)));
  const [r, g, b] = [0, 1, 2].map((i) => Math.round(medias.reduce((s, m) => s + m[i], 0) / medias.length));
  const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return { hex, oscuro: 0.299 * r + 0.587 * g + 0.114 * b < 140 };
}

/** Normaliza cualquier salida de la IA a PNG cuadrado (el símbolo que se guarda aparte). */
export async function emblemaPng(datos: Buffer): Promise<Buffer> {
  return sharp(datos).resize(LADO, LADO, { fit: 'cover' }).png().toBuffer();
}

/** Compone el logo final: símbolo arriba y el nombre exacto debajo. */
export async function componerLogo(emblema: Buffer, nombre: string): Promise<Buffer> {
  const texto = nombre.replace(/\s+/g, ' ').trim().slice(0, 40);
  const { hex, oscuro } = await fondo(emblema);
  const tinta = oscuro ? '#FDFCF8' : '#17130F';
  const tam = texto.length <= 10 ? 112 : texto.length <= 16 ? 96 : texto.length <= 24 ? 78 : 62;
  const serif = await fuenteSerif();
  const respuesta = new ImageResponse(
    (
      <div style={{ width: LADO, height: LADO, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: hex }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${emblema.toString('base64')}`} width={640} height={640} style={{ width: 640, height: 640, objectFit: 'contain' }} alt="" />
        <div style={{ display: 'flex', marginTop: 8, maxWidth: 900, textAlign: 'center', justifyContent: 'center', fontSize: tam, lineHeight: 1.05, color: tinta, fontFamily: serif ? 'Playfair' : 'serif', fontWeight: 700, letterSpacing: -1 }}>{texto}</div>
      </div>
    ),
    { width: LADO, height: LADO, fonts: serif ? [{ name: 'Playfair', data: serif, weight: 700, style: 'normal' }] : undefined },
  );
  return Buffer.from(await respuesta.arrayBuffer());
}
