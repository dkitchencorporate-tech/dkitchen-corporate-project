import QRCode from 'qrcode';
import { exigirSocio } from '@/lib/guard-admin';
import { fichaSocio, misClientes, ticketsDeMisClientes } from '@/lib/socio';
import { estadoFundador } from '@/lib/fundador';
import { nombrePlan } from '@/lib/pricing-config';
import { entrarPuestaAction } from './actions';

export const dynamic = 'force-dynamic';

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const fecha = (s: string) => new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const ESTADO: Record<string, string> = { activo: 'Activo', gracia: 'Pago pendiente', solo_lectura: 'Solo lectura', suspendido: 'Suspendido' };

/** Inicio del socio: su código y QR, sus clientes (puesta a punto) y sus tickets. */
export default async function SocioInicio({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const jwt = await exigirSocio();
  const { e } = await searchParams;
  const [ficha, clientes, tickets, fundador] = await Promise.all([fichaSocio(jwt), misClientes(jwt), ticketsDeMisClientes(jwt), estadoFundador()]);
  if (!ficha) return <p className="text-sm text-niebla">No encontramos tu ficha de socio. Escribe a DKitchen.</p>;
  const enlaceQr = `${SITIO}/qr?v=${ficha.codigo}`;
  const enlaceFundador = `${SITIO}/fundador?v=${ficha.codigo}`;
  const qr = await QRCode.toDataURL(enlaceQr, { width: 360, margin: 1 });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Hola, {ficha.nombre.split(' ')[0]}</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Tus clientes</h1>
      </div>
      {e === 'permiso' && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Ese local no es tuyo o su dueño te ha retirado el permiso de edición.</p>}

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <section className={tarjeta}>
          <p className="text-xs text-niebla">Tu código de vendedor</p>
          <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.12em]">{ficha.codigo}</p>
          <p className="mt-3 text-sm text-niebla">Cada alta que entre por tu enlace o tu QR (o con tu código escrito en el formulario) queda a tu nombre.</p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="break-all"><span className="text-niebla">Carta QR: </span><a href={enlaceQr} className="font-medium underline underline-offset-2">{enlaceQr}</a></p>
            {fundador?.abierto && <p className="break-all"><span className="text-niebla">Fundador ({fundador.quedan} plazas): </span><a href={enlaceFundador} className="font-medium underline underline-offset-2">{enlaceFundador}</a></p>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="rounded-2xl bg-papel p-3"><p className="text-xs text-niebla">Altas</p><p className="text-2xl font-semibold tabular-nums">{ficha.altas}</p></div>
            <div className="rounded-2xl bg-papel p-3"><p className="text-xs text-niebla">De pago</p><p className="text-2xl font-semibold tabular-nums">{ficha.de_pago}</p></div>
          </div>
        </section>
        <section className={`${tarjeta} flex flex-col items-center justify-center`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR con tu código ${ficha.codigo}`} width={180} height={180} />
          <a href={qr} download={`dkitchen-qr-${ficha.codigo}.png`} className="mt-3 rounded-full bg-tinta px-4 py-2 text-xs font-semibold text-white">Descargar mi QR</a>
        </section>
      </div>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Clientes ({clientes.length})</p>
        {clientes.length === 0 ? (
          <p className="mt-2 text-sm text-niebla">Aún no tienes ninguno. Cuando un local se dé de alta con tu código aparecerá aquí para que le hagas la puesta a punto.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linea">
            {clientes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="font-semibold">{c.nombre}{c.fundador && <span className="ml-2 rounded-full bg-oro/20 px-2 py-0.5 text-[11px] font-semibold text-tinta">Fundador</span>}</p>
                  <p className="text-xs text-niebla">
                    Plan {nombrePlan(c.plan)} · {c.en_prueba ? 'en prueba' : ESTADO[c.estado_acceso] ?? c.estado_acceso} · alta {fecha(c.alta_en)} · {c.productos} platos
                    {c.tickets_abiertos > 0 && <span className="font-semibold text-vino"> · {c.tickets_abiertos} ticket{c.tickets_abiertos > 1 ? 's' : ''} abierto{c.tickets_abiertos > 1 ? 's' : ''}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/m/${c.slug}`} target="_blank" rel="noopener" className="rounded-full border border-linea-fuerte px-3.5 py-2 text-xs font-semibold hover:bg-papel">Ver carta</a>
                  {c.puede_editar ? (
                    <form action={entrarPuestaAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="rounded-full bg-vino px-4 py-2 text-xs font-semibold text-white">Puesta a punto</button>
                    </form>
                  ) : (
                    <span className="rounded-full bg-papel px-3 py-2 text-xs text-niebla">Sin permiso del dueño</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Tickets de tus clientes</p>
        {tickets.length === 0 ? (
          <p className="mt-2 text-sm text-niebla">Ninguno. Los responde DKitchen; aquí los ves para estar al tanto.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linea text-sm">
            {tickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0"><span className="font-medium">{t.restaurante}</span> <span className="text-niebla">· {t.asunto}</span></span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.estado === 'abierto' ? 'bg-vino/10 text-vino' : 'bg-papel text-niebla'}`}>{t.estado} · {fecha(t.creado_en)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
