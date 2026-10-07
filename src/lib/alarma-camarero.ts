'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Alarma de llamadas de mesa (07/10/2026, B1 de karc0): suena FUERTE y se repite
 * hasta que alguien atiende, en la app del camarero y en todo el panel del dueño.
 *
 * - Un solo AudioContext por página, desbloqueado con el primer toque o tecla en
 *   cualquier sitio (los navegadores no dejan sonar sin un gesto previo).
 * - El aviso es un búfer en bucle (WebAudio): sigue sonando con la pestaña en
 *   segundo plano, donde los temporizadores de JavaScript se frenan.
 * - Mientras suena: vibración, título de la pestaña parpadeando y pantalla
 *   encendida (Wake Lock) para que el móvil de la barra no se apague.
 * - iPhone: el interruptor de silencio también silencia la web; se avisa en pantalla.
 */

type Ctx = AudioContext;
let contexto: Ctx | null = null;
let fuente: AudioBufferSourceNode | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

function crearContexto(): Ctx | null {
  if (contexto) return contexto;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  contexto = new C();
  contexto.onstatechange = avisar;
  return contexto;
}

/** Debe llamarse dentro de un gesto del usuario (toque, clic o tecla). */
export function desbloquearAudio() {
  try {
    const c = crearContexto();
    if (c && c.state !== 'running') void c.resume().then(avisar, avisar);
    // Un sonido vacío dentro del gesto termina de desbloquear Safari en iPhone.
    if (c) { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); }
  } catch { /* sin audio en este navegador */ }
  avisar();
}

export const audioListo = () => contexto?.state === 'running';

/** Patrón de alarma: 3 pares de tonos agudos (tipo timbre de cocina) y 1,4 s de silencio. */
function bufferAlarma(c: Ctx) {
  const sr = c.sampleRate;
  const dur = 3;
  const b = c.createBuffer(1, Math.floor(sr * dur), sr);
  const d = b.getChannelData(0);
  const pulsos: [number, number][] = [[0, 1318], [0.22, 988], [0.5, 1318], [0.72, 988], [1.0, 1318], [1.22, 988]];
  for (const [ini, f] of pulsos) {
    const a = Math.floor(ini * sr);
    const n = Math.floor(0.19 * sr);
    for (let i = 0; i < n && a + i < d.length; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.008) * Math.min(1, (0.19 - t) / 0.02);
      // Onda cuadrada suavizada: se oye por encima del ruido de un bar.
      d[a + i] = 0.9 * env * Math.tanh(4 * Math.sin(2 * Math.PI * f * t));
    }
  }
  return b;
}

function empezarBucle() {
  const c = crearContexto();
  if (!c || fuente) return;
  if (c.state !== 'running') void c.resume().catch(() => {});
  const s = c.createBufferSource();
  s.buffer = bufferAlarma(c);
  s.loop = true;
  const g = c.createGain();
  g.gain.value = 1;
  s.connect(g).connect(c.destination);
  s.start();
  fuente = s;
}

function pararBucle() {
  try { fuente?.stop(); } catch { /* ya parado */ }
  fuente = null;
}

/** Prueba corta del sonido (un ciclo), para el botón «Probar sonido». */
export function probarSonido() {
  desbloquearAudio();
  const c = crearContexto();
  if (!c) return;
  const s = c.createBufferSource();
  s.buffer = bufferAlarma(c);
  s.connect(c.destination);
  s.start();
  s.stop(c.currentTime + 1.45);
}

/**
 * Activa la alarma mientras `sonando` sea true. Devuelve si el audio está
 * desbloqueado (si no, la pantalla debe pedir un toque para activarlo).
 */
