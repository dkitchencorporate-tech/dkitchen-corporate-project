import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { esComercialActual } from '@/lib/rol-central';
import { bandejaSoporte, solicitudesQrAdmin } from '@/lib/admin-clientes';
import { responderTicketAction } from '../qr/actions';
import { guardarModoIaAction, n2IaAction } from './actions';
import PanelN2 from '@/components/admin/PanelN2';
import CajaRespuesta from '@/components/admin/CajaRespuesta';
import { diagnosticar, sugerir, borrador, datosTickets, metricasSoporte, modoSoporte, CATEGORIAS, type Categoria, type IaN2, type ModoSoporte } from '@/lib/soporte-n2';

export const dynamic = 'force-dynamic';

const fechaHora = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const COLOR: Record<string, string> = {
  abierto: 'bg-amber-500/15 text-amber-700',
  respondido: 'bg-green-500/15 text-green-700',
  cerrado: 'bg-papel text-niebla',
};

const AVISOS: Record<string, string> = {
  acceso: 'Enlace de contraseña enviado.', bienvenida: 'Bienvenida y enlace de contraseña enviados.', enlace: 'Enlace nuevo enviado al correo del dueño.',
  tpv: 'Reintento al TPV hecho.', resuelto: 'Ticket cerrado como resuelto.',
  modo: 'Interruptor de la IA de soporte guardado.', ia: 'Diagnóstico y borrador de la IA listos: revísalos antes de responder.',
};
const ERRORES: Record<string, string> = {
  datos: 'Datos del formulario no válidos.', diagnostico: 'No se pudo leer el estado del local.', sin_correo: 'El local no tiene cuenta de dueño con correo.',
  miembro: 'Ese miembro del equipo no está activo o no se pudo regenerar.', sin_fallidos: 'No hay envíos al TPV fallidos en 7 días.', categoria: 'Elige categoría y nivel.',
  ia_modo: 'La IA de N2 no está en modo AI Gateway (míralo en el interruptor de arriba).', ia_tope: 'Se ha llegado al tope mensual de gasto de IA.', ia_fallo: 'La IA no ha respondido bien. Prueba otra vez o responde con el diagnóstico por reglas.',
  hueco: 'No se ha enviado: la respuesta aún tiene un hueco por rellenar ([Respuesta] o [pasos]). Escribe la respuesta real y vuelve a pulsar «Responder».',
};

