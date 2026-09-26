import { exigirAdmin } from '@/lib/guard-admin';
import { listarClientesQr } from '@/lib/admin-clientes';

export const dynamic = 'force-dynamic';

const PRECIO: Record<string, number> = { basico: 9, ampliado: 25 };
const fecha = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
const COLOR_ESTADO: Record<string, string> = {
  activo: 'bg-green-500/15 text-green-400',
  gracia: 'bg-amber-500/15 text-amber-400',
  suspendido: 'bg-red-500/15 text-red-400',
};

export default async function ClientesQr() {
  const jwt = await exigirAdmin();
  const clientes = await listarClientesQr(jwt);

  const activos = clientes.filter((c) => c.activo && c.estadoAcceso !== 'suspendido');
  const mrr = activos.reduce((s, c) => s + (PRECIO[c.plan] ?? 0), 0);
  const escaneosMes = clientes.reduce((s, c) => s + c.escaneosMes, 0);
  const listosParaSubir = clientes.filter((c) => c.escaneosMes > 600);
  const pendientes = clientes.reduce((s, c) => s + c.ticketsAbiertos + c.solicitudesQrPendientes, 0);

  const kpis = [
    { t: 'Clientes activos', v: activos.length },
    { t: 'Ingreso mensual (MRR)', v: `${mrr} €` },
    { t: 'Escaneos este mes', v: escaneosMes },
    { t: 'Tickets / QR físicos pendientes', v: pendientes },
  ];

  return (
    <div className="p-6 lg:p-10 text-white space-y-8">
      <div>
        <h1 className="text-2xl font-black">Clientes QR Menú</h1>
        <p className="text-sm text-white/40">Datos reales de la base. Se actualiza en cada visita.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.t} className="rounded-2xl border border-white/10 bg-[#1c140b] p-5">
            <p className="text-xs text-white/40">{k.t}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{k.v}</p>
          </div>
        ))}
      </div>

      {listosParaSubir.length > 0 && (
        <div className="rounded-2xl border border-[#D9531E]/50 bg-[#D9531E]/10 p-4 text-sm">
          <strong>Listos para subir de peldaño (&gt;600 escaneos/mes):</strong> {listosParaSubir.map((c) => c.nombre).join(', ')}
        </div>
      )}

      {clientes.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#1c140b] p-10 text-center text-white/40">Todavía no hay clientes QR.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/40">
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
            <tbody className="divide-y divide-white/5">
              {clientes.map((c) => (
                <tr key={c.restauranteId} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <a href={`/m/${c.slug}`} target="_blank" rel="noopener" className="font-semibold hover:text-[#D9531E]">
                      {c.nombre}
                    </a>
                    <p className="text-xs text-white/30">/{c.slug}{c.codigoQr ? ` · QR ${c.codigoQr}` : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{c.contacto ?? '—'}</p>
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-xs text-white/40 hover:text-white">
                        {c.email}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {c.plan} <span className="text-white/30">· {PRECIO[c.plan] ?? '?'} €</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO[c.estadoAcceso] ?? 'bg-white/10'}`}>
                      {c.estadoAcceso}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.platos}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.escaneosMes} <span className="text-white/30">/ {c.escaneosTotal}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.ticketsAbiertos + c.solicitudesQrPendientes > 0 ? (
                      <span className="text-amber-400">
                        {c.ticketsAbiertos} tickets · {c.solicitudesQrPendientes} QR
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50">{fecha.format(new Date(c.creadoEn))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
