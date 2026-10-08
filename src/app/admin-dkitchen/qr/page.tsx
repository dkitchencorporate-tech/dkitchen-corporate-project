import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { listarClientesQr, pestanaDe, type ClienteQr, type Pestana } from '@/lib/admin-clientes';
import NuevoCliente from '@/components/admin/NuevoCliente';
import GuiaZona from '@/components/admin/GuiaZona';
import { nombrePlan } from '@/lib/pricing-config';

export const dynamic = 'force-dynamic';

const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
const dia = (iso: string) => fecha.format(new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso));
const euros = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';

/** Pestañas de Clientes (bloque 1b, 0061). Demo y archivados no cuentan en ingresos ni en el parte. */
const PESTANAS: { id: Pestana; nombre: string; texto: string }[] = [
  { id: 'activos', nombre: 'Activos', texto: 'Clientes al día que pagan o van a pagar su cuota.' },
  { id: 'prueba', nombre: 'En prueba', texto: 'Prueba con todo incluido y fecha de fin. Aún no pagan.' },
  { id: 'riesgo', nombre: 'En riesgo', texto: 'Cobro fallido (gracia), panel en solo lectura o baja ya programada.' },
  { id: 'bajas', nombre: 'Bajas', texto: 'Suspendidos: carta fuera y panel cerrado. Se borran a los 60 días de la baja.' },
  { id: 'archivados', nombre: 'Archivados', texto: 'Fuera de la lista principal sin borrar nada (duplicados, pruebas que no siguieron…). Se pueden desarchivar.' },
  { id: 'demo', nombre: 'Demo', texto: 'Tus cuentas demo internas: todo incluido sin fecha, fuera de ingresos, del parte y de las alertas.' },
];

