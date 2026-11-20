import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type EstiloEmblema = 'gastro' | 'taberna' | 'urbano';
type IconoGastronomia =
  | 'burger'
  | 'pizza'
  | 'vino'
  | 'marisco'
  | 'olivo'
  | 'tajin'
  | 'taco'
  | 'cafe'
  | 'sushi'
  | 'tortilla'
  | 'brasa'
  | 'gastro'
  | 'taberna';

const ICONOS_VALIDOS = new Set<IconoGastronomia>([
  'burger', 'pizza', 'vino', 'marisco', 'olivo', 'tajin',
  'taco', 'cafe', 'sushi', 'tortilla', 'brasa', 'gastro', 'taberna',
]);

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'y', 'bar', 'restaurante',
  'taberna', 'meson', 'cafeteria', 'pizzeria', 'tasca', 'bodega', 'marisqueria',
  'tortilleria', 'baza', 'granada', 'almeria', 'jaen', 'guadix', 'cullar',
]);

function escaparXml(v: string): string {
  return v.replace(/[<>&"']/g, (ch) => (
    ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === '"' ? '&quot;' : '&apos;'
  ));
}

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mezclarHex(hexA: string, hexB: string, pesoB: number): string {
  const [r1, g1, b1] = hexARgb(hexA);
  const [r2, g2, b2] = hexARgb(hexB);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  const t = 1 - pesoB;
  return `#${clamp(r1 * t + r2 * pesoB)}${clamp(g1 * t + g2 * pesoB)}${clamp(b1 * t + b2 * pesoB)}`;
}

function detectarIcono(slug: string): IconoGastronomia {
  if (/burger|boveda|triple-b/.test(slug)) return 'burger';
  if (/pizza|pizzeria|santoro|capricho|venecia|7-fuentes/.test(slug)) return 'pizza';
  if (/umami|sushi|poke/.test(slug)) return 'sushi';
  if (/catrina|taco/.test(slug)) return 'taco';
  if (/reina-monica|tajin/.test(slug)) return 'tajin';
  if (/marisc|pato-rojo|espina/.test(slug)) return 'marisco';
  if (/cafeter|cafetera|colombia|bovedilla|desayun/.test(slug)) return 'cafe';
  if (/tortill|mala/.test(slug)) return 'tortilla';
  if (/almazara|oliv|paulenca/.test(slug)) return 'olivo';
  if (/vino|vinoteca|bodega|catavinos|porcha|burladero|refugio/.test(slug)) return 'vino';
  if (/brasa|dama|pinetes|terrao|kaliskka|cuevas/.test(slug)) return 'brasa';
  if (/taberna|meson|bar-|kiosco|picaeta|diverso|milikito|volga/.test(slug)) return 'taberna';
  return 'gastro';
}

function monogramaDesdeSlug(slug: string): string {
  const partes = slug.split('-').filter(Boolean);
  const significativas = partes.filter((p) => !STOP_WORDS.has(p));
  const base = significativas.length >= 1 ? significativas : partes;
  if (base.length === 1) {
    const p = base[0].replace(/[^a-z0-9]/gi, '');
    return p.slice(0, 2).toUpperCase() || 'DK';
  }
  return base
    .slice(0, 3)
    .map((p) => (/^\d+$/.test(p) ? p.slice(0, 1) : p.charAt(0)))
    .join('')
    .toUpperCase()
    .slice(0, 3) || 'DK';
}

