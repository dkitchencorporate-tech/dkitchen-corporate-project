import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { NOMBRE_ALERTA, enlaceAlerta, type DatosMando } from '@/lib/mando';

export const dynamic = 'force-dynamic';

/**
 * Histórico de partes diarios (punto 8, 0056). Cada mañana a las 08:30 el cron
 * guarda el parte y lo envía por correo; aquí quedan los últimos 30 días.
 */
type Fila = { fecha: string; datos: DatosMando; enviado_en: string | null };
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';

export default async function PartesCentral() {
  const jwt = await exigirAdmin();
  const partes = await comoCliente(jwt, async (c) => (await c.query<Fila>('SELECT fecha::text AS fecha, datos, enviado_en FROM dk.admin_partes(30)')).rows).catch(() => null);
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-carbon sm:px-6 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Partes</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Partes diarios</h1>
        <p className="mt-1 text-sm text-niebla">Cada mañana a las 08:30 (07:30 en horario de invierno) se genera el parte con lo que necesita a una persona y te llega por correo. El panel en vivo está en <Link href="/admin-dkitchen/inicio" className="text-vino underline">Inicio</Link>.</p>
      </div>
      {partes === null ? <p className={`${tarjeta} text-sm font-semibold text-vino`}>No se pudieron leer los partes.</p>
        : partes.length === 0 ? <p className={`${tarjeta} text-sm text-ceniza`}>Todavía no hay partes. El primero sale mañana por la mañana.</p>
        : (
          <ul className="space-y-3">
            {partes.map(({ fecha, datos: d, enviado_en }, i) => (
              <li key={fecha}>
                <details className={`${tarjeta} group`} open={i === 0}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold capitalize">{new Date(fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <span className="flex items-center gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${d.urgentes ? 'bg-vino/10 text-vino' : d.necesita_humano ? 'bg-amber-500/15 text-amber-700' : 'bg-exito/15 text-exito'}`}>
                        {d.necesita_humano === 0 ? 'Todo en orden' : `${d.necesita_humano} pendiente${d.necesita_humano > 1 ? 's' : ''}${d.urgentes ? ` · ${d.urgentes} urgente${d.urgentes > 1 ? 's' : ''}` : ''}`}
                      </span>
                      <span className="text-ceniza">{enviado_en ? 'enviado' : 'sin enviar'}</span>
                    </span>
                  </summary>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
                    {([['Altas', d.altas.hoy], ['A pago', d.pasos_pago.hoy], ['Bajas', d.bajas.hoy], ['Activos', d.activos], ['Tickets', d.tickets.abiertos], ['Cobrado', `${(d.cobrado_centimos.hoy / 100).toLocaleString('es-ES')} €`]] as const).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-papel py-2"><dt className="text-ceniza">{k}</dt><dd className="mt-0.5 text-base font-semibold tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                  {d.alertas.length > 0 && (
                    <ul className="mt-4 divide-y divide-linea text-sm">
                      {d.alertas.map((a, j) => (
                        <li key={j}>
                          <Link href={enlaceAlerta(a)} className="flex items-start gap-3 py-2 hover:text-vino">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.gravedad === 'urgente' ? 'bg-vino' : 'bg-amber-500'}`} />
                            <span className="min-w-0 flex-1"><span className="text-xs text-ceniza">{NOMBRE_ALERTA[a.tipo]} · </span>{a.nombre && <span className="font-medium">{a.nombre}: </span>}<span className="text-niebla">{a.texto}</span></span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
