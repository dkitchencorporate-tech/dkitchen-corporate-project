/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Anton, Cormorant_Garamond, Playfair_Display } from 'next/font/google';
import { BotonImprimir } from './BotonImprimir';
import { obtenerCartaConRespaldo } from '@/lib/cache-resiliencia';
import { composicionDe, firmaCompleta, type Composicion, type Firma } from '@/lib/composiciones';

/**
 * Kit imprimible del local (tarea 5, 26/10/2026): cartel QR, tarjetas de mesa,
 * pegatinas y flyer, todo en A4 para imprimir en casa o en la copistería
 * («Guardar como PDF» del navegador). QR en SVG vectorial, que no pierde
 * nitidez al ampliarse. Las cifras van siempre en lining-nums.
 *
 * DISEÑO DE AUTOR AUTOMÁTICO (26/10, karc0: «el kit no tiene diseño de autor»):
 * cada pieza hereda la composición de la carta del local (alta cocina, taberna o
 * urbana, la elegida o la automática), con su letra, su color, su firma y una
 * foto con profundidad (portada o el mejor plato). Nadie lo maqueta a mano.
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

const cormorant = Cormorant_Garamond({ weight: ['300', '500', '600'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', preload: false });
const playfair = Playfair_Display({ weight: ['700', '800'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', preload: false });
const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap', preload: false });

type Tema = { fondo: string; tinta: string; suave: string; linea: string; acento: string; titulo: string; peso: string; estilo: string; caja: string; espacio: string; texto: string };

/** La misma piel que la carta pública (components/carta/CartaComposicion.tsx), pasada a papel. */
function tema(comp: Composicion, color: string, oscuro: boolean): Tema {
  const texto = cormorant.style.fontFamily;
  if (comp === 'taberna') {
    const pizarra = `color-mix(in srgb, ${color} 24%, #141A13)`;
    return { fondo: pizarra, tinta: '#F4ECD8', suave: 'rgba(244,236,216,.72)', linea: 'rgba(244,236,216,.22)', acento: '#F2D9A6', titulo: playfair.style.fontFamily, peso: '800', estilo: 'italic', caja: 'none', espacio: '0', texto };
  }
  if (comp === 'urbano') {
    return { fondo: '#0E0D0B', tinta: '#FFFFFF', suave: 'rgba(255,255,255,.72)', linea: 'rgba(255,255,255,.18)', acento: color, titulo: anton.style.fontFamily, peso: '400', estilo: 'normal', caja: 'uppercase', espacio: '.005em', texto: 'var(--fuente-display), system-ui, sans-serif' };
  }
  return oscuro
    ? { fondo: '#0A0A0A', tinta: '#F5F2EC', suave: 'rgba(245,242,236,.66)', linea: 'rgba(245,242,236,.16)', acento: `color-mix(in srgb, ${color} 45%, #E8CF9C)`, titulo: texto, peso: '300', estilo: 'normal', caja: 'none', espacio: '0', texto }
    : { fondo: '#F4F0E8', tinta: '#1A1714', suave: 'rgba(26,23,20,.64)', linea: 'rgba(26,23,20,.16)', acento: color, titulo: texto, peso: '300', estilo: 'normal', caja: 'none', espacio: '0', texto };
}

