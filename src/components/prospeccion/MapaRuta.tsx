import Link from 'next/link';

/**
 * 0114 · Mapa de la ruta del día y de la cartera (decisión 12: Prospección = mapa + tablero).
 * Mosaico estático de teselas CARTO (claras, datos de OpenStreetMap) encuadrado a los puntos, con los pines
 * de la marca encima: numerados en vino para la ruta (con su línea) o puntos del color del estado para la
 * cartera. Sin librerías ni JavaScript en el móvil: se pinta en el servidor. Navegar = «Abrir en Google Maps».
 */
export type PuntoMapa = { id: string; nombre: string; lat: number; lng: number; orden?: number; tono?: string; detalle?: string };

const T = 256, W = 720, H = 440, PAD = 46;
const proyectar = (lat: number, lng: number, z: number) => {
  const s = T * 2 ** z;
  const sen = Math.sin((lat * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * s, y: (0.5 - Math.log((1 + sen) / (1 - sen)) / (4 * Math.PI)) * s };
};

export default function MapaRuta({ puntos, base, ruta = false, etiqueta }: { puntos: PuntoMapa[]; base: string; ruta?: boolean; etiqueta: string }) {
  const ok = puntos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!ok.length) {
    return (
      <div className="flex aspect-[720/440] w-full items-center justify-center rounded-[22px] border border-dashed border-linea bg-papel/60 p-6 text-center text-sm text-niebla">
        Aún no hay locales situados en el mapa. Se sitúan solos al registrar una visita a pie (GPS del móvil) o con «Estoy aquí» en la ficha.
      </div>
    );
  }
  let z = 16;
  for (let k = 17; k >= 5; k--) {
    const ps = ok.map((p) => proyectar(p.lat, p.lng, k));
    const ancho = Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
    const alto = Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y));
    if (ancho <= W - 2 * PAD && alto <= H - 2 * PAD) { z = Math.min(k, 16); break; }
  }
  const ps = ok.map((p) => ({ ...p, ...proyectar(p.lat, p.lng, z) }));
  const cx = (Math.max(...ps.map((p) => p.x)) + Math.min(...ps.map((p) => p.x))) / 2;
  const cy = (Math.max(...ps.map((p) => p.y)) + Math.min(...ps.map((p) => p.y))) / 2;
  const ox = cx - W / 2, oy = cy - H / 2;
  const teselas: { x: number; y: number }[] = [];
  const max = 2 ** z;
  for (let tx = Math.floor(ox / T); tx <= Math.floor((ox + W) / T); tx++)
    for (let ty = Math.floor(oy / T); ty <= Math.floor((oy + H) / T); ty++)
      if (ty >= 0 && ty < max) teselas.push({ x: tx, y: ty });
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const enRuta = ruta ? [...ps].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)) : [];
  const linea = enRuta.map((p, i) => `${i ? 'L' : 'M'}${(p.x - ox).toFixed(1)} ${(p.y - oy).toFixed(1)}`).join(' ');

  return (
    <figure className="relative">
      <div className="relative aspect-[720/440] w-full overflow-hidden rounded-[22px] bg-[#EFEDE8] ring-1 ring-linea" role="img" aria-label={etiqueta}>
        {teselas.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${t.x}-${t.y}`} alt="" loading="lazy" decoding="async" draggable={false}
            src={`https://a.basemaps.cartocdn.com/light_all/${z}/${((t.x % max) + max) % max}/${t.y}@2x.png`}
            className="pointer-events-none absolute select-none [filter:saturate(.55)_sepia(.12)]"
            style={{ left: pct(t.x * T - ox, W), top: pct(t.y * T - oy, H), width: pct(T, W), height: pct(T, H) }} />
        ))}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(10,8,12,.18))]" />
        {ruta && enRuta.length > 1 && (
          <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <path d={linea} fill="none" stroke="#0A080C" strokeOpacity=".25" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={linea} fill="none" stroke="#6E0C2B" strokeWidth="3.5" strokeDasharray="2 7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="dk-ruta-linea" />
          </svg>
        )}
        {ps.map((p) => (
          <Link key={p.id} href={`${base}/${p.id}${ruta ? '#registro' : ''}`} title={`${p.nombre}${p.detalle ? ' · ' + p.detalle : ''}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none" style={{ left: pct(p.x - ox, W), top: pct(p.y - oy, H) }}>
            {ruta ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vino text-[13px] font-bold text-white shadow-[0_6px_16px_-4px_rgba(110,12,43,.7)] ring-[3px] ring-white transition duration-200 group-hover:scale-110 group-focus-visible:ring-oro">{p.orden}</span>
            ) : (
              <span className={`block h-3.5 w-3.5 rounded-full ring-2 ring-white shadow transition duration-200 group-hover:scale-150 ${p.tono ?? 'bg-vino'}`} />
            )}
            <span className="pointer-events-none absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-noche px-2.5 py-1 text-[11px] font-semibold text-white group-hover:block group-focus-visible:block">{p.nombre}</span>
          </Link>
        ))}
      </div>
      <figcaption className="mt-1.5 flex justify-between gap-2 text-[10px] text-ceniza">
        <span>{ok.length} {ok.length === 1 ? 'local' : 'locales'} en el mapa</span>
        <span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="underline">CARTO</a></span>
      </figcaption>
    </figure>
  );
}
