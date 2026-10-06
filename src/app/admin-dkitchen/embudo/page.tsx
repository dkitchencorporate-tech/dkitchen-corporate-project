import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { PRODUCTOS_PAGO } from '@/lib/productos-pago';

export const dynamic = 'force-dynamic';

/**
 * Embudo de las páginas de pago (0032): cuántos entran, cuántos empiezan a
 * rellenar, cuántos van a pagar, cuántos se van y cuántos pagan, por producto.
 */
type Fila = { producto: string; visitas: string; interes: string; checkout: string; salidas: string; pagados: string; segundos_medios: number };
type Dia = { dia: string; visitas: string; pagados: string };
const RANGOS = [7, 30, 90];
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default async function Embudo({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const jwt = await exigirAdmin();
  const dias = RANGOS.includes(Number((await searchParams).dias)) ? Number((await searchParams).dias) : 30;
  const { filas, diario } = await comoCliente(jwt, async (c) => ({
    filas: (await c.query<Fila>('SELECT * FROM dk.admin_embudo($1)', [dias])).rows,
    diario: (await c.query<Dia>('SELECT * FROM dk.admin_embudo_diario($1)', [Math.min(dias, 90)])).rows,
  }));
  const datos = Object.values(PRODUCTOS_PAGO).map((p) => {
    const f = filas.find((x) => x.producto === p.id);
    const n = (k: keyof Fila) => Number(f?.[k] ?? 0);
    return { p, visitas: n('visitas'), interes: n('interes'), checkout: n('checkout'), salidas: n('salidas'), pagados: n('pagados'), seg: f?.segundos_medios ?? 0 };
  });
  const tot = datos.reduce((a, d) => ({ visitas: a.visitas + d.visitas, checkout: a.checkout + d.checkout, pagados: a.pagados + d.pagados, ingresos: a.ingresos + d.pagados * d.p.precio }), { visitas: 0, checkout: 0, pagados: 0, ingresos: 0 });
  const maxDia = Math.max(1, ...diario.map((d) => Number(d.visitas)));

  return (
    <div className="space-y-8 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Embudo de pago</h1>
          <p className="text-sm text-niebla">Páginas /pagar: quién entra, quién se va y quién paga. Anónimo, datos reales.</p>
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-linea-calida">
          {RANGOS.map((r) => <Link key={r} href={`?dias=${r}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${r === dias ? 'bg-tinta text-white' : 'text-niebla'}`}>{r} días</Link>)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['Visitas a páginas de pago', tot.visitas], ['Fueron a pagar', tot.checkout], ['Pagos confirmados', tot.pagados], ['Ingresos por pago directo', `${tot.ingresos.toLocaleString('es-ES')} €`]].map(([t, v]) => (
          <div key={t as string} className="rounded-2xl border border-linea-calida bg-white p-5"><p className="text-sm text-niebla">{t}</p><p className="font-display mt-2 text-4xl font-semibold tabular-nums">{v}</p></div>
        ))}
      </div>

      <div className="rounded-2xl border border-linea-calida bg-white p-5">
        <p className="text-sm text-niebla">Visitas por día · los puntos oro son pagos</p>
        <div className="mt-4 flex h-36 items-end gap-[3px]">
          {diario.map((d) => (
            <div key={d.dia} title={`${d.dia}: ${d.visitas} visitas, ${d.pagados} pagos`} className="relative flex-1">
              <div className="rounded-t bg-vino/80" style={{ height: `${Math.max(2, (Number(d.visitas) / maxDia) * 130)}px` }} />
              {Number(d.pagados) > 0 && <span className="absolute -top-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-oro" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {datos.map((d) => {
          const pasos: [string, number][] = [['Entran', d.visitas], ['Rellenan', d.interes], ['Van a pagar', d.checkout], ['Pagan', d.pagados]];
          return (
            <div key={d.p.id} className="rounded-2xl border border-linea-calida bg-white p-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-xl font-semibold">{d.p.nombre}</p>
                <a href={`/pagar/${d.p.id}`} target="_blank" className="text-xs text-niebla underline">ver página</a>
              </div>
              <p className="text-sm text-niebla">{d.p.precio} € · conversión {pct(d.pagados, d.visitas)} %</p>
              <div className="mt-5 space-y-3">
                {pasos.map(([t, v]) => (
                  <div key={t}>
                    <div className="flex justify-between text-sm"><span>{t}</span><span className="tabular-nums font-semibold">{v} <span className="font-normal text-ceniza">· {pct(v, d.visitas)} %</span></span></div>
                    <div className="mt-1 h-2 rounded-full bg-[#F1EEEA]"><div className="h-2 rounded-full bg-vino" style={{ width: `${pct(v, d.visitas)}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-linea-calida pt-4 text-sm text-niebla">Se fueron sin pagar: <strong className="text-carbon">{d.salidas}</strong>{d.seg ? ` · tras ${d.seg} s de media` : ''}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