// Instagram puede estar guardado como «@local», «local» o la URL del perfil.
const ig = (v: string) => '@' + v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
const qrSvg = (url: string) => QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#171008', light: '#FFFFFF' } });
const euros = (p: string) => `${Number(p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

type Plato = { nombre: string; precio: string };
type Autor = { comp: Composicion; firma: Firma; foto: string | null; destacados: Plato[] };

export async function KitImprimible({ d, pieza, mesas, base, volver }: { d: DatosKit; pieza: PiezaKit; mesas: number; base: string; volver: { href: string; texto: string } }) {
  const marca = d.colorMarca || '#6E0C2B';
  // La carta pública manda: composición elegida o automática, firma completada y fotos de los platos.
  const carta = await obtenerCartaConRespaldo(d.slug).then((r) => r?.carta ?? null).catch(() => null);
  const comp = carta ? composicionDe(carta) : composicionDe({ nombre: d.nombre, slug: d.slug, descripcion: d.descripcion });
  const platos = carta ? [...carta.secciones.flatMap((s) => s.platos), ...carta.sueltos] : [];
  const marcados = platos.filter((p) => p.etiqueta === 'recomendado' || p.etiqueta === 'especial');
  const a: Autor = {
    comp,
    firma: firmaCompleta({ nombre: d.nombre, slug: d.slug, firma: carta?.firma }, comp),
    foto: d.portadaUrl || platos.find((p) => p.fotoUrl)?.fotoUrl || null,
    destacados: [...marcados, ...platos.filter((p) => !marcados.includes(p))].slice(0, 3).map((p) => ({ nombre: p.nombre, precio: p.precio })),
  };
  const T = tema(comp, marca, d.estiloFondo !== 'papel' && d.estiloFondo !== 'blanco');
  const urlQr = (mesa?: number) => `https://dkitchencorporate.es/r/${d.codigo}${mesa ? `?mesa=${mesa}` : ''}`;
  const general = await qrSvg(urlQr());
  const porMesa = pieza === 'mesas' && mesas > 0
    ? await Promise.all(Array.from({ length: mesas }, (_, i) => qrSvg(urlQr(i + 1))))
    : [];
  const estilo = {
    '--k-fondo': T.fondo, '--k-tinta': T.tinta, '--k-suave': T.suave, '--k-linea': T.linea, '--k-acento': T.acento, '--k-marca': marca,
    '--k-titulo': T.titulo, '--k-peso': T.peso, '--k-estilo': T.estilo, '--k-caja': T.caja, '--k-espacio': T.espacio, '--k-texto': T.texto,
  } as CSSProperties;

  const hojas = {
    cartel: [<Cartel key="c" d={d} a={a} qr={general} />],
    mesas: porMesa.length
      ? trocear(porMesa.map((qr, i) => <TarjetaMesa key={i} d={d} a={a} qr={qr} mesa={i + 1} />), 4).map((g, i) => <Rejilla key={i} cols={2} filas={2}>{g}</Rejilla>)
      : [<Rejilla key="m" cols={2} filas={2}>{[0, 1, 2, 3].map((i) => <TarjetaMesa key={i} d={d} a={a} qr={general} />)}</Rejilla>],
    pegatinas: [<Rejilla key="p" cols={3} filas={4} pegatinas>{Array.from({ length: 12 }, (_, i) => <Pegatina key={i} d={d} a={a} qr={general} />)}</Rejilla>],
    flyer: [<Rejilla key="f" cols={1} filas={2}>{[0, 1].map((i) => <Flyer key={i} d={d} a={a} qr={general} />)}</Rejilla>],
  }[pieza];

  return (
    <div id="kit" className={`min-h-screen bg-[#E9E6E0] text-carbon kit-${comp}`} style={estilo}>
      <style>{CSS}</style>
      <header className="kit-pantalla sticky top-0 z-10 border-b border-linea bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <Link href={volver.href} className="text-sm text-niebla hover:text-carbon">← {volver.texto}</Link>
          <p className="font-display text-lg font-semibold">Kit de {d.nombre}</p>
          <span className="rounded-full bg-vino/[.07] px-3 py-1 text-xs font-semibold text-vino">Diseño de autor · {comp === 'gastro' ? 'Alta cocina' : comp === 'taberna' ? 'Taberna' : 'Urbana'}</span>
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

/** Foto con profundidad: la portada o el mejor plato, fundida con el fondo de la composición. */
function Foto({ a, className = '' }: { a: Autor; className?: string }) {
  return (
    <div className={`kit-foto ${className}`}>
      {a.foto && <img src={a.foto} alt="" />}
      <span className="kit-foto-velo" />
    </div>
  );
}

/** El remate gráfico de la firma (mismo adorno que la carta). */
function Adorno({ tipo }: { tipo?: Firma['adorno'] }) {
  if (tipo === 'ninguno') return null;
  const centro = tipo === 'estrella' ? '✦' : tipo === 'ola' ? '∿' : tipo === 'sello' ? '✓' : '◆';
  return <p className="kit-adorno" aria-hidden="true"><span />{centro}<span /></p>;
}

function Nombre({ d, a, className }: { d: DatosKit; a: Autor; className: string }) {
  return (
    <>
      {d.logoUrl && <img src={d.logoUrl} alt="" className="kit-logo" />}
      <p className="kit-lema">{a.firma.lema}</p>
      <h1 className={`kit-titulo ${className}`}>{d.nombre}</h1>
    </>
  );
}

function Cartel({ d, a, qr }: { d: DatosKit; a: Autor; qr: string }) {
  return (
    <div className="kit-a4 kit-cartel">
      <Foto a={a} className="kit-cartel-foto" />
      <div className="kit-cartel-cabeza"><Nombre d={d} a={a} className="kit-cartel-nombre" /><Adorno tipo={a.firma.adorno} /></div>
      <div className="kit-cartel-cuerpo">
        <div className="kit-cartel-marco"><Qr svg={qr} className="kit-qr-cartel" /></div>
        <div className="kit-cartel-texto">
          <p className="kit-versalitas">La carta</p>
          <p className="kit-titulo kit-cartel-titular">Escanea<br />y mira la carta</p>
          <p className="kit-ayuda">Apunta la cámara del móvil al código. Sin descargar nada.</p>
          {a.destacados.length > 0 && (
            <ul className="kit-destacados">
              <li className="kit-versalitas">{a.firma.destacados}</li>
              {a.destacados.map((p) => <li key={p.nombre}><span>{p.nombre}</span><i /><b>{euros(p.precio)}</b></li>)}
            </ul>
          )}
        </div>
      </div>
      <p className="kit-pie">{[d.direccion, d.horario, d.instagram && ig(d.instagram)].filter(Boolean).join('   ·   ')}</p>
    </div>
  );
}

function TarjetaMesa({ d, a, qr, mesa }: { d: DatosKit; a: Autor; qr: string; mesa?: number }) {
  return (
    <div className="kit-tarjeta">
      <Foto a={a} className="kit-tarjeta-foto" />
      <div className="kit-tarjeta-cabeza">
        <p className="kit-lema">{a.firma.lema}</p>
        <p className="kit-titulo kit-tarjeta-nombre">{d.nombre}</p>
      </div>
      <div className="kit-tarjeta-cuerpo">
        {mesa ? <p className="kit-titulo kit-mesa"><span className="kit-versalitas">Mesa</span>{mesa}</p> : <Adorno tipo={a.firma.adorno} />}
        <div className="kit-tarjeta-qr"><Qr svg={qr} className="kit-qr-tarjeta" /></div>
        <p className="kit-titulo kit-tarjeta-titular">La carta, aquí</p>
        <p className="kit-ayuda">Escanea con la cámara del móvil</p>
      </div>
    </div>
  );
}

function Pegatina({ d, a, qr }: { d: DatosKit; a: Autor; qr: string }) {
  return (
    <div className="kit-pegatina">
      <p className="kit-pegatina-arriba">La carta</p>
      <Qr svg={qr} className="kit-qr-pegatina" />
      <p className="kit-titulo kit-pegatina-abajo">{d.nombre}</p>
      <span className="kit-pegatina-aro" style={{ borderColor: a.comp === 'gastro' ? 'var(--k-acento)' : 'var(--k-marca)' }} />
    </div>
  );
}

function Flyer({ d, a, qr }: { d: DatosKit; a: Autor; qr: string }) {
  return (
    <div className="kit-flyer">
      <div className="kit-flyer-izq">
        <Foto a={a} className="kit-flyer-foto" />
        <div className="kit-flyer-nombre"><Nombre d={d} a={a} className="kit-flyer-titulo" /></div>
      </div>
      <div className="kit-flyer-der">
        {d.descripcion && <p className="kit-flyer-frase">{d.descripcion.split(/[.\n]/)[0]?.slice(0, 90)}</p>}
        {a.destacados.length > 0 && (
          <ul className="kit-destacados">
            <li className="kit-versalitas">{a.firma.destacados}</li>
            {a.destacados.map((p) => <li key={p.nombre}><span>{p.nombre}</span><i /><b>{euros(p.precio)}</b></li>)}
          </ul>
        )}
        <dl className="kit-flyer-datos">
          {d.horario && <><dt>Horario</dt><dd>{d.horario}</dd></>}
          {d.direccion && <><dt>Dónde</dt><dd>{d.direccion}</dd></>}
          {d.telefono && <><dt>Reservas</dt><dd>{d.telefono}</dd></>}
          {d.instagram && <><dt>Instagram</dt><dd>{ig(d.instagram)}</dd></>}
        </dl>
        <div className="kit-flyer-qr">
          <Qr svg={qr} className="kit-qr-flyer" />
          <p><span className="kit-titulo">Mira la carta</span><br />antes de venir</p>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@page { size: A4 portrait; margin: 0; }
#kit .kit-hoja { box-shadow: 0 18px 50px -24px rgba(23,16,8,.45); }
#kit .kit-a4 { width: 210mm; height: 297mm; display: grid; background: #fff; overflow: hidden; color: var(--k-tinta); font-family: var(--k-texto);
  font-variant-numeric: lining-nums tabular-nums; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
#kit .kit-titulo { font-family: var(--k-titulo); font-weight: var(--k-peso); font-style: var(--k-estilo); text-transform: var(--k-caja); letter-spacing: var(--k-espacio);
  font-variant-numeric: lining-nums tabular-nums; line-height: .95; text-wrap: balance; }
#kit .kit-versalitas { font-family: system-ui, sans-serif; font-size: 7.5pt; letter-spacing: .32em; text-transform: uppercase; font-weight: 600; color: var(--k-acento); }
#kit .kit-lema { font-family: system-ui, sans-serif; font-size: 7.5pt; letter-spacing: .38em; text-transform: uppercase; font-weight: 600; opacity: .88; }
#kit.kit-urbano .kit-lema { display: inline-block; width: fit-content; transform: rotate(-2deg); background: var(--k-marca); color: #fff; padding: 1mm 2.5mm; letter-spacing: .2em; font-weight: 800; opacity: 1; }
#kit .kit-ayuda { font-size: 9.5pt; color: var(--k-suave); font-family: system-ui, sans-serif; }
#kit .kit-adorno { display: flex; align-items: center; justify-content: center; gap: 3mm; color: var(--k-acento); font-size: 9pt; }
#kit .kit-adorno span { width: 12mm; height: .6pt; background: currentColor; opacity: .55; }
#kit .kit-qr svg { display: block; width: 100%; height: 100%; }
#kit .kit-qr { background: #fff; }
#kit .kit-logo { height: 13mm; width: 13mm; object-fit: cover; border-radius: 50%; box-shadow: 0 0 0 .8pt rgba(255,255,255,.45); margin-bottom: 3mm; }
#kit.kit-urbano .kit-logo { border-radius: 3mm; }
#kit .kit-foto { position: absolute; inset: 0; overflow: hidden; background: var(--k-fondo); }
#kit .kit-foto img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
#kit .kit-foto-velo { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.28) 0%, transparent 32%, color-mix(in srgb, var(--k-fondo) 75%, transparent) 72%, var(--k-fondo) 100%); }
#kit.kit-urbano .kit-foto-velo { background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 30%, rgba(14,13,11,.9) 82%, var(--k-fondo) 100%), linear-gradient(100deg, color-mix(in srgb, var(--k-marca) 55%, transparent), transparent 60%); }
#kit .kit-destacados { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.6mm; font-size: 10.5pt; }
#kit .kit-destacados li:not(.kit-versalitas) { display: flex; align-items: baseline; gap: 2mm; }
#kit .kit-destacados li span { font-family: var(--k-titulo); font-style: var(--k-estilo); text-transform: var(--k-caja); font-size: 12pt; }
#kit .kit-destacados li i { flex: 1; border-bottom: 1pt dotted var(--k-linea); min-width: 4mm; }
#kit .kit-destacados li b { color: var(--k-acento); font-weight: 600; white-space: nowrap; }
#kit .kit-destacados .kit-versalitas { margin-bottom: 1mm; }

#kit .kit-cartel { position: relative; display: flex; flex-direction: column; background: var(--k-fondo); }
#kit .kit-cartel-foto { height: 150mm; bottom: auto; }
#kit .kit-cartel-cabeza { position: relative; height: 150mm; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; text-align: center; padding: 0 16mm 8mm; gap: 3mm; }
#kit.kit-urbano .kit-cartel-cabeza { align-items: flex-start; text-align: left; }
#kit.kit-urbano .kit-cartel-cabeza .kit-adorno { display: none; }
#kit .kit-cartel-nombre { font-size: 58pt; }
#kit.kit-urbano .kit-cartel-nombre { font-size: 76pt; line-height: .86; }
#kit .kit-cartel-cuerpo { position: relative; flex: 1; display: grid; grid-template-columns: 82mm 1fr; gap: 10mm; align-items: center; padding: 6mm 16mm 0; }
#kit .kit-cartel-marco { padding: 3mm; background: var(--k-marca); border-radius: 5mm; box-shadow: 0 10mm 20mm -10mm rgba(0,0,0,.6); }
#kit.kit-gastro .kit-cartel-marco { background: none; border: .8pt solid var(--k-acento); border-radius: 0; padding: 4mm; box-shadow: none; }
#kit .kit-qr-cartel { width: 76mm; height: 76mm; padding: 5mm; border-radius: 3mm; }
#kit.kit-gastro .kit-qr-cartel { border-radius: 0; }
#kit .kit-cartel-texto { display: flex; flex-direction: column; gap: 3.5mm; }
#kit .kit-cartel-titular { font-size: 30pt; }
#kit.kit-urbano .kit-cartel-titular { font-size: 36pt; }
#kit .kit-pie { position: relative; padding: 0 16mm 11mm; text-align: center; font-size: 8.5pt; letter-spacing: .08em; color: var(--k-suave); font-family: system-ui, sans-serif; }

#kit .kit-tarjeta { position: relative; display: flex; flex-direction: column; background: var(--k-fondo); outline: .4pt dashed rgba(0,0,0,.3); outline-offset: -.2pt; overflow: hidden; }
#kit .kit-tarjeta-foto { height: 52mm; bottom: auto; }
#kit .kit-tarjeta-cabeza { position: relative; height: 52mm; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; text-align: center; padding: 0 8mm 3mm; gap: 1.5mm; }
#kit.kit-urbano .kit-tarjeta-cabeza { align-items: flex-start; text-align: left; }
#kit .kit-tarjeta-nombre { font-size: 22pt; }
#kit.kit-urbano .kit-tarjeta-nombre { font-size: 26pt; }
#kit .kit-tarjeta-cuerpo { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.5mm; text-align: center; padding: 2mm 8mm 7mm; }
#kit .kit-mesa { display: flex; align-items: baseline; gap: 2.5mm; font-size: 26pt; }
#kit .kit-tarjeta-qr { padding: 2mm; background: var(--k-marca); border-radius: 3mm; }
#kit.kit-gastro .kit-tarjeta-qr { background: none; border: .6pt solid var(--k-acento); border-radius: 0; }
#kit .kit-qr-tarjeta { width: 40mm; height: 40mm; padding: 2.5mm; border-radius: 2mm; }
#kit .kit-tarjeta-titular { font-size: 16pt; }

#kit .kit-a4-pegatinas { padding: 13mm 15mm; gap: 6mm; }
#kit .kit-pegatina { position: relative; border-radius: 9999px; background: var(--k-fondo); display: flex; flex-direction: column; align-items: center; justify-content: center; aspect-ratio: 1; width: 55mm; justify-self: center; align-self: center; gap: 1.2mm; box-shadow: inset 0 0 0 .4pt rgba(0,0,0,.3); }
#kit .kit-pegatina-aro { position: absolute; inset: 2.2mm; border-radius: 9999px; border: 1.4pt solid; pointer-events: none; }
#kit .kit-pegatina-arriba { font-family: system-ui, sans-serif; font-size: 6pt; letter-spacing: .3em; text-transform: uppercase; font-weight: 700; color: var(--k-acento); }
#kit .kit-qr-pegatina { width: 27mm; height: 27mm; padding: 1.8mm; border-radius: 1.5mm; }
#kit .kit-pegatina-abajo { max-width: 38mm; font-size: 10pt; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

#kit .kit-flyer { display: grid; grid-template-columns: 46% 1fr; background: var(--k-fondo); outline: .4pt dashed rgba(0,0,0,.3); outline-offset: -.2pt; overflow: hidden; }
#kit .kit-flyer-izq { position: relative; }
#kit .kit-flyer-izq .kit-foto-velo { background: linear-gradient(180deg, rgba(0,0,0,.2) 0%, transparent 35%, color-mix(in srgb, var(--k-fondo) 80%, transparent) 78%, var(--k-fondo) 100%); }
#kit .kit-flyer-nombre { position: absolute; inset: auto 0 0 0; padding: 0 9mm 9mm; display: flex; flex-direction: column; gap: 2mm; }
#kit .kit-flyer-titulo { font-size: 30pt; }
#kit.kit-urbano .kit-flyer-titulo { font-size: 38pt; line-height: .86; }
#kit .kit-flyer-der { display: flex; flex-direction: column; gap: 4.5mm; padding: 11mm 11mm 10mm; }
#kit .kit-flyer-frase { font-family: var(--k-titulo); font-style: var(--k-estilo); font-weight: var(--k-peso); text-transform: var(--k-caja); font-size: 16pt; line-height: 1.08; }
#kit .kit-flyer-datos { display: grid; grid-template-columns: auto 1fr; gap: 1.4mm 4mm; font-size: 8.5pt; font-family: system-ui, sans-serif; }
#kit .kit-flyer-datos dt { color: var(--k-acento); font-weight: 700; text-transform: uppercase; letter-spacing: .16em; font-size: 6.5pt; padding-top: .6mm; }
#kit .kit-flyer-datos dd { color: var(--k-tinta); opacity: .9; }
#kit .kit-flyer-qr { margin-top: auto; display: flex; align-items: center; gap: 4mm; font-size: 9pt; color: var(--k-suave); font-family: system-ui, sans-serif; }
#kit .kit-flyer-qr .kit-titulo { font-size: 15pt; color: var(--k-tinta); }
#kit .kit-qr-flyer { width: 28mm; height: 28mm; padding: 2mm; flex-shrink: 0; border-radius: 2mm; box-shadow: 0 0 0 1.5mm var(--k-marca); }
#kit.kit-gastro .kit-qr-flyer { border-radius: 0; box-shadow: 0 0 0 .6pt var(--k-acento); }

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
