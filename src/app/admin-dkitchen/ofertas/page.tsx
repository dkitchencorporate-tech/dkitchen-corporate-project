import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import GuiaZona from '@/components/admin/GuiaZona';
import { guardarOfertaFechaAction, estadoSolicitudOfertaAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Ofertas por fecha (0105, R5, 28/10/2026): packs de temporada que los locales clientes ven en su
 * panel (Negocio → Mejoras) solo entre «desde» y «hasta». Aquí se editan y se atienden las solicitudes.
 * El precio que se cobra es el que guarda la base al pedirla (cambiarlo aquí no toca lo ya pedido).
 */
type Solicitud = { id: string; restaurante_id: string; local: string; precio_centimos: number; estado: string; creado_en: string };
type Oferta = { id: string; tema: string; titulo: string; descripcion: string; incluye: string[]; precio_centimos: number; precio_ancla_centimos: number | null;
  desde: string; hasta: string; activa: boolean; solicitudes: Solicitud[] };

const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const campo = 'mt-1 w-full rounded-xl border border-linea bg-white px-3 py-2 text-sm';
const TEMAS: Record<string, string> = { halloween: '🎃 Halloween', navidad: '🎄 Navidad', san_valentin: '💘 San Valentín', carnaval: '🎭 Carnaval', otra: '⭐ Otra fecha' };
const ESTADOS: Record<string, string> = { recibida: 'Recibida', en_curso: 'En curso', entregada: 'Entregada', descartada: 'Descartada' };
const euros = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
const dia = (d: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d));
const fecha = (s: string) => new Date(s).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

function estadoVisible(o: Oferta, hoy: string) {
  if (!o.activa) return { texto: 'Apagada', clase: 'bg-crema text-niebla' };
  if (hoy < o.desde) return { texto: `Sale el ${dia(o.desde)}`, clase: 'bg-oro/20 text-tinta' };
  if (hoy > o.hasta) return { texto: 'Terminada', clase: 'bg-crema text-niebla' };
  return { texto: 'Se ve hoy en los paneles', clase: 'bg-green-500/15 text-green-700' };
}