export default async function SoporteQr({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const [tickets, solicitudes, metricas, modo, esComercial] = await Promise.all([bandejaSoporte(jwt), solicitudesQrAdmin(jwt), metricasSoporte(jwt), modoSoporte(jwt), esComercialActual(jwt)]);
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

  const carpeta = q.c === 'esperando' ? 'respondido' : q.c === 'cerrados' ? 'cerrado' : 'abierto';
  const CARPETAS: [string, string, string][] = [['sin', 'abierto', 'Sin responder'], ['esperando', 'respondido', 'Esperando'], ['cerrados', 'cerrado', 'Cerrados']];
  const lista = tickets.filter((x) => x.estado === carpeta);
  const t = tickets.find((x) => x.id === q.t) ?? null;
  const qs = (extra: Record<string, string>) => '?' + new URLSearchParams({ ...(q.c ? { c: q.c } : {}), ...extra }).toString();

  return (
    <div className="space-y-4 px-4 py-6 text-tinta sm:p-6 lg:p-10" data-testid="soporte">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Soporte</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Bandeja</h1>
        </div>
        <Link href="/admin-dkitchen/servicios/qr" className="text-sm font-semibold text-vino">{pendientes} pedido{pendientes === 1 ? '' : 's'} de QR físico → Servicios</Link>
      </div>
      {aviso && <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{aviso}</p>}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`space-y-3 ${t ? 'hidden lg:block' : ''}`}>
          <nav className="grid grid-cols-3 gap-1.5" aria-label="Carpetas">
            {CARPETAS.map(([k, e, n]) => {
              const cuantos = tickets.filter((x) => x.estado === e).length;
              return <Link key={k} href={k === 'sin' ? '/admin-dkitchen/soporte' : `/admin-dkitchen/soporte?c=${k}`} className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-center text-[13px] font-semibold leading-tight sm:text-sm ${carpeta === e ? 'bg-tinta text-white' : 'border border-linea bg-white'}`}>{n} <span className="opacity-60">{cuantos}</span></Link>;
            })}
          </nav>
          <ul className="overflow-hidden rounded-[22px] border border-linea bg-white">
            {lista.map((x) => (
              <li key={x.id} className="border-b border-linea last:border-0">
                <Link href={qs({ t: x.id })} scroll={false} className={`block px-4 py-3 transition ${t?.id === x.id ? 'bg-vino/[0.06]' : 'hover:bg-papel'}`}>
                  <span className="flex items-baseline justify-between gap-2"><b className="truncate text-sm">{x.restaurante}</b><span className="shrink-0 text-[11px] text-niebla">{fechaHora.format(new Date(x.creadoEn))}</span></span>
                  <span className="block truncate text-sm">{x.asunto}</span>
                  <span className="block truncate text-xs text-niebla">{x.mensaje}</span>
                </Link>
              </li>
            ))}
            {!lista.length && <li className="px-4 py-10 text-center text-sm text-niebla">{carpeta === 'abierto' ? '¡Bandeja limpia! No hay nada sin responder.' : 'Nada por aquí.'}</li>}
          </ul>
        </aside>

        <section className={`min-w-0 ${t ? '' : 'hidden lg:block'}`}>
          {!t ? (
            <div className="grid h-full min-h-[320px] place-items-center rounded-[22px] border border-dashed border-linea-fuerte bg-white/50 p-8 text-center text-sm text-niebla">Elige una conversación de la izquierda.</div>
          ) : (
            <article id={`t-${t.id}`} className="dk-paso space-y-4 rounded-[22px] border border-linea bg-white p-5 sm:p-6" data-testid="conversacion">
              <Link href={qs({})} className="text-xs font-semibold text-vino lg:hidden">← Bandeja</Link>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold">{t.asunto}</h2>
                  <p className="text-xs text-niebla"><Link href={`/admin-dkitchen/qr/${t.restauranteId}?tab=soporte`} className="font-semibold text-tinta hover:text-vino">{t.restaurante}</Link> · {fechaHora.format(new Date(t.creadoEn))}{t.origen === 'chat' ? ' · desde el chat' : ''}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR[t.estado]}`}>{t.estado}{extra.get(t.id)?.categoria ? ` · ${CATEGORIAS[extra.get(t.id)!.categoria as Categoria] ?? extra.get(t.id)!.categoria}` : ''}</span>
              </div>
              <div className="max-w-[90%] rounded-[18px] rounded-tl-md bg-papel px-4 py-3 text-sm"><p className="whitespace-pre-wrap">{t.mensaje}</p></div>
              {t.origen === 'chat' && t.contexto && (
                <p className="text-xs text-niebla">Estaba en <b className="text-tinta">{t.contexto.seccion ?? '—'}</b>{t.contexto.plan ? ` · plan ${t.contexto.plan}` : ''}{t.contexto.busquedas?.length ? ` · escribió: ${t.contexto.busquedas.map((b) => `«${b}»`).join(' · ')}` : ''}</p>
              )}
              {t.respuesta && (
                <div className="ml-auto max-w-[90%] rounded-[18px] rounded-tr-md bg-vino px-4 py-3 text-sm text-white">
                  <p className="whitespace-pre-wrap">{t.respuesta}</p>
                  <p className="mt-1 text-right text-[11px] text-white/60">{t.respondidoEn ? fechaHora.format(new Date(t.respondidoEn)) : ''}</p>
                </div>
              )}
              {extra.get(t.id)?.ia && <BloqueIa ia={extra.get(t.id)!.ia!} />}
              {t.estado !== 'cerrado' && modo?.n2 === 'gateway' && (
                <form action={n2IaAction}><input type="hidden" name="ticketId" value={t.id} /><input type="hidden" name="restauranteId" value={t.restauranteId} />
                  <button className="rounded-full border border-vino px-4 py-2 text-sm font-semibold text-vino hover:bg-vino/5">{extra.get(t.id)?.ia ? 'Rehacer borrador con IA' : 'Borrador con IA'}</button></form>
              )}
              {n2.has(t.id) && <details className="rounded-2xl border border-linea p-3 text-sm"><summary className="cursor-pointer font-semibold">Diagnóstico y arreglos rápidos</summary><div className="mt-3"><PanelN2 ticketId={t.id} restauranteId={t.restauranteId} d={n2.get(t.id)!.d} s={n2.get(t.id)!.s} acciones={n2.get(t.id)!.acciones} /></div></details>}
              {t.estado === 'cerrado' && extra.get(t.id)?.resolucion && <p className="text-xs text-niebla">Resolución: {extra.get(t.id)!.resolucion}</p>}
              {t.estado !== 'cerrado' && (
                <form action={responderTicketAction} className="border-t border-linea pt-4">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <CajaRespuesta hayRespuesta={!!t.respuesta} inicial={t.respuesta ? undefined : extra.get(t.id)?.ia?.borrador ?? n2.get(t.id)?.texto} />
                </form>
              )}
            </article>
          )}
        </section>
      </div>

      {!esComercial && (
        <details className="rounded-[22px] border border-linea bg-white p-4 text-sm">
          <summary className="cursor-pointer font-semibold">IA de soporte y métricas</summary>
          <div className="mt-4 space-y-4">
            {metricas && <p className="text-xs text-niebla">N2 manual: {metricas.resueltos}/50 resueltos · acierto {metricas.acierto ?? '—'} % · resolución media {metricas.horas_medias_resolucion ?? '—'} h.</p>}
            {modo && <InterruptorIa modo={modo} />}
          </div>
        </details>
      )}
    </div>
  );
}

