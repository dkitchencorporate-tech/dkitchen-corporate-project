import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { bandejaSoporte, solicitudesQrAdmin } from '@/lib/admin-clientes';
import { responderTicketAction, estadoSolicitudAction } from '../qr/actions';

export const dynamic = 'force-dynamic';

const fechaHora = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const COLOR: Record<string, string> = {
  abierto: 'bg-amber-500/15 text-amber-700',
  respondido: 'bg-green-500/15 text-green-700',
  cerrado: 'bg-papel text-niebla',
};
const ESTADOS_SOLICITUD = ['solicitado', 'presupuestado', 'pagado', 'en_produccion', 'enviado'];

export default async function SoporteQr() {
  const jwt = await exigirAdmin();
  const [tickets, solicitudes] = await Promise.all([bandejaSoporte(jwt), solicitudesQrAdmin(jwt)]);
  const abiertos = tickets.filter((t) => t.estado === 'abierto').length;
  const pendientes = solicitudes.filter((s) => s.estado !== 'enviado').length;

  return (
    <div className="p-6 lg:p-10 text-carbon space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Soporte QR Menú</h1>
        <p className="text-sm text-niebla">
          {abiertos} ticket{abiertos === 1 ? '' : 's'} sin responder · {pendientes} pedido{pendientes === 1 ? '' : 's'} de QR físico en curso
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Tickets</h2>
        {tickets.length === 0 && <p className="rounded-2xl border border-linea bg-white p-8 text-center text-niebla">No hay tickets.</p>}
        {tickets.map((t) => (
          <article key={t.id} className="rounded-2xl border border-linea bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{t.asunto}{t.origen === 'chat' && <span className="ml-2 rounded-full bg-vino/10 px-2 py-0.5 align-middle text-[11px] font-semibold text-vino">Desde el chat</span>}</p>
                <p className="text-xs text-niebla">
                  <Link href={`/admin-dkitchen/qr/${t.restauranteId}`} className="hover:text-carbon">{t.restaurante}</Link> · {fechaHora.format(new Date(t.creadoEn))}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR[t.estado]}`}>{t.estado}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-grafito">{t.mensaje}</p>
            {t.origen === 'chat' && t.contexto && (
              <div className="rounded-lg bg-crema p-3 text-xs text-grafito">
                <p className="text-niebla">
                  Sección: <strong className="text-carbon">{t.contexto.seccion ?? '—'}</strong>
                  {t.contexto.plan && <> · plan <strong className="text-carbon">{t.contexto.plan}</strong></>}
                  {t.contexto.nivel && <> · diseño <strong className="text-carbon">{t.contexto.nivel}</strong></>}
                </p>
                {!!t.contexto.camino?.length && (
                  <ol className="mt-2 list-decimal space-y-0.5 pl-4">{t.contexto.camino.map((c, i) => <li key={i}>{c}</li>)}</ol>
                )}
                {!!t.contexto.busquedas?.length && <p className="mt-2 text-niebla">Escribió: {t.contexto.busquedas.map((b) => `«${b}»`).join(' · ')}</p>}
              </div>
            )}
            {t.respuesta && (
              <div className="rounded-lg border-l-2 border-vino bg-[#F3F3F0] p-3 text-sm">
                <p className="text-xs text-niebla">Respuesta {t.respondidoEn ? `· ${fechaHora.format(new Date(t.respondidoEn))}` : ''}</p>
                <p className="whitespace-pre-wrap">{t.respuesta}</p>
              </div>
            )}
            {t.estado !== 'cerrado' && (
              <form action={responderTicketAction} className="space-y-2">
                <input type="hidden" name="ticketId" value={t.id} />
                <textarea
                  name="respuesta"
                  required
                  maxLength={4000}
                  rows={3}
                  placeholder={t.respuesta ? 'Añadir otra respuesta (sustituye a la anterior)…' : 'Escribe la respuesta. El cliente la recibirá por correo y en su panel.'}
                  className="w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm focus:border-vino focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-niebla">
                    <input type="checkbox" name="cerrar" className="accent-vino" /> Cerrar el ticket
                  </label>
                  <button className="rounded-full bg-vino px-4 py-2 text-sm font-bold hover:bg-vino-hondo">Responder</button>
                </div>
              </form>
            )}
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Pedidos de QR físico</h2>
        {solicitudes.length === 0 ? (
          <p className="rounded-2xl border border-linea bg-white p-8 text-center text-niebla">No hay pedidos.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-linea">
            <table className="w-full text-sm">
              <thead className="bg-[#F3F3F0] text-left text-xs uppercase tracking-wider text-niebla">
                <tr>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Envío</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECE8]">
                {solicitudes.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin-dkitchen/qr/${s.restauranteId}`} className="font-semibold hover:text-vino">{s.restaurante}</Link>
                      <p className="text-xs text-ceniza">{fechaHora.format(new Date(s.creadoEn))}</p>
                    </td>
                    <td className="px-4 py-3">{s.cantidad} × {s.tipo}{s.notas ? <p className="text-xs text-niebla">{s.notas}</p> : null}</td>
                    <td className="px-4 py-3 text-niebla">{s.direccionEnvio ?? '—'}</td>
                    <td className="px-4 py-3">
                      <form action={estadoSolicitudAction} className="flex items-center gap-2">
                        <input type="hidden" name="solicitudId" value={s.id} />
                        <select name="estado" defaultValue={s.estado} className="rounded-md border border-linea bg-white px-2 py-1 text-xs">
                          {ESTADOS_SOLICITUD.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                        </select>
                        <button className="rounded-md bg-papel px-2 py-1 text-xs font-semibold hover:bg-[#E5E5E1]">Guardar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
