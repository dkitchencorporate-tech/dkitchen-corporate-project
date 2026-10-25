/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { BotonImprimir } from './BotonImprimir';

/**
 * Kit imprimible del local (tarea 5, 26/10/2026): cartel QR, tarjetas de mesa,
 * pegatinas y flyer, todo en A4 para imprimir en casa o en la copistería
 * («Guardar como PDF» del navegador). Usa la identidad del local (color, fondo,
 * letra, logo y portada) y el QR en SVG vectorial, que no pierde nitidez al
 * ampliarse. Las cifras van siempre en lining-nums: la serif de la web dibuja
 * el 0 como una «o» con las cifras antiguas.
 */
export interface DatosKit {
  nombre: string; slug: string; codigo: string; plan: string;
  logoUrl: string | null; colorMarca: string | null; estiloFondo: string | null; estiloLetra: string | null;
  descripcion: string | null; direccion: string | null; horario: string | null; telefono: string | null;
  instagram: string | null; portadaUrl: string | null;
}

export type PiezaKit = 'cartel' | 'mesas' | 'pegatinas' | 'flyer';
export const PIEZAS: { id: PiezaKit; nombre: string; detalle: string }[] = [
  { id: 'cartel', nombre: 'Cartel QR', detalle: 'A4 · para la entrada, la barra o el escaparate' },
  { id: 'mesas', nombre: 'Tarjetas de mesa', detalle: 'A6 · 4 por hoja, cada una con el QR de su mesa' },
  { id: 'pegatinas', nombre: 'Pegatinas', detalle: '12 por hoja · 5,5 cm' },
  { id: 'flyer', nombre: 'Flyer', detalle: 'A5 · 2 por hoja, para repartir' },
];

const FONDOS: Record<string, { fondo: string; tinta: string; suave: string; linea: string }> = {
  papel: { fondo: '#F5EFE4', tinta: '#221D17', suave: 'rgba(34,29,23,.66)', linea: 'rgba(34,29,23,.16)' },
  blanco: { fondo: '#FFFFFF', tinta: '#1A1714', suave: 'rgba(26,23,20,.62)', linea: 'rgba(26,23,20,.14)' },
  oscuro: { fondo: '#0E0C0A', tinta: '#F4EEE4', suave: 'rgba(244,238,228,.66)', linea: 'rgba(244,238,228,.18)' },
};

// Instagram puede estar guardado como «@local», «local» o la URL del perfil.
const ig = (v: string) => '@' + v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
const qrSvg = (url: string) => QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#171008', light: '#FFFFFF' } });

