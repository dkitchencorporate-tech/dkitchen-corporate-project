'use client';

import Image from 'next/image';
import { CATEGORIES_SUSHI, DEMO_MENU_SUSHI } from '@/lib/demo-data';
import type { EstiloMini } from './CartaMini';

/**
 * Carta demo con fotos reales para «Pruébalo tú». Se pinta con el estilo
 * elegido (estilo, fondo, letra, color). `completa` = versión ampliada del
 * modal, con índice de secciones y todos los platos.
 */
const FONDOS = {
  papel: { fondo: '#F7F3EA', tinta: '#221D17', tarjeta: '#FFFFFF', suave: 'rgba(34,29,23,.55)', linea: 'rgba(34,29,23,.12)' },
  blanco: { fondo: '#FFFFFF', tinta: '#1B1D22', tarjeta: '#F4F4F2', suave: 'rgba(27,29,34,.55)', linea: 'rgba(27,29,34,.1)' },
  oscuro: { fondo: '#15161A', tinta: '#F3F1EC', tarjeta: '#1F2126', suave: 'rgba(243,241,236,.6)', linea: 'rgba(243,241,236,.12)' },
};
const CATS = ['s_ent_frios', 's_nigiris', 's_principales', 's_postres'];
const precio = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0 });
const ALERG: Record<string, string> = { GL: 'Gluten', CR: 'Crustáceos', HU: 'Huevos', PE: 'Pescado', SO: 'Soja', LE: 'Lácteos', SE: 'Sésamo', SU: 'Sulfitos', MO: 'Moluscos' };