function renderIcono(icono: IconoGastronomia, oro: string, crema: string): string {
  switch (icono) {
    case 'burger':
      return `<g fill="none" stroke="${oro}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
        <path d="M188 148c0-28 30-46 68-46s68 18 68 46z" fill="${oro}" fill-opacity="0.16"/>
        <path d="M184 168c16-9 32 9 48 0s32 9 48 0 32 9 48 0"/>
        <line x1="190" y1="186" x2="322" y2="186" stroke="${crema}" stroke-width="12"/>
        <path d="M192 204h128v6a14 14 0 0 1-14 14H206a14 14 0 0 1-14-14z"/>
      </g>`;
    case 'pizza':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 98L192 214c42 18 86 18 128 0L256 98z" fill="${oro}" fill-opacity="0.15"/>
        <path d="M184 198c46 22 98 22 144 0"/>
        <circle cx="244" cy="158" r="9" fill="${crema}" stroke="none"/>
        <circle cx="272" cy="176" r="8" fill="${crema}" stroke="none"/>
        <circle cx="236" cy="186" r="7" fill="${crema}" stroke="none"/>
      </g>`;
    case 'vino':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M222 102h68l-6 44a28 28 0 0 1-56 0l-6-44z" fill="${oro}" fill-opacity="0.14"/>
        <line x1="256" y1="172" x2="256" y2="216"/>
        <line x1="226" y1="216" x2="286" y2="216"/>
        <path d="M232 138c16 8 32-8 48 0" stroke="${crema}" stroke-width="8"/>
      </g>`;
    case 'marisco':
      return `<g fill="none" stroke="${oro}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M196 182c0-42 26-74 60-74s60 32 60 74c-20 14-40 18-60 18s-40-4-60-18z" fill="${oro}" fill-opacity="0.15"/>
        <line x1="256" y1="108" x2="256" y2="200"/>
        <line x1="226" y1="118" x2="244" y2="198"/>
        <line x1="286" y1="118" x2="268" y2="198"/>
        <path d="M234 202h44l-8 14h-28z" fill="${crema}" fill-opacity="0.9" stroke="none"/>
      </g>`;
    case 'olivo':
      return `<g fill="none" stroke="${oro}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M204 204c34-18 68-54 104-98"/>
        <ellipse cx="222" cy="156" rx="18" ry="9" transform="rotate(-35 222 156)" fill="${oro}" fill-opacity="0.22"/>
        <ellipse cx="282" cy="166" rx="18" ry="9" transform="rotate(20 282 166)" fill="${oro}" fill-opacity="0.22"/>
        <ellipse cx="258" cy="126" rx="16" ry="8" transform="rotate(-25 258 126)" fill="${oro}" fill-opacity="0.22"/>
        <circle cx="242" cy="186" r="10" fill="${crema}" stroke="none"/>
        <circle cx="290" cy="134" r="9" fill="${crema}" stroke="none"/>
      </g>`;
    case 'tajin':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 96l-46 84h92l-46-84z" fill="${oro}" fill-opacity="0.16"/>
        <circle cx="256" cy="94" r="8" fill="${crema}" stroke="none"/>
        <path d="M190 184h132c-4 22-24 34-66 34s-62-12-66-34z"/>
      </g>`;
    case 'taco':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M188 196a68 68 0 0 1 136 0z" fill="${oro}" fill-opacity="0.16"/>
        <path d="M208 164c12-16 26-10 34-24 10 12 24 6 34-6 8 14 20 12 28 30" stroke="${crema}" stroke-width="8"/>
      </g>`;
    case 'cafe':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M206 146h88v32c0 24-20 38-44 38s-44-14-44-38v-32z" fill="${oro}" fill-opacity="0.16"/>
        <path d="M294 152h12a14 14 0 0 1 0 28h-12"/>
        <line x1="196" y1="222" x2="304" y2="222"/>
        <path d="M234 124c-6-10 8-16 2-26M262 124c-6-10 8-16 2-26" stroke="${crema}" stroke-width="7"/>
      </g>`;
    case 'sushi':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <rect x="200" y="138" width="112" height="58" rx="22" fill="${oro}" fill-opacity="0.16"/>
        <circle cx="234" cy="167" r="10" fill="${crema}" stroke="none"/>
        <circle cx="276" cy="167" r="10" fill="${crema}" stroke="none"/>
        <line x1="192" y1="108" x2="320" y2="124" stroke="${crema}" stroke-width="8"/>
        <line x1="192" y1="126" x2="320" y2="112" stroke="${crema}" stroke-width="6"/>
      </g>`;
    case 'tortilla':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="256" cy="162" r="52" fill="${oro}" fill-opacity="0.16"/>
        <path d="M256 162l46-24M256 162l22 47" stroke="${crema}" stroke-width="8"/>
        <circle cx="236" cy="144" r="6" fill="${crema}" stroke="none"/>
        <circle cx="228" cy="176" r="5" fill="${crema}" stroke="none"/>
      </g>`;
    case 'brasa':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 96c22 24 38 46 38 72a38 38 0 0 1-76 0c0-20 12-38 22-50 2 14 12 22 18 22-2-18 2-32-2-44z" fill="${oro}" fill-opacity="0.18"/>
        <path d="M256 154c10 10 14 18 14 28a14 14 0 0 1-28 0c0-10 6-20 14-28z" fill="${crema}" stroke="none"/>
      </g>`;
    case 'taberna':
      return `<g fill="none" stroke="${oro}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M214 114h84v18c0 28-18 46-42 54v30h24M256 186c-24-8-42-26-42-54v-18"/>
        <line x1="232" y1="216" x2="280" y2="216"/>
        <circle cx="256" cy="140" r="9" fill="${crema}" stroke="none"/>
      </g>`;
    case 'gastro':
    default:
      return `<g fill="none" stroke="${oro}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 100l18 42 44 4-34 29 10 43-38-23-38 23 10-43-34-29 44-4z" fill="${oro}" fill-opacity="0.16"/>
        <circle cx="256" cy="160" r="8" fill="${crema}" stroke="none"/>
      </g>`;
  }
}