function Formulario({ o }: { o?: Oferta }) {
  return (
    <form action={guardarOfertaFechaAction} className="grid gap-3 sm:grid-cols-2">
      {o && <input type="hidden" name="id" value={o.id} />}
      <label className="text-xs text-niebla">Tema
        <select name="tema" defaultValue={o?.tema ?? 'otra'} className={campo}>{Object.entries(TEMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </label>
      <label className="text-xs text-niebla">Título (lo que ve el dueño)
        <input name="titulo" required minLength={3} maxLength={80} defaultValue={o?.titulo} className={campo} />
      </label>
      <label className="text-xs text-niebla sm:col-span-2">Descripción (una o dos frases)
        <textarea name="descripcion" required minLength={3} maxLength={400} rows={2} defaultValue={o?.descripcion} className={campo} />
      </label>
      <label className="text-xs text-niebla sm:col-span-2">Qué incluye (una línea por punto, máximo 6)
        <textarea name="incluye" rows={4} defaultValue={o?.incluye.join('\n')} className={campo} />
      </label>
      <label className="text-xs text-niebla">Precio sin IVA (€)
        <input name="precio" required inputMode="decimal" defaultValue={o ? String(o.precio_centimos / 100).replace('.', ',') : ''} className={campo} />
      </label>
      <label className="text-xs text-niebla">Precio tachado (opcional, mayor que el precio)
        <input name="ancla" inputMode="decimal" defaultValue={o?.precio_ancla_centimos ? String(o.precio_ancla_centimos / 100).replace('.', ',') : ''} className={campo} />
      </label>
      <label className="text-xs text-niebla">Se ve desde
        <input type="date" name="desde" required defaultValue={o?.desde} className={campo} />
      </label>
      <label className="text-xs text-niebla">Se ve hasta (incluido)
        <input type="date" name="hasta" required defaultValue={o?.hasta} className={campo} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="activa" value="si" defaultChecked={o?.activa ?? true} /> Encendida</label>
      <div className="sm:text-right"><button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white hover:bg-vino-hondo">{o ? 'Guardar cambios' : 'Crear oferta'}</button></div>
    </form>
  );
}

export default async function Ofertas() {
  const jwt = await exigirAdmin();
  const { hoy, ofertas } = await comoCliente(jwt, async (c) => (await c.query<{ j: { hoy: string; ofertas: Oferta[] } }>('SELECT dk.admin_ofertas_fecha() AS j')).rows[0].j);
  const solicitudes = ofertas.flatMap((o) => o.solicitudes.map((s) => ({ ...s, oferta: o.titulo })));
  const pendientes = solicitudes.filter((s) => s.estado === 'recibida' || s.estado === 'en_curso').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Ofertas</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Ofertas por fecha</h1>
        <p className="mt-1 text-sm text-niebla">Packs de temporada para los locales que ya son clientes. Cada uno sale en su panel (Negocio → Mejoras) solo entre sus fechas.</p>
      </div>

      <GuiaZona titulo="Ofertas" ancla="ofertas"
        que="Lo que el dueño de un local ve en Mejoras en fechas señaladas (Halloween, Navidad, San Valentín, Carnaval…) y quién lo ha pedido."
        pasos={['Cambia el texto, el precio o las fechas de una oferta y guarda.', 'Apágala si no quieres que salga aunque esté en fechas.', 'Cuando un local la pida te llega un correo; prepárasela y marca su estado aquí.']}
        ojo={['Sin pasarela de pago, el dueño ve «Solicitud recibida»: el cobro se acuerda con él.', 'El precio que cuenta es el del momento en que la pidió.']} />

      <div className="grid gap-3 sm:grid-cols-3">
        {([['Se ven hoy', ofertas.filter((o) => o.activa && hoy >= o.desde && hoy <= o.hasta).length], ['Solicitudes por atender', pendientes], ['Entregadas', solicitudes.filter((s) => s.estado === 'entregada').length]] as [string, number][]).map(([t, n]) => (
          <div key={t} className={tarjeta}><p className="text-xs text-niebla">{t}</p><p className="font-display mt-1 text-3xl font-semibold">{n}</p></div>
        ))}
      </div>

      {solicitudes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Solicitudes</h2>
          <div className={`${tarjeta} divide-y divide-linea p-0`}>
            {solicitudes.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold"><Link href={`/admin-dkitchen/qr/${s.restaurante_id}`} className="hover:text-vino">{s.local}</Link></p>
                  <p className="text-xs text-niebla">{s.oferta} · {euros(s.precio_centimos)} + IVA · {fecha(s.creado_en)}</p>
                </div>
                <form action={estadoSolicitudOfertaAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <select name="estado" defaultValue={s.estado} className="rounded-xl border border-linea bg-white px-3 py-2 text-sm">{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <button className="rounded-full border border-linea-fuerte px-4 py-2 text-sm font-semibold">Guardar</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Ofertas</h2>
        {ofertas.map((o) => {
          const e = estadoVisible(o, hoy);
          return (
            <details key={o.id} className={tarjeta}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{TEMAS[o.tema] ?? o.tema} · {o.titulo} <span className="ml-1 text-sm font-normal text-niebla">{euros(o.precio_centimos)} + IVA · {dia(o.desde)} → {dia(o.hasta)}</span></span>
                <span className="flex items-center gap-2">
                  {o.solicitudes.length > 0 && <span className="text-xs text-niebla">{o.solicitudes.length} {o.solicitudes.length === 1 ? 'solicitud' : 'solicitudes'}</span>}
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${e.clase}`}>{e.texto}</span>
                </span>
              </summary>
              <div className="mt-4 border-t border-linea pt-4"><Formulario o={o} /></div>
            </details>
          );
        })}
        <details className={`${tarjeta} border-dashed`}>
          <summary className="cursor-pointer list-none font-semibold text-vino">+ Nueva oferta</summary>
          <div className="mt-4 border-t border-linea pt-4"><Formulario /></div>
        </details>
      </section>
    </div>
  );
}
