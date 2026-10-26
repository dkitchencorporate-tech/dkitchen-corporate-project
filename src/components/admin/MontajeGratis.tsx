import Link from 'next/link';
import { ORIGENES_MONTAJE, type Montajes } from '@/lib/montajes-gratis';
import { marcarMontajeAction, quitarMontajeAction } from '@/lib/montajes-acciones';

/**
 * Montajes gratis (0104): marca en la ficha del local (Prospección) o del cliente (QR) y
 * contador «X de 20» en Inicio. Solo Central. Es la invitación de flyers, tarjetas y visitas:
 * nunca se anuncia en la web.
 */
const AVISOS: Record<string, [string, boolean]> = {
  marcado: ['Montaje gratis marcado.', true], quitado: ['Marca quitada: la plaza vuelve al cupo.', true],
  cupo: ['El cupo de montajes gratis está completo.', false], repetido: ['Este local ya tenía su montaje gratis.', false],
  permiso: ['Necesitas la verificación en dos pasos para marcarlo.', false], error: ['No se pudo guardar.', false],
};
const fecha = (s: string) => new Date(s).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' });

/** Barra del cupo: una muesca por plaza, en vino las usadas. */
export function BarraCupo({ usados, cupo }: { usados: number; cupo: number }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${usados} de ${cupo} montajes gratis usados`}>
      {Array.from({ length: cupo }, (_, i) => <span key={i} className={`h-2.5 flex-1 rounded-full ${i < usados ? 'bg-vino' : 'bg-papel ring-1 ring-inset ring-linea'}`} />)}
    </div>
  );
}

/** Bloque para la ficha de un local o de un cliente. */
export default function MontajeGratisFicha({ m, prospecto, restaurante, volver, aviso }: {
  m: Montajes | null; prospecto?: string; restaurante?: string; volver: string; aviso?: string;
}) {
  if (!m) return null;
  const marca = m.lista.find((x) => (prospecto && x.prospecto_id === prospecto) || (restaurante && x.restaurante_id === restaurante));
  const quedan = Math.max(0, m.cupo - m.usados);
  const a = aviso ? AVISOS[aviso] : undefined;
  return (
    <section id="montaje" className="scroll-mt-20 rounded-[22px] border border-linea bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">Montaje gratis</h2>
        <Link href="/admin-dkitchen/inicio#montajes" className="text-xs font-semibold tabular-nums text-niebla hover:text-vino">{m.usados} de {m.cupo} usados</Link>
      </div>
      <p className="mt-1 text-sm text-niebla">Invitación de los flyers, las tarjetas y las visitas: le montamos la carta desde su foto sin cobrarle la puesta a punto. No se anuncia en la web.</p>
      <div className="mt-4"><BarraCupo usados={m.usados} cupo={m.cupo} /></div>
      {a && <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${a[1] ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{a[0]}</p>}
      {marca ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-vino/[0.06] px-4 py-3 text-sm">
          <span><span className="font-semibold text-vino">Ya tiene su montaje gratis</span> · {ORIGENES_MONTAJE[marca.origen]} · {fecha(marca.creado_en)}{marca.nota ? <span className="mt-0.5 block text-niebla">{marca.nota}</span> : null}</span>
          <form action={quitarMontajeAction}>
            <input type="hidden" name="id" value={marca.id} /><input type="hidden" name="volver" value={volver} />
            <button className="rounded-full border border-acero px-4 py-2 text-xs font-semibold">Quitar la marca</button>
          </form>
        </div>
      ) : quedan === 0 ? (
        <p className="mt-4 text-sm font-semibold text-vino">Cupo completo: ya se han dado los {m.cupo} montajes gratis.</p>
      ) : (
        <form action={marcarMontajeAction} className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          {prospecto && <input type="hidden" name="prospecto" value={prospecto} />}
          {restaurante && <input type="hidden" name="restaurante" value={restaurante} />}
          <input type="hidden" name="volver" value={volver} />
          <label className="text-xs text-niebla">Viene de
            <select name="origen" defaultValue="flyer" className="mt-1 block w-full rounded-2xl border border-linea bg-white px-4 py-3 text-[15px] text-carbon focus:border-vino focus:outline-none">
              {Object.entries(ORIGENES_MONTAJE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-niebla">Nota (opcional)
            <input name="nota" maxLength={300} placeholder="Dónde se le dio el flyer, quién lo monta…" className="mt-1 block w-full rounded-2xl border border-linea bg-white px-4 py-3 text-[15px] text-carbon focus:border-vino focus:outline-none" />
          </label>
          <button className="rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white">Marcar · quedan {quedan}</button>
        </form>
      )}
    </section>
  );
}

/** Tarjeta de Inicio: contador y últimos montajes. */
export function MontajesInicio({ m }: { m: Montajes | null }) {
  if (!m) return null;
  const lleno = m.usados >= m.cupo;
  return (
    <section id="montajes" className={`scroll-mt-20 rounded-[22px] border bg-white p-5 ${lleno ? 'border-vino' : 'border-linea'}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Montajes gratis · flyers y visitas</p>
          <p className="mt-0.5 text-xs text-niebla">Se marcan en la ficha del local (Prospección) o del cliente.</p>
        </div>
        <p className="font-display text-4xl font-semibold tabular-nums"><span className={lleno ? 'text-vino' : ''}>{m.usados}</span><span className="text-xl text-ceniza"> / {m.cupo}</span></p>
      </div>
      <div className="mt-4"><BarraCupo usados={m.usados} cupo={m.cupo} /></div>
      {m.lista.length === 0 ? <p className="mt-4 text-sm text-ceniza">Todavía no se ha dado ninguno.</p> : (
        <ul className="mt-3 divide-y divide-linea">
          {m.lista.slice(0, 6).map((x) => (
            <li key={x.id}>
              <Link href={x.prospecto_id ? `/admin-dkitchen/prospeccion/${x.prospecto_id}#montaje` : x.restaurante_id ? `/admin-dkitchen/qr/${x.restaurante_id}#montaje` : '#montajes'} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-vino">
                <span className="truncate font-medium">{x.nombre}</span>
                <span className="shrink-0 text-xs text-niebla">{ORIGENES_MONTAJE[x.origen]} · {fecha(x.creado_en)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {m.lista.length > 6 && <p className="mt-2 text-xs text-ceniza">Y {m.lista.length - 6} más.</p>}
    </section>
  );
}