export async function GET(
  peticion: Request,
  contexto: { params: Promise<{ slug: string }> }
) {
  const { slug: slugBruto } = await contexto.params;
  const slug = slugBruto.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'dk';
  const sp = new URL(peticion.url).searchParams;

  const colorParam = (sp.get('c') ?? '').replace(/^#/, '').toUpperCase();
  const colorBase = /^[0-9A-F]{6}$/.test(colorParam) ? colorParam : '6E0C2B';

  const estiloParam = sp.get('e');
  const estilo: EstiloEmblema =
    estiloParam === 'urbano' || estiloParam === 'gastro' || estiloParam === 'taberna'
      ? estiloParam
      : 'gastro';

  const monoParam = (sp.get('m') ?? '').replace(/[^a-zA-Z0-9ÁÉÍÓÚÑáéíóúñ]/g, '').toUpperCase().slice(0, 3);
  const monograma = escaparXml(monoParam || monogramaDesdeSlug(slug));

  const iconoParam = sp.get('k') as IconoGastronomia | null;
  const icono: IconoGastronomia = iconoParam && ICONOS_VALIDOS.has(iconoParam)
    ? iconoParam
    : detectarIcono(slug);

  const fondoCentro = mezclarHex(colorBase, '161210', 0.42);
  const fondoBorde = mezclarHex(colorBase, '090807', 0.78);
  const oro = estilo === 'urbano' ? mezclarHex(colorBase, 'FFFFFF', 0.35) : '#E5C484';
  const crema = '#F9F5EC';

  const fuente = estilo === 'urbano'
    ? "'Arial Black', Impact, 'Helvetica Neue', sans-serif"
    : "Georgia, 'Times New Roman', serif";
  const peso = estilo === 'urbano' ? '900' : estilo === 'taberna' ? '700' : '600';
  const estiloFont = estilo === 'taberna' ? 'italic' : 'normal';
  const tamMono = monograma.length <= 1 ? 168 : monograma.length === 2 ? 142 : 110;
  const tracking = estilo === 'gastro' ? '0.08em' : estilo === 'urbano' ? '-0.02em' : '0.02em';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${monograma}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="68%">
      <stop offset="0%" stop-color="${fondoCentro}"/>
      <stop offset="100%" stop-color="${fondoBorde}"/>
    </radialGradient>
    <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${oro}" stop-opacity="0.88"/>
      <stop offset="50%" stop-color="${crema}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${oro}" stop-opacity="0.88"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="228" fill="none" stroke="url(#rim)" stroke-width="5"/>
  <circle cx="256" cy="256" r="210" fill="none" stroke="${oro}" stroke-opacity="0.4" stroke-width="2" ${estilo === 'taberna' ? 'stroke-dasharray="5 9"' : ''}/>
  ${renderIcono(icono, oro, crema)}
  <text x="256" y="340" text-anchor="middle" dominant-baseline="central" fill="${crema}" font-family="${fuente}" font-size="${tamMono}" font-weight="${peso}" font-style="${estiloFont}" letter-spacing="${tracking}">${monograma}</text>
  <path d="M206 426h36M270 426h36" stroke="${oro}" stroke-opacity="0.7" stroke-width="3" stroke-linecap="round"/>
  <polygon points="256,419 263,426 256,433 249,426" fill="${oro}"/>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
    },
  });
}