export default function CartaDemo({ e, completa = false }: { e: EstiloMini; completa?: boolean }) {
  const f = FONDOS[e.fondo];
  const serif = e.letra === 'serif' || e.plantilla === 'editorial' ? 'var(--fuente-serif-web), Georgia, serif' : 'inherit';
  const secciones = CATS.map((id) => ({
    id, nombre: CATEGORIES_SUSHI.find((c) => c.id === id)?.name.es ?? '',
    platos: DEMO_MENU_SUSHI.filter((p) => p.category === id).slice(0, completa ? 4 : 2),
  }));
  const tam = completa ? 'text-[17px]' : 'text-[13px]';

  return (
    <div style={{ background: f.fondo, color: f.tinta }} className="min-h-full">
      {e.plantilla === 'editorial' ? (
        <header className={`text-center ${completa ? 'px-6 pb-8 pt-14' : 'px-4 pb-4 pt-9'}`}>
          <p className="text-[9px] uppercase tracking-[0.32em]" style={{ color: e.color }}>La carta</p>
          <p className={`mt-2 font-semibold leading-none ${completa ? 'text-5xl' : 'text-[30px]'}`} style={{ fontFamily: serif }}>Kaiseki</p>
          <p className={`mt-2 italic ${completa ? 'text-lg' : 'text-xs'}`} style={{ fontFamily: serif, color: f.suave }}>Cocina japonesa de mercado</p>
          <div className="mx-auto mt-4 h-px w-10" style={{ background: e.color }} />
        </header>
      ) : e.plantilla === 'express' ? (
        <header className="px-4 py-4" style={{ borderTop: `5px solid ${e.color}` }}>
          <p className={`font-bold ${completa ? 'text-2xl' : 'text-lg'}`} style={{ fontFamily: serif }}>Kaiseki</p>
        </header>
      ) : (
        <header className={`relative ${completa ? 'h-56' : 'h-36'}`}>
          <Image src="/images/demo/s17.png" alt="" fill sizes="(max-width: 768px) 100vw, 480px" className="object-cover" priority={completa} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className={`font-bold ${completa ? 'text-4xl' : 'text-2xl'}`} style={{ fontFamily: serif }}>Kaiseki</p>
            <p className="text-xs text-white/75">Cocina japonesa de mercado</p>
          </div>
        </header>
      )}

      {completa && (
        <nav className="sticky top-0 z-10 flex gap-5 overflow-x-auto border-y px-5 py-3 text-[11px] uppercase tracking-[0.18em] backdrop-blur" style={{ borderColor: f.linea, background: `${f.fondo}ee` }}>
          {secciones.map((s) => <a key={s.id} href={`#demo-${s.id}`} className="shrink-0" style={{ color: f.suave }}>{s.nombre}</a>)}
        </nav>
      )}

      {secciones.map((s, i) => {
        const destacado = s.platos[0];
        return (
          <section key={s.id} id={completa ? `demo-${s.id}` : undefined} className={`scroll-mt-14 ${completa ? 'px-5 pt-10' : 'px-4 pt-6'}`}>
            <h3 className={e.plantilla === 'express' ? 'text-[10px] font-bold uppercase tracking-widest' : e.plantilla === 'editorial' ? `text-center ${completa ? 'text-3xl' : 'text-xl'}` : `font-semibold ${completa ? 'text-2xl' : 'text-[15px]'}`}
              style={{ fontFamily: e.plantilla === 'express' ? undefined : serif, color: e.plantilla === 'express' ? f.suave : undefined }}>
              {e.plantilla === 'editorial' && <span className="mb-1 block text-[9px] tracking-[0.3em]" style={{ color: e.color }}>{['I', 'II', 'III', 'IV'][i]}</span>}
              {s.nombre}
            </h3>

            {e.plantilla === 'editorial' && completa && destacado && (
              <div className="relative mt-5 aspect-[3/2] overflow-hidden rounded-sm">
                <Image src={destacado.image} alt={destacado.name.es} fill sizes="480px" className="object-cover" />
              </div>
            )}

            {e.plantilla === 'visual' ? (
              <div className={`mt-3 grid gap-3 ${completa ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {s.platos.map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-2xl" style={{ background: f.tarjeta }}>
                    <div className={`relative ${completa ? 'aspect-[4/3]' : 'aspect-square'}`}><Image src={p.image} alt={p.name.es} fill sizes={completa ? '480px' : '160px'} className="object-cover" /></div>
                    <div className="p-3">
                      <div className={`flex items-baseline justify-between gap-2 ${tam}`}><span className="font-semibold leading-tight" style={{ fontFamily: serif }}>{p.name.es}</span><span className="shrink-0 font-bold" style={{ color: e.color }}>{precio(p.price)} €</span></div>
                      {completa && <p className="mt-1 text-sm" style={{ color: f.suave }}>{p.description.es}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`mt-3 ${e.plantilla === 'clasica' ? 'rounded-2xl px-3' : ''}`} style={e.plantilla === 'clasica' ? { background: f.tarjeta } : undefined}>
                {s.platos.map((p, k) => (
                  <div key={p.id} className={`flex gap-3 py-3 ${e.plantilla === 'clasica' && k ? 'border-t' : ''}`} style={{ borderColor: f.linea }}>
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-baseline gap-2 ${tam}`}>
                        <span className="font-semibold" style={{ fontFamily: serif }}>{p.name.es}</span>
                        <span className="flex-1 border-b border-dotted" style={{ borderColor: e.plantilla === 'editorial' ? f.suave : 'transparent' }} />
                        {e.plantilla !== 'clasica' && <span className="shrink-0 font-semibold tabular-nums">{precio(p.price)}</span>}
                      </div>
                      {e.plantilla !== 'express' && <p className={`mt-0.5 line-clamp-2 ${completa ? 'text-sm' : 'text-[11px]'}`} style={{ color: f.suave, fontStyle: e.plantilla === 'editorial' ? 'italic' : undefined, fontFamily: e.plantilla === 'editorial' ? serif : undefined }}>{p.description.es}</p>}
                      {completa && p.allergens.length > 0 && <p className="mt-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: f.suave }}>{p.allergens.map((a) => ALERG[a] ?? a).join(' · ')}</p>}
                      {e.plantilla === 'clasica' && <p className={`mt-1 font-semibold ${tam}`}>{precio(p.price)} €</p>}
                    </div>
                    {e.plantilla === 'clasica' && (
                      <div className={`relative shrink-0 overflow-hidden rounded-xl ${completa ? 'h-20 w-20' : 'h-12 w-12'}`}><Image src={p.image} alt="" fill sizes="80px" className="object-cover" /></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <p className={`uppercase tracking-[0.18em] ${completa ? 'px-5 pb-32 pt-10 text-[10px]' : 'px-4 pb-10 pt-6 text-[9px]'}`} style={{ color: f.suave }}>
        Alérgenos según el Reglamento (UE) 1169/2011 · Pregunta a nuestro equipo
      </p>
    </div>
  );
}