const horaMadrid = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const MODOS_N1: Record<ModoSoporte['n1'], string> = { apagado: 'Apagada (solo la guía)', agente: 'Agente Claude de guardia (pruebas)', gateway: 'AI Gateway (responde sola)' };
const MODOS_N2: Record<ModoSoporte['n2'], string> = { reglas: 'Solo reglas', agente: 'Agente Claude de guardia (pruebas)', gateway: 'AI Gateway (botón en cada ticket)' };

/** Interruptor de la IA de soporte (0080): aquí se le pasa el mando a AI Gateway cuando hay saldo. */
function InterruptorIa({ modo }: { modo: ModoSoporte }) {
  const hasta = modo.agente_hasta ? new Date(modo.agente_hasta) : null;
  return (
    <section id="ia" className="scroll-mt-6 rounded-[24px] border border-oro/40 bg-papel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">IA de soporte · N1 y N2</p>
          <h2 className="font-display mt-1 text-2xl font-semibold">¿Quién responde?</h2>
          <p className="mt-1 max-w-xl text-sm text-niebla">Modelo en AI Gateway: <strong className="text-carbon">{modo.modelo}</strong>. N2 nunca responde sola: deja el diagnóstico y el borrador, y tú lo envías.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${modo.agente_activo ? 'bg-green-500/15 text-green-700' : 'bg-white text-niebla ring-1 ring-linea'}`}>
          {modo.agente_activo && hasta ? `Agente de guardia hasta las ${horaMadrid.format(hasta)}` : 'Sin agente de guardia'}
        </span>
      </div>
      <form action={guardarModoIaAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm">N1 · chat de ayuda del panel
          <select name="n1" defaultValue={modo.n1} className="mt-1 w-full rounded-xl border border-acero bg-white px-3 py-2.5 text-sm">
            {Object.entries(MODOS_N1).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <label className="text-sm">N2 · tickets
          <select name="n2" defaultValue={modo.n2} className="mt-1 w-full rounded-xl border border-acero bg-white px-3 py-2.5 text-sm">
            {Object.entries(MODOS_N2).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Guardar</button>
      </form>
      <p className="mt-3 text-xs text-niebla">En modo agente, el chat solo responde con IA mientras Claude está de guardia (lo abre Claude cuando le pides pruebas); el resto del tiempo enseña la guía y «hablar con una persona». Con saldo en AI Gateway, pon los dos en «AI Gateway».</p>
    </section>
  );
}

function BloqueIa({ ia }: { ia: IaN2 }) {
  return (
    <div className="rounded-xl border border-vino/25 bg-vino/[0.04] p-3 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">
        Diagnóstico de la IA · {CATEGORIAS[ia.categoria] ?? ia.categoria} · nivel {ia.nivel} · {ia.motor === 'agente' ? 'agente Claude' : ia.motor} · {fechaHora.format(new Date(ia.en))}
      </p>
      {ia.diagnostico && <p className="mt-1 whitespace-pre-wrap">{ia.diagnostico}</p>}
      <p className="mt-2 text-xs text-niebla">El borrador ya está en la caja de respuesta de abajo: revísalo antes de pulsar «Responder».</p>
    </div>
  );
}
