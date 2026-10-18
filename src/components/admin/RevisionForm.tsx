'use client';

import { useRef, useState } from 'react';

/**
 * Revisiones de Alex (0087): comentario + imágenes. Las capturas se pegan con
 * Ctrl+V en el cuadro, se arrastran o se eligen; el navegador las reduce a 1.600 px
 * (JPEG) y las sube una a una a /api/admin/revision-imagen. Las URL viajan en un
 * campo oculto a la server action (revisionAction).
 */
async function comprimir(f: File): Promise<Blob> {
  const img = await createImageBitmap(f);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('sin imagen'))), 'image/jpeg', 0.84));
}

export default function RevisionForm({ id, accion, comentario }: { id: string; accion: (f: FormData) => void; comentario: string | null }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const subir = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/')).slice(0, 12 - urls.length);
    if (!imgs.length) return;
    setError(null); setSubiendo((n) => n + imgs.length);
    for (const f of imgs) {
      try {
        const fd = new FormData();
        fd.append('f', new File([await comprimir(f)], 'captura.jpg', { type: 'image/jpeg' }));
        const r = await fetch('/api/admin/revision-imagen', { method: 'POST', body: fd });
        const j = await r.json();
        if (!r.ok || !j.url) throw new Error(j.error || 'error');
        setUrls((u) => [...u, j.url]);
      } catch { setError('Una imagen no se pudo subir. Prueba otra vez.'); }
      setSubiendo((n) => n - 1);
    }
  };

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="imagenes" value={JSON.stringify(urls)} />
      <label className="block text-sm">Lo que has visto (texto, enlaces o pega aquí capturas con Ctrl+V)
        <textarea name="comentario" rows={4} maxLength={6000} defaultValue={comentario ?? ''}
          onPaste={(e) => { const fs = Array.from(e.clipboardData.files); if (fs.length) { e.preventDefault(); subir(fs); } }}
          onDrop={(e) => { e.preventDefault(); subir(Array.from(e.dataTransfer.files)); }}
          placeholder="Qué está bien, qué hay que cambiar y dónde. Puedes pegar capturas directamente."
          className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => archivo.current?.click()} className="rounded-full border border-acero bg-white px-4 py-2 text-sm font-medium">📎 Añadir imágenes</button>
        <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { subir(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        {subiendo > 0 && <span className="text-xs text-niebla">Subiendo {subiendo}…</span>}
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {urls.map((u) => (
            <li key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-20 w-28 rounded-lg object-cover ring-1 ring-linea" />
              <button type="button" onClick={() => setUrls((x) => x.filter((y) => y !== u))} aria-label="Quitar" className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-tinta text-xs text-white">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button name="estado" value="cambios" disabled={subiendo > 0} className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Hay que cambiar · enviar a Claude</button>
        <button name="estado" value="aprobada" disabled={subiendo > 0} className="rounded-full border border-exito px-5 py-2.5 text-sm font-semibold text-exito disabled:opacity-50">✓ Aprobado</button>
      </div>
    </form>
  );
}