export function useAlarmaLlamadas(sonando: boolean, texto = 'Mesa llamando') {
  const [listo, setListo] = useState(false);

  // Desbloqueo con el primer gesto en cualquier parte de la página
  useEffect(() => {
    const refrescar = () => setListo(audioListo());
    oyentes.add(refrescar);
    const gesto = () => desbloquearAudio();
    const opts = { capture: true, passive: true } as const;
    window.addEventListener('pointerdown', gesto, opts);
    window.addEventListener('keydown', gesto, opts);
    window.addEventListener('touchend', gesto, opts);
    refrescar();
    return () => {
      oyentes.delete(refrescar);
      window.removeEventListener('pointerdown', gesto, opts);
      window.removeEventListener('keydown', gesto, opts);
      window.removeEventListener('touchend', gesto, opts);
    };
  }, []);

  // Pantalla siempre encendida mientras la página está abierta (barra, móvil del camarero)
  useEffect(() => {
    type Bloqueo = { release: () => Promise<void> };
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Bloqueo> } }).wakeLock;
    if (!wl) return;
    let bloqueo: Bloqueo | null = null;
    const pedir = () => { if (document.visibilityState === 'visible') wl.request('screen').then((b) => { bloqueo = b; }, () => {}); };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => { document.removeEventListener('visibilitychange', pedir); void bloqueo?.release().catch(() => {}); };
  }, []);

  // Sonido en bucle + vibración + título parpadeando mientras haya llamadas sin atender
  useEffect(() => {
    if (!sonando) { pararBucle(); return; }
    empezarBucle();
    const original = document.title;
    let alterna = false;
    const tic = () => {
      alterna = !alterna;
      document.title = alterna ? `🔔 ${texto}` : original;
      navigator.vibrate?.([400, 150, 400, 150, 400]);
      if (!fuente) empezarBucle();
    };
    tic();
    const id = setInterval(tic, 1500);
    return () => { clearInterval(id); document.title = original; navigator.vibrate?.(0); pararBucle(); };
  }, [sonando, texto, listo]);

  const activar = useCallback(() => { desbloquearAudio(); setListo(audioListo()); }, []);
  return { listo, activar };
}

/**
 * Campanilla de reserva nueva (B4, 07/10/2026): «ding-dong» claro y distinto de la
 * alarma de mesas. El búfer dura 20 s (sonido al principio y silencio después):
 * en bucle se repite cada 20 s, también con la pestaña en segundo plano.
 */
function bufferCampanilla(c: Ctx) {
  const sr = c.sampleRate;
  const b = c.createBuffer(1, Math.floor(sr * 20), sr);
  const d = b.getChannelData(0);
  const notas: [number, number][] = [[0, 1046.5], [0.42, 784]];
  for (const [ini, f] of notas) {
    const a = Math.floor(ini * sr);
    const n = Math.floor(1.3 * sr);
    for (let i = 0; i < n && a + i < d.length; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.005) * Math.exp(-3.2 * t);
      d[a + i] += (0.8 * env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t))) / 1.3;
    }
  }
  return b;
}

/**
 * Suena la campanilla cada 20 s mientras `sonando` sea true (reservas sin ver).
 * Usa el mismo AudioContext que la alarma: lo desbloquea el primer toque en la página.
 */
export function useCampanillaReservas(sonando: boolean, texto = 'Nueva reserva') {
  useEffect(() => {
    if (!sonando) return;
    const c = crearContexto();
    let s: AudioBufferSourceNode | null = null;
    const empezar = () => {
      if (!c || s) return;
      if (c.state !== 'running') void c.resume().catch(() => {});
      s = c.createBufferSource();
      s.buffer = bufferCampanilla(c);
      s.loop = true;
      s.connect(c.destination);
      s.start();
    };
    empezar();
    navigator.vibrate?.([200, 100, 200]);
    const original = document.title;
    let alterna = false;
    const id = setInterval(() => {
      if (fuente) return; // la alarma de mesas manda sobre el título
      alterna = !alterna;
      document.title = alterna ? `📅 ${texto}` : original;
    }, 2000);
    return () => { clearInterval(id); if (!fuente) document.title = original; try { s?.stop(); } catch { /* ya parado */ } s = null; };
  }, [sonando, texto]);
}

/** true en iPhone/iPad, donde el interruptor de silencio apaga el sonido de la web. */
export const esIOS = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
