'use client';

import { useState, useTransition } from 'react';
import { mensajeError } from '@/lib/mensaje-error';
import { guardarEstiloAction } from '@/app/panel/actions';
import { COLORES } from './EstiloCarta';
import { avisarEstudio } from './EstudioMarco';
import { ADORNOS, esComposicion, type Firma } from '@/lib/composiciones';

/**
 * ESTILO (13/10, karc0: «diseño de autor en todo; fuera Esencial»). Todas las
 * cartas son Premium: aquí solo se elige la composición (Gran foto / Autor), el
 * tema (Noir / Crema) y el acento. Lo que se toca se prueba en el móvil en vivo
 * del Estudio antes de guardar. Se guarda en los mismos campos de siempre:
 * foto → plantilla 'premium', autor → 'clasica'; noir → fondo 'oscuro', crema → 'papel'.
 */
type Comp = 'foto' | 'autor' | 'gastro' | 'taberna' | 'urbano';
type Tema = 'noir' | 'crema';

// R3 (19/10): tres cartas de autor al nivel de las demos, cada una con su letra y su maquetación.
const COMPOSICIONES: { id: Comp; nombre: string; frase: string; puntos: string[] }[] = [
  { id: 'gastro', nombre: 'Alta cocina', frase: 'Negro editorial y letra fina. Cocina de autor, menú degustación, vinos.', puntos: ['Platos en filas con foto grande', 'Selección del chef', 'Nota del chef firmada'] },
  { id: 'taberna', nombre: 'Taberna', frase: 'Pizarra, papel y la recomendación del día. Tapas, raciones, bar.', puntos: ['Cabecera de pizarra', 'Recomendación del día', 'Precio en pastilla'] },
  { id: 'urbano', nombre: 'Urbana', frase: 'Letra de cartel y tu color en degradado. Hamburguesas, pizza, street food.', puntos: ['Tarjetón de marca', 'Los que más piden', 'Precio sobre la foto'] },
  { id: 'foto', nombre: 'Gran foto', frase: 'La foto vende. Brunch, hamburguesas, gastro, cocina de producto.', puntos: ['Portada a sangre', 'Foto grande en cada plato', 'Los que más salen', 'Buscador y «Sorpréndeme»'] },
  { id: 'autor', nombre: 'Autor', frase: 'Como una carta impresa de autor. Restaurante, vinos, tapas, bar.', puntos: ['Secciones con romanos', 'Filete de puntos hasta el precio', 'Una foto por sección', 'Buscador y «Sorpréndeme»'] },
];

