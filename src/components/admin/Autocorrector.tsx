'use client';

import { useEffect } from 'react';

/**
 * Autocorrector de Central (18/10/2026, karc0: «que lo que escriba no salga con errores, como en el móvil,
 * aunque grabe la pantalla»). Sin IA ni coste: al terminar cada palabra (espacio, signo o salto de línea)
 * pone las tildes seguras (tambien → también; nunca las ambiguas como esta/está o envío/envió), corrige
 * erratas de una letra hacia la palabra más frecuente y pone mayúscula al empezar la frase.
 * Retroceso justo después de una corrección = deshacerla, y esa palabra no se vuelve a tocar.
 * Diccionario en /diccionario/es.txt (se carga al enfocar el primer campo). Para excluir un campo:
 * data-sin-corrector en él o en un contenedor.
 */
interface Dic { rango: Map<string, number>; tildes: Map<string, string> }
let carga: Promise<Dic> | null = null;
let dic: Dic | null = null;
function cargar() {
  carga ??= fetch('/diccionario/es.txt').then((r) => r.text()).then((t) => {
    const l = t.split('\n');
    const tildes = new Map(l[2].split(' ').map((p) => p.split('>') as [string, string]));
    const rango = new Map<string, number>();
    for (let i = 3; i < l.length; i++) if (l[i]) rango.set(l[i], i - 3);
    dic = { rango, tildes };
    return dic;
  }).catch((e) => { carga = null; throw e; });
  return carga;
}

// Marcas, herramientas y anglicismos de trabajo que no se tocan.
const PROPIAS = new Set(('dkitchen neon vercel stripe claude karc central signature experience fundador antigravity hyperframes elevenlabs ' +
  'sumup revolut whop verifactu iavanza tpv qr pwa cta url urls web app apps gateway blob cron preview deploy commit push prompt prompts ' +
  'scroll skroll modal modales landing landings checkout banner banners hero admin login email emails link links post posts reel reels ' +
  'carrusel upsell upsells lead leads dashboard mockup layout footer header sidebar toggle slider feedback branding marketing ads pixel ' +
  'tiktok instagram facebook whatsapp google maps gmail chrome linkedin youtube ok online offline wifi smartphone tablet stories story ' +
  'storytelling copy copys ux ui seo sem kpi kpis mrr ltv cac utm utms flyer flyers').split(' '));
const LETRAS = 'abcdefghijklmnopqrstuvwxyzáéíóúüñ';
const SEP = /[\s.,;:!?)\]»"…]/;
const PALABRA = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/;
const CLAVE = 'dk-corrector-ignorar';

function leerIgnoradas(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE) ?? '[]')); } catch { return new Set(); }
}
function ignorar(s: Set<string>, w: string) {
  s.add(w);
  try { localStorage.setItem(CLAVE, JSON.stringify([...s].slice(-500))); } catch { /* sin almacenamiento: solo esta sesión */ }
}

function ediciones(w: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= w.length; i++) {
    const a = w.slice(0, i), b = w.slice(i);
    if (b) out.add(a + b.slice(1));
    if (b.length > 1) out.add(a + b[1] + b[0] + b.slice(2));
    for (const c of LETRAS) { if (b) out.add(a + c + b.slice(1)); out.add(a + c + b); }
  }
  return out;
}

function corregir(w: string, d: Dic, ignoradas: Set<string>, inicioFrase: boolean): string | null {
  const resto = w.slice(1);
  if (resto !== resto.toLowerCase()) return null; // QR, DKitchen…
  const m = w.toLowerCase();
  if (ignoradas.has(m) || PROPIAS.has(m)) return null;
  const mayus = w[0] !== m[0];
  let r = d.tildes.get(m) ?? null;
  // Erratas: solo palabras desconocidas, de 4 letras o más y que no sean un nombre propio a mitad de frase.
  if (!r && !d.rango.has(m) && m.length >= 4 && (!mayus || inicioFrase)) {
    let mejor: string | null = null, rm = Infinity, segundo = Infinity;
    const vistos = new Set<string>();
    for (const e of ediciones(m)) {
      const c = d.tildes.get(e) ?? e; // comunicasion → comunicacion → comunicación
      const k = d.rango.get(c);
      if (k === undefined || k > 60000 || vistos.has(c)) continue;
      vistos.add(c);
      if (k < rm) { segundo = rm; rm = k; mejor = c; } else if (k < segundo) segundo = k;
    }
    if (mejor && (segundo === Infinity || segundo > rm * 4 + 300)) r = d.tildes.get(mejor) ?? mejor;
  }
  if (!r || r === m) return null;
  return mayus ? r[0].toUpperCase() + r.slice(1) : r;
}

