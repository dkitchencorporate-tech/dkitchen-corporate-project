'use client';

import { avisarEstudio } from './EstudioMarco';

/**
 * LANDING del local dentro del Estudio (13/10). Fase A: la landing /l/<slug> se
 * genera sola con Identidad + Carta y aquí se ve en vivo; el editor por bloques
 * con IA (PLAN_LANDING_LOCAL_2026-10-13, migración 0076) la sustituye después.
 * Plan Carta (9 €): solo carta QR, sin landing.
 */
export default function LandingEstudio({ slug, plan, ir }: { slug: string; plan: string; ir: (p: string) => void }) {
  if (plan === 'basico') {
    return (
      <section className="overflow-hidden rounded-[30px] bg-[#0D090F] p-8 text-white" style={{ backgroundImage: 'radial-gradient(120% 70% at 0% 0%, rgba(140,13,55,.5), transparent 60%)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">Landing del local</p>
        <h2 className="mt-2 font-display text-4xl italic text-[#F2C14E]">Tu casa, en una página</h2>
        <p className="mt-3 max-w-lg text-white/75">Portada, la historia de la casa, platos estrella, reseñas de Google y reserva en un toque. Va incluida desde el plan Local; tu plan Carta trae la carta QR.</p>
        <button type="button" onClick={() => ir('plan')} className="mt-6 rounded-full bg-[#F2C14E] px-6 py-3 text-sm font-bold text-[#0D090F]">Ver el plan Local</button>
      </section>
    );
  }
  const url = `https://dkitchencorporate.es/l/${slug}`;
  const pasos: [string, string, string][] = [
    ['Identidad', 'Nombre, logo, horario, dirección, teléfono y enlace de reseñas de Google.', 'local'],
    ['Portada', 'Tu mejor foto a pantalla completa (Estudio → Estilo → Foto de portada).', 'diseno'],
    ['Platos de la casa', 'Marca como Especial o Recomendado los que quieras enseñar (Carta → Categorías y combos).', 'estudio'],
  ];
  return (
    <section className="space-y-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-vino">Landing del local · incluida en tu plan</p>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">Tu casa, en una página</h2>
        <p className="mt-1 max-w-xl text-sm text-niebla">Se construye sola con tu Identidad y tu Carta: cuanto más completas, mejor se ve. La tienes en vivo a la derecha.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-[26px] bg-[#0D090F] p-4 pl-6 text-white">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-[#F2C14E]">{url.replace('https://', '')}</span>
        <button type="button" onClick={() => { void navigator.clipboard?.writeText(url); }} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">Copiar enlace</button>
        <button type="button" onClick={() => avisarEstudio({ ver: 'landing', recargar: true })} className="rounded-full bg-[#F2C14E] px-4 py-2 text-xs font-bold text-[#0D090F]">Ver en vivo</button>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {pasos.map(([t, d, p], i) => (
          <li key={t}>
            <button type="button" onClick={() => ir(p)} className="h-full w-full rounded-[24px] bg-white p-5 text-left ring-1 ring-linea transition hover:ring-vino">
              <span className="font-display text-3xl font-semibold tabular-nums text-vino">{String(i + 1).padStart(2, '0')}</span>
              <span className="mt-1 block font-semibold">{t}</span>
              <span className="mt-1 block text-sm text-niebla">{d}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
