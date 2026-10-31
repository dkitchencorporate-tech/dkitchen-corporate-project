import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { listarClientesQr, solicitudesQrAdmin, pestanaDe, type ClienteQr, type SolicitudQrAdmin } from '@/lib/admin-clientes';
import { estadoSolicitudAction } from '@/app/admin-dkitchen/qr/actions';
import { nombrePlan } from '@/lib/pricing-config';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
const dia = (iso: string) => fecha.format(new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso));

const ESTADOS_PEDIDO: Record<string, [string, string]> = {
  solicitado: ['Solicitado', 'bg-amber-500/15 text-amber-800'],
  presupuestado: ['Presupuestado', 'bg-blue-500/15 text-blue-800'],
  pagado: ['Pagado', 'bg-emerald-500/15 text-emerald-800'],
  en_produccion: ['En producción', 'bg-vino/15 text-vino'],
  enviado: ['Enviado', 'bg-green-500/15 text-green-700'],
};

export default async function ServiciosQrPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; estado_qr?: string }>;
}) {
  const jwt = await exigirAdmin();
  const [todos, pedidos, sp] = await Promise.all([
    listarClientesQr(jwt),
    solicitudesQrAdmin(jwt).catch(() => [] as SolicitudQrAdmin[]),
    searchParams,
  ]);

  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const clientesQr = todos.filter((c) => !c.soloProyecto);

  const cartasActivas = clientesQr.filter((c) => c.activo && pestanaDe(c, hoy) === 'activos').length;
  const cartasPrueba = clientesQr.filter((c) => pestanaDe(c, hoy) === 'prueba').length;
  const pedidosPendientes = pedidos.filter((p) => p.estado === 'solicitado' || p.estado === 'en_produccion').length;
  const escaneosTotalesMes = clientesQr.reduce((s, c) => s + c.escaneosMes, 0);

  // Filtrado de cartas por plan
  const planFiltro = sp.plan || 'todos';
  const cartasFiltradas = planFiltro === 'todos'
    ? clientesQr
    : clientesQr.filter((c) => c.plan === planFiltro);

  return (
    <div className="space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Servicios · Producción</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Carta QR</h1>
          <p className="mt-1 text-sm text-niebla">
            Supervisión técnica de cartas, platos, pedidos de QR físico y estado operativo.
          </p>
        </div>
        <Link
          href="/admin-dkitchen/qr"
          className="rounded-full bg-vino px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-hondo"
        >
          Ver en lista de clientes →
        </Link>
      </div>

      <GuiaZona
        titulo="Servicio Carta QR"
        ancla="servicios-qr"
        que="Área de producción para el producto Carta QR. Aquí gestionas el avance de pedidos físicos para imprenta, supervisas el catálogo de platos de cada restaurante y revisas las cartas activas."
        pasos={[
          'Revisa en «Pedidos de QR Físico» las solicitudes pendientes de imprimir o enviar.',
          'Usa el selector de estado en cada fila para pasar pedidos a «En producción» o «Enviado».',
          'En «Cartas en Producción», pulsa el enlace al menú para comprobar la visualización real.',
          'Pulsa «Ficha» para modificar planes, diseño de autor o configurar el TPV.',
        ]}
      />

      {/* KPIs de Producción */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-linea bg-noche p-5 text-white">
          <p className="text-xs text-white/55">Cartas activas</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-oro">{cartasActivas}</p>
          <p className="mt-0.5 text-[11px] text-white/45">{cartasPrueba} en prueba gratuita</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Pedidos QR físico</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{pedidosPendientes}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">{pedidos.length} pedidos históricos</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Escaneos este mes</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{escaneosTotalesMes.toLocaleString('es-ES')}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">en todos los locales activos</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Locales con Carta QR</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{clientesQr.length}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">Carta, Local y Sala</p>
        </div>
      </div>

      {/* Bloque 1: Pedidos de QR Físico para Producción */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-carbon">
            Pedidos de QR Físico <span className="text-sm font-normal text-niebla">({pedidos.length})</span>
          </h2>
        </div>

        {pedidos.length === 0 ? (
          <p className="rounded-2xl border border-linea bg-white p-6 text-center text-sm text-niebla">
            No hay solicitudes de QR físico pendientes en este momento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-linea bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-linea bg-papel text-left text-xs uppercase tracking-wider text-niebla">
                <tr>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Soporte</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3">Dirección de Envío</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {pedidos.map((p) => {
                  const [etiqueta, estilo] = ESTADOS_PEDIDO[p.estado] ?? [p.estado, 'bg-papel text-carbon'];
                  return (
                    <tr key={p.id} className="hover:bg-papel/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-carbon">
                        {p.restaurante}
                      </td>
                      <td className="px-4 py-3 text-niebla capitalize">
                        {p.tipo.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {p.cantidad}
                      </td>
                      <td className="px-4 py-3 text-xs text-ceniza max-w-xs truncate">
                        {p.direccionEnvio || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <form action={estadoSolicitudAction} className="inline-flex items-center gap-1.5">
                          <input type="hidden" name="solicitudId" value={p.id} />
                          <select
                            name="estado"
                            defaultValue={p.estado}
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                            className={`rounded-lg border border-linea px-2 py-1 text-xs font-semibold outline-none transition focus:border-vino ${estilo}`}
                          >
                            <option value="solicitado">Solicitado</option>
                            <option value="presupuestado">Presupuestado</option>
                            <option value="pagado">Pagado</option>
                            <option value="en_produccion">En producción</option>
                            <option value="enviado">Enviado</option>
                          </select>
                        </form>
                      </td>
                      <td className="px-4 py-3 text-xs text-niebla whitespace-nowrap">
                        {dia(p.creadoEn)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bloque 2: Locales con Carta QR en Producción */}
      <section className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-carbon">
            Cartas en Servicio <span className="text-sm font-normal text-niebla">({cartasFiltradas.length})</span>
          </h2>

          <div className="flex gap-1.5 text-xs">
            {['todos', 'basico', 'ampliado', 'sala'].map((p) => {
              const activo = planFiltro === p;
              const label = p === 'todos' ? 'Todos los planes' : nombrePlan(p);
              return (
                <Link
                  key={p}
                  href={p === 'todos' ? '/admin-dkitchen/servicios/qr' : `/admin-dkitchen/servicios/qr?plan=${p}`}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    activo ? 'bg-tinta text-white' : 'border border-linea bg-white text-carbon hover:bg-papel'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-linea bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-linea bg-papel text-left text-xs uppercase tracking-wider text-niebla">
              <tr>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-right">Platos</th>
                <th className="px-4 py-3 text-right">Escaneos Mes</th>
                <th className="px-4 py-3">Situación</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {cartasFiltradas.map((c) => (
                <tr key={c.restauranteId} className="hover:bg-papel/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin-dkitchen/qr/${c.restauranteId}`} className="font-semibold text-carbon hover:text-vino">
                      {c.nombre}
                    </Link>
                    <p className="text-xs text-ceniza">
                      <a href={`/m/${c.slug}`} target="_blank" rel="noopener" className="hover:text-carbon">
                        /{c.slug} ↗
                      </a>
                      {c.codigoQr ? ` · QR ${c.codigoQr}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-[#EFE6D3] px-2.5 py-0.5 text-xs font-semibold text-carbon">
                      {nombrePlan(c.plan)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {c.platos}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-niebla">
                    <span className="font-medium text-carbon">{c.escaneosMes}</span>
                    <span className="text-ceniza text-xs"> / {c.escaneosTotal}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.pruebaHasta ? (
                      <span className="rounded-full bg-vino/10 px-2 py-0.5 text-xs font-semibold text-vino">
                        Prueba hasta {dia(c.pruebaHasta)}
                      </span>
                    ) : c.estadoAcceso === 'gracia' ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Cobro fallido
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Al día
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin-dkitchen/qr/${c.restauranteId}`}
                      className="inline-flex items-center rounded-lg border border-linea bg-white px-2.5 py-1 text-xs font-semibold text-vino hover:border-vino hover:bg-papel transition"
                    >
                      Ficha →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
