import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { fichaCliente, historialCliente, type EntradaHistorial } from '@/lib/admin-clientes';
import { cambiarEstadoAction, cambiarPlanAction } from '../actions';

export const dynamic = 'force-dynamic';

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
  'admin.responder_ticket': 'DKitchen respondió un ticket',
  'admin.estado_solicitud_qr': 'DKitchen actualizó un pedido de QR físico',
  aprovisionamiento_stripe: 'Alta tras el pago',
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
      <ul className="mt-1 space-y-0.5 text-xs text-white/50">
        {lineas.map(([k, d]) => (
          <li key={k}>
            <span className="text-white/70">{k}</span>: {valor(d?.antes)} → <span className="text-white/80">{valor(d?.despues)}</span>
          </li>
        ))}
      </ul>
    );
  }
  const nombre = (cambios as Record<string, unknown>).nombre;
  return nombre ? <p className="mt-1 text-xs text-white/50">«{valor(nombre)}»</p> : null;
}

export default async function FichaClienteQr({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const jwt = await exigirAdmin();
  const [ficha, historial] = await Promise.all([fichaCliente(jwt, id), historialCliente(jwt, id)]);
  if (!ficha?.restaurante) notFound();

  const r = ficha.restaurante;
  const maxDia = Math.max(1, ...ficha.escaneos_30d.map((d) => d.n));
  const total30 = ficha.escaneos_30d.reduce((s, d) => s + d.n, 0);
  const pago =
    r.estado_acceso === 'activo' ? 'Al día'
    : r.pago_fallido_desde ? `Pago fallido desde ${fecha.format(new Date(r.pago_fallido_desde))}`
    : r.estado_acceso;

  return (
    <div className="p-6 lg:p-10 text-white space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin-dkitchen/qr" className="text-xs text-white/40 hover:text-white">← Clientes QR</Link>
          <h1 className="mt-1 text-2xl font-black">{r.nombre}</h1>
          <p className="text-sm text-white/40">
            /{r.slug} · alta {fecha.format(new Date(r.creado_en))} · último acceso{' '}
            {ficha.ultimo_acceso ? fechaHora.format(new Date(ficha.ultimo_acceso)) : 'nunca'}
          </p>
        </div>
        <a href={`/m/${r.slug}`} target="_blank" rel="noopener" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:border-[#D9531E]">
          Ver su carta ↗
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { t: 'Plan', v: r.plan === 'ampliado' ? 'Ampliado · 25 €' : 'Básico · 9 €' },
          { t: 'Pago', v: pago },
          { t: 'Escaneos 30 días', v: total30 },
          { t: 'Llamadas de mesa 30 días', v: ficha.llamadas_30d },
        ].map((k) => (
          <div key={k.t} className="rounded-2xl border border-white/10 bg-[#1c140b] p-5">
            <p className="text-xs text-white/40">{k.t}</p>
            <p className="mt-1 text-lg font-black">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-[#1c140b] p-6 lg:col-span-2">
          <h2 className="font-bold">Escaneos de los últimos 30 días</h2>
          <div className="mt-4 flex h-32 items-end gap-1" role="img" aria-label={`${total30} escaneos en 30 días`}>
            {ficha.escaneos_30d.map((d) => (
              <div
                key={d.dia}
                title={`${d.dia}: ${d.n}`}
                className="flex-1 rounded-t bg-[#D9531E]"
                style={{ height: `${Math.max(3, (d.n / maxDia) * 100)}%`, opacity: d.n ? 1 : 0.25 }}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1c140b] p-6 space-y-3 text-sm">
          <h2 className="font-bold">Contacto y carta</h2>
          <p>{ficha.contacto ?? '—'}</p>
          {ficha.email && <a href={`mailto:${ficha.email}`} className="block text-[#D9531E] hover:underline">{ficha.email}</a>}
          <p className="text-white/50">{r.telefono ?? 'Sin teléfono'} · {r.direccion ?? 'Sin dirección'}</p>
          <p className="text-white/50">{ficha.secciones} secciones · {ficha.platos} platos</p>
          <p className="text-white/50">QR: {ficha.codigos.join(', ') || '—'}</p>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#1c140b] p-6">
        <h2 className="font-bold">Acciones</h2>
        <p className="text-xs text-white/40">Cada acción queda registrada en el historial.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={cambiarEstadoAction}>
            <input type="hidden" name="restauranteId" value={r.id} />
            <input type="hidden" name="estado" value={r.activo ? 'suspendido' : 'activo'} />
            <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${r.activo ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25' : 'bg-green-500/15 text-green-300 hover:bg-green-500/25'}`}>
              {r.activo ? 'Suspender cuenta' : 'Reactivar cuenta'}
            </button>
          </form>
          <form action={cambiarPlanAction}>
            <input type="hidden" name="restauranteId" value={r.id} />
            <input type="hidden" name="plan" value={r.plan === 'ampliado' ? 'basico' : 'ampliado'} />
            <button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
              Pasar a {r.plan === 'ampliado' ? 'Básico' : 'Ampliado'}
            </button>
          </form>
          <Link href="/admin-dkitchen/soporte" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
            Soporte y QR físico
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#1c140b] p-6">
        <h2 className="font-bold">Historial de cambios</h2>
        {historial.length === 0 ? (
          <p className="mt-3 text-sm text-white/40">Sin cambios registrados todavía.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {historial.map((e, i) => (
              <li key={i} className="border-l-2 border-white/10 pl-4">
                <p className="text-sm">
                  <span className={e.quien === 'DKitchen' ? 'text-[#D9531E]' : e.quien === 'sistema' ? 'text-white/50' : 'text-white'}>
                    {ACCION[e.accion] ?? e.accion}
                  </span>
                  <span className="ml-2 text-xs text-white/30">{fechaHora.format(new Date(e.ocurridoEn))}</span>
                </p>
                <Cambios e={e} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
