import { exigirAdmin } from '@/lib/guard-admin';
import { leerCalor, leerMapa } from '@/lib/mapa-web';
import GuiaZona from '@/components/admin/GuiaZona';
import MapaWeb from '@/components/admin/MapaWeb';
import CalorWeb from '@/components/admin/CalorWeb';

export const dynamic = 'force-dynamic';
// El recorrido (acción de esta página) puede tardar varios minutos.
export const maxDuration = 300;

/**
 * Mapa cartográfico de la web (0106, E1–E2, 28/10/2026): cada URL pública, sus salidas y entradas,
 * y los avisos (callejones sin salida, enlaces rotos, destinos externos) por zonas. Plan:
 * 05 REFERENCIA/PLAN_WEB_PRECIOS_RESPONSIVIDAD_MAPA_2026-10-18.md §E.
 */
export default async function Mapa({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const r = sp.r;
  const dias = [7, 30, 90].includes(Number(sp.d)) ? Number(sp.d) : 30;
  const id = r && /^[0-9a-f-]{36}$/i.test(r) ? r : null;
  const [mapa, calor] = await Promise.all([leerMapa(jwt, id), leerCalor(jwt, dias)]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Mapa</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Mapa de la web</h1>
        <p className="mt-1 text-sm text-niebla">Todas las páginas públicas por zonas, qué enlaza a qué y dónde se queda atascado un visitante.</p>
      </div>
      <GuiaZona titulo="Mapa" ancla="mapa"
        que="Una foto de la web tal como la ve un visitante: cada página, sus salidas y entradas, y los avisos."
        pasos={['Pulsa «Recorrer ahora» tras cada cambio grande de la web (tarda 1–4 minutos).', 'Pulsa una página para ver de dónde se llega y adónde se puede ir.', 'Usa «Solo callejones» y «Solo rotos» para la lista de arreglos; el objetivo es dejarlos en 0.']}
        ojo={['Callejón = página sin ningún botón o enlace propio: solo el menú y el pie.', 'Los botones que navegan solo con JavaScript no salen en el plano: el bloque Calor (abajo) sí los cuenta, con los clics reales de quien acepta las cookies.']} />
      <MapaWeb mapa={mapa} />
      <CalorWeb calor={calor} dias={dias} recorrido={id} />
    </div>
  );
}
