import type { MensajeBuzon } from '@/lib/buzon';
import { TIPOS_BUZON, ESTADOS_BUZON, type EstadoBuzon } from '@/lib/buzon-tipos';

const fechaHora = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const ERRORES: Record<string, string> = {
  tipo: 'Elige qué tipo de mensaje es.', corto: 'Escribe al menos unas palabras.', largo: 'El mensaje es demasiado largo (máximo 4000 caracteres).',
  muchos: 'Has enviado muchos mensajes en una hora. Espera un poco.', base: 'No se pudo guardar. Inténtalo de nuevo.',
};
const AYUDA: Record<string, string> = {
  encargo: 'Algo que quieres que haga (p. ej. «añade el plan Sala a la tabla de precios»).',
  idea: 'Algo para pensar más adelante, sin prisa.',
  fallo: 'Algo que no funciona. Di en qué pantalla y con qué cliente.',
  pregunta: 'Algo que quieres saber. La respuesta aparecerá aquí.',
};

/**
 * Buzón para Claude (0065), compartido por Central y /socio. Claude Code lo lee
 * al empezar cada sesión de trabajo, lo marca como leído y deja su respuesta.
 */
export default function BuzonVista({ mensajes, esAdmin, escribir, cambiarEstado, ok, error }: {
  mensajes: MensajeBuzon[] | null; esAdmin: boolean;
  escribir: (f: FormData) => Promise<void>; cambiarEstado?: (f: FormData) => Promise<void>;
  ok?: boolean; error?: string;
}) {
  const abiertos = mensajes?.filter((m) => m.estado === 'nuevo' || m.estado === 'leido').length ?? 0;
  return (
    <div className="space-y-6">
      <section className="rounded-[22px] border border-linea bg-white p-5">
        <p className="text-sm font-semibold">Escribir a Claude</p>
        <p className="mt-1 text-xs text-niebla">Claude lo lee al empezar cada sesión de trabajo. No es para urgencias de clientes: para eso, Soporte o WhatsApp.</p>
        {ok && <p className="mt-3 rounded-2xl bg-exito/10 p-3 text-sm text-exito">Mensaje guardado. Lo verás abajo con su estado y la respuesta.</p>}
        {error && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERRORES[error] ?? 'No se pudo guardar.'}</p>}
        <form action={escribir} className="mt-3 space-y-3">
          <fieldset>
            <legend className="text-sm">¿Qué es?</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(TIPOS_BUZON).map(([v, n], i) => (
                <label key={v} title={AYUDA[v]} className="flex cursor-pointer items-center justify-center rounded-xl border border-acero px-3 py-2.5 text-sm font-medium has-[:checked]:border-tinta has-[:checked]:bg-tinta has-[:checked]:text-white">
                  <input type="radio" name="tipo" value={v} defaultChecked={i === 0} className="sr-only" />{n}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">Mensaje
            <textarea name="mensaje" required minLength={3} maxLength={4000} rows={5}
              placeholder="Cuéntalo como se lo dirías a una persona: qué quieres, dónde y para cuándo."
              className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta" />
          </label>
          <label className="block text-sm">Pantalla o cliente (opcional)
            <input name="pantalla" maxLength={300} placeholder="p. ej. Clientes → El Rincón del Flores" className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
          </label>
          <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Enviar a Claude</button>
        </form>
      </section>

      <section>
        <p className="text-sm font-semibold">{mensajes ? `${abiertos} pendientes · ${mensajes.length} en total` : 'No se pudo leer el buzón.'}</p>
        {mensajes && mensajes.length === 0 && <p className="mt-3 rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Aún no hay mensajes.</p>}
        <ul className="mt-3 space-y-3">
          {mensajes?.map((m) => (
            <li key={m.id} className="rounded-[22px] border border-linea bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-papel px-2.5 py-0.5 font-semibold text-carbon">{TIPOS_BUZON[m.tipo]}</span>
                  {esAdmin && <span className="text-niebla">{m.autorNombre}{m.autorTipo === 'socio' ? ' (socio)' : ''}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADOS_BUZON[m.estado][1]}`}>{ESTADOS_BUZON[m.estado][0]}</span>
                  <span className="text-ceniza">{fechaHora.format(new Date(m.creadoEn))}</span>
                </span>
              </div>
              {m.pantalla && <p className="mt-2 text-xs text-niebla">{m.pantalla}</p>}
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.mensaje}</p>
              {m.respuesta && (
                <div className="mt-3 rounded-2xl border-l-[3px] border-vino bg-papel px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">Respuesta de Claude{m.respondidoEn ? ` · ${fechaHora.format(new Date(m.respondidoEn))}` : ''}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{m.respuesta}</p>
                </div>
              )}
              {esAdmin && cambiarEstado && (
                <form action={cambiarEstado} className="mt-3 flex flex-wrap gap-2 text-xs">
                  <input type="hidden" name="id" value={m.id} />
                  {(['hecho', 'descartado', 'nuevo'] as EstadoBuzon[]).filter((e) => e !== m.estado).map((e) => (
                    <button key={e} name="estado" value={e} className="rounded-full bg-papel px-3 py-1.5 font-semibold hover:bg-linea">
                      {e === 'nuevo' ? 'Volver a abrir' : `Marcar ${ESTADOS_BUZON[e][0].toLowerCase()}`}
                    </button>
                  ))}
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
