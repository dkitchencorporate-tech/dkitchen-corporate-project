import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { bandejaSoporte, solicitudesQrAdmin } from '@/lib/admin-clientes';
import { responderTicketAction, estadoSolicitudAction } from '../qr/actions';
import PanelN2 from '@/components/admin/PanelN2';
import { diagnosticar, sugerir, borrador, datosTickets, metricasSoporte, CATEGORIAS, type Categoria } from '@/lib/soporte-n2';

export const dynamic = 'force-dynamic';

const fechaHora = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const COLOR: Record<string, string> = {
  abierto: 'bg-amber-500/15 text-amber-700',
  respondido: 'bg-green-500/15 text-green-700',
  cerrado: 'bg-papel text-niebla',
};
const ESTADOS_SOLICITUD = ['solicitado', 'presupuestado', 'pagado', 'en_produccion', 'enviado'];

const AVISOS: Record<string, string> = {
  acceso: 'Enlace de contraseña enviado.', bienvenida: 'Bienvenida y enlace de contraseña enviados.', enlace: 'Enlace nuevo enviado al correo del dueño.',
  tpv: 'Reintento al TPV hecho.', resuelto: 'Ticket cerrado como resuelto.',
};
const ERRORES: Record<string, string> = {
  datos: 'Datos del formulario no válidos.', diagnostico: 'No se pudo leer el estado del local.', sin_correo: 'El local no tiene cuenta de dueño con correo.',
  miembro: 'Ese miembro del equipo no está activo o no se pudo regenerar.', sin_fallidos: 'No hay envíos al TPV fallidos en 7 días.', categoria: 'Elige categoría y nivel.',
};

export default async function SoporteQr({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const [tickets, solicitudes, metricas] = await Promise.all([bandejaSoporte(jwt), solicitudesQrAdmin(jwt), metricasSoporte(jwt)]);
  const abiertos = tickets.filter((t) => t.estado === 'abierto').length;
  // N2 (0055): diagnóstico por reglas de los tickets sin cerrar (máx. 15 por carga)
  const vivos = tickets.filter((t) => t.estado !== 'cerrado').slice(0, 15);
  const [extra, diagnosticos] = await Promise.all([
    datosTickets(jwt, tickets.map((t) => t.id)),
    Promise.all(vivos.map((t) => diagnosticar(jwt, t.restauranteId))),
  ]);
  const n2 = new Map(vivos.map((t, i) => {
    const d = diagnosticos[i];
    const s = sugerir(t.asunto, t.mensaje, d);
    const acciones = extra.get(t.id)?.acciones ?? [];
    return [t.id, { d, s, acciones, texto: borrador(s.categoria, acciones, d) }];
  }));
  const aviso = q.ok ? (q.ok === 'tpv' ? `Reintento al TPV: ${q.n ?? 0} de ${q.de ?? 0} llegaron.` : AVISOS[q.ok]) : null;
  const error = q.e ? ERRORES[q.e] ?? 'No se pudo hacer.' : null;
  const pendientes = solicitudes.filter((s) => s.estado !== 'enviado').length;

  return (
    <div className="p-6 lg:p-10 text-carbon space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Soporte QR Menú</h1>
        <p className="text-sm text-niebla">
          {abiertos} ticket{abiertos === 1 ? '' : 's'} sin responder · {pendientes} pedido{pendientes === 1 ? '' : 's'} de QR físico en curso
        </p>
      </div>

      {metricas && (
        <div className="rounded-2xl border border-linea bg-white p-4 text-sm">
          <p className="font-semibold">Soporte N2 manual · {metricas.resueltos}/50 tickets resueltos con registro completo</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-papel"><div className="h-full rounded-full bg-vino" style={{ width: `${Math.min(100, (metricas.resueltos / 50) * 100)}%` }} /></div>
          <p className="mt-2 text-xs text-niebla">
            Recibidos {metricas.recibidos} · acierto del diagnóstico {metricas.acierto ?? '—'} % ({metricas.con_diagnostico_valorado} valorados) · resolución media {metricas.horas_medias_resolucion ?? '—'} h.
            Al llegar a 50 con acierto ≥ 85 % se valora pasarlo a un agente Claude (ver PROTOCOLO_SOPORTE_N2).
          </p>
        </div>
      )}
      {aviso && <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{aviso}</p>}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Tickets</h2>
        {tickets.length === 0 && <p className="rounded-2xl border border-linea bg-white p-8 text-center text-niebla">No hay tickets.</p>}
        {tickets.map((t) => (
          <article key={t.id} id={`t-${t.id}`} className="scroll-mt-6 rounded-2xl border border-linea bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{t.asunto}{t.origen === 'chat' && <span className="ml-2 rounded-full bg-vino/10 px-2 py-0.5 align-middle text-[11px] font-semibold text-vino">Desde el chat</span>}</p>
                <p className="text-xs text-niebla">
                  <Link href={`/admin-dkitchen/qr/${t.restauranteId}`} className="hover:text-carbon">{t.restaurante}</Link> · {fechaHora.format(new Date(t.creadoEn))}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR[t.estado]}`}>{t.estado}{extra.get(t.id)?.categoria ? ` · ${CATEGORIAS[extra.get(t.id)!.categoria as Categoria] ?? extra.get(t.id)!.categoria}` : ''}</span>
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
              <div className="rounded-lg border-l-2 border-vino bg-papel p-3 text-sm">
                <p className="text-xs text-niebla">Respuesta {t.respondidoEn ? `· ${fechaHora.format(new Date(t.respondidoEn))}` : ''}</p>
                <p className="whitespace-pre-wrap">{t.respuesta}</p>
              </div>
            )}
            {n2.has(t.id) && <PanelN2 ticketId={t.id} restauranteId={t.restauranteId} d={n2.get(t.id)!.d} s={n2.get(t.id)!.s} acciones={n2.get(t.id)!.acciones} />}
            {t.estado === 'cerrado' && extra.get(t.id)?.resolucion && <p className="text-xs text-niebla">Resolución: {extra.get(t.id)!.resolucion}</p>}
            {t.estado !== 'cerrado' && (
              <form action={responderTicketAction} className="space-y-2">
                <input type="hidden" name="ticketId" value={t.id} />
                <textarea
                  name="respuesta"
                  required
                  maxLength={4000}
                  rows={n2.has(t.id) ? 7 : 3}
                  defaultValue={t.respuesta ? undefined : n2.get(t.id)?.texto}
                  placeholder={t.respuesta ? 'Añadir otra respuesta (sustituye a la anterior)…' : 'Escribe la respuesta. El cliente la recibirá por correo y en su panel.'}
                  className="w-full rounded-lg border border-acero bg-white px-3 py-2 text-sm focus:border-vino focus:outline-none"
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
              <thead className="bg-papel text-left text-xs uppercase tracking-wider text-niebla">
                <tr>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Envío</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
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
                        <select name="estado" defaultValue={s.estado} className="rounded-md border border-acero bg-white px-2 py-1 text-xs">
                          {ESTADOS_SOLICITUD.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                        </select>
                        <button className="rounded-md bg-papel px-2 py-1 text-xs font-semibold hover:bg-linea">Guardar</button>
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
