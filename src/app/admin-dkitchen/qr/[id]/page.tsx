import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import {
  fichaCliente, historialCliente, serviciosCliente, listarEnlaces, catalogoPrecios, resumenCobro,
  usoPlanCliente, verComunicaciones, bandejaSoporte, cuentaEnSeguimiento, eventosSeguimiento,
  listarTraducciones, montajesGratis, administradores,
} from '@/lib/admin-clientes';
import { listarProyectos, nombreFase, PRODUCTOS_PROYECTO } from '@/lib/proyectos';
import { comoCliente } from '@/lib/db';
import { esPlanQr, nombrePlan, QR_MENU } from '@/lib/pricing-config';
import { obtenerCarta } from '@/lib/carta';
import GuiaZona from '@/components/admin/GuiaZona';
import MontajeGratisFicha from '@/components/admin/MontajeGratis';
import EnlaceMedida from '@/components/admin/EnlaceMedida';
import HistorialFicha from '@/components/admin/HistorialFicha';
import ComunicacionFicha from '@/components/admin/ComunicacionFicha';
import DisenoFicha from '@/components/admin/DisenoFicha';
import {
  cambiarEstadoAction, cambiarPlanAction, regalarTodoAction, cartaDemoAction, reenviarAccesoAction,
  servicioAdminAction, checklistSetupAction, conexionTpvAction, responderTicketAction,
  archivarAction, demoInternaAction, programarBajaAction, anularBajaAction, entrarSoporteAction,
  asignarComercialAction, asignarSiguientePasoAction,
} from '../actions';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
const fechaHora = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const euros = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';

const NOMBRES_USO: Record<string, string> = {
  platos: 'Platos activos', mesas: 'Mesas en el plano', camareros: 'Camareros con acceso',
  comandas_mes: 'Comandas al TPV este mes', reservas_mes: 'Reservas este mes', banners: 'Banners activos',
};

const TAB_TITULOS = [
  { id: 'resumen', nombre: 'Resumen' },
  { id: 'qr', nombre: 'Carta QR' },
  { id: 'signature', nombre: 'Signature' },
  { id: 'experience', nombre: 'Experience' },
  { id: 'cobros', nombre: 'Cobros' },
  { id: 'comunicacion', nombre: 'Comunicación' },
  { id: 'tickets', nombre: 'Tickets' },
] as const;

type TabId = (typeof TAB_TITULOS)[number]['id'];

