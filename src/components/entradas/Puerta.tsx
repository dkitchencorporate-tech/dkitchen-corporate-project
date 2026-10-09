'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

type Resultado = { r: string; nombre?: string; numero?: number; usada_en?: string };

const TEXTOS: Record<string, [string, string]> = {
  ok: ['bg-exito', 'ENTRADA VÁLIDA'],
  usada: ['bg-vino', 'YA USADA'],
  anulada: ['bg-vino', 'ENTRADA ANULADA'],
  no_existe: ['bg-vino', 'NO ES DE ESTE EVENTO'],
  clave: ['bg-vino', 'CLAVE DE PUERTA INCORRECTA'],
  freno: ['bg-vino', 'DEMASIADAS LECTURAS, ESPERA'],
  error: ['bg-vino', 'ERROR, PRUEBA OTRA VEZ'],
};

/** Escáner de entradas para el móvil del portero: cámara trasera + jsQR, con entrada manual de respaldo. */
export default function Puerta({ slug }: { slug: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const ultimo = useRef<{ codigo: string; t: number }>({ codigo: '', t: 0 });
  const [clave, setClave] = useState('');
  const [res, setRes] = useState<Resultado | null>(null);
  const [manual, setManual] = useState('');
  const [camara, setCamara] = useState<'off' | 'on' | 'error'>('off');

  useEffect(() => {
    const k = new URLSearchParams(window.location.hash.slice(1)).get('k') ?? '';
    setClave(k);
  }, []);

  async function validar(codigo: string) {
    const ahora = Date.now();
    if (codigo === ultimo.current.codigo && ahora - ultimo.current.t < 4000) return;
    ultimo.current = { codigo, t: ahora };
    const r = await fetch('/api/entradas/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, clave, codigo }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as Resultado | null;
    setRes(j ?? { r: 'error' });
    if (navigator.vibrate) navigator.vibrate(j?.r === 'ok' ? 80 : [200, 80, 200]);
  }

  async function encender() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (!video.current) return;
      video.current.srcObject = s;
      await video.current.play();
      setCamara('on');
      const bucle = () => {
        const v = video.current, c = lienzo.current;
        if (!v || !c || v.readyState < 2) { requestAnimationFrame(bucle); return; }
        c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0);
          const qr = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
          if (qr?.data) validar(qr.data.trim());
        }
        setTimeout(() => requestAnimationFrame(bucle), 250);
      };
      bucle();
    } catch {
      setCamara('error');
    }
  }

  const [fondo, texto] = res ? TEXTOS[res.r] ?? TEXTOS.error : ['bg-noche', 'Apunta al código QR'];
  return (
    <main className="min-h-screen bg-noche px-4 py-6 text-white">
      <div className="mx-auto grid max-w-md gap-4">
        <h1 className="text-lg font-semibold">Control de entradas</h1>
        {!clave && (
          <label className="grid gap-1.5 text-sm">Clave de puerta (te la da el organizador)
            <input onChange={(e) => setClave(e.target.value.trim())} className="rounded-xl bg-white px-4 py-3 text-carbon" />
          </label>
        )}
        <div className="relative overflow-hidden rounded-[22px] bg-black">
          <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
          <canvas ref={lienzo} className="hidden" />
          {camara !== 'on' && (
            <button onClick={encender} disabled={!clave} className="absolute inset-0 m-auto h-fit w-fit rounded-full bg-vino px-6 py-3 font-semibold disabled:opacity-50">
              {camara === 'error' ? 'Sin acceso a la cámara: usa el código abajo' : 'Encender cámara'}
            </button>
          )}
        </div>
        <div role="status" aria-live="assertive" className={`rounded-[22px] px-5 py-6 text-center ${fondo}`}>
          <p className="text-2xl font-bold">{texto}</p>
          {res?.nombre && <p className="mt-1">{res.nombre}{res.numero ? ` · entrada ${res.numero}` : ''}</p>}
          {res?.usada_en && <p className="mt-1 text-sm">Usada: {new Date(res.usada_en).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (manual) validar(manual.trim()); }} className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Código escrito" className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-carbon" />
          <button disabled={!clave} className="rounded-xl bg-white/15 px-4 font-semibold disabled:opacity-50">Validar</button>
        </form>
      </div>
    </main>
  );
}
