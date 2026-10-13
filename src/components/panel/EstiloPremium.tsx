'use client';

import { useState, useTransition } from 'react';
import { mensajeError } from '@/lib/mensaje-error';
import { guardarEstiloAction } from '@/app/panel/actions';
import { COLORES } from './EstiloCarta';
import { avisarEstudio } from './EstudioMarco';

/**
 * ESTILO (13/10, karc0: «diseño de autor en todo; fuera Esencial»). Todas las
 * cartas son Premium: aquí solo se elige la composición (Gran foto / Autor), el
 * tema (Noir / Crema) y el acento. Lo que se toca se prueba en el móvil en vivo
 * del Estudio antes de guardar. Se guarda en los mismos campos de siempre:
 * foto → plantilla 'premium', autor → 'clasica'; noir → fondo 'oscuro', crema → 'papel'.
 */
type Comp = 'foto' | 'autor';
type Tema = 'noir' | 'crema';

const COMPOSICIONES: { id: Comp; nombre: string; frase: string; puntos: string[] }[] = [
  { id: 'foto', nombre: 'Gran foto', frase: 'La foto vende. Brunch, hamburguesas, gastro, cocina de producto.', puntos: ['Portada a sangre', 'Foto grande en cada plato', 'Los que más salen', 'Buscador y «Sorpréndeme»'] },
  { id: 'autor', nombre: 'Autor', frase: 'Como una carta impresa de autor. Restaurante, vinos, tapas, bar.', puntos: ['Secciones con romanos', 'Filete de puntos hasta el precio', 'Una foto por sección', 'Buscador y «Sorpréndeme»'] },
];

function Miniatura({ comp, tema, color }: { comp: Comp; tema: Tema; color: string }) {
  const noir = tema === 'noir';
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

export default function EstiloPremium({ inicial }: { inicial: { plantilla: string; fondo: string; letra: string; color: string } }) {
  const compIni: Comp = inicial.plantilla === 'visual' || inicial.plantilla === 'premium' ? 'foto' : 'autor';
  const temaIni: Tema = inicial.fondo === 'papel' || inicial.fondo === 'blanco' ? 'crema' : 'noir';
  const colorIni = (inicial.color || '#B23A48').toUpperCase();
  const [comp, setComp] = useState<Comp>(compIni);
  const [tema, setTema] = useState<Tema>(temaIni);
  const [color, setColor] = useState(colorIni);
  const [base, setBase] = useState({ comp: compIni, tema: temaIni, color: colorIni });
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const cambiado = comp !== base.comp || tema !== base.tema || color !== base.color;

  const probar = (c: Comp, t: Tema) => avisarEstudio({ vista: c, tema: t });
  const elegirComp = (c: Comp) => { setComp(c); probar(c, tema); };
  const elegirTema = (t: Tema) => { setTema(t); probar(comp, t); };

  const guardar = () => {
    setAviso(null);
    iniciar(async () => {
      try {
        await guardarEstiloAction({ plantilla: comp === 'foto' ? 'premium' : 'clasica', fondo: tema === 'noir' ? 'oscuro' : 'papel', letra: inicial.letra === 'serif' ? 'serif' : 'sans', color });
        setBase({ comp, tema, color });
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
        <p className="mt-1 max-w-xl text-sm text-niebla">Elige la composición y el tema: lo ves al momento en el móvil de la derecha. Nada cambia para tus clientes hasta que guardas.</p>
      </header>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-niebla">1 · Composición</p>
        <div className="grid gap-4 md:grid-cols-2">
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

      <div className={`${cambiado ? 'sticky bottom-20 z-10 shadow-lg lg:bottom-4' : ''} flex flex-wrap items-center gap-3 rounded-full bg-white/90 p-2 pl-5 ring-1 ring-linea backdrop-blur`}>
        <span className="flex-1 text-sm text-niebla">{aviso ? <span className={aviso.ok ? 'text-exito' : 'text-red-600'}>{aviso.texto}</span> : cambiado ? 'Tienes cambios sin guardar.' : 'Así se ve tu carta ahora.'}</span>
        {cambiado && <button type="button" onClick={() => { setComp(base.comp); setTema(base.tema); setColor(base.color); avisarEstudio({ recargar: true }); }} className="rounded-full px-4 py-2.5 text-sm font-semibold text-niebla hover:text-tinta">Deshacer</button>}
        <button type="button" disabled={!cambiado || pendiente} onClick={guardar} className="rounded-full bg-vino px-6 py-3 text-sm font-bold text-white disabled:opacity-35">{pendiente ? 'Guardando…' : 'Guardar estilo'}</button>
      </div>
    </section>
  );
}
