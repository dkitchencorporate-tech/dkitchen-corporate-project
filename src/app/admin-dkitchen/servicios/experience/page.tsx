import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { listarProyectos, FASES, nombreFase } from '@/lib/proyectos';
import { euros, leerLanding } from '@/lib/entradas';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

type EventoFila = {
  id: string;
  slug: string;
  local_nombre: string;
  titulo: string;
  fecha: string;
  precio_centimos: number;
  aforo: number;
  vendidas: number;
  usadas: number;
  ingresos_centimos: string;
  estado: string;
  stripe_cuenta: string | null;
  clave_puerta: string | null;
  formato: string | null;
};

const fechaFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
const dia = (s: string) => fechaFmt.format(new Date(s));

const ESTADO_EVENTO: Record<string, [string, string]> = {
  borrador: ['Borrador', 'bg-papel text-carbon border border-linea'],
  venta: ['En venta', 'bg-emerald-500/15 text-emerald-800 font-semibold'],
  cerrado: ['Cerrado', 'bg-papel text-niebla'],
};

export default async function ServiciosExperiencePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const jwt = await exigirAdmin();
  const [proyectos, eventos, sp] = await Promise.all([
    listarProyectos(jwt, { producto: 'experience' }),
    comoCliente(jwt, async (c) => (await c.query<EventoFila>(
      'SELECT id, slug, local_nombre, titulo, fecha, precio_centimos, aforo, vendidas, usadas, ingresos_centimos, estado, stripe_cuenta, clave_puerta, formato FROM eventos ORDER BY fecha DESC'
    )).rows).catch(() => [] as EventoFila[]),
    searchParams,
  ]);

  const fasesExperience = FASES.experience.filter(([k]) => k !== 'descartado');

  const eventosEnVenta = eventos.filter((e) => e.estado === 'venta').length;
  const vendidasTotal = eventos.reduce((s, e) => s + Number(e.vendidas), 0);
  const aforoTotal = eventos.reduce((s, e) => s + Number(e.aforo), 0);
  const recaudacionTotalCentimos = eventos.reduce((s, e) => s + Number(e.ingresos_centimos || 0), 0);
  const proyectosEnMarcha = proyectos.filter((p) => p.fase !== 'cerrado' && p.fase !== 'descartado').length;

  const tabActiva = sp.tab || 'eventos';

  return (
    <div className="space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Servicios · Producción</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Experience</h1>
          <p className="mt-1 text-sm text-niebla">
            Eventos gastronómicos llave en mano: montaje de conceptos, venta de entradas y control de puerta.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin-dkitchen/entradas"
            className="rounded-full bg-noche px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-tinta"
          >
            + Asistente de eventos
          </Link>
          <Link
            href="/admin-dkitchen/qr"
            className="rounded-full bg-vino px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-hondo"
          >
            Ver en clientes →
          </Link>
        </div>
      </div>

      <GuiaZona
        titulo="Servicio Experience"
        ancla="servicios-experience"
        que="Área de producción para el producto Experience (cenas clandestinas, mesa del chef, maridajes y talleres con venta de entradas). Supervisas el pipeline comercial y el estado de la taquilla de cada evento."
        pasos={[
          'En «Eventos y Taquilla» consultas las entradas vendidas en tiempo real y el enlace de escaneo de puerta.',
          'En «Pipeline de Eventos» monitorizas las fases de montaje con el restaurante (Concepto → Montado → Venta abierta → Celebrado).',
          'Cada restaurante cobra directamente con su propia cuenta de Stripe Connect (el dinero nunca pasa por DKitchen).',
        ]}
      />

      {/* KPIs de Experience */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-linea bg-noche p-5 text-white">
          <p className="text-xs text-white/55">Eventos en venta</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-oro">{eventosEnVenta}</p>
          <p className="mt-0.5 text-[11px] text-white/45">{eventos.length} eventos registrados</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Entradas vendidas</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">
            {vendidasTotal} <span className="text-niebla text-base">/ {aforoTotal}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ceniza">aforo global completado</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Recaudación taquilla</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{euros(recaudacionTotalCentimos)}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">cobrado por los restaurantes</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Proyectos en montaje</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{proyectosEnMarcha}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">en fase de producción</p>
        </div>
      </div>

      {/* Selector de Pestañas: Eventos / Pipeline */}
      <div className="flex gap-2 border-b border-linea pb-2">
        <Link
          href="/admin-dkitchen/servicios/experience?tab=eventos"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            tabActiva === 'eventos'
              ? 'bg-tinta text-white'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          Eventos y Taquilla ({eventos.length})
        </Link>
        <Link
          href="/admin-dkitchen/servicios/experience?tab=pipeline"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            tabActiva === 'pipeline'
              ? 'bg-tinta text-white'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          Pipeline de Proyectos ({proyectos.length})
        </Link>
      </div>

      {/* Pestaña 1: Eventos y Taquilla */}
      {tabActiva === 'eventos' && (
        <section className="space-y-3">
          {eventos.length === 0 ? (
            <p className="rounded-2xl border border-linea bg-white p-12 text-center text-sm text-niebla">
              No hay eventos Experience creados todavía. Usa el asistente para montar el primero.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-linea bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-linea bg-papel text-left text-xs uppercase tracking-wider text-niebla">
                  <tr>
                    <th className="px-4 py-3">Evento</th>
                    <th className="px-4 py-3">Local</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Precio Entrada</th>
                    <th className="px-4 py-3 text-right">Vendidas / Aforo</th>
                    <th className="px-4 py-3 text-right">Recaudación</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Enlaces</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {eventos.map((e) => {
                    const [etiqueta, estilo] = ESTADO_EVENTO[e.estado] ?? [e.estado, 'bg-papel text-carbon'];
                    return (
                      <tr key={e.id} className="hover:bg-papel/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-carbon block">{e.titulo}</span>
                          {e.formato && (
                            <span className="text-[11px] text-niebla capitalize">Formato: {e.formato}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-carbon font-medium">
                          {e.local_nombre}
                        </td>
                        <td className="px-4 py-3 text-xs text-niebla whitespace-nowrap">
                          {dia(e.fecha)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {euros(e.precio_centimos)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="font-semibold text-carbon">{e.vendidas}</span>
                          <span className="text-ceniza text-xs"> / {e.aforo}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-carbon">
                          {euros(Number(e.ingresos_centimos || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${estilo}`}>
                            {etiqueta}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-xs space-x-2">
                          <a
                            href={`/e/${e.slug}`}
                            target="_blank"
                            rel="noopener"
                            className="text-vino hover:underline font-semibold"
                          >
                            Entradas ↗
                          </a>
                          <a
                            href={`/e/${e.slug}/puerta`}
                            target="_blank"
                            rel="noopener"
                            className="text-carbon hover:underline"
                          >
                            Puerta ↗
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Pestaña 2: Pipeline de Proyectos Experience */}
      {tabActiva === 'pipeline' && (
        <section className="space-y-4">
          {proyectos.length === 0 ? (
            <p className="rounded-2xl border border-linea bg-white p-12 text-center text-sm text-niebla">
              No hay proyectos de Experience registrados en el embudo.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {proyectos.map((p) => {
                const paso = Math.max(0, fasesExperience.findIndex(([k]) => k === p.fase));
                const pct = p.fase === 'descartado' ? 0 : Math.round(((paso + 1) / fasesExperience.length) * 100);

                return (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-2xl border border-linea bg-white p-5 shadow-sm hover:border-vino/50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin-dkitchen/proyectos/${p.id}`}
                          className="font-display text-base font-bold text-carbon hover:text-vino truncate block"
                        >
                          {p.negocio || p.nombre || p.email}
                        </Link>
                        <p className="text-xs text-niebla truncate">
                          {p.nombre ? `${p.nombre} · ` : ''}{p.email}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#E3E7F1] px-2.5 py-0.5 text-xs font-semibold text-[#1F2A44]">
                        Experience
                      </span>
                    </div>

                    {/* Barra de progreso de fases Experience */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-semibold text-[#B08D57]">{nombreFase('experience', p.fase)}</span>
                        <span className="text-ceniza text-[11px]">{pct}%</span>
                      </div>
                      <div className="mt-1.5 flex gap-1" aria-hidden>
                        {fasesExperience.map(([k], i) => (
                          <span
                            key={k}
                            className="h-1.5 flex-1 rounded-full"
                            style={{
                              background: i <= paso && p.fase !== 'descartado' ? '#B08D57' : '#E7E1D6',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Siguiente paso */}
                    {p.siguiente_paso && (
                      <div className="mt-4 rounded-xl bg-papel p-3 text-xs">
                        <p className="font-semibold text-carbon">Siguiente paso:</p>
                        <p className="mt-0.5 text-grafito">{p.siguiente_paso}</p>
                        {p.siguiente_fecha && (
                          <p className="mt-1 text-[11px] text-niebla">Fecha: {dia(p.siguiente_fecha)}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-linea text-xs">
                      <span className="text-niebla">
                        {p.comercial ? `Comercial: ${p.comercial}` : 'DKitchen'}
                      </span>
                      <Link
                        href={`/admin-dkitchen/proyectos/${p.id}`}
                        className="font-semibold text-vino hover:underline"
                      >
                        Abrir ficha →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
