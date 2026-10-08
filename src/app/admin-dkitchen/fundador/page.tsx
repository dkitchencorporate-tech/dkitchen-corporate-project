import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { estadoFundador } from '@/lib/fundador';
import { FUNDADOR, nombrePlan } from '@/lib/pricing-config';
import ContadorFundador from '@/components/fundador/ContadorFundador';
import { abrirFundadorAction } from './actions';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

/**
 * Fundador en Central (0051, regla de acceso de karc0 del 07/10: solo el
 * super admin). Interruptor de apertura, contador y listado de fundadores.
 */
type Fila = { id: string; nombre: string; slug: string; plan: string; estado_acceso: string; activo: boolean; fundador_desde: string; fundador_perdido_en: string | null };
const fecha = (s: string) => new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';

export default async function FundadorCentral() {
  const jwt = await exigirAdmin();
  const [e, filas] = await Promise.all([
    estadoFundador(),
    comoCliente(jwt, async (c) => (await c.query<Fila>('SELECT * FROM dk.admin_fundadores()')).rows),
  ]);
  const vigentes = filas.filter((f) => !f.fundador_perdido_en && f.activo).length;
  const ingresoTrimestral = vigentes * FUNDADOR.trimestre;
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Fundador</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Programa Fundador</h1>
        <p className="mt-1 text-sm text-niebla">Plan Sala al 40 % ({FUNDADOR.trimestre.toLocaleString('es-ES')} € + IVA por trimestre). {FUNDADOR.plazas} plazas o {FUNDADOR.dias} días desde la apertura, lo primero.</p>
      </div>

      <GuiaZona titulo="Fundador" ancla="fundador"
        que="Los primeros locales con el plan Sala al 40 % de por vida, pagando por trimestre."
        pasos={['Mira cuántas plazas quedan y quién las tiene.', 'Si un fundador deja de pagar, pierde el precio y queda registrado.']} />

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <section className={tarjeta}>
          <p className="text-xs text-niebla">Estado</p>
          {!e ? (
            <p className="mt-2 font-semibold text-vino">No se pudo leer el estado de la base.</p>
          ) : e.abierto ? (
            <p className="mt-2 text-lg font-semibold text-green-700">Abierto desde el {fecha(e.abiertoEn!)} · cierra el {fecha(e.cierraEn!)}</p>
          ) : e.motivo === 'sin_abrir' ? (
            <>
              <p className="mt-2 text-lg font-semibold">Sin abrir</p>
              <p className="mt-1 text-sm text-niebla">Al abrirlo empiezan a contar los {FUNDADOR.dias} días, aparece en /precios y se puede pagar en /fundador. No se puede deshacer desde aquí.</p>
              <form action={abrirFundadorAction} className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmo" value="si" required className="h-4 w-4" /> Confirmo que el flyer y los términos están listos</label>
                <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Abrir Fundador</button>
              </form>
            </>
          ) : (
            <p className="mt-2 text-lg font-semibold">Cerrado por {e.motivo === 'plazas' ? 'plazas agotadas' : 'fin del plazo'}{e.abiertoEn ? ` (abierto el ${fecha(e.abiertoEn)})` : ''}</p>
          )}
          <p className="mt-4 text-sm text-niebla">Fundadores vigentes: <strong className="text-tinta">{vigentes}</strong> · cobro por trimestre: <strong className="text-tinta">{ingresoTrimestral.toLocaleString('es-ES', { maximumFractionDigits: 2 })} € + IVA</strong></p>
          <p className="mt-1 text-xs text-ceniza">Landing privada para el flyer y el socio: <Link href="/fundador" className="underline">dkitchencorporate.es/fundador</Link></p>
        </section>
        {e && <ContadorFundador quedan={e.quedan} plazas={e.plazas} cierraEn={e.abierto ? e.cierraEn : null} />}
      </div>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Fundadores ({filas.length})</p>
        {filas.length === 0 ? (
          <p className="mt-2 text-sm text-niebla">Todavía no hay ninguno.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linea text-sm">
            {filas.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span><span className="mr-2 tabular-nums text-ceniza">#{i + 1}</span><Link href={`/admin-dkitchen/qr/${f.id}`} className="font-semibold underline-offset-2 hover:underline">{f.nombre}</Link> <span className="text-niebla">· desde el {fecha(f.fundador_desde)}</span></span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${f.fundador_perdido_en || !f.activo ? 'bg-papel text-niebla' : 'bg-green-500/15 text-green-700'}`}>
                  {f.fundador_perdido_en ? `Perdido (plan ${nombrePlan(f.plan)})` : !f.activo ? 'Baja' : f.estado_acceso === 'activo' ? 'Vigente' : `Vigente · ${f.estado_acceso}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
