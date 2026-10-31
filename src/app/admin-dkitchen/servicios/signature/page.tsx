import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { listarProyectos, FASES, nombreFase, type ProyectoFila } from '@/lib/proyectos';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const euros = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
const dia = (s: string) => new Date(s + (s.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' });

export default async function ServiciosSignaturePage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const jwt = await exigirAdmin();
  const [proyectos, sp] = await Promise.all([
    listarProyectos(jwt, { producto: 'signature' }),
    searchParams,
  ]);

  const fasesSignature = FASES.signature.filter(([k]) => k !== 'descartado');

  const enConstruccion = proyectos.filter((p) => p.fase === 'en_construccion' || p.fase === 'primera_version').length;
  const enContratoODatos = proyectos.filter((p) => ['solicitud', 'pagado', 'contrato_enviado', 'datos_recibidos'].includes(p.fase)).length;
  const publicadas = proyectos.filter((p) => p.fase === 'publicado' || p.fase === 'mantenimiento').length;
  const importeTotal = proyectos.reduce((s, p) => s + (p.importe_centimos || 0), 0);

  const faseFiltro = sp.fase || 'todos';
  const proyectosFiltrados = faseFiltro === 'todos'
    ? proyectos
    : faseFiltro === 'en_marcha'
    ? proyectos.filter((p) => ['en_construccion', 'primera_version'].includes(p.fase))
    : faseFiltro === 'publicadas'
    ? proyectos.filter((p) => ['publicado', 'mantenimiento'].includes(p.fase))
    : proyectos.filter((p) => p.fase === faseFiltro);

  return (
    <div className="space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Servicios · Producción</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Signature</h1>
          <p className="mt-1 text-sm text-niebla">
            Desarrollo y mantenimiento de apps a medida para restaurantes.
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
        titulo="Servicio Signature"
        ancla="servicios-signature"
        que="Área de producción para el producto Signature (apps nativas/PWA de autor). Aquí supervisas el recorrido de cada restaurante desde la recogida de carta y marca hasta la publicación y el mantenimiento mensual."
        pasos={[
          'Fases oficiales: Solicitud → Pagado → Contrato enviado → Firmado → Datos recibidos → En construcción → Primera versión → Publicado → Mantenimiento.',
          'Pulsa cualquier proyecto para abrir su ficha completa, subir archivos de marca o gestionar el contrato.',
          'Revisa el «Siguiente paso» de cada app para asegurar los plazos de entrega comprometidos.',
        ]}
      />

      {/* KPIs de Signature */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-linea bg-noche p-5 text-white">
          <p className="text-xs text-white/55">En construcción</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-oro">{enConstruccion}</p>
          <p className="mt-0.5 text-[11px] text-white/45">apps en taller técnico</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Esperando contrato / datos</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{enContratoODatos}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">en fase de onboarding</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Apps publicadas</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{publicadas}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">en producción y mantenimiento</p>
        </div>
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="text-xs text-niebla">Volumen contratado</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{euros(importeTotal)}</p>
          <p className="mt-0.5 text-[11px] text-ceniza">{proyectos.length} proyectos totales</p>
        </div>
      </div>

      {/* Filtros rápidos por fase */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          ['todos', `Todos (${proyectos.length})`],
          ['en_marcha', `En marcha (${enConstruccion})`],
          ['publicadas', `Publicadas (${publicadas})`],
          ['mantenimiento', 'Mantenimiento'],
        ].map(([k, label]) => {
          const activo = faseFiltro === k;
          return (
            <Link
              key={k}
              href={k === 'todos' ? '/admin-dkitchen/servicios/signature' : `/admin-dkitchen/servicios/signature?fase=${k}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activo ? 'bg-tinta text-white' : 'border border-linea bg-white text-carbon hover:bg-papel'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Listado de proyectos Signature */}
      {proyectosFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-linea bg-white p-12 text-center text-sm text-niebla">
          No hay proyectos Signature en esta categoría.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectosFiltrados.map((p) => {
            const paso = Math.max(0, fasesSignature.findIndex(([k]) => k === p.fase));
            const pct = p.fase === 'descartado' ? 0 : Math.round(((paso + 1) / fasesSignature.length) * 100);

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
                  {p.importe_centimos ? (
                    <span className="shrink-0 rounded-full bg-papel px-2.5 py-1 text-xs font-bold tabular-nums text-carbon">
                      {euros(p.importe_centimos)}
                    </span>
                  ) : null}
                </div>

                {/* Barra de progreso de fases Signature */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-vino">{nombreFase('signature', p.fase)}</span>
                    <span className="text-ceniza text-[11px]">{pct}%</span>
                  </div>
                  <div className="mt-1.5 flex gap-1" aria-hidden>
                    {fasesSignature.map(([k], i) => (
                      <span
                        key={k}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: i <= paso && p.fase !== 'descartado' ? '#5A0F1F' : '#E7E1D6',
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
                      <p className="mt-1 text-[11px] text-niebla">Plazo: {dia(p.siguiente_fecha)}</p>
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
                    Abrir proyecto →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