type Campo = HTMLTextAreaElement | HTMLInputElement;
const esCampo = (el: EventTarget | null): el is Campo =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && (el.type === 'text' || el.type === 'search'));
const excluido = (el: Campo) => !!el.closest('[data-sin-corrector]') || el.readOnly || el.disabled;

export default function Autocorrector() {
  useEffect(() => {
    const ignoradas = leerIgnoradas();
    let aplicando = false;
    let ultimo: { el: Campo; ini: number; original: string; nuevo: string; pos: number } | null = null;

    const reemplazar = (el: Campo, ini: number, fin: number, texto: string, caret: number) => {
      aplicando = true;
      el.setSelectionRange(ini, fin);
      // execCommand conserva Ctrl+Z y avisa a React como si se hubiera tecleado.
      const ok = document.execCommand('insertText', false, texto);
      aplicando = false;
      if (ok) el.setSelectionRange(caret, caret);
      return ok;
    };

    const alEnfocar = (e: FocusEvent) => { if (esCampo(e.target) && !dic) cargar().catch(() => {}); };

    const alEscribir = (e: Event) => {
      const el = e.target;
      if (aplicando || !esCampo(el) || excluido(el) || !dic) return;
      const ie = e as InputEvent;
      const fin = ie.inputType === 'insertLineBreak' || (ie.inputType === 'insertText' && !!ie.data && SEP.test(ie.data.slice(-1)));
      if (!fin) return;
      const pos = el.selectionStart;
      if (pos == null || pos !== el.selectionEnd || pos < 2) return;
      const antes = el.value.slice(0, pos - 1);
      const mt = /(\S+)$/.exec(antes);
      if (!mt) return;
      let token = mt[1], ini = antes.length - token.length;
      const lead = /^[¿¡("«'[]+/.exec(token)?.[0] ?? '';
      token = token.slice(lead.length); ini += lead.length;
      token = token.replace(/[.,;:!?)»"\]…]+$/, '');
      if (token.length < 1 || !PALABRA.test(token)) return; // enlaces, correos, números
      const previo = el.value.slice(0, ini);
      const inicioFrase = el instanceof HTMLTextAreaElement && /(^\s*|[.!?…]\s+|\n\s*)$/.test(previo);
      let nuevo = token.length >= 2 ? corregir(token, dic, ignoradas, inicioFrase) ?? token : token;
      if (inicioFrase && nuevo[0] !== nuevo[0].toUpperCase() && !ignoradas.has(token.toLowerCase())) nuevo = nuevo[0].toUpperCase() + nuevo.slice(1);
      if (nuevo === token) return;
      const caret = pos + nuevo.length - token.length;
      if (reemplazar(el, ini, ini + token.length, nuevo, caret)) ultimo = { el, ini, original: token, nuevo, pos: caret };
    };

    const alTecla = (e: KeyboardEvent) => {
      if (!ultimo || ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      const u = ultimo; ultimo = null;
      if (e.key !== 'Backspace' || e.target !== u.el || e.ctrlKey || e.metaKey) return;
      const el = u.el;
      if (el.selectionStart !== u.pos || el.selectionEnd !== u.pos || el.value.slice(u.ini, u.ini + u.nuevo.length) !== u.nuevo) return;
      e.preventDefault();
      reemplazar(el, u.ini, u.ini + u.nuevo.length, u.original, u.pos - u.nuevo.length + u.original.length);
      ignorar(ignoradas, u.original.toLowerCase());
    };

    document.addEventListener('focusin', alEnfocar);
    document.addEventListener('input', alEscribir, true);
    document.addEventListener('keydown', alTecla, true);
    return () => {
      document.removeEventListener('focusin', alEnfocar);
      document.removeEventListener('input', alEscribir, true);
      document.removeEventListener('keydown', alTecla, true);
    };
  }, []);
  return null;
}
