'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useState, useTransition, type ReactNode } from 'react';
import { guardarEstiloAction } from '@/app/panel/actions';
import { FICHAS_COMPOSICION, ADORNOS, esComposicion, type Firma } from '@/lib/composiciones';

/**
 * Selectores de estilo de la carta (0031): estilo, fondo, letra y color de
 * una paleta curada. Vista previa en vivo antes de guardar. Solo nivel
 * Esencial. «Premium» (12/10) sustituye a la Carta de Autor de pago y va incluido en todos los planes.
 */
export const ESTILOS = [
  { id: 'premium', nombre: 'Premium · Gran foto', para: 'Premium incluido en tu plan, con la foto como protagonista: portada a pantalla completa, foto grande en cada sección, buscador y «Sorpréndeme». Con fondo Oscuro queda en modo Noir.', muestra: ['Portada a sangre con tu foto', 'Buscador y «Sorpréndeme»', 'Secciones numeradas fijas al bajar', 'Foto grande por sección'] },
  { id: 'clasica', nombre: 'Premium · Autor', para: 'Premium incluido en tu plan, como una carta impresa de autor: secciones numeradas, línea de puntos hasta el precio y una foto por sección.', muestra: ['Portada a sangre con tu foto', 'Buscador y «Sorpréndeme»', 'Línea de puntos hasta el precio', 'Una foto por sección'] },
  { id: 'editorial', nombre: 'Premium · Autor (vinos)', para: 'Igual que Autor, con letra clásica en toda la carta. Ideal para cocina de autor y vinos.', muestra: ['Sin fotos en la lista (se ven al abrir el plato)', 'Banners arriba'] },
  { id: 'visual', nombre: 'Premium · Gran foto (brunch)', para: 'Igual que Gran foto: la foto de cada plato vende. Brunch, hamburguesas, gastro.', muestra: ['Foto grande de portada', 'Foto grande en cada plato', 'Banners arriba'] },
  { id: 'express', nombre: 'Premium · Autor (bar)', para: 'Igual que Autor. Bar, cafetería y terraza.', muestra: ['Sin fotos en la lista (se ven al abrir el plato)', 'Banners arriba'] },
] as const;
export const FONDOS = [
  { id: 'papel', nombre: 'Papel', fondo: '#F7F3EA', tinta: '#221D17', tarjeta: '#FFFFFF' },
  { id: 'blanco', nombre: 'Blanco', fondo: '#FFFFFF', tinta: '#1B1D22', tarjeta: '#F7F5F2' },
  { id: 'oscuro', nombre: 'Oscuro', fondo: '#15161A', tinta: '#F3F1EC', tarjeta: '#1F2126' },
] as const;
export const COLORES = [
  { hex: '#E8592A', nombre: 'Naranja' }, { hex: '#B23A48', nombre: 'Burdeos' }, { hex: '#C58B2A', nombre: 'Mostaza' },
  { hex: '#2F5D50', nombre: 'Verde oliva' }, { hex: '#2F8F6B', nombre: 'Verde salvia' }, { hex: '#1F4E79', nombre: 'Azul marino' },
  { hex: '#3B6EA5', nombre: 'Azul' }, { hex: '#5B3E8A', nombre: 'Ciruela' }, { hex: '#17191E', nombre: 'Grafito' },
];

type Estilo = { plantilla: string; fondo: string; letra: string; color: string; firma?: Firma };

/** Fotos de ejemplo: solo se usan hasta que el cliente sube las suyas. */
const FOTOS_EJEMPLO = ['/images/demo/s5.png', '/images/demo/s18.png', '/images/demo/s22.png'];

