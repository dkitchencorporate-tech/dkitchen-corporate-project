import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { listarClientesQr } from '@/lib/admin-clientes';
import NuevoCliente from '@/components/admin/NuevoCliente';

export const dynamic = 'force-dynamic';

const PRECIO: Record<string, number> = { basico: 9, ampliado: 25 };
const fecha = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
const COLOR_ESTADO: Record<string, string> = {
  activo: 'bg-green-500/15 text-green-700',
  gracia: 'bg-amber-500/15 text-amber-700',
  suspendido: 'bg-red-500/15 text-red-600',
};

const FILTROS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'activo', nombre: 'Activos' },
  { id: 'gracia', nombre: 'Impago (gracia)' },
  { id: 'solo_lectura', nombre: 'Solo lectura' },
  { id: 'suspendido', nombre: 'Suspendidos' },
];

export default async function ClientesQr({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const jwt = await exigirAdmin();
  const todos = await listarClientesQr(jwt);
  const { estado } = await searchParams;
  const filtro = FILTROS.some((f) => f.id === estado) ? estado! : 'todos';
  const clientes = filtro === 'todos' ? todos : todos.filter((c) => c.estadoAcceso === filtro);

  const activos = todos.filter((c) => c.activo && c.estadoAcceso !== 'suspendido');
  const mrr = activos.reduce((s, c) => s + (PRECIO[c.plan] ?? 0), 0);
  const escaneosMes = todos.reduce((s, c) => s + c.escaneosMes, 0);
  const listosParaSubir = todos.filter((c) => c.escaneosMes > 600);
  const pendientes = todos.reduce((s, c) => s + c.ticketsAbiertos + c.solicitudesQrPendientes, 0);

  const kpis = [
    { t: 'Clientes activos', v: activos.length },
    { t: 'Ingreso mensual (MRR)', v: `${mrr} €` },
    { t: 'Escaneos este mes', v: escaneosMes },
    { t: 'Tickets / QR físicos pendientes', v: pendientes },
  ];

  return (
    <div className="px-4 py-6 sm:p-6 lg:p-10 text-[#1B1D22] space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Clientes QR Menú</h1>
          <p className="text-sm text-[#6B7079]">Datos reales de la base. Se actualiza en cada visita.</p>
        </div>
        <NuevoCliente />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.t} className="rounded-2xl border border-[#E6E6E2] bg-white p-5">
            <p className="text-xs text-[#6B7079]">{k.t}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{k.v}</p>
          </div>
        ))}
      </div>

      {listosParaSubir.length > 0 && (
        <div className="rounded-2xl border border-[#6E0C2B]/50 bg-[#6E0C2B]/10 p-4 text-sm">
          <strong>Listos para subir de peldaño (&gt;600 escaneos/mes):</strong> {listosParaSubir.map((c) => c.nombre).join(', ')}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'todos' ? '/admin-dkitchen/qr' : `/admin-dkitchen/qr?estado=${f.id}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${filtro === f.id ? 'bg-[#6E0C2B] text-white' : 'bg-[#EDEDEA] text-[#6B7079] hover:bg-[#E5E5E1]'}`}
          >
            {f.nombre} ({f.id === 'todos' ? todos.length : todos.filter((c) => c.estadoAcceso === f.id).length})
          </Link>
        ))}
        <Link href="/admin-dkitchen/soporte" className="ml-auto rounded-full bg-[#EDEDEA] px-3 py-1 text-xs font-semibold text-[#3F434B] hover:bg-[#E5E5E1]">
          Soporte y QR físico →
        </Link>
      </div>

      {clientes.length === 0 ? (
        <p className="rounded-2xl border border-[#E6E6E2] bg-white p-10 text-center text-[#6B7079]">{filtro === 'todos' ? 'Todavía no hay clientes QR.' : 'Ningún cliente en este estado.'}</p>
      ) : (
        <>
        {/* Móvil: una tarjeta por cliente (sin scroll lateral) */}
        <ul className="space-y-3 md:hidden">
          {clientes.map((c) => (
            <li key={c.restauranteId}>
              <Link href={`/admin-dkitchen/qr/${c.restauranteId}`} className="block rounded-2xl border border-[#E6E6E2] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.nombre}</p>
                    <p className="truncate text-xs text-[#6B7079]">{c.contacto ?? '—'}{c.email ? ` · ${c.email}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO[c.estadoAcceso] ?? 'bg-[#EDEDEA]'}`}>{c.estadoAcceso}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-[#F3F3F0] py-2"><dt className="text-[#6B7079]">Plan</dt><dd className="font-semibold capitalize">{c.plan}</dd></div>
                  <div className="rounded-lg bg-[#F3F3F0] py-2"><dt className="text-[#6B7079]">Escaneos mes</dt><dd className="font-semibold tabular-nums">{c.escaneosMes}</dd></div>
                  <div className="rounded-lg bg-[#F3F3F0] py-2"><dt className="text-[#6B7079]">Pendientes</dt><dd className={`font-semibold tabular-nums ${c.ticketsAbiertos + c.solicitudesQrPendientes > 0 ? 'text-amber-700' : ''}`}>{c.ticketsAbiertos + c.solicitudesQrPendientes}</dd></div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-2xl border border-[#E6E6E2] md:block">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F3F0] text-left text-xs uppercase tracking-wider text-[#6B7079]">
              <tr>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Platos</th>
                <th className="px-4 py-3 text-right">Escaneos mes / total</th>
                <th className="px-4 py-3 text-right">Pendientes</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECE8]">
              {clientes.map((c) => (
                <tr key={c.restauranteId} className="hover:bg-[#F3F3F0]">
                  <td className="px-4 py-3">
                    <Link href={`/admin-dkitchen/qr/${c.restauranteId}`} className="font-semibold hover:text-[#6E0C2B]">
                      {c.nombre}
                    </Link>
                    <p className="text-xs text-[#9A9EA6]">
                      <a href={`/m/${c.slug}`} target="_blank" rel="noopener" className="hover:text-[#1B1D22]">/{c.slug} ↗</a>
                      {c.codigoQr ? ` · QR ${c.codigoQr}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{c.contacto ?? '—'}</p>
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-xs text-[#6B7079] hover:text-[#1B1D22]">
                        {c.email}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {c.plan} <span className="text-[#9A9EA6]">· {PRECIO[c.plan] ?? '?'} €</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO[c.estadoAcceso] ?? 'bg-[#EDEDEA]'}`}>
                      {c.estadoAcceso}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.platos}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.escaneosMes} <span className="text-[#9A9EA6]">/ {c.escaneosTotal}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.ticketsAbiertos + c.solicitudesQrPendientes > 0 ? (
                      <span className="text-amber-700">
                        {c.ticketsAbiertos} tickets · {c.solicitudesQrPendientes} QR
                      </span>
                    ) : (
                      <span className="text-[#9A9EA6]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#6B7079]">{fecha.format(new Date(c.creadoEn))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