function Estado({ c }: { c: ClienteQr }) {
  const [t, cl] = c.bajaProgramadaEn && c.estadoAcceso !== 'suspendido' ? [`Baja el ${dia(c.bajaProgramadaEn)}`, 'bg-vino/10 text-vino']
    : c.estadoAcceso === 'gracia' ? ['Cobro fallido', 'bg-amber-500/15 text-amber-700']
    : c.estadoAcceso === 'solo_lectura' ? [c.pruebaHasta ? 'Prueba vencida' : 'Solo lectura', 'bg-amber-500/15 text-amber-700']
    : c.estadoAcceso === 'suspendido' ? [c.bajaDesde ? `De baja desde ${dia(c.bajaDesde)}` : 'Suspendido', 'bg-red-500/15 text-red-600']
    : c.demoInterna ? ['Demo interna', 'bg-papel text-niebla']
    : c.pruebaHasta ? [`Prueba hasta ${dia(c.pruebaHasta)}`, 'bg-vino/10 text-vino']
    : ['Al día', 'bg-green-500/15 text-green-700'];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cl}`}>{t}</span>;
}

export default async function ClientesQr({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const jwt = await exigirAdmin();
  const todos = await listarClientesQr(jwt);
  const { p } = await searchParams;
  const pestana: Pestana = PESTANAS.some((x) => x.id === p) ? (p as Pestana) : 'activos';
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const de = (id: Pestana) => todos.filter((c) => pestanaDe(c, hoy) === id);
  const clientes = de(pestana);

  const ingreso = todos.reduce((s, c) => s + c.cuota, 0);
  const pagan = todos.filter((c) => c.cuota > 0).length;
  const pendientes = todos.reduce((s, c) => s + c.ticketsAbiertos + c.solicitudesQrPendientes, 0);
  const kpis: [string, string, string][] = [
    ['Ingreso mensual real', euros(ingreso), `${pagan} cliente${pagan === 1 ? '' : 's'} que paga${pagan === 1 ? '' : 'n'} · sin IVA`],
    ['Activos', String(de('activos').length), `${de('prueba').length} en prueba`],
    ['En riesgo', String(de('riesgo').length), 'impago, solo lectura o baja programada'],
    ['Tickets / QR físicos', String(pendientes), 'pendientes de atender'],
  ];

  return (
    <div className="space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Clientes</h1>
          <p className="text-sm text-niebla">Carta QR · datos reales de la base, al momento.</p>
        </div>
        <NuevoCliente />
      </div>

      <GuiaZona titulo="Clientes" ancla="clientes"
        que="Todos los locales con carta QR, separados por su situación. Desde aquí entras en la ficha de cada uno para hacer cualquier gestión: cobrar, dar de baja, archivar, entrar en su panel o ver su historial."
        pasos={[
          'Elige la pestaña: Activos, En prueba, En riesgo, Bajas, Archivados o Demo (el número es cuántos hay).',
          'Pulsa el nombre del local para abrir su ficha.',
          '«Nuevo cliente» crea una cuenta a mano: con enlace de pago, con prueba con fecha, como demo interna o solo la cuenta.',
          'El «Ingreso mensual real» suma solo lo que de verdad se cobra cada mes (sin pruebas, demos, cortesías antiguas ni archivados).',
        ]}
        ojo={['Las cuentas demo y archivadas no cuentan en ingresos, ni en el parte diario, ni en las alertas de Inicio.']} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([t, v, d], i) => (
          <div key={t} className={`rounded-2xl border border-linea p-5 ${i === 0 ? 'bg-noche text-white' : 'bg-white'}`}>
            <p className={`text-xs ${i === 0 ? 'text-white/55' : 'text-niebla'}`}>{t}</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${i === 0 ? 'text-oro' : ''}`}>{v}</p>
            <p className={`mt-0.5 text-[11px] ${i === 0 ? 'text-white/45' : 'text-ceniza'}`}>{d}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Situación de los clientes" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {PESTANAS.map((x) => (
          <Link key={x.id} href={x.id === 'activos' ? '/admin-dkitchen/qr' : `/admin-dkitchen/qr?p=${x.id}`} aria-current={pestana === x.id ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${pestana === x.id ? 'bg-tinta text-white' : 'border border-linea bg-white text-grafito hover:border-tinta'}`}>
            {x.nombre} <span className={`ml-1 tabular-nums ${pestana === x.id ? 'text-white/70' : 'text-ceniza'}`}>{de(x.id).length}</span>
          </Link>
        ))}
      </nav>
      <p className="text-sm text-niebla">{PESTANAS.find((x) => x.id === pestana)!.texto}</p>

      {clientes.length === 0 ? (
        <p className="rounded-2xl border border-linea bg-white p-10 text-center text-niebla">Ningún cliente en esta pestaña.</p>
      ) : (
        <>
          {/* Móvil: una tarjeta por cliente (sin scroll lateral) */}
          <ul className="space-y-3 md:hidden">
            {clientes.map((c) => (
              <li key={c.restauranteId}>
                <Link href={`/admin-dkitchen/qr/${c.restauranteId}`} className="block rounded-2xl border border-linea bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.nombre}</p>
                      <p className="truncate text-xs text-niebla">{c.contacto ?? '—'}{c.email ? ` · ${c.email}` : ''}</p>
                    </div>
                    <Estado c={c} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-papel py-2"><dt className="text-niebla">Plan</dt><dd className="font-semibold">{nombrePlan(c.plan)}</dd></div>
                    <div className="rounded-lg bg-papel py-2"><dt className="text-niebla">Paga/mes</dt><dd className="font-semibold tabular-nums">{euros(c.cuota)}</dd></div>
                    <div className="rounded-lg bg-papel py-2"><dt className="text-niebla">Escaneos mes</dt><dd className="font-semibold tabular-nums">{c.escaneosMes}</dd></div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-linea bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-papel text-left text-xs uppercase tracking-wider text-niebla">
                <tr>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Situación</th>
                  <th className="px-4 py-3 text-right">Paga/mes</th>
                  <th className="px-4 py-3 text-right">Escaneos mes / total</th>
                  <th className="px-4 py-3 text-right">Pendientes</th>
                  <th className="px-4 py-3">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {clientes.map((c) => (
                  <tr key={c.restauranteId} className="hover:bg-papel">
                    <td className="px-4 py-3">
                      <Link href={`/admin-dkitchen/qr/${c.restauranteId}`} className="font-semibold hover:text-vino">{c.nombre}</Link>
                      <p className="text-xs text-ceniza">
                        <a href={`/m/${c.slug}`} target="_blank" rel="noopener" className="hover:text-carbon">/{c.slug} ↗</a>
                        {c.codigoQr ? ` · QR ${c.codigoQr}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{c.contacto ?? '—'}</p>
                      {c.email && <a href={`mailto:${c.email}`} className="text-xs text-niebla hover:text-carbon">{c.email}</a>}
                    </td>
                    <td className="px-4 py-3">{nombrePlan(c.plan)}</td>
                    <td className="px-4 py-3"><Estado c={c} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{euros(c.cuota)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.escaneosMes} <span className="text-ceniza">/ {c.escaneosTotal}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.ticketsAbiertos + c.solicitudesQrPendientes > 0
                        ? <span className="text-amber-700">{c.ticketsAbiertos} tickets · {c.solicitudesQrPendientes} QR</span>
                        : <span className="text-ceniza">—</span>}
                    </td>
                    <td className="px-4 py-3 text-niebla">{dia(c.creadoEn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-xs text-ceniza"><Link href="/admin-dkitchen/soporte" className="text-vino underline">Soporte y QR físico →</Link></p>
    </div>
  );
}
