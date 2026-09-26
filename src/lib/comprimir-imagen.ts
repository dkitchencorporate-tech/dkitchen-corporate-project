/**
 * Reduce la foto en el navegador antes de subirla (máx. 1400 px, JPEG ~0,82).
 * Una foto de móvil de 4–8 MB queda en 150–400 KB: cabe en el límite de 1 MB
 * de las Server Actions y la carta carga rápido en 4G.
 */
export async function comprimirImagen(archivo: File, ladoMax = 1400): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  for (const calidad of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', calidad));
    if (blob && blob.size <= 900_000) return blob;
  }
  throw new Error('La imagen es demasiado grande incluso comprimida.');
}
