import { CANALES, RESULTADOS, type Canal, type Resultado } from '@/lib/prospeccion-catalogo';

/**
 * 0114 · «Preparación antes de entrar» por local (spec B2): Google, reseñas, Instagram, plataformas, carta
 * actual y lo que pasó la última vez, a un toque, en la puerta. Solo enlaces y datos que ya tenemos.
 */
export default function AntesDeEntrar({ p, demo }: {
  p: {
    nombre: string; zona: string; instagram?: string | null; plataformas?: string | null; web?: string | null;
    preparacion?: string | null; notas?: string | null; canal?: Canal | null; ultimo_resultado?: Resultado | null;
  };
  demo?: string | null;
}) {
  const q = encodeURIComponent(`${p.nombre} ${p.zona}`);
  const enlaces: [string, string][] = [
    ['Google', `https://www.google.com/search?q=${q}`],
    ['Reseñas', `https://www.google.com/maps/search/?api=1&query=${q}`],
    ...(p.instagram ? [['Instagram', `https://instagram.com/${p.instagram}`] as [string, string]] : []),
    ...(p.web ? [['Su web', /^https?:/.test(p.web) ? p.web : `https://${p.web}`] as [string, string]] : []),
    ['Carta (Google)', `https://www.google.com/search?q=${encodeURIComponent(`${p.nombre} ${p.zona} carta`)}`],
    ...(demo ? [['Su demo', `/m/${demo}`] as [string, string]] : []),
  ];
  return (
    <div className="rounded-2xl bg-papel/70 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-vino">Antes de entrar</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {enlaces.map(([t, u]) => (
          <a key={t} href={u} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-carbon ring-1 ring-linea hover:text-vino">{t} ↗</a>
        ))}
      </div>
      <ul className="mt-2 space-y-0.5 text-xs text-grafito">
        {p.plataformas && <li><b>Plataformas:</b> {p.plataformas}</li>}
        {p.ultimo_resultado && <li><b>Última vez:</b> {RESULTADOS[p.ultimo_resultado]}{p.canal ? ` (${CANALES[p.canal]})` : ''}</li>}
        {p.preparacion && <li><b>Preparación:</b> {p.preparacion}</li>}
        {!p.preparacion && p.notas && <li><b>Notas:</b> {p.notas}</li>}
      </ul>
    </div>
  );
}
