/**
 * Prepara una foto en el navegador antes de subirla (gratis, sin IA):
 * - recorte centrado al formato pedido (4:3 platos, 16:9 banners),
 * - ajuste de luz suave (niveles automáticos y aclarado si está oscura),
 * - compresión a JPEG por debajo de 900 KB.
 */
export interface OpcionesImagen {
  /** Proporción ancho/alto para recortar al centro (p. ej. 4 / 3). */
  recorte?: number;
  /** Ajuste automático de luz y contraste. */
  mejorar?: boolean;
}

export async function comprimirImagen(archivo: File, ladoMax = 1400, opciones: OpcionesImagen = {}): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (opciones.recorte) {
    const actual = sw / sh;
    if (actual > opciones.recorte) { sw = Math.round(sh * opciones.recorte); sx = Math.round((bitmap.width - sw) / 2); }
    else if (actual < opciones.recorte) { sh = Math.round(sw / opciones.recorte); sy = Math.round((bitmap.height - sh) / 2); }
  }
  const escala = Math.min(1, ladoMax / Math.max(sw, sh));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(sw * escala);
  lienzo.height = Math.round(sh * escala);
  const ctx = lienzo.getContext('2d')!;
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  if (opciones.mejorar) ajustarLuz(ctx, lienzo.width, lienzo.height);
  for (const calidad of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', calidad));
    if (blob && blob.size <= 900_000) return blob;
  }
  throw new Error('La imagen es demasiado grande incluso comprimida.');
}

/** Niveles automáticos (percentiles 1 % y 99 % de luminancia) con límites prudentes y aclarado de sombras si hace falta. */
function ajustarLuz(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  let suma = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) { // muestra 1 de cada 4 píxeles
    const l = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0;
    hist[l]++; suma += l; n++;
  }
  const percentil = (p: number) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * p) return v; } return 255; };
  // Límites: nunca se estira más de lo razonable (evita quemar fotos ya correctas).
  const negro = Math.min(percentil(0.01), 40);
  const blanco = Math.max(percentil(0.99), 215);
  const media = suma / n;
  // Aclarado (gamma < 1) solo si la foto es oscura; máximo moderado.
  const gamma = media < 105 ? Math.max(0.72, media / 125) : 1;
  if (negro <= 2 && blanco >= 253 && gamma === 1) return; // ya está bien
  const tabla = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const x = Math.min(1, Math.max(0, (v - negro) / (blanco - negro)));
    tabla[v] = Math.round(255 * Math.pow(x, gamma));
  }
  for (let i = 0; i < d.length; i += 4) { d[i] = tabla[d[i]]; d[i + 1] = tabla[d[i + 1]]; d[i + 2] = tabla[d[i + 2]]; }
  ctx.putImageData(img, 0, 0);
}
