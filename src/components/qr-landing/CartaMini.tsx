'use client';

/**
 * Carta real en miniatura (HTML, no vídeo) para los mockups de la web.
 * Mismos estilos que el selector del panel: estilo, fondo, letra y color.
 * `desplazar` hace que la carta suba sola como si alguien la estuviera leyendo.
 */
export type EstiloMini = { plantilla: 'clasica' | 'editorial' | 'visual' | 'express'; fondo: 'papel' | 'blanco' | 'oscuro'; letra: 'sans' | 'serif'; color: string };

const FONDOS = {
  papel: { fondo: '#F7F3EA', tinta: '#221D17', tarjeta: '#FFFFFF', suave: 'rgba(34,29,23,.55)' },
  blanco: { fondo: '#FFFFFF', tinta: '#1B1D22', tarjeta: '#F4F4F2', suave: 'rgba(27,29,34,.55)' },
  oscuro: { fondo: '#15161A', tinta: '#F3F1EC', tarjeta: '#1F2126', suave: 'rgba(243,241,236,.6)' },
};
const SECCIONES: [string, [string, string, string][]][] = [
  ['Para compartir', [['Croquetas de jamón', 'Cremosas, seis unidades', '9,50'], ['Patatas bravas', 'Brava ahumada y alioli', '6,50'], ['Tabla de quesos', 'Membrillo y nueces', '14']]],
  ['Principales', [['Arroz meloso de marisco', 'Gamba roja y mejillones', '18'], ['Presa ibérica', 'A la brasa, patata asada', '19,50'], ['Lubina a la espalda', 'Refrito de ajo y guindilla', '21']]],
  ['Postres', [['Tarta de queso', 'Horneada, centro cremoso', '6,50'], ['Coulant de chocolate', 'Con helado de vainilla', '7']]],
];

export default function CartaMini({ e, nombre = 'Casa Brasa', desplazar = false }: { e: EstiloMini; nombre?: string; desplazar?: boolean }) {
  const f = FONDOS[e.fondo];
  const serif = e.letra === 'serif' || e.plantilla === 'editorial' ? 'var(--fuente-serif-web), Georgia, serif' : 'inherit';
  return (
    <div className="h-full w-full overflow-hidden" style={{ background: f.fondo, color: f.tinta }}>
      <div className={desplazar ? 'animate-[subirCarta_16s_ease-in-out_infinite_alternate]' : ''}>
        {e.plantilla === 'visual' ? (
          <div className="relative flex h-40 items-end bg-[url('/images/demo/s1.png')] bg-cover bg-center p-4">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <p className="relative text-2xl font-bold text-white" style={{ fontFamily: serif }}>{nombre}</p>
          </div>
        ) : e.plantilla === 'express' ? (
          <div className="px-4 py-4" style={{ borderTop: `5px solid ${e.color}` }}>
            <p className="text-lg font-bold" style={{ fontFamily: serif }}>{nombre}</p>
          </div>
        ) : (
          <div className="px-4 pb-4 pt-9 text-center">
            <p className="text-[9px] uppercase tracking-[0.32em]" style={{ color: e.color }}>La carta</p>
            <p className="mt-1.5 text-[30px] font-semibold leading-none" style={{ fontFamily: serif }}>{nombre}</p>
            <div className="mx-auto mt-3 h-px w-8" style={{ background: e.color }} />
          </div>
        )}
        {SECCIONES.map(([s, platos], i) => (
          <div key={s} className="px-4 pt-5">
            <p className={e.plantilla === 'express' ? 'text-[10px] font-bold uppercase tracking-widest' : e.plantilla === 'editorial' ? 'text-center text-xl' : 'text-[15px] font-semibold'}
              style={{ fontFamily: e.plantilla === 'express' ? undefined : serif, color: e.plantilla === 'express' ? f.suave : undefined }}>
              {e.plantilla === 'editorial' && <span className="mb-1 block text-[9px] tracking-[0.3em]" style={{ color: e.color }}>{['I', 'II', 'III'][i]}</span>}
              {s}
            </p>
            <div className={`mt-2 ${e.plantilla === 'clasica' ? 'rounded-2xl px-3 py-1' : ''}`} style={e.plantilla === 'clasica' ? { background: f.tarjeta } : undefined}>
              {platos.map(([n, d, p]) => e.plantilla === 'visual' ? (
                <div key={n} className="mb-2.5 overflow-hidden rounded-xl" style={{ background: f.tarjeta }}>
                  <div className="h-16" style={{ background: `linear-gradient(135deg, ${e.color}55, ${e.color}22)` }} />
                  <div className="flex justify-between px-3 py-2 text-[12px]"><span className="font-semibold" style={{ fontFamily: serif }}>{n}</span><span className="font-bold" style={{ color: e.color }}>{p} €</span></div>
                </div>
              ) : (
                <div key={n} className="py-2">
                  <div className="flex items-baseline gap-2 text-[13px]">
                    <span className="font-semibold" style={{ fontFamily: serif }}>{n}</span>
                    <span className="flex-1 border-b border-dotted" style={{ borderColor: e.plantilla === 'editorial' ? f.suave : 'transparent' }} />
                    <span className="font-semibold tabular-nums">{p}{e.plantilla === 'editorial' ? '' : ' €'}</span>
                  </div>
                  {e.plantilla !== 'express' && <p className="text-[11px]" style={{ color: f.suave, fontStyle: e.plantilla === 'editorial' ? 'italic' : undefined, fontFamily: e.plantilla === 'editorial' ? serif : undefined }}>{d}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="px-4 pb-10 pt-6 text-[9px] uppercase tracking-[0.18em]" style={{ color: f.suave }}>Alérgenos · Gluten · Lácteos · Huevos</p>
      </div>
    </div>
  );
}