export async function KitImprimible({ d, pieza, mesas, base, volver }: { d: DatosKit; pieza: PiezaKit; mesas: number; base: string; volver: { href: string; texto: string } }) {
  const P = FONDOS[d.estiloFondo ?? 'papel'] ?? FONDOS.papel;
  const marca = d.colorMarca || '#6E0C2B';
  const serif = d.estiloLetra !== 'sans';
  const urlQr = (mesa?: number) => `https://dkitchencorporate.es/r/${d.codigo}${mesa ? `?mesa=${mesa}` : ''}`;
  const general = await qrSvg(urlQr());
  const porMesa = pieza === 'mesas' && mesas > 0
    ? await Promise.all(Array.from({ length: mesas }, (_, i) => qrSvg(urlQr(i + 1))))
    : [];
  const estilo = {
    '--k-fondo': P.fondo, '--k-tinta': P.tinta, '--k-suave': P.suave, '--k-linea': P.linea, '--k-marca': marca,
    '--k-titulo': serif ? 'var(--fuente-serif-web), Georgia, serif' : 'var(--fuente-display), system-ui, sans-serif',
  } as CSSProperties;

  const hojas = {
    cartel: [<Cartel key="c" d={d} qr={general} />],
    mesas: porMesa.length
      ? trocear(porMesa.map((qr, i) => <TarjetaMesa key={i} d={d} qr={qr} mesa={i + 1} />), 4).map((g, i) => <Rejilla key={i} cols={2} filas={2}>{g}</Rejilla>)
      : [<Rejilla key="m" cols={2} filas={2}>{[0, 1, 2, 3].map((i) => <TarjetaMesa key={i} d={d} qr={general} />)}</Rejilla>],
    pegatinas: [<Rejilla key="p" cols={3} filas={4} pegatinas>{Array.from({ length: 12 }, (_, i) => <Pegatina key={i} d={d} qr={general} />)}</Rejilla>],
    flyer: [<Rejilla key="f" cols={1} filas={2}>{[0, 1].map((i) => <Flyer key={i} d={d} qr={general} />)}</Rejilla>],
  }[pieza];

  return (
    <div id="kit" className="min-h-screen bg-[#E9E6E0] text-carbon" style={estilo}>
      <style>{CSS}</style>
      <header className="kit-pantalla sticky top-0 z-10 border-b border-linea bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <Link href={volver.href} className="text-sm text-niebla hover:text-carbon">← {volver.texto}</Link>
          <p className="font-display text-lg font-semibold">Kit de {d.nombre}</p>
          <div className="ml-auto"><BotonImprimir /></div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-5xl gap-2 overflow-x-auto pb-1" aria-label="Piezas del kit">
          {PIEZAS.map((p) => (
            <Link key={p.id} href={`${base}?pieza=${p.id}${p.id === 'mesas' && mesas ? `&mesas=${mesas}` : ''}`} aria-current={p.id === pieza ? 'page' : undefined}
              className={`shrink-0 rounded-2xl border px-4 py-2 text-left text-sm ${p.id === pieza ? 'border-vino bg-vino text-white' : 'border-linea bg-white'}`}>
              <span className="block font-semibold">{p.nombre}</span>
              <span className={`block text-xs ${p.id === pieza ? 'text-white/75' : 'text-niebla'}`}>{p.detalle}</span>
            </Link>
          ))}
        </nav>
        {pieza === 'mesas' && (
          <form className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center gap-2 text-sm" action={base}>
            <input type="hidden" name="pieza" value="mesas" />
            <label htmlFor="mesas" className="text-niebla">Mesas numeradas (cada tarjeta lleva el QR de su mesa):</label>
            <input id="mesas" name="mesas" type="number" min={0} max={60} defaultValue={mesas || ''} placeholder="0 = sin número" className="w-28 rounded-xl border border-acero px-3 py-1.5 tabular-nums" />
            <button className="rounded-full border border-tinta px-4 py-1.5 font-semibold">Generar</button>
          </form>
        )}
      </header>

      <main className="kit-hojas mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-8">
        {hojas.map((h, i) => <section key={i} className="kit-hoja">{h}</section>)}
        <aside className="kit-pantalla w-full max-w-[210mm] rounded-[24px] border border-linea bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">¿Lo quieres impreso y resistente?</p>
          <p className="font-display mt-1 text-xl font-semibold">{d.plan === 'sala' ? 'Metacrilato para cada mesa' : 'Pegatinas de vinilo para las mesas'}</p>
          <p className="mt-1 text-sm text-niebla">
            {d.plan === 'sala'
              ? 'Con el plan Sala cada mesa tiene su QR: en metacrilato aguanta el servicio, se limpia con un paño y no se dobla.'
              : 'El papel sirve para empezar; el vinilo aguanta agua, grasa y bayeta durante años.'}
            {' '}Lo pides desde tu panel y te lo enviamos a casa.
          </p>
          <Link href="/panel?pestana=qr" className="mt-4 inline-block rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Pedir mi QR impreso →</Link>
        </aside>
      </main>
    </div>
  );
}

function trocear<T>(lista: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(lista.length / n) }, (_, i) => lista.slice(i * n, i * n + n));
}

function Rejilla({ cols, filas, pegatinas, children }: { cols: number; filas: number; pegatinas?: boolean; children: ReactNode }) {
  return <div className={`kit-a4 ${pegatinas ? 'kit-a4-pegatinas' : ''}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${filas}, 1fr)` }}>{children}</div>;
}

