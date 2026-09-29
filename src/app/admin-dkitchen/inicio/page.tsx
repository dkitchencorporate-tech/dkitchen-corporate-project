import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { listarClientesQr, type ClienteQr } from '@/lib/admin-clientes';
import { comoCliente } from '@/lib/db';
import { PRODUCTOS_PAGO } from '@/lib/productos-pago';

export const dynamic = 'force-dynamic';

/**
 * Portada de Central (29/09/2026): el estado del negocio de un vistazo y la
 * lista de a quién atender hoy. Todo sale de la base en cada visita.
 * Umbrales de subida según DKITCHEN_ESTRATEGIA_PRECIOS_ESCALERA (§7).
 */
const PRECIO: Record<string, number> = { basico: 9, ampliado: 25 };
const tarjeta = 'rounded-[22px] border border-[#E6E2DC] bg-white p-5';

function Lista({ titulo, vacio, filas, accion }: { titulo: string; vacio: string; filas: { c: ClienteQr; d: string }[]; accion?: string }) {
  return (
    <section className={tarjeta}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">{titulo}</p>
        <span className="rounded-full bg-[#F3F1EE] px-2.5 py-0.5 text-xs tabular-nums text-[#6B7079]">{filas.length}</span>
      </div>
      {filas.length === 0 ? <p className="mt-4 text-sm text-[#9A9EA6]">{vacio}</p> : (
        <ul className="mt-3 divide-y divide-[#F0ECE7]">
          {filas.slice(0, 6).map(({ c, d }) => (
            <li key={c.restauranteId}>
              <Link href={`/admin-dkitchen/qr/${c.restauranteId}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-[#6E0C2B]">
                <span className="truncate font-medium">{c.nombre}</span>
                <span className="shrink-0 text-xs text-[#6B7079]">{d}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {accion && filas.length > 0 && <p className="mt-3 text-xs text-[#9A9EA6]">{accion}</p>}
    </section>
  );
}

export default async function CentralInicio() {
  const jwt = await exigirAdmin();
  const [clientes, embudo] = await Promise.all([
    listarClientesQr(jwt),
    comoCliente(jwt, async (c) => (await c.query<{ producto: string; visitas: string; pagados: string }>('SELECT producto, visitas, pagados FROM dk.admin_embudo(30)')).rows).catch(() => []),
  ]);
  const hace30 = Date.now() - 30 * 864e5;
  const activos = clientes.filter((c) => c.activo && c.estadoAcceso === 'activo');
  const mrr = activos.reduce((s, c) => s + (PRECIO[c.plan] ?? 0), 0);
  const altas = clientes.filter((c) => new Date(c.creadoEn).getTime() > hace30);
  const riesgo = clientes.filter((c) => ['gracia', 'solo_lectura', 'suspendido'].includes(c.estadoAcceso));
  const atender = clientes
    .filter((c) => c.ticketsAbiertos + c.solicitudesQrPendientes > 0)
    .map((c) => ({ c, d: [c.ticketsAbiertos && `${c.ticketsAbiertos} ticket${c.ticketsAbiertos > 1 ? 's' : ''}`, c.solicitudesQrPendientes && `${c.solicitudesQrPendientes} QR físico`].filter(Boolean).join(' · ') }));
  const signature = activos.filter((c) => c.escaneosMes >= 600).map((c) => ({ c, d: `${c.escaneosMes} escaneos/mes` }));
  const ampliado = activos.filter((c) => c.plan === 'basico' && c.escaneosMes >= 150).map((c) => ({ c, d: `${c.escaneosMes} escaneos/mes` }));
  const dormidos = activos.filter((c) => c.escaneosMes === 0 && new Date(c.creadoEn).getTime() < Date.now() - 14 * 864e5).map((c) => ({ c, d: 'sin escaneos este mes' }));
  const visitas = embudo.reduce((s, e) => s + Number(e.visitas), 0);
  const pagos = embudo.reduce((s, e) => s + Number(e.pagados), 0);
  const ingresos = embudo.reduce((s, e) => s + Number(e.pagados) * (PRODUCTOS_PAGO[e.producto]?.precio ?? 0), 0);
  const hora = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false });
  const saludo = Number(hora) < 13 ? 'Buenos días' : Number(hora) < 20 ? 'Buenas tardes' : 'Buenas noches';

  const kpis: [string, string, string][] = [
    ['Ingreso mensual recurrente', `${mrr.toLocaleString('es-ES')} €`, 'cuotas QR activas, + IVA'],
    ['Clientes activos', String(activos.length), `${altas.length} altas en 30 días`],
    ['En riesgo', String(riesgo.length), 'impago, solo lectura o suspendidos'],
    ['Por atender', String(atender.length), 'tickets y QR físicos'],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-[#1B1D22] sm:p-6 lg:p-10">
      <header>
        <p className="text-sm text-[#6B7079]">{saludo}</p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">Central</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([t, v, d], i) => (
          <div key={t} className={`${i === 0 ? 'col-span-2 bg-[#0A080C] text-white lg:col-span-1' : 'bg-white'} rounded-[22px] border border-[#E6E2DC] p-5`}>
            <p className={`text-xs ${i === 0 ? 'text-white/55' : 'text-[#6B7079]'}`}>{t}</p>
            <p className={`font-display mt-2 text-4xl font-semibold tabular-nums ${i === 0 ? 'text-[#D9B25C]' : i === 2 && riesgo.length ? 'text-[#6E0C2B]' : ''}`}>{v}</p>
            <p className={`mt-1 text-xs ${i === 0 ? 'text-white/45' : 'text-[#9A9EA6]'}`}>{d}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2"><Lista titulo="Atender hoy" vacio="Nada pendiente. Todo al día." filas={atender} accion="Abre la ficha para responder o gestionar el envío." /></div>
        <Link href="/admin-dkitchen/embudo" className={`${tarjeta} block transition-colors hover:border-[#D6D1CA]`}>
          <p className="text-sm font-semibold">Pagos directos · 30 días</p>
          <p className="font-display mt-3 text-4xl font-semibold tabular-nums">{pagos}</p>
          <p className="mt-1 text-xs text-[#6B7079]">pagos de {visitas} visitas · {ingresos.toLocaleString('es-ES')} € + IVA</p>
          <p className="mt-5 text-xs text-[#6E0C2B] underline">Ver embudo</p>
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Lista titulo="Listos para Signature" vacio="Ningún cliente supera 600 escaneos al mes todavía." filas={signature} accion="Umbral de la escalera: 600 escaneos/mes sostenidos." />
        <Lista titulo="Listos para Ampliado" vacio="Ningún Básico supera 150 escaneos al mes." filas={ampliado} />
        <Lista titulo="Sin actividad" vacio="Todos los clientes tienen escaneos este mes." filas={dormidos} accion="Clientes con más de 14 días y 0 escaneos: escríbeles antes de que se vayan." />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Lista titulo="En riesgo de baja" vacio="Ningún cliente en impago ni suspendido." filas={riesgo.map((c) => ({ c, d: c.estadoAcceso.replace('_', ' ') }))} />
        <Lista titulo="Altas recientes" vacio="Sin altas en los últimos 30 días." filas={altas.map((c) => ({ c, d: new Date(c.creadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) }))} />
      </div>
    </div>
  );
}
