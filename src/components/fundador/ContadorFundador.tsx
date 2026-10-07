/**
 * «Quedan X de 100» (0051). Sin estado propio: las cifras llegan de
 * dk.fundador_estado() en el servidor; sirve en la web y en Central.
 */
export default function ContadorFundador({ quedan, plazas, cierraEn, oscuro = false }: { quedan: number; plazas: number; cierraEn: string | null; oscuro?: boolean }) {
  const ocupadas = Math.max(0, plazas - quedan);
  const pct = plazas > 0 ? Math.round((ocupadas / plazas) * 100) : 0;
  const dias = cierraEn ? Math.max(0, Math.ceil((new Date(cierraEn).getTime() - Date.now()) / 86400000)) : null;
  return (
    <div className={`w-full rounded-2xl p-5 md:w-72 ${oscuro ? 'bg-white/10 text-white' : 'border border-linea bg-white text-tinta'}`} role="status" aria-live="polite">
      <p className="font-display text-4xl font-semibold tabular-nums">
        Quedan {quedan} <span className={`text-lg font-normal ${oscuro ? 'text-white/60' : 'text-niebla'}`}>de {plazas}</span>
      </p>
      <div className={`mt-3 h-2 overflow-hidden rounded-full ${oscuro ? 'bg-white/15' : 'bg-papel'}`} aria-hidden="true">
        <div className="h-full rounded-full bg-vino" style={{ width: `${pct}%` }} />
      </div>
      {dias !== null && <p className={`mt-2 text-xs ${oscuro ? 'text-white/60' : 'text-niebla'}`}>Se cierra a las {plazas} plazas o en {dias} {dias === 1 ? 'día' : 'días'}, lo que llegue antes.</p>}
    </div>
  );
}