function Qr({ svg, className = '' }: { svg: string; className?: string }) {
  // SVG generado aquí mismo por la librería qrcode a partir de nuestra URL: no lleva nada del usuario.
  return <div className={`kit-qr ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Marca({ d, grande }: { d: DatosKit; grande?: boolean }) {
  return d.logoUrl
    ? <img src={d.logoUrl} alt={d.nombre} className={grande ? 'kit-logo-grande' : 'kit-logo'} />
    : <p className={`kit-titulo ${grande ? 'kit-nombre-grande' : 'kit-nombre'}`}>{d.nombre}</p>;
}

function Cartel({ d, qr }: { d: DatosKit; qr: string }) {
  return (
    <div className="kit-a4 kit-cartel">
      <div className="kit-cartel-marco">
        <Marca d={d} grande />
        <p className="kit-versalitas">Carta digital</p>
        <h1 className="kit-titulo kit-cartel-titular">Escanea<br />y mira la carta</h1>
        <div className="kit-filete" />
        <Qr svg={qr} className="kit-qr-cartel" />
        <p className="kit-cartel-ayuda">Apunta la cámara del móvil al código. Sin descargar nada.</p>
        <p className="kit-pie">{[d.nombre, d.direccion, d.instagram && ig(d.instagram)].filter(Boolean).join('  ·  ')}</p>
      </div>
    </div>
  );
}

function TarjetaMesa({ d, qr, mesa }: { d: DatosKit; qr: string; mesa?: number }) {
  return (
    <div className="kit-tarjeta">
      <Marca d={d} />
      {mesa ? <p className="kit-titulo kit-mesa"><span className="kit-versalitas">Mesa</span>{mesa}</p> : <p className="kit-versalitas kit-tarjeta-kicker">Bienvenido</p>}
      <Qr svg={qr} className="kit-qr-tarjeta" />
      <p className="kit-titulo kit-tarjeta-titular">La carta, aquí</p>
      <p className="kit-tarjeta-ayuda">Escanea con la cámara del móvil</p>
    </div>
  );
}

function Pegatina({ d, qr }: { d: DatosKit; qr: string }) {
  return (
    <div className="kit-pegatina">
      <p className="kit-versalitas kit-pegatina-arriba">Carta</p>
      <Qr svg={qr} className="kit-qr-pegatina" />
      <p className="kit-pegatina-abajo">{d.nombre}</p>
    </div>
  );
}

function Flyer({ d, qr }: { d: DatosKit; qr: string }) {
  return (
    <div className="kit-flyer">
      <div className="kit-flyer-foto">
        {d.portadaUrl ? <img src={d.portadaUrl} alt="" /> : <div className="kit-flyer-sinfoto"><Marca d={d} grande /></div>}
      </div>
      <div className="kit-flyer-texto">
        {d.portadaUrl && <Marca d={d} />}
        <p className="kit-titulo kit-flyer-titular">{d.descripcion?.split(/[.\n]/)[0]?.slice(0, 70) || 'La carta, a un escaneo'}</p>
        <div className="kit-filete" />
        <dl className="kit-flyer-datos">
          {d.horario && <><dt>Horario</dt><dd>{d.horario}</dd></>}
          {d.direccion && <><dt>Dónde</dt><dd>{d.direccion}</dd></>}
          {d.telefono && <><dt>Reservas</dt><dd>{d.telefono}</dd></>}
          {d.instagram && <><dt>Instagram</dt><dd>{ig(d.instagram)}</dd></>}
        </dl>
        <div className="kit-flyer-qr">
          <Qr svg={qr} className="kit-qr-flyer" />
          <p>Escanea y mira<br />la carta antes de venir</p>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@page { size: A4 portrait; margin: 0; }
#kit .kit-hoja { box-shadow: 0 18px 50px -24px rgba(23,16,8,.45); }
#kit .kit-a4 { width: 210mm; height: 297mm; display: grid; background: #fff; overflow: hidden; color: var(--k-tinta);
  font-variant-numeric: lining-nums tabular-nums; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
#kit .kit-titulo { font-family: var(--k-titulo); font-variant-numeric: lining-nums tabular-nums; line-height: 1.02; }
#kit .kit-versalitas { font-size: 9pt; letter-spacing: .28em; text-transform: uppercase; font-weight: 600; color: var(--k-marca); }
#kit .kit-filete { width: 18mm; height: 1.2pt; background: var(--k-marca); }
#kit .kit-qr svg { display: block; width: 100%; height: 100%; }
#kit .kit-qr { background: #fff; border-radius: 4mm; }
#kit .kit-logo { max-height: 14mm; max-width: 46mm; object-fit: contain; }
#kit .kit-logo-grande { max-height: 26mm; max-width: 80mm; object-fit: contain; }
#kit .kit-nombre { font-size: 15pt; font-weight: 600; }
#kit .kit-nombre-grande { font-size: 26pt; font-weight: 600; }

#kit .kit-cartel { display: block; background: var(--k-fondo); padding: 14mm; }
#kit .kit-cartel-marco { height: 100%; border: 1pt solid var(--k-linea); border-radius: 8mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7mm; text-align: center; padding: 14mm; }
#kit .kit-cartel-titular { font-size: 46pt; font-weight: 600; }
#kit .kit-qr-cartel { width: 92mm; height: 92mm; padding: 6mm; box-shadow: 0 0 0 1pt var(--k-linea); }
#kit .kit-cartel-ayuda { font-size: 11pt; color: var(--k-suave); }
#kit .kit-pie { margin-top: auto; font-size: 9.5pt; color: var(--k-suave); letter-spacing: .04em; }

#kit .kit-tarjeta { background: var(--k-fondo); outline: .4pt dashed rgba(0,0,0,.25); outline-offset: -.2pt; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4mm; text-align: center; padding: 10mm; }
#kit .kit-mesa { display: flex; flex-direction: column; align-items: center; gap: 1mm; font-size: 40pt; font-weight: 600; }
#kit .kit-tarjeta-kicker { margin-bottom: 2mm; }
#kit .kit-qr-tarjeta { width: 52mm; height: 52mm; padding: 3.5mm; }
#kit .kit-tarjeta-titular { font-size: 20pt; font-weight: 600; }
#kit .kit-tarjeta-ayuda { font-size: 9pt; color: var(--k-suave); }

#kit .kit-a4-pegatinas { padding: 13mm 15mm; gap: 6mm; }
#kit .kit-pegatina { border-radius: 9999px; background: var(--k-fondo); box-shadow: inset 0 0 0 .4pt rgba(0,0,0,.25); display: flex; flex-direction: column; align-items: center; justify-content: center; aspect-ratio: 1; width: 55mm; justify-self: center; align-self: center; gap: 1.5mm; }
#kit .kit-pegatina-arriba { font-size: 7pt; }
#kit .kit-qr-pegatina { width: 30mm; height: 30mm; padding: 2mm; border-radius: 2mm; }
#kit .kit-pegatina-abajo { max-width: 40mm; font-size: 7pt; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

#kit .kit-flyer { display: grid; grid-template-columns: 43% 1fr; background: var(--k-fondo); outline: .4pt dashed rgba(0,0,0,.25); outline-offset: -.2pt; overflow: hidden; }
#kit .kit-flyer-foto { position: relative; overflow: hidden; }
#kit .kit-flyer-foto img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
#kit .kit-flyer-sinfoto { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--k-marca); color: #fff; padding: 8mm; }
#kit .kit-flyer-texto { display: flex; flex-direction: column; gap: 4mm; padding: 10mm 11mm; }
#kit .kit-flyer-titular { font-size: 21pt; font-weight: 600; }
#kit .kit-flyer-datos { display: grid; grid-template-columns: auto 1fr; gap: 1.5mm 4mm; font-size: 9pt; }
#kit .kit-flyer-datos dt { color: var(--k-marca); font-weight: 600; text-transform: uppercase; letter-spacing: .14em; font-size: 7pt; padding-top: .6mm; }
#kit .kit-flyer-datos dd { color: var(--k-tinta); }
#kit .kit-flyer-qr { margin-top: auto; display: flex; align-items: center; gap: 4mm; font-size: 9pt; color: var(--k-suave); }
#kit .kit-qr-flyer { width: 30mm; height: 30mm; padding: 2mm; flex-shrink: 0; }

@media screen and (max-width: 860px) { #kit .kit-hoja { zoom: .42; } }
@media print {
  body > *:not(#kit) { display: none !important; }
  #kit { background: none !important; }
  #kit .kit-pantalla { display: none !important; }
  #kit .kit-hojas { padding: 0 !important; gap: 0 !important; }
  #kit .kit-hoja { box-shadow: none; break-after: page; zoom: 1 !important; }
  #kit .kit-hoja:last-of-type { break-after: auto; }
}
`;

/** Pieza y número de mesas desde la URL (?pieza=mesas&mesas=12). */
export function parametrosKit(sp: Record<string, string | undefined>): { pieza: PiezaKit; mesas: number } {
  const pieza = PIEZAS.some((p) => p.id === sp.pieza) ? (sp.pieza as PiezaKit) : 'cartel';
  const n = Number.parseInt(sp.mesas ?? '', 10);
  return { pieza, mesas: Number.isFinite(n) ? Math.min(60, Math.max(0, n)) : 0 };
}