function Miniatura({ comp, tema, color }: { comp: Comp; tema: Tema; color: string }) {
  const noir = tema === 'noir';
  const caja = 'h-[168px] w-[100px] shrink-0 overflow-hidden rounded-[18px] ring-1 ring-black/10';
  const plato = (i: number) => (i % 2 ? 'linear-gradient(135deg,#5E6B2A,#20260C)' : 'linear-gradient(135deg,#9A4A22,#3B1607)');
  if (comp === 'gastro') {
    const acento = noir ? '#E8CF9C' : color;
    return (
      <div className={caja} style={{ background: noir ? '#0A0A0A' : '#F4F0E8', color: noir ? '#F5F2EC' : '#1A1714' }}>
        <div className="flex h-[62px] flex-col items-center justify-center" style={{ background: noir ? 'radial-gradient(#2a2420,#0A0A0A)' : 'radial-gradient(#e2d8c6,#F4F0E8)' }}>
          <span className="text-[5px] uppercase tracking-[0.3em]" style={{ color: acento }}>Temporada</span>
          <span className="mt-0.5 font-display text-[12px] font-light">La casa</span>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className={`mx-2 mt-2 flex items-center gap-1.5 ${i ? 'flex-row-reverse' : ''}`}>
            <span className="h-7 w-10" style={{ background: plato(i) }} />
            <span className="flex-1 text-[6px] font-light">Plato<br /><span style={{ color: acento }}>18 €</span></span>
          </div>
        ))}
      </div>
    );
  }
  if (comp === 'taberna') {
    return (
      <div className={caja} style={{ background: noir ? '#151A16' : '#FAF7F1', color: noir ? '#F1EADB' : '#26332A' }}>
        <div className="flex h-[46px] items-center justify-center text-[#F4ECD8]" style={{ background: `color-mix(in srgb, ${color} 28%, #1C261D)` }}><span className="font-display text-[12px] font-bold italic">La casa</span></div>
        <div className="px-1.5 py-1.5" style={{ background: color }}><div className="rounded border border-dashed border-white/60 px-1 py-0.5 text-[5.5px] font-bold uppercase text-white">Hoy recomendamos</div></div>
        <div className="m-1.5 space-y-1 rounded-lg p-1" style={{ background: noir ? '#1D241E' : '#fff' }}>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-1"><span className="h-5 w-5 rounded" style={{ background: plato(i) }} /><span className="flex-1 text-[6px] font-bold">Ración</span><span className="rounded px-0.5 text-[6px] font-black" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>9</span></div>
          ))}
        </div>
      </div>
    );
  }
  if (comp === 'urbano') {
    return (
      <div className={caja} style={{ background: noir ? '#141009' : '#FFF7EC', color: noir ? '#fff' : '#141009' }}>
        <div className="relative m-1.5 h-[52px] overflow-hidden rounded-xl p-1.5 text-white" style={{ background: `linear-gradient(120deg, ${color}, color-mix(in srgb, ${color} 45%, #FF9F1C))` }}>
          <span className="block text-[11px] font-black uppercase italic leading-none">La<br />casa</span>
          <span className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full border-2 border-white/40" style={{ background: plato(0) }} />
        </div>
        <div className="mx-1.5 grid grid-cols-2 gap-1">
          {[0, 1, 1, 0].map((i, k) => (
            <div key={k} className="overflow-hidden rounded-md" style={{ border: noir ? '1px solid rgba(255,255,255,.1)' : '1px solid #141009' }}>
              <div className="h-6" style={{ background: plato(i) }} /><p className="px-0.5 text-[5px] font-black uppercase">Burger</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const fondo = noir ? '#0B0A09' : '#F7F1E6';
  const tinta = noir ? '#F4EEE4' : '#221D17';
  const suave = noir ? 'rgba(244,238,228,.45)' : 'rgba(34,29,23,.45)';
  return (
    <div className="h-[168px] w-[100px] shrink-0 overflow-hidden rounded-[18px] ring-1 ring-black/10" style={{ background: fondo, color: tinta }}>
      <div className="relative h-[58px]" style={{ background: comp === 'foto' ? 'linear-gradient(135deg,#7A3B1D,#2B1408)' : `linear-gradient(135deg,${color}55,${fondo})` }}>
        <span className="absolute inset-x-0 bottom-2 text-center font-display text-[11px] italic" style={{ color: comp === 'foto' ? '#F4EEE4' : tinta }}>La casa</span>
      </div>
      {comp === 'foto' ? (
        <div className="space-y-1.5 p-2">
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-md" style={{ background: noir ? '#15130F' : '#FFFFFF' }}>
              <div className="h-7" style={{ background: i ? 'linear-gradient(135deg,#5E6B2A,#20260C)' : 'linear-gradient(135deg,#9A4A22,#3B1607)' }} />
              <div className="flex justify-between px-1.5 py-1 text-[7px]"><span>Plato</span><span style={{ color: noir ? '#F2C14E' : color }}>12</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 p-2.5 text-[7px]">
          <p className="text-center font-display text-[9px] tracking-[0.3em]" style={{ color: noir ? '#F2C14E' : color }}>I · ENTRANTES</p>
          {['Croquetas', 'Ensalada', 'Arroz'].map((p) => (
            <p key={p} className="flex items-end gap-1"><span>{p}</span><span className="mb-[2px] flex-1 border-b border-dotted" style={{ borderColor: suave }} /><span>9</span></p>
          ))}
          <div className="h-6 rounded" style={{ background: 'linear-gradient(135deg,#9A4A22,#3B1607)' }} />
        </div>
      )}
    </div>
  );
}

export default function EstiloPremium({ inicial }: { inicial: { plantilla: string; fondo: string; letra: string; color: string; firma?: Firma } }) {
  const compIni: Comp = esComposicion(inicial.plantilla) ? inicial.plantilla : inicial.plantilla === 'visual' || inicial.plantilla === 'premium' ? 'foto' : 'autor';
  const firmaIni = JSON.stringify(inicial.firma ?? {});
  const [firma, setFirma] = useState<Firma>(inicial.firma ?? {});
  const [firmaBase, setFirmaBase] = useState(firmaIni);
  const cambiaFirma = (k: keyof Firma, v: string) => setFirma({ ...firma, [k]: v } as Firma);
  const temaIni: Tema = inicial.fondo === 'papel' || inicial.fondo === 'blanco' ? 'crema' : 'noir';
  const colorIni = (inicial.color || '#B23A48').toUpperCase();
  const [comp, setComp] = useState<Comp>(compIni);
  const [tema, setTema] = useState<Tema>(temaIni);
  const [color, setColor] = useState(colorIni);
  const [base, setBase] = useState({ comp: compIni, tema: temaIni, color: colorIni });
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const cambiado = comp !== base.comp || tema !== base.tema || color !== base.color || JSON.stringify(firma) !== firmaBase;

  const probar = (c: Comp, t: Tema) => avisarEstudio({ vista: c, tema: t });
  const elegirComp = (c: Comp) => { setComp(c); probar(c, tema); };
  const elegirTema = (t: Tema) => { setTema(t); probar(comp, t); };

  const guardar = () => {
    setAviso(null);
    iniciar(async () => {
      try {
        await guardarEstiloAction({ plantilla: comp === 'foto' ? 'premium' : comp === 'autor' ? 'clasica' : comp, fondo: tema === 'noir' ? 'oscuro' : 'papel', letra: inicial.letra === 'serif' ? 'serif' : 'sans', color, firma });
        setBase({ comp, tema, color });
        setFirmaBase(JSON.stringify(firma));
        setAviso({ ok: true, texto: 'Guardado. Tu carta ya se ve así.' });
        avisarEstudio({ recargar: true });
      } catch (err) { setAviso({ ok: false, texto: mensajeError(err, 'No se pudo guardar.') }); }
    });
  };

  return (
    <section className="space-y-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-vino">Estilo · Premium incluido en tu plan</p>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">Cómo se ve tu carta</h2>
        <p className="mt-1 max-w-xl text-sm text-niebla">Elige la composición y el tema: lo ves al momento en el móvil de la derecha. Con tu color, tu portada y tu firma, tu carta no se parece a ninguna otra. Nada cambia para tus clientes hasta que guardas.</p>
      </header>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-niebla">1 · Composición</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {COMPOSICIONES.map((c) => {
            const activa = comp === c.id;
            return (
              <button key={c.id} type="button" onClick={() => elegirComp(c.id)} aria-pressed={activa}
                className={`group flex gap-4 rounded-[26px] p-4 text-left transition ${activa ? 'bg-[#0D090F] text-white shadow-[0_24px_50px_-24px_rgba(13,9,15,.9)] ring-2 ring-[#F2C14E]' : 'bg-white ring-1 ring-linea hover:ring-linea-fuerte'}`}>
                <Miniatura comp={c.id} tema={tema} color={color} />
                <span className="min-w-0">
                  <span className={`block font-display text-2xl italic ${activa ? 'text-[#F2C14E]' : ''}`}>{c.nombre}</span>
                  <span className={`mt-1 block text-sm ${activa ? 'text-white/70' : 'text-niebla'}`}>{c.frase}</span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {c.puntos.map((p) => <span key={p} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${activa ? 'bg-white/10 text-white/85' : 'bg-vino/[.06] text-vino'}`}>{p}</span>)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-niebla">2 · Tema</p>
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          {([['noir', 'Noir', 'Fondo negro, precios en oro. Noche, cócteles, autor.', '#0B0A09', '#F2C14E'], ['crema', 'Crema', 'Papel cálido y tinta. Día, brunch, terraza.', '#F7F1E6', '#221D17']] as const).map(([id, n, f, bg, fg]) => (
            <button key={id} type="button" onClick={() => elegirTema(id)} aria-pressed={tema === id}
              className={`rounded-[22px] p-4 text-left ring-2 transition ${tema === id ? 'ring-[#F2C14E]' : 'ring-transparent hover:ring-linea-fuerte'}`} style={{ background: bg, color: fg }}>
              <span className="block font-display text-xl italic">{n}</span>
              <span className="mt-1 block text-xs opacity-75">{f}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-niebla">3 · Acento de tu marca</p>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color de acento">
          {COLORES.map((c) => (
            <button key={c.hex} type="button" role="radio" aria-checked={color === c.hex} title={c.nombre} aria-label={c.nombre}
              onClick={() => setColor(c.hex)}
              className={`h-11 w-11 rounded-full ring-offset-2 ring-offset-crema transition ${color === c.hex ? 'scale-110 ring-2 ring-tinta' : 'hover:scale-105'}`} style={{ background: c.hex }} />
          ))}
        </div>
        <p className="mt-2 text-xs text-niebla">Se usa en detalles y botones; en Noir, los precios van siempre en oro.</p>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-niebla">4 · Tu firma</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-niebla">Lema bajo el nombre<input value={firma.lema ?? ''} maxLength={120} onChange={(e) => cambiaFirma('lema', e.target.value)} placeholder="Cocina de mercado desde 1987" className="mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2.5 text-sm text-tinta" /></label>
          <label className="block text-xs font-medium text-niebla">Título de tus recomendados<input value={firma.destacados ?? ''} maxLength={40} onChange={(e) => cambiaFirma('destacados', e.target.value)} placeholder="Selección del chef" className="mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2.5 text-sm text-tinta" /></label>
          <label className="block text-xs font-medium text-niebla sm:col-span-2">Nota del chef o de la casa<textarea value={firma.nota ?? ''} maxLength={400} rows={3} onChange={(e) => cambiaFirma('nota', e.target.value)} placeholder="Cocinamos con lo que trae el mercado cada mañana…" className="mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2.5 text-sm text-tinta" /></label>
          <label className="block text-xs font-medium text-niebla">Quién la firma<input value={firma.autor ?? ''} maxLength={60} onChange={(e) => cambiaFirma('autor', e.target.value)} placeholder="Chef Marta Ruiz" className="mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2.5 text-sm text-tinta" /></label>
          <label className="block text-xs font-medium text-niebla">Adorno
            <select value={firma.adorno ?? 'rombo'} onChange={(e) => cambiaFirma('adorno', e.target.value)} className="mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2.5 text-sm text-tinta">
              {ADORNOS.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-niebla">Se ve en las cartas de autor (Alta cocina, Taberna, Urbana) al guardar.</p>
      </div>

      <div className={`${cambiado ? 'sticky bottom-20 z-10 shadow-lg lg:bottom-4' : ''} flex flex-wrap items-center gap-3 rounded-full bg-white/90 p-2 pl-5 ring-1 ring-linea backdrop-blur`}>
        <span className="flex-1 text-sm text-niebla">{aviso ? <span className={aviso.ok ? 'text-exito' : 'text-red-600'}>{aviso.texto}</span> : cambiado ? 'Tienes cambios sin guardar.' : 'Así se ve tu carta ahora.'}</span>
        {cambiado && <button type="button" onClick={() => { setComp(base.comp); setTema(base.tema); setColor(base.color); setFirma(JSON.parse(firmaBase)); avisarEstudio({ recargar: true }); }} className="rounded-full px-4 py-2.5 text-sm font-semibold text-niebla hover:text-tinta">Deshacer</button>}
        <button type="button" disabled={!cambiado || pendiente} onClick={guardar} className="rounded-full bg-vino px-6 py-3 text-sm font-bold text-white disabled:opacity-35">{pendiente ? 'Guardando…' : 'Guardar estilo'}</button>
      </div>
    </section>
  );
}