export default async function FichaClienteQr({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ montaje?: string; tab?: string; ok?: string; e?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const jwt = await exigirAdmin();

  const [ficha, historial, servicios, enlaces, catalogo, cobro] = await Promise.all([
    fichaCliente(jwt, id),
    historialCliente(jwt, id),
    serviciosCliente(jwt, id),
    listarEnlaces(jwt, id),
    catalogoPrecios(jwt),
    resumenCobro(jwt, id),
  ]);

  const [uso, comunicaciones, tickets, equipo] = await Promise.all([
    usoPlanCliente(jwt, id).catch(() => []),
    verComunicaciones(jwt, id).catch(() => []),
    bandejaSoporte(jwt).then((l) => l.filter((t) => t.restauranteId === id)).catch(() => []),
    administradores(jwt).catch(() => []),
  ]);

  if (!ficha?.restaurante) notFound();
  const r = ficha.restaurante;

  // Proyectos asociados por email o por nombre
  const [todosProyectos, eventos, montajes] = await Promise.all([
    listarProyectos(jwt, {}).catch(() => []),
    comoCliente(jwt, async (c) => (await c.query(
      'SELECT id, slug, local_nombre, titulo, fecha, precio_centimos, aforo, vendidas, usadas, ingresos_centimos, estado, formato FROM eventos WHERE local_nombre ILIKE $1 OR slug ILIKE $2 ORDER BY fecha DESC',
      [`%${r.nombre}%`, `%${r.slug}%`]
    )).rows).catch(() => []),
    montajesGratis(jwt).catch(() => null),
  ]);

  const proyectos = ficha.email
    ? todosProyectos.filter((p) => p.email && p.email.toLowerCase() === ficha.email!.toLowerCase())
    : [];
  const proyectosSig = proyectos.filter((p) => p.producto === 'signature');
  const proyectosExp = proyectos.filter((p) => p.producto === 'experience');

  const cartaDiseno = await obtenerCarta(r.slug).catch(() => null);
  const fotosCarta = cartaDiseno
    ? [...cartaDiseno.secciones.flatMap((x) => x.platos), ...cartaDiseno.sueltos]
        .map((p) => p.fotoUrl)
        .filter((u): u is string => !!u)
        .slice(0, 3)
    : [];

  const total30 = ficha.escaneos_30d.reduce((s, d) => s + d.n, 0);
  const abiertosTk = tickets.filter((t) => t.estado === 'abierto').length;

  const tabActiva: TabId = (TAB_TITULOS.some((t) => t.id === sp.tab) ? sp.tab : 'resumen') as TabId;

  const pago =
    r.demo_interna ? 'Demo interna (no paga)'
    : r.estado_acceso === 'suspendido' ? 'De baja'
    : cobro?.prueba_hasta && r.estado_acceso === 'activo' ? `Prueba activa`
    : r.pago_fallido_desde ? 'Pago fallido'
    : r.estado_acceso === 'activo' ? 'Al día'
    : r.estado_acceso;

  return (
    <div className="px-4 py-6 text-carbon space-y-6 sm:p-6 lg:p-10">
      {/* Cabecera unificada de la ficha */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-niebla">
            <Link href="/admin-dkitchen/qr" className="hover:text-vino">← Clientes</Link>
            <span>/</span>
            <span>Ficha de local</span>
            <span className="rounded-full bg-[#EFE6D3] px-2 py-0.5 text-[10px] font-bold text-carbon">
              {esPlanQr(r.plan) ? QR_MENU.planes[r.plan].nombre : r.plan}
            </span>
          </div>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl text-carbon">
            {r.nombre}
          </h1>
          <p className="mt-1 text-xs text-niebla">
            /{r.slug} · Alta {fecha.format(new Date(r.creado_en))} · Último acceso:{' '}
            {ficha.ultimo_acceso ? fechaHora.format(new Date(ficha.ultimo_acceso)) : 'nunca'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {r.estado_acceso !== 'suspendido' && (
            <form action={entrarSoporteAction}>
              <input type="hidden" name="restauranteId" value={r.id} />
              <button
                type="submit"
                className="rounded-full bg-vino px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-hondo"
              >
                Entrar en su panel →
              </button>
            </form>
          )}
          <a
            href={`/m/${r.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-linea bg-white px-4 py-2 text-xs font-semibold text-carbon hover:bg-papel transition"
          >
            Ver carta ↗
          </a>
        </div>
      </div>

      <GuiaZona
        titulo="Ficha única de cliente"
        ancla="ficha-unica"
        que="Supervisión integral 360° del restaurante. Centraliza Carta QR, Signature, Experience, cobros de Stripe, comunicación y soporte en una sola pantalla por pestañas."
        pasos={[
          'Pestaña Resumen: consulta KPIs generales, cambia el comercial asignado o anota el siguiente paso.',
          'Pestaña Carta QR: gestiona el plan, topes de platos, comandas y pedidos físicos.',
          'Pestañas Signature y Experience: consulta las fases de app o los eventos con taquilla en tiempo real.',
          'Pestaña Cobros: emite enlaces de pago a medida con Stripe o gestiona bajas.',
        ]}
      />

      {/* Selector de pestañas de la ficha (Gran Reserva tabs) */}
      <nav
        aria-label="Pestañas de la Ficha"
        className="flex gap-1.5 overflow-x-auto border-b border-linea pb-2 [scrollbar-width:none]"
      >
        {TAB_TITULOS.map((t) => {
          const activa = tabActiva === t.id;
          const badge = t.id === 'tickets' && abiertosTk > 0 ? abiertosTk : null;
          return (
            <Link
              key={t.id}
              href={`/admin-dkitchen/qr/${id}?tab=${t.id}`}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                activa
                  ? 'bg-tinta text-white shadow-sm'
                  : 'border border-linea bg-white text-carbon hover:bg-papel'
              }`}
            >
              <span>{t.nombre}</span>
              {badge && (
                <span className="rounded-full bg-vino px-1.5 py-0.2 text-[10px] font-bold text-white leading-none">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── PESTAÑA 1: RESUMEN ────────────────────────────────────────── */}
      {tabActiva === 'resumen' && (
        <div className="space-y-6">
          {/* KPIs Principales */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-linea bg-noche p-5 text-white">
              <p className="text-xs text-white/55">Cuota mensual</p>
              <p className="mt-1 font-display text-2xl font-black tabular-nums text-oro">
                {esPlanQr(r.plan) ? `${QR_MENU.planes[r.plan].mensual} €` : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-white/45">{pago}</p>
            </div>
            <div className="rounded-2xl border border-linea bg-white p-5">
              <p className="text-xs text-niebla">Escaneos 30 días</p>
              <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">
                {total30.toLocaleString('es-ES')}
              </p>
              <p className="mt-0.5 text-[11px] text-ceniza">{ficha.llamadas_30d} llamadas camarero</p>
            </div>
            <div className="rounded-2xl border border-linea bg-white p-5">
              <p className="text-xs text-niebla">Servicios contratados</p>
              <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">
                {1 + (proyectosSig.length > 0 ? 1 : 0) + (eventos.length > 0 ? 1 : 0)}
              </p>
              <p className="mt-0.5 text-[11px] text-ceniza">
                Carta QR{proyectosSig.length > 0 ? ' · Signature' : ''}{eventos.length > 0 ? ' · Experience' : ''}
              </p>
            </div>
            <div className="rounded-2xl border border-linea bg-white p-5">
              <p className="text-xs text-niebla">Tickets de soporte</p>
              <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">{tickets.length}</p>
              <p className="mt-0.5 text-[11px] text-ceniza">{abiertosTk} pendientes de atender</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tarjeta de Datos del Local & Comercial */}
            <div className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-carbon">Datos del local y comercial</h2>
              <dl className="divide-y divide-linea text-xs">
                <div className="flex justify-between py-2">
                  <dt className="text-niebla">Contacto</dt>
                  <dd className="font-semibold text-carbon">{ficha.contacto || 'Sin contacto'}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-niebla">Correo</dt>
                  <dd className="font-semibold text-carbon">{ficha.email || '—'}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-niebla">Ciudad / Dirección</dt>
                  <dd className="font-semibold text-carbon text-right max-w-xs truncate">
                    {r.ciudad || 'España'} · {r.direccion || 'Sin dirección física'}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-niebla">Siguiente paso comercial</dt>
                  <dd className="font-semibold text-vino text-right max-w-xs truncate">
                    {r.siguiente_paso || '—'}
                  </dd>
                </div>
              </dl>

              {/* Formulario rápido para reasignar comercial */}
              <form action={asignarComercialAction} className="pt-2 border-t border-linea">
                <input type="hidden" name="restauranteId" value={r.id} />
                <label className="block text-xs font-semibold text-carbon mb-1">
                  Comercial asignado en Central:
                </label>
                <div className="flex gap-2">
                  <select
                    name="comercial"
                    defaultValue={r.comercial || ''}
                    className="w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-semibold outline-none focus:border-vino"
                  >
                    <option value="">Sin comercial asignado</option>
                    {equipo.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-tinta px-4 py-2 text-xs font-bold text-white hover:bg-black"
                  >
                    Asignar
                  </button>
                </div>
              </form>

              {/* Formulario rápido de siguiente paso */}
              <form action={asignarSiguientePasoAction} className="pt-2">
                <input type="hidden" name="restauranteId" value={r.id} />
                <label className="block text-xs font-semibold text-carbon mb-1">
                  Actualizar siguiente paso:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="siguientePaso"
                    placeholder="Ej.: Llamada 5 nov para revisar carta"
                    defaultValue={r.siguiente_paso || ''}
                    className="w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs outline-none focus:border-vino"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-vino px-4 py-2 text-xs font-bold text-white hover:bg-hondo"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>

            {/* Acciones y Acceso */}
            <div className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-carbon">Acciones operativas</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <form action={entrarSoporteAction}>
                  <input type="hidden" name="restauranteId" value={r.id} />
                  <button className="w-full rounded-xl border border-linea bg-papel p-3 text-left hover:border-vino transition">
                    <span className="block text-xs font-bold text-carbon">Entrar en su panel</span>
                    <span className="text-[11px] text-niebla">Modo soporte (12 horas)</span>
                  </button>
                </form>

                <form action={reenviarAccesoAction}>
                  <input type="hidden" name="email" value={ficha.email || ''} />
                  <button className="w-full rounded-xl border border-linea bg-papel p-3 text-left hover:border-vino transition">
                    <span className="block text-xs font-bold text-carbon">Reenviar contraseña</span>
                    <span className="text-[11px] text-niebla">Enlace a su correo</span>
                  </button>
                </form>

                <form action={cartaDemoAction}>
                  <input type="hidden" name="restauranteId" value={r.id} />
                  <button className="w-full rounded-xl border border-linea bg-papel p-3 text-left hover:border-vino transition">
                    <span className="block text-xs font-bold text-carbon">Cargar carta demo</span>
                    <span className="text-[11px] text-niebla">14 platos de ejemplo</span>
                  </button>
                </form>

                <Link
                  href={`/admin-dkitchen/qr/${id}?tab=cobros#enlace`}
                  className="rounded-xl border border-linea bg-papel p-3 text-left hover:border-vino transition block"
                >
                  <span className="block text-xs font-bold text-vino">Preparar enlace de pago</span>
                  <span className="text-[11px] text-niebla">Stripe checkout a medida</span>
                </Link>
              </div>

              {/* Banner de servicios complementarios */}
              <div className="rounded-xl bg-crema p-4 border border-linea space-y-2">
                <p className="text-xs font-bold text-carbon">Servicios vinculados al titular:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-vino/15 px-3 py-1 font-semibold text-vino">
                    Carta QR: {nombrePlan(r.plan)}
                  </span>
                  {proyectosSig.length > 0 ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-800">
                      Signature activo ({proyectosSig[0].fase})
                    </span>
                  ) : (
                    <Link
                      href={`/admin-dkitchen/qr/${id}?tab=signature`}
                      className="rounded-full border border-dashed border-linea bg-white px-3 py-1 font-semibold text-niebla hover:border-vino"
                    >
                      + Añadir Signature
                    </Link>
                  )}
                  {eventos.length > 0 ? (
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 font-semibold text-blue-800">
                      Experience: {eventos.length} evento(s)
                    </span>
                  ) : (
                    <Link
                      href={`/admin-dkitchen/qr/${id}?tab=experience`}
                      className="rounded-full border border-dashed border-linea bg-white px-3 py-1 font-semibold text-niebla hover:border-vino"
                    >
                      + Añadir Experience
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PESTAÑA 2: CARTA QR ──────────────────────────────────────── */}
      {tabActiva === 'qr' && (
        <div className="space-y-6">
          {/* Selector de Plan */}
          <div className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-carbon">Plan Carta QR activo</h2>
              <span className="rounded-full bg-[#EFE6D3] px-3 py-1 text-xs font-bold text-carbon">
                Plan {nombrePlan(r.plan)}
              </span>
            </div>

            <form action={cambiarPlanAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="restauranteId" value={r.id} />
              <select
                name="plan"
                defaultValue={r.plan}
                className="rounded-xl border border-linea bg-papel px-3.5 py-2 text-xs font-semibold outline-none focus:border-vino"
              >
                {(['ampliado', 'basico', 'sala'] as const).map((p) => (
                  <option key={p} value={p}>
                    {nombrePlan(p)} · {QR_MENU.planes[p].mensual} €/mes
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-vino px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-hondo"
              >
                Cambiar plan
              </button>
            </form>
          </div>

          {/* Uso frente al Plan */}
          <section className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-carbon">
              Uso frente a los límites del plan
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uso.map((u) => {
                const pct = u.tope ? Math.min(100, Math.round((u.usados / u.tope) * 100)) : 0;
                return (
                  <li key={u.que} className="rounded-xl bg-papel p-3.5 space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold text-carbon">
                      <span>{NOMBRES_USO[u.que] ?? u.que}</span>
                      <span className="tabular-nums font-bold">{u.usados} / {u.tope}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-linea overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 85 ? 'bg-amber-600' : 'bg-vino'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Montaje gratis y puesta a punto */}
          {montajes && (
            <MontajeGratisFicha
              m={montajes}
              restaurante={id}
              volver={`/admin-dkitchen/qr/${id}?tab=qr`}
              aviso={sp.montaje}
            />
          )}

          {/* Diseño y editores */}
          <section className="rounded-2xl border border-linea bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-carbon">Ficha 360 · Diseño y editores</h2>
            <DisenoFicha restauranteId={id} cartaCliente={cartaDiseno} fotosCarta={fotosCarta} />
          </section>
        </div>
      )}

      {/* ── PESTAÑA 3: SIGNATURE ─────────────────────────────────────── */}
      {tabActiva === 'signature' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-carbon">Signature · App Propia</h2>
              <p className="text-xs text-niebla">
                Desarrollo y mantenimiento de aplicación PWA / nativa de autor.
              </p>
            </div>
            {proyectosSig.length === 0 && (
              <Link
                href={`/admin-dkitchen/qr/${id}?tab=cobros#enlace`}
                className="rounded-full bg-vino px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-hondo"
              >
                + Contratar Signature
              </Link>
            )}
          </div>

          {proyectosSig.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-linea-fuerte bg-white p-10 text-center space-y-3">
              <span className="text-2xl">📱</span>
              <h3 className="font-display text-base font-bold text-carbon">Este cliente aún no tiene Signature</h3>
              <p className="text-xs text-niebla max-w-md mx-auto">
                Ofrece una app propia para su restaurante desde 500 € Fundador o 1.650 € estándar con mantenimiento mensual.
              </p>
              <Link
                href={`/admin-dkitchen/qr/${id}?tab=cobros#enlace`}
                className="inline-block rounded-full bg-tinta px-5 py-2.5 text-xs font-bold text-white hover:bg-black"
              >
                Preparar propuesta Signature →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {proyectosSig.map((p) => (
                <div key={p.id} className="rounded-2xl border border-linea bg-white p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-display text-base font-bold text-carbon block">{p.negocio || p.nombre}</span>
                      <p className="text-xs text-niebla">Fase: <span className="font-bold text-vino">{nombreFase('signature', p.fase)}</span></p>
                    </div>
                    {p.importe_centimos ? (
                      <span className="rounded-full bg-papel px-2.5 py-1 text-xs font-bold text-carbon">
                        {euros(p.importe_centimos)}
                      </span>
                    ) : null}
                  </div>

                  {p.siguiente_paso && (
                    <div className="rounded-xl bg-papel p-3 text-xs">
                      <span className="font-bold text-carbon block">Siguiente paso:</span>
                      <span className="text-grafito">{p.siguiente_paso}</span>
                      {p.siguiente_fecha && <span className="text-niebla block mt-1 text-[11px]">Fecha: {p.siguiente_fecha}</span>}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-linea text-xs">
                    <span className="text-niebla">{p.comercial ? `Comercial: ${p.comercial}` : 'DKitchen'}</span>
                    <Link href={`/admin-dkitchen/proyectos/${p.id}`} className="font-bold text-vino hover:underline">
                      Ver proyecto completo →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PESTAÑA 4: EXPERIENCE ────────────────────────────────────── */}
      {tabActiva === 'experience' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-carbon">Experience · Eventos Gastronómicos</h2>
              <p className="text-xs text-niebla">
                Cenas clandestinas, mesa del chef, maridajes y venta de entradas.
              </p>
            </div>
            <Link
              href="/admin-dkitchen/entradas"
              className="rounded-full bg-vino px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-hondo"
            >
              + Nuevo evento Experience
            </Link>
          </div>

          {eventos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-linea-fuerte bg-white p-10 text-center space-y-3">
              <span className="text-2xl">🎟️</span>
              <h3 className="font-display text-base font-bold text-carbon">No hay eventos Experience creados</h3>
              <p className="text-xs text-niebla max-w-md mx-auto">
                Monta el primer evento llave en mano para este restaurante (299 € nuevo / 199 € con Carta QR).
              </p>
              <Link
                href="/admin-dkitchen/entradas"
                className="inline-block rounded-full bg-tinta px-5 py-2.5 text-xs font-bold text-white hover:bg-black"
              >
                Abrir asistente de eventos →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-linea bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-linea bg-papel text-left text-xs uppercase tracking-wider text-niebla">
                  <tr>
                    <th className="px-4 py-3">Evento</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Precio Entrada</th>
                    <th className="px-4 py-3 text-right">Aforo / Vendidas</th>
                    <th className="px-4 py-3 text-right">Recaudación</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Enlaces</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {eventos.map((e: any) => (
                    <tr key={e.id} className="hover:bg-papel/60 transition">
                      <td className="px-4 py-3 font-semibold text-carbon">
                        {e.titulo}
                        {e.formato && <span className="block text-[11px] text-niebla capitalize">Formato: {e.formato}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-niebla whitespace-nowrap">
                        {fecha.format(new Date(e.fecha))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {euros(e.precio_centimos)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-semibold text-carbon">{e.vendidas}</span> / {e.aforo}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-carbon">
                        {euros(Number(e.ingresos_centimos || 0))}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-800">
                          {e.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-xs space-x-2">
                        <a href={`/e/${e.slug}`} target="_blank" rel="noopener" className="text-vino hover:underline font-bold">
                          Entradas ↗
                        </a>
                        <a href={`/e/${e.slug}/puerta`} target="_blank" rel="noopener" className="text-carbon hover:underline">
                          Puerta ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PESTAÑA 5: COBROS Y ENLACES ───────────────────────────────── */}
      {tabActiva === 'cobros' && (
        <div className="space-y-6">
          <section id="enlace" className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-5">
            <h2 className="font-display text-xl font-semibold tracking-tight text-carbon">
              Enlace de pago a medida
            </h2>
            <p className="text-xs text-niebla">
              Prepara un checkout seguro de Stripe para este cliente con importes validados en servidor.
            </p>
            <EnlaceMedida
              restauranteId={id}
              planActual={r.plan}
              enlaces={enlaces}
              catalogo={catalogo}
            />
          </section>

          {/* Opciones de baja y archivo */}
          <section className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-carbon">Baja, archivo y demo</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <form action={programarBajaAction} className="rounded-xl border border-linea p-3.5 space-y-2">
                <input type="hidden" name="restauranteId" value={r.id} />
                <span className="text-xs font-bold text-carbon block">Programar baja</span>
                <span className="text-[11px] text-niebla block">Cancela la suscripción en Stripe al final del periodo</span>
                <button type="submit" className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                  Dar de baja
                </button>
              </form>

              <form action={archivarAction} className="rounded-xl border border-linea p-3.5 space-y-2">
                <input type="hidden" name="restauranteId" value={r.id} />
                <input type="hidden" name="archivar" value={r.archivado_en ? '0' : '1'} />
                <span className="text-xs font-bold text-carbon block">{r.archivado_en ? 'Desarchivar' : 'Archivar cliente'}</span>
                <span className="text-[11px] text-niebla block">Oculta el local de la lista principal</span>
                <button type="submit" className="rounded-full border border-linea px-3 py-1 text-xs font-semibold hover:bg-papel">
                  {r.archivado_en ? 'Desarchivar' : 'Archivar'}
                </button>
              </form>

              <form action={demoInternaAction} className="rounded-xl border border-linea p-3.5 space-y-2">
                <input type="hidden" name="restauranteId" value={r.id} />
                <input type="hidden" name="demo" value={r.demo_interna ? '0' : '1'} />
                <span className="text-xs font-bold text-carbon block">Demo interna</span>
                <span className="text-[11px] text-niebla block">No computa en ingresos ni en estadísticas</span>
                <button type="submit" className="rounded-full border border-linea px-3 py-1 text-xs font-semibold hover:bg-papel">
                  {r.demo_interna ? 'Quitar demo' : 'Marcar demo'}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* ── PESTAÑA 6: COMUNICACIÓN ───────────────────────────────────── */}
      {tabActiva === 'comunicacion' && (
        <section className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold tracking-tight text-carbon">
            Comunicación y Seguimiento
          </h2>
          <ComunicacionFicha restauranteId={id} comunicaciones={comunicaciones} />
        </section>
      )}

      {/* ── PESTAÑA 7: TICKETS ───────────────────────────────────────── */}
      {tabActiva === 'tickets' && (
        <section className="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-xl font-semibold tracking-tight text-carbon">
              Tickets de soporte ({tickets.length})
            </h2>
            <span className="text-xs text-niebla">{abiertosTk} abiertos</span>
          </div>

          {tickets.length === 0 ? (
            <p className="text-xs text-niebla p-8 text-center bg-papel rounded-xl">
              Este cliente no tiene tickets de soporte técnico.
            </p>
          ) : (
            <ul className="divide-y divide-linea">
              {tickets.map((t) => (
                <li key={t.id} className="py-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-carbon">{t.asunto}</span>
                      <span className="block text-[11px] text-niebla">
                        {fechaHora.format(new Date(t.creadoEn))} · {t.estado}
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      t.estado === 'abierto' ? 'bg-amber-500/15 text-amber-800' : 'bg-papel text-niebla'
                    }`}>
                      {t.estado}
                    </span>
                  </div>
                  <p className="text-xs text-carbon bg-papel p-3 rounded-xl">{t.mensaje}</p>

                  {t.respuesta && (
                    <div className="text-xs bg-crema p-3 rounded-xl border border-linea text-vino">
                      <b>Respuesta de DKitchen:</b> {t.respuesta}
                    </div>
                  )}

                  {t.estado === 'abierto' && (
                    <form action={responderTicketAction} className="pt-2 space-y-2">
                      <input type="hidden" name="ticketId" value={t.id} />
                      <textarea
                        name="respuesta"
                        required
                        placeholder="Escribe la respuesta al cliente..."
                        className="w-full rounded-xl border border-linea bg-white p-2.5 text-xs outline-none focus:border-vino"
                      />
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-niebla flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" name="cerrar" defaultChecked className="accent-vino" />
                          Marcar como resuelto al enviar
                        </label>
                        <button
                          type="submit"
                          className="rounded-full bg-vino px-4 py-1.5 text-xs font-bold text-white hover:bg-hondo"
                        >
                          Responder ticket
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
