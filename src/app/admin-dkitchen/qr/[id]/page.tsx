import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { fichaCliente, historialCliente, serviciosCliente, listarEnlaces, catalogoPrecios, type EntradaHistorial } from '@/lib/admin-clientes';
import EnlacesPago from '@/components/admin/EnlacesPago';
import { resumenCobro, euros, fechaLarga, diasHasta } from '@/lib/prueba';
import { obtenerCarta } from '@/lib/menu';
import { listarTraducciones } from '@/lib/idiomas';
import TraductorCarta from '@/components/admin/TraductorCarta';
import { anularEnlaceAction, regalarTodoAction, cartaDemoAction, reenviarAccesoAction, cambiarEstadoAction, cambiarPlanAction, asignarDisenoAction, servicioAdminAction, checklistSetupAction, conexionTpvAction } from '../actions';
import { QR_MENU, PLANES_QR, esPlanQr, nombrePlan } from '@/lib/pricing-config';

export const dynamic = 'force-dynamic';

const CATALOGO_SERVICIOS: [string, string][] = [
  ['setup_esencial', 'Setup Esencial'], ['setup_experto', 'Setup Experto · Carta de Autor'], ['idiomas', 'Pack de idiomas'],
  ['plano_mesas', 'Plano de mesas'], ['app_sala', 'App de sala'], ['conexion_tpv', 'Conexión TPV'], ['pack_sala', 'Pack Sala Completo'],
];
const PUNTOS_SETUP: [string, string][] = [
  ['carta', 'Carta completa cargada'], ['imagenes', 'Imágenes optimizadas'], ['banner', 'Banner de lanzamiento'], ['google', 'Google Business optimizado'],
  ['redes', 'Contenido redes 1.er mes'], ['material', 'Pegatinas / flyers enviados'], ['soporte', 'Soporte premium activo'], ['formacion', 'Formaciones realizadas'],
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fechaHora = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fecha = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const ACCION: Record<string, string> = {
  'restaurantes.update': 'Editó los datos del local',
  'menu_items.insert': 'Añadió un plato',
  'menu_items.update': 'Editó un plato',
  'menu_items.delete': 'Eliminó un plato',
  'menu_secciones.insert': 'Creó una sección',
  'menu_secciones.update': 'Renombró una sección',
  'menu_secciones.delete': 'Eliminó una sección',
  'admin.cambiar_estado': 'DKitchen cambió el estado de la cuenta',
  'admin.cambiar_plan': 'DKitchen cambió el plan',
  'admin.asignar_diseno': 'DKitchen asignó el diseño de la carta',
  'admin.servicio': 'DKitchen gestionó un servicio',
  'admin.conexion_tpv': 'DKitchen configuró la conexión TPV',
  'pago.servicio': 'Contrató un servicio (pago)',
  'admin.responder_ticket': 'DKitchen respondió un ticket',
  'admin.estado_solicitud_qr': 'DKitchen actualizó un pedido de QR físico',
  aprovisionamiento_stripe: 'Alta tras el pago',
  'admin.regalar_todo': 'DKitchen le regaló todo',
  'admin.carta_demo': 'DKitchen cargó la carta de ejemplo',
  'admin.enlace_pago': 'DKitchen preparó un enlace de pago',
  'pago.enlace_admin': 'Pagó un enlace preparado por DKitchen',
  'prueba.quedarme': 'Pulsó «Quedarme con todo» en su prueba',
  'prueba.vencida': 'Terminó su prueba sin pagar (pasa a solo lectura)',
};

function valor(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

function Cambios({ e }: { e: EntradaHistorial }) {
  const cambios = e.detalle?.cambios;
  if (!cambios || typeof cambios !== 'object') return null;
  const lineas = Object.entries(cambios);
  if (e.accion.endsWith('.update')) {
    return (
      <ul className="mt-1 space-y-0.5 text-xs text-niebla">
        {lineas.map(([k, d]) => (
          <li key={k}>
            <span className="text-grafito">{k}</span>: {valor(d?.antes)} → <span className="text-grafito">{valor(d?.despues)}</span>
          </li>
        ))}
      </ul>
    );
  }
  const nombre = (cambios as Record<string, unknown>).nombre;
  return nombre ? <p className="mt-1 text-xs text-niebla">«{valor(nombre)}»</p> : null;
}

export default async function FichaClienteQr({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const jwt = await exigirAdmin();
  const [ficha, historial, servicios, enlaces, catalogo, cobro] = await Promise.all([fichaCliente(jwt, id), historialCliente(jwt, id), serviciosCliente(jwt, id), listarEnlaces(jwt, id), catalogoPrecios(jwt), resumenCobro(jwt, id)]);
  if (!ficha?.restaurante) notFound();

  const r = ficha.restaurante;
  // Pack de idiomas: DKitchen traduce aquí la carta del cliente (0028).
  const conIdiomas = servicios.some((x) => x.servicio === 'idiomas');
  const [cartaCliente, traducciones] = conIdiomas
    ? await Promise.all([obtenerCarta(r.slug), listarTraducciones(jwt, id)])
    : [null, []];
  const maxDia = Math.max(1, ...ficha.escaneos_30d.map((d) => d.n));
  const total30 = ficha.escaneos_30d.reduce((s, d) => s + d.n, 0);
  const pago =
    cobro?.prueba_hasta && r.estado_acceso === 'activo' ? `Prueba · quedan ${Math.max(0, diasHasta(cobro.prueba_hasta))} días`
    : cobro?.prueba_hasta && r.estado_acceso === 'solo_lectura' ? 'Prueba vencida'
    : r.estado_acceso === 'activo' ? 'Al día'
    : r.pago_fallido_desde ? `Pago fallido desde ${fecha.format(new Date(r.pago_fallido_desde))}`
    : r.estado_acceso;

  return (
    <div className="px-4 py-6 sm:p-6 lg:p-10 text-carbon space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin-dkitchen/qr" className="text-xs text-niebla hover:text-carbon">← Clientes QR</Link>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{r.nombre}</h1>
          <p className="text-sm text-niebla">
            /{r.slug} · alta {fecha.format(new Date(r.creado_en))} · último acceso{' '}
            {ficha.ultimo_acceso ? fechaHora.format(new Date(ficha.ultimo_acceso)) : 'nunca'}
          </p>
        </div>
        <a href={`/m/${r.slug}`} target="_blank" rel="noopener" className="rounded-lg border border-linea-fuerte px-4 py-2 text-sm font-semibold hover:border-vino">
          Ver su carta ↗
        </a>
      </div>

      <nav aria-label="Secciones de la ficha" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {[['#acciones', 'Acciones'], ['#enlace', 'Cobrar'], ['#servicios', 'Servicios'], ['#diseno', 'Diseño'], ['#historial', 'Historial']].map(([h, t]) => (
          <a key={h} href={h} className="shrink-0 rounded-full border border-linea bg-white px-4 py-2 text-sm font-medium hover:border-tinta">{t}</a>
        ))}
      </nav>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { t: 'Plan', v: esPlanQr(r.plan) ? `${nombrePlan(r.plan)} · ${QR_MENU.planes[r.plan].mensual} € + IVA` : r.plan },
          { t: 'Pago', v: pago },
          { t: 'Escaneos 30 días', v: total30 },
          { t: 'Llamadas de mesa 30 días', v: ficha.llamadas_30d },
        ].map((k) => (
          <div key={k.t} className="rounded-2xl border border-linea bg-white p-5">
            <p className="text-xs text-niebla">{k.t}</p>
            <p className="mt-1 text-lg font-black">{k.v}</p>
          </div>
        ))}
      </div>

      {cobro && (
        <section id="cobro" className="scroll-mt-20 rounded-[22px] border border-linea bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold tracking-tight">Cobro</h2>
            <p className="text-xs text-niebla">Todos los clientes pagan el día {cobro.dia_cobro} de cada mes · precios + IVA</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-papel p-4">
              <p className="text-xs text-niebla">Valor de lo que tiene</p>
              <p className="mt-1 text-lg font-black">{euros(cobro.valor_mensual)}/mes</p>
            </div>
            <div className="rounded-2xl bg-papel p-4">
              <p className="text-xs text-niebla">Paga</p>
              <p className="mt-1 text-lg font-black">{cobro.paga_mensual ? `${euros(cobro.paga_mensual)}/mes` : '0 €'}</p>
            </div>
            <div className="rounded-2xl bg-papel p-4">
              <p className="text-xs text-niebla">{cobro.proximo_cobro ? 'Próximo cobro' : cobro.prueba_hasta ? 'Si paga hoy, primer cobro' : 'Cobro'}</p>
              <p className="mt-1 text-lg font-black">
                {cobro.proximo_cobro ? fechaLarga(cobro.proximo_cobro) : cobro.prueba_hasta ? fechaLarga(cobro.cobro_si_paga_hoy) : cobro.paga_mensual ? '—' : 'Cortesía sin fecha'}
              </p>
            </div>
          </div>
          {cobro.prueba_hasta && (
            <p className="mt-3 rounded-xl bg-vino/10 px-4 py-3 text-sm text-vino">
              Prueba con todo incluido hasta el <strong>{fechaLarga(cobro.prueba_hasta)}</strong>
              {r.estado_acceso === 'solo_lectura'
                ? ` · vencida: si paga ahora, abona la parte proporcional hasta el día ${cobro.dia_cobro}.`
                : ` · si paga antes, no paga nada hasta el ${fechaLarga(cobro.cobro_si_paga_hoy)}.`}
            </p>
          )}
          <ul className="mt-4 divide-y divide-linea text-sm">
            <li className="flex justify-between gap-3 py-2"><span>Plan {nombrePlan(cobro.plan)}{cobro.fundador ? ' · Fundador' : ''}</span><span className="text-niebla">{euros(cobro.precio_plan)}/mes</span></li>
            {cobro.items.map((i) => (
              <li key={i.servicio} className="flex justify-between gap-3 py-2">
                <span>{i.nombre} <span className="text-xs text-niebla">· {i.origen === 'pago' ? 'pagado' : i.origen === 'regalo' ? 'regalo' : i.origen === 'plan' ? 'incluido en el plan' : 'demo'}</span></span>
                <span className="shrink-0 text-niebla">{euros(i.precio)}{i.tipo === 'mensual' ? '/mes' : ' una vez'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-[22px] border border-linea bg-white p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">Escaneos de los últimos 30 días</h2>
          <div className="mt-4 flex h-32 items-end gap-1" role="img" aria-label={`${total30} escaneos en 30 días`}>
            {ficha.escaneos_30d.map((d) => (
              <div
                key={d.dia}
                title={`${d.dia}: ${d.n}`}
                className="flex-1 rounded-t bg-vino"
                style={{ height: `${Math.max(3, (d.n / maxDia) * 100)}%`, opacity: d.n ? 1 : 0.25 }}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-linea bg-white p-5 sm:p-6 space-y-3 text-sm">
          <h2 className="font-display text-xl font-semibold tracking-tight">Contacto y carta</h2>
          <p>{ficha.contacto ?? '—'}</p>
          {ficha.email && <a href={`mailto:${ficha.email}`} className="block text-vino hover:underline">{ficha.email}</a>}
          <p className="text-niebla">{r.telefono ?? 'Sin teléfono'} · {r.direccion ?? 'Sin dirección'}</p>
          <p className="text-niebla">{ficha.secciones} secciones · {ficha.platos} platos</p>
          <p className="text-niebla">QR: {ficha.codigos.join(', ') || '—'}</p>
        </section>
      </div>

      <section id="acciones" className="scroll-mt-20 rounded-[22px] border border-linea bg-white p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Acciones</h2>
        <p className="text-xs text-niebla">Cada acción queda registrada en el historial.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={regalarTodoAction} className="flex w-full flex-wrap items-center gap-2 rounded-2xl bg-papel p-3">
            <input type="hidden" name="restauranteId" value={r.id} />
            <label className="text-sm font-semibold" htmlFor="dias-prueba">Todo incluido gratis</label>
            <select id="dias-prueba" name="dias" defaultValue="15" className="rounded-lg border border-acero bg-white px-3 py-2 text-sm">
              <option value="15">15 días</option>
              <option value="30">30 días</option>
              <option value="fecha">Hasta una fecha…</option>
              <option value="sin">Sin fecha de fin (cortesía)</option>
            </select>
            <input type="date" name="hasta" aria-label="Fecha de fin de la prueba" className="rounded-lg border border-acero bg-white px-3 py-2 text-sm" />
            <button className="rounded-full bg-vino px-4 py-2 text-sm font-bold hover:bg-vino-hondo">Activar</button>
            <p className="w-full text-xs text-niebla">La fecha solo cuenta con «Hasta una fecha…». Si la prueba termina sin pago, el panel pasa a solo lectura y la carta sigue visible.</p>
          </form>
          {ficha.platos === 0 && (
            <form action={cartaDemoAction}>
              <input type="hidden" name="restauranteId" value={r.id} />
              <button className="rounded-lg bg-papel px-4 py-2 text-sm font-semibold hover:bg-linea">Cargar carta de demostración</button>
            </form>
          )}
          {ficha.email && (
            <form action={reenviarAccesoAction}>
              <input type="hidden" name="email" value={ficha.email} />
              <button className="rounded-lg bg-papel px-4 py-2 text-sm font-semibold hover:bg-linea">Reenviar enlace de acceso</button>
            </form>
          )}
          <form action={cambiarEstadoAction}>
            <input type="hidden" name="restauranteId" value={r.id} />
            <input type="hidden" name="estado" value={r.activo ? 'suspendido' : 'activo'} />
            <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${r.activo ? 'bg-red-500/15 text-red-600 hover:bg-red-500/25' : 'bg-green-500/15 text-green-700 hover:bg-green-500/25'}`}>
              {r.activo ? 'Suspender cuenta' : 'Reactivar cuenta'}
            </button>
          </form>
          {PLANES_QR.filter((p) => p !== r.plan).map((p) => (
            <form key={p} action={cambiarPlanAction}>
              <input type="hidden" name="restauranteId" value={r.id} />
              <input type="hidden" name="plan" value={p} />
              <button className="rounded-lg bg-papel px-4 py-2 text-sm font-semibold hover:bg-linea">
                Pasar a {nombrePlan(p)}
              </button>
            </form>
          ))}
          <Link href="/admin-dkitchen/soporte" className="rounded-lg bg-papel px-4 py-2 text-sm font-semibold hover:bg-linea">
            Soporte y QR físico
          </Link>
        </div>
      </section>

      <section id="enlace" className="scroll-mt-20 rounded-[22px] border border-linea bg-white p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Enlace de pago a medida</h2>
          <p className="text-xs text-niebla">Plan y/o servicios al precio que decidas. Al pagarlo se activa solo y queda en el historial.</p>
        </div>
        <EnlacesPago restauranteId={r.id} catalogo={catalogo} />
        {enlaces.length > 0 && (
          <ul className="divide-y divide-linea border-t border-linea pt-2 text-sm">
            {enlaces.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{[e.plan ? `Plan ${e.plan}` : null, ...e.servicios].filter(Boolean).join(' + ')}</p>
                  <p className="text-xs text-niebla">
                    {(e.primerCentimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    {e.mensualCentimos ? ` + ${(e.mensualCentimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/mes` : ''} · {fecha.format(new Date(e.creadoEn))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.estado === 'pagado' ? 'bg-green-500/15 text-green-700' : e.estado === 'anulado' ? 'bg-papel text-niebla' : 'bg-amber-500/15 text-amber-700'}`}>{e.estado}</span>
                  {e.estado === 'pendiente' && e.url && <a href={e.url} target="_blank" rel="noopener" className="text-xs text-niebla underline">Abrir</a>}
                  {e.estado === 'pendiente' && (
                    <form action={anularEnlaceAction}>
                      <input type="hidden" name="enlaceId" value={e.id} />
                      <input type="hidden" name="restauranteId" value={r.id} />
                      <button className="text-xs text-red-600">Anular</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="servicios" className="scroll-mt-20 rounded-[22px] border border-linea bg-white p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Servicios y módulos</h2>
          <p className="text-xs text-niebla">"Demo" activa sin cobro (para enseñar o grabar vídeos). "Regalar" = cortesía comercial. Todo queda en el historial.</p>
        </div>
        <ul className="divide-y divide-linea text-sm">
          {CATALOGO_SERVICIOS.map(([clave, nombre]) => {
            const s = servicios.find((x) => x.servicio === clave);
            const enPack = !s && ['plano_mesas', 'app_sala', 'conexion_tpv'].includes(clave) && servicios.some((x) => x.servicio === 'pack_sala' && x.estado !== 'cancelado');
            if (enPack) return (
              <li key={clave} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>{nombre}</strong><span className="ml-2 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] text-green-700">activo · incluido en Pack Sala</span></span>
              </li>
            );
            return (
              <li key={clave} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <strong>{nombre}</strong>
                  {s ? <span className="ml-2 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] text-green-700">{s.estado} · {s.origen}</span>
                     : <span className="ml-2 text-xs text-ceniza">no contratado</span>}
                </span>
                <span className="flex gap-2">
                  {(s ? ['entregado', 'cancelar'] : ['demo', 'regalar']).map((accion) => (
                    <form key={accion} action={servicioAdminAction}>
                      <input type="hidden" name="restauranteId" value={r.id} />
                      <input type="hidden" name="servicio" value={clave} />
                      <input type="hidden" name="accion" value={accion} />
                      <button className={`rounded-md px-2.5 py-1 text-xs font-semibold ${accion === 'cancelar' ? 'bg-red-500/15 text-red-600' : 'bg-papel hover:bg-linea'}`}>
                        {accion === 'entregado' ? 'Marcar entregado' : accion === 'cancelar' ? 'Cancelar' : accion === 'demo' ? 'Activar demo' : 'Regalar'}
                      </button>
                    </form>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>

        {servicios.filter((x) => x.servicio === 'setup_esencial' || x.servicio === 'setup_experto').map((s) => (
          <form key={s.servicio} action={checklistSetupAction} className="rounded-xl bg-white p-4 text-sm">
            <input type="hidden" name="restauranteId" value={r.id} />
            <input type="hidden" name="servicio" value={s.servicio} />
            <p className="mb-2 font-bold">Entrega del {s.servicio === 'setup_experto' ? 'Setup Experto' : 'Setup Esencial'}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {PUNTOS_SETUP.filter(([k]) => s.servicio === 'setup_experto' || !['redes', 'soporte'].includes(k)).map(([k, t]) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={s.checklist[k] === true} className="accent-vino" /> {t}</label>
              ))}
            </div>
            <button className="mt-3 rounded-md bg-papel px-3 py-1.5 text-xs font-bold">Guardar progreso</button>
          </form>
        ))}

        {servicios.some((x) => x.servicio === 'conexion_tpv' || x.servicio === 'pack_sala') && (
          <form action={conexionTpvAction} className="space-y-2 rounded-xl bg-white p-4 text-sm">
            <input type="hidden" name="restauranteId" value={r.id} />
            <p className="font-bold">Conexión con el TPV</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="proveedor" required placeholder="TPV (Revo, Ágora, Last.app…)" className="rounded-lg border border-acero bg-white px-3 py-2" />
              <input name="endpoint" required type="url" placeholder="https://… (endpoint del fabricante)" className="rounded-lg border border-acero bg-white px-3 py-2" />
            </div>
            <input name="credencial" type="password" autoComplete="off" placeholder="Cabecera Authorization (p. ej. Bearer xxx). Vacío = mantener" className="w-full rounded-lg border border-acero bg-white px-3 py-2" />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="activa" defaultChecked className="accent-vino" /> Activa</label>
            <p className="text-[11px] text-ceniza">La credencial se cifra (AES-256-GCM) antes de guardarse; nadie puede volver a leerla desde el panel.</p>
            <button className="rounded-md bg-vino px-3 py-1.5 text-xs font-bold">Guardar conexión</button>
          </form>
        )}
      </section>

      <section id="diseno" className="scroll-mt-20 rounded-[22px] border border-linea bg-white p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Diseño de la carta</h2>
        <p className="text-xs text-niebla">
          Solo DKitchen lo asigna (el cliente administra contenido). Esencial = incluido · Autor = Setup Experto · Signature = a medida.
        </p>
        <form action={asignarDisenoAction} className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <input type="hidden" name="restauranteId" value={r.id} />
          <label className="space-y-1">
            <span className="block text-xs text-niebla">Plantilla</span>
            <select name="plantilla" defaultValue={r.plantilla ?? 'clasica'} className="rounded-lg border border-acero bg-white px-3 py-2">
              <option value="clasica">Clásica</option>
              <option value="visual">Visual</option>
              <option value="express">Express</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-niebla">Nivel</span>
            <select name="nivel" defaultValue={r.nivel_diseno ?? 'esencial'} className="rounded-lg border border-acero bg-white px-3 py-2">
              <option value="esencial">Esencial</option>
              <option value="autor">Carta de Autor</option>
              <option value="signature">Signature</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-niebla">Color (libre)</span>
            <input type="color" name="color" defaultValue={r.color_marca ?? '#6E0C2B'} className="h-[38px] w-16 rounded-lg border border-acero bg-white p-1" />
          </label>
          <button className="rounded-full bg-vino px-4 py-2 font-bold hover:bg-vino-hondo">Aplicar diseño</button>
        </form>
      </section>

      {cartaCliente && (
        <section className="rounded-[22px] border border-linea bg-white p-5 sm:p-6">
          <TraductorCarta
            restauranteId={id}
            activos={cartaCliente.idiomas ?? []}
            secciones={cartaCliente.secciones.map((x) => ({ id: x.id, nombre: x.nombre }))}
            platos={[...cartaCliente.secciones.flatMap((x) => x.platos), ...cartaCliente.sueltos].map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, seccionId: p.seccionId }))}
            traducciones={traducciones}
          />
        </section>
      )}

      <details id="historial" className="scroll-mt-20 rounded-[22px] border border-linea bg-white p-5 sm:p-6">
        <summary className="cursor-pointer list-none font-bold">Historial de cambios <span className="ml-2 text-sm font-normal text-ceniza">{historial.length} registros · pulsa para ver</span></summary>
        {historial.length === 0 ? (
          <p className="mt-3 text-sm text-niebla">Sin cambios registrados todavía.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {historial.map((e, i) => (
              <li key={i} className="border-l-2 border-linea pl-4">
                <p className="text-sm">
                  <span className={e.quien === 'DKitchen' ? 'text-vino' : e.quien === 'sistema' ? 'text-niebla' : 'text-carbon'}>
                    {ACCION[e.accion] ?? e.accion}
                  </span>
                  <span className="ml-2 text-xs text-ceniza">{fechaHora.format(new Date(e.ocurridoEn))}</span>
                </p>
                <Cambios e={e} />
              </li>
            ))}
          </ol>
        )}
      </details>
    </div>
  );
}