/** Vista previa de las cartas de autor (R3): cada composición con su maquetación y su letra. */
export function VistaAutor({ e, nombre, fotos, portada = null, logo = null }: { e: Estilo; nombre: string; fotos: string[]; portada?: string | null; logo?: string | null }) {
  const img = (i: number) => fotos.length ? fotos[i % fotos.length] : FOTOS_EJEMPLO[i % FOTOS_EJEMPLO.length];
  const oscuro = e.fondo === 'oscuro';
  const f = e.firma ?? {};
  const platos: [string, string][] = [['Croquetas caseras', '9,50'], ['Arroz de la casa', '16,00'], ['Tarta de queso', '6,50']];
  const marco = (hijos: ReactNode, fondo: string, tinta: string) => (
    <div className="mx-auto w-[230px] rounded-[34px] border border-linea bg-tinta p-2 shadow-xl">
      <div className="h-[400px] overflow-hidden rounded-[27px]" style={{ background: fondo, color: tinta }}>{hijos}</div>
      <p className="mt-2 text-center text-[10px] leading-snug text-white/60">{fotos.length ? 'Con tus fotos reales' : 'Fotos de ejemplo: se cambian por las tuyas al subirlas'}</p>
    </div>
  );
  const serif = { fontFamily: 'Georgia, serif' };
  if (e.plantilla === 'gastro') {
    const acento = oscuro ? `color-mix(in srgb, ${e.color} 55%, #F2D9A6)` : e.color;
    return marco(<>
      <div className="relative flex h-36 flex-col items-center justify-center px-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portada || img(0)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" style={{ mixBlendMode: oscuro ? 'luminosity' : 'multiply' }} />
        <p className="relative text-[7px] uppercase tracking-[0.35em]" style={{ color: acento }}>{f.lema || 'Menú de temporada'}</p>
        <p className="relative mt-2 text-[22px] font-light leading-none" style={serif}>{nombre}</p>
      </div>
      <div className="px-3">
        <p className="mt-2 flex items-center gap-2 text-[11px] font-light" style={serif}><span className="text-[7px] tracking-widest" style={{ color: acento }}>01</span><span className="h-px w-5" style={{ background: acento }} />Para compartir</p>
        {platos.map(([n, pr], i) => (
          <div key={n} className={`mt-2 flex items-center gap-2 ${i % 2 ? 'flex-row-reverse' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(i)} alt="" className="h-11 w-16 shrink-0 object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-light" style={serif}>{n}</p><p className="text-[9px]" style={{ color: acento }}>{pr} €</p></div>
          </div>
        ))}
        {f.nota && <p className="mt-3 text-center text-[9px] italic opacity-70" style={serif}>«{f.nota.slice(0, 60)}{f.nota.length > 60 ? '…' : ''}»</p>}
      </div>
    </>, oscuro ? '#0A0A0A' : '#F4F0E8', oscuro ? '#F5F2EC' : '#1A1714');
  }
  if (e.plantilla === 'taberna') {
    const pizarra = `color-mix(in srgb, ${e.color} 28%, #1C261D)`;
    const linea = oscuro ? 'rgba(255,255,255,.1)' : '#E8E1D2';
    return marco(<>
      <div className="px-3 pb-3 pt-4 text-center text-[#F4ECD8]" style={{ background: pizarra }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src={logo} alt="" className="mx-auto mb-1 h-7 w-7 rounded-full object-cover" />}
        <p className="text-[20px] font-extrabold italic leading-none" style={serif}>{nombre}</p>
        <p className="mx-auto mt-1.5 inline-block border-t border-white/25 pt-1 text-[6.5px] font-bold uppercase tracking-[0.2em]">{f.lema || 'Tapas, raciones y vinos'}</p>
      </div>
      <div className="px-2 py-2 text-white" style={{ background: e.color }}>
        <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/50 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(0)} alt="" className="h-7 w-7 rounded-md object-cover" />
          <span className="flex-1 text-[8px] font-bold uppercase">{f.destacados || 'Hoy recomendamos'}</span><span className="text-[9px] font-black">9,50 €</span>
        </div>
      </div>
      <div className="m-2 rounded-2xl border p-2" style={{ background: oscuro ? '#1D241E' : '#fff', borderColor: linea }}>
        <p className="inline-block border-b-2 text-[13px] font-bold" style={{ borderColor: e.color, ...serif }}>Para compartir</p>
        {platos.map(([n, pr], i) => (
          <div key={n} className="mt-1.5 flex items-center gap-1.5 rounded-xl border p-1" style={{ borderColor: linea }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(i)} alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="flex-1 text-[9px] font-bold">{n}</span>
            <span className="rounded-md px-1 text-[9px] font-black" style={{ background: `color-mix(in srgb, ${e.color} 14%, transparent)`, color: e.color }}>{pr}</span>
          </div>
        ))}
      </div>
    </>, oscuro ? '#151A16' : '#FAF7F1', oscuro ? '#F1EADB' : '#26332A');
  }
  return marco(<>
    <div className="flex items-center gap-1.5 px-2.5 py-2">
      <span className="grid h-6 w-6 place-items-center rounded-md text-[11px] font-black text-white" style={{ background: e.color }}>{nombre.charAt(0)}</span>
      <span className="truncate text-[11px] font-black uppercase italic">{nombre}</span>
    </div>
    <div className="relative mx-2 overflow-hidden rounded-2xl p-3 text-white" style={{ background: `linear-gradient(120deg, ${e.color}, color-mix(in srgb, ${e.color} 45%, #FF9F1C))` }}>
      <span className="rounded-full bg-black px-1.5 py-0.5 text-[6px] font-black uppercase">{f.lema || 'Recién hecho'}</span>
      <p className="relative z-10 mt-1.5 max-w-[65%] text-[17px] font-black uppercase italic leading-[0.95]">{nombre}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={portada || img(0)} alt="" className="absolute -bottom-4 -right-4 h-20 w-20 rotate-[-12deg] rounded-full border-4 border-white/35 object-cover" />
    </div>
    <p className="mx-2.5 mt-2.5 text-[12px] font-black uppercase italic">Para compartir</p>
    <div className="mx-2 mt-1.5 grid grid-cols-2 gap-1.5">
      {platos.slice(0, 2).map(([n, pr], i) => (
        <div key={n} className="overflow-hidden rounded-xl" style={{ background: oscuro ? '#1D1811' : '#fff', border: oscuro ? '1px solid rgba(255,255,255,.08)' : '1.5px solid #141009' }}>
          <div className="relative h-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(i)} alt="" className="h-full w-full object-cover" />
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[8px] font-black text-white">{pr}</span>
          </div>
          <p className="truncate px-1.5 py-1 text-[8px] font-black uppercase">{n}</p>
        </div>
      ))}
    </div>
  </>, oscuro ? '#141009' : '#FFF7EC', oscuro ? '#fff' : '#141009');
}

function Vista({ e, nombre, fotos, portada = null, portadaConNombre = false, logo = null }: { e: Estilo; nombre: string; fotos: string[]; portada?: string | null; portadaConNombre?: boolean; logo?: string | null }) {
  if (esComposicion(e.plantilla)) return <VistaAutor e={e} nombre={nombre} fotos={fotos} portada={portada} logo={logo} />;
  const img = (i: number) => fotos.length ? fotos[i % fotos.length] : FOTOS_EJEMPLO[i];
  const conFoto = e.plantilla === 'visual' || e.plantilla === 'clasica' || e.plantilla === 'premium';
  const f = FONDOS.find((x) => x.id === e.fondo) ?? FONDOS[0];
  const serif = e.letra === 'serif' ? 'Georgia, "Times New Roman", serif' : 'inherit';
  const suave = f.id === 'oscuro' ? 'rgba(243,241,236,.55)' : 'rgba(0,0,0,.5)';
  const platos = [['Croquetas caseras', '9,50'], ['Arroz de la casa', '16'], ['Tarta de queso', '6,50']];
  return (
    <div className="mx-auto w-[230px] rounded-[34px] border border-linea bg-tinta p-2 shadow-xl">
      <div className="h-[400px] overflow-hidden rounded-[27px]" style={{ background: f.fondo, color: f.tinta }}>
        {e.plantilla === 'visual' ? (
          <div className="relative flex h-24 items-end overflow-hidden p-3" style={{ background: e.color }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portada || img(0)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {!(portada && portadaConNombre) && <p style={{ fontFamily: serif }} className="relative text-lg font-bold text-white">{logo && <img src={logo} alt="" className="relative mr-2 inline-block h-7 w-7 rounded-full bg-white object-cover align-middle" />}{nombre}</p>}
          </div>
        ) : e.plantilla === 'express' ? (
          <div className="px-3 py-3" style={{ borderTop: `4px solid ${e.color}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <p style={{ fontFamily: serif }} className="font-bold">{logo && <img src={logo} alt="" className="relative mr-2 inline-block h-7 w-7 rounded-full bg-white object-cover align-middle" />}{nombre}</p>
          </div>
        ) : (
          <div className="px-3 pb-3 pt-6 text-center">
            {e.plantilla === 'editorial' && <p className="text-[8px] uppercase tracking-[0.3em]" style={{ color: e.color }}>La carta</p>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="" className="mx-auto mb-1 h-9 w-9 rounded-full object-cover" />}
            <p style={{ fontFamily: serif }} className={`mt-1 font-semibold ${e.plantilla === 'editorial' ? 'text-2xl' : 'text-lg'}`}>{nombre}</p>
          </div>
        )}
        <div className="mx-3 mt-2 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-white" style={{ background: e.color }}>Banner · Menú del día 12,90 €</div>
        <div className="px-3">
          <p style={{ fontFamily: serif, color: e.plantilla === 'editorial' ? e.color : undefined }}
            className={`mt-2 ${e.plantilla === 'express' ? 'text-[9px] font-bold uppercase tracking-widest' : e.plantilla === 'editorial' ? 'text-center text-base' : 'text-sm font-semibold'}`}>Para compartir</p>
          <div className={`mt-2 ${e.plantilla === 'clasica' ? 'rounded-xl p-2' : ''}`} style={e.plantilla === 'clasica' ? { background: f.tarjeta } : undefined}>
            {platos.map(([n, p], i) => (
              e.plantilla === 'visual' ? (
                <div key={n} className="mb-2 overflow-hidden rounded-lg" style={{ background: f.tarjeta }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(i)} alt="" className="h-12 w-full object-cover" style={{ background: `${e.color}33` }} />
                  <div className="flex justify-between px-2 py-1.5 text-[11px]"><span style={{ fontFamily: serif }} className="font-semibold">{n}</span><span style={{ color: e.color }} className="font-bold">{p}</span></div>
                </div>
              ) : (
                <div key={n} className="flex items-center gap-1.5 py-1.5 text-[11px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {conFoto && <img src={img(i)} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />}
                  <span style={{ fontFamily: serif }} className="font-semibold">{n}</span>
                  {e.plantilla === 'editorial' ? <span className="flex-1 border-b border-dotted" style={{ borderColor: suave }} /> : <span className="flex-1" />}
                  <span className="font-semibold">{p}</span>
                </div>
              )
            ))}
          </div>
          <p className="mt-3 text-[9px]" style={{ color: suave }}>Alérgenos: gluten · lácteos · huevos</p>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] leading-snug text-white/60">{fotos.length ? 'Con tus fotos reales' : 'Fotos de ejemplo: se cambian por las tuyas al subirlas'}</p>
    </div>
  );
}

export default function EstiloCarta({ inicial, nombre, bloqueado, fotos = [], portada = null, portadaConNombre = false, logo = null, slug }: { inicial: Estilo; nombre: string; bloqueado: boolean; fotos?: string[]; portada?: string | null; portadaConNombre?: boolean; logo?: string | null; slug?: string }) {
  const [e, setE] = useState<Estilo>(inicial);
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const cambiado = JSON.stringify(e) !== JSON.stringify(inicial);
  const opcion = (activa: boolean) => `rounded-2xl border p-3 text-left transition ${activa ? 'border-tinta bg-crema' : 'border-linea hover:border-linea-fuerte'}`;

  if (bloqueado) {
    return (
      <section className="rounded-[22px] border border-linea bg-white p-6">
        <h3 className="text-lg font-semibold">Estilo de tu carta</h3>
        <p className="mt-1 text-sm text-niebla">Tu carta tiene un diseño de autor hecho por DKitchen. Si quieres cambiar algo, pídenoslo en Soporte.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-linea bg-white p-5 sm:p-7">
      <h3 className="text-lg font-semibold">Estilo de tu carta</h3>
      <p className="mt-1 text-sm text-niebla">Elige cómo se ve tu carta. Todas las combinaciones están pensadas para leerse bien en cualquier móvil. Mira la vista previa antes de guardar.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">1. Composición</p>
            <p className="mt-0.5 text-xs text-niebla">De autor: tres cartas distintas, cada una con su letra y su maquetación. Con tu color, tu portada y tu firma, ninguna sale igual a otra.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {FICHAS_COMPOSICION.map((x) => (
                <button key={x.id} type="button" onClick={() => setE({ ...e, plantilla: x.id })} className={opcion(e.plantilla === x.id)} aria-pressed={e.plantilla === x.id}>
                  <span className="block font-semibold">{x.nombre}</span>
                  <span className="mt-0.5 block text-xs text-niebla">{x.para}</span>
                  <span className="mt-2 flex flex-wrap gap-1">{x.muestra.map((m) => <span key={m} className="rounded-full bg-vino/[.06] px-2 py-0.5 text-[10.5px] font-medium text-vino">{m}</span>)}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ceniza">Premium</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ESTILOS.map((x) => (
                <button key={x.id} type="button" onClick={() => setE({ ...e, plantilla: x.id })} className={opcion(e.plantilla === x.id)} aria-pressed={e.plantilla === x.id}>
                  <span className="block font-semibold">{x.nombre}</span>
                  <span className="mt-0.5 block text-xs text-niebla">{x.para}</span>
                  <span className="mt-2 flex flex-wrap gap-1">{x.muestra.map((m) => <span key={m} className="rounded-full bg-vino/[.06] px-2 py-0.5 text-[10.5px] font-medium text-vino">{m}</span>)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">2. Fondo</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FONDOS.map((x) => (
                <button key={x.id} type="button" onClick={() => setE({ ...e, fondo: x.id })} className={opcion(e.fondo === x.id)} aria-pressed={e.fondo === x.id}>
                  <span className="block h-8 rounded-lg border border-linea" style={{ background: x.fondo }} />
                  <span className="mt-1.5 block text-sm font-medium">{x.nombre}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">3. Letra</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[['sans', 'Moderna', 'inherit'], ['serif', 'Clásica', 'Georgia, serif']].map(([id, n, ff]) => (
                <button key={id} type="button" onClick={() => setE({ ...e, letra: id })} className={opcion(e.letra === id)} aria-pressed={e.letra === id}>
                  <span className="block text-2xl" style={{ fontFamily: ff }}>Aa</span>
                  <span className="block text-sm font-medium">{n}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">4. Color de acento</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Color de acento">
              {COLORES.map((c) => (
                <button key={c.hex} type="button" role="radio" aria-checked={e.color.toUpperCase() === c.hex} title={c.nombre} aria-label={c.nombre}
                  onClick={() => setE({ ...e, color: c.hex })}
                  className={`h-10 w-10 rounded-full ring-offset-2 ${e.color.toUpperCase() === c.hex ? 'ring-2 ring-tinta' : ''}`} style={{ background: c.hex }} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">5. Tu firma</p>
            <p className="mt-0.5 text-xs text-niebla">Lo que hace tuya la carta. Todo opcional.</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {([['lema', 'Lema bajo el nombre', 'Cocina de mercado desde 1987', 120], ['destacados', 'Título de tus recomendados', 'Selección del chef', 40], ['autor', 'Quién firma la nota', 'Chef Marta Ruiz', 60]] as const).map(([k, l, ph, max]) => (
                <label key={k} className="block text-xs font-medium text-niebla">{l}
                  <input value={e.firma?.[k] ?? ''} maxLength={max} placeholder={ph} onChange={(ev) => setE({ ...e, firma: { ...e.firma, [k]: ev.target.value } as Firma })}
                    className="mt-1 w-full rounded-xl border border-linea px-3 py-2 text-sm text-tinta" />
                </label>
              ))}
              <label className="block text-xs font-medium text-niebla">Adorno
                <select value={e.firma?.adorno ?? 'rombo'} onChange={(ev) => setE({ ...e, firma: { ...e.firma, adorno: ev.target.value as Firma['adorno'] } })} className="mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2 text-sm text-tinta">
                  {ADORNOS.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-niebla sm:col-span-2">Nota del chef o de la casa
                <textarea value={e.firma?.nota ?? ''} maxLength={400} rows={3} placeholder="Cocinamos con lo que trae el mercado cada mañana…" onChange={(ev) => setE({ ...e, firma: { ...e.firma, nota: ev.target.value } })}
                  className="mt-1 w-full rounded-xl border border-linea px-3 py-2 text-sm text-tinta" />
              </label>
            </div>
          </div>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-ceniza">Vista previa</p>
          <Vista e={e} nombre={nombre} fotos={fotos} portada={portada} portadaConNombre={portadaConNombre} logo={logo} />
          {slug && esComposicion(e.plantilla) && (
            <a href={`/m/${slug}?vista=${e.plantilla}&tema=${e.fondo === 'oscuro' ? 'noir' : 'crema'}`} target="_blank" rel="noopener" className="mt-3 block text-center text-xs font-semibold text-vino underline-offset-2 hover:underline">Ver tu carta entera así →</a>
          )}
        </div>
      </div>

      {aviso && <p className={`mt-5 text-sm ${aviso.ok ? 'text-exito' : 'text-red-600'}`}>{aviso.texto}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button disabled={!cambiado || pendiente} onClick={() => { setAviso(null); iniciar(async () => { try { await guardarEstiloAction(e); setAviso({ ok: true, texto: 'Estilo guardado. Tu carta ya se ve así.' }); } catch (err) { setAviso({ ok: false, texto: mensajeError(err, 'No se pudo guardar.') }); } }); }}
          className="rounded-full bg-tinta px-6 py-3 text-sm font-semibold text-white disabled:opacity-35">{pendiente ? 'Guardando…' : 'Guardar estilo'}</button>
        {cambiado && <button onClick={() => setE(inicial)} className="rounded-full border border-linea px-5 py-3 text-sm font-semibold">Deshacer cambios</button>}
      </div>
    </section>
  );
}
