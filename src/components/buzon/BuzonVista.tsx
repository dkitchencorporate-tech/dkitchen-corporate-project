'use client';

import { useEffect, useRef, useState } from 'react';
import {
  TIPOS_BUZON,
  ESTADOS_BUZON,
  type AdjuntoBuzon,
  type EstadoBuzon,
  type MensajeBuzon,
} from '@/lib/buzon-tipos';
import { subirMediaCentral } from '@/lib/subir-media-cliente';

const fechaHora = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Madrid',
});

const ERRORES: Record<string, string> = {
  tipo: 'Elige qué tipo de mensaje es.',
  corto: 'Escribe al menos unas palabras.',
  largo: 'El mensaje es demasiado largo (máximo 4000 caracteres).',
  muchos: 'Has enviado muchos mensajes en una hora. Espera un poco.',
  base: 'No se pudo guardar. Inténtalo de nuevo.',
};

const AYUDA: Record<string, string> = {
  encargo: 'Algo que quieres que haga (p. ej. «añade el plan Sala a la tabla de precios»).',
  idea: 'Algo para pensar más adelante, sin prisa.',
  fallo: 'Algo que no funciona. Di en qué pantalla y con qué cliente.',
  pregunta: 'Algo que quieres saber. La respuesta aparecerá aquí.',
};

const MAX_ADJUNTOS = 6;

/**
 * Buzón Agente DK (0065 / 0123), compartido por Central y /socio.
 * Divide mensajes entre Pendientes (nuevo/leído) y Atendidos (hecho/descartado),
 * y permite adjuntar hasta 6 capturas o vídeos cortos (hasta 25 MB).
 */
export default function BuzonVista({
  mensajes,
  esAdmin,
  escribir,
  cambiarEstado,
  ok,
  error,
}: {
  mensajes: MensajeBuzon[] | null;
  esAdmin: boolean;
  escribir: (f: FormData) => Promise<void>;
  cambiarEstado?: (f: FormData) => Promise<void>;
  ok?: boolean;
  error?: string;
}) {
  const [pestana, setPestana] = useState<'pendientes' | 'atendidos'>('pendientes');
  const [adjuntos, setAdjuntos] = useState<AdjuntoBuzon[]>([]);
  const [subiendo, setSubiendo] = useState(0);
  const [errorMedia, setErrorMedia] = useState<string | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const formularioRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (ok) {
      setAdjuntos([]);
      setErrorMedia(null);
      formularioRef.current?.reset();
    }
  }, [ok, mensajes?.length]);

  const pendientes = mensajes?.filter((m) => m.estado === 'nuevo' || m.estado === 'leido') ?? [];
  const atendidos = mensajes?.filter((m) => m.estado === 'hecho' || m.estado === 'descartado') ?? [];
  const visibles = pestana === 'pendientes' ? pendientes : atendidos;

  async function manejarArchivos(lista: File[]) {
    const disponibles = MAX_ADJUNTOS - adjuntos.length;
    if (disponibles <= 0 || !lista.length) return;
    const lote = lista.slice(0, disponibles);
    setErrorMedia(null);
    setSubiendo((n) => n + lote.length);

    for (const f of lote) {
      try {
        const subido = await subirMediaCentral(f, 'buzon');
        setAdjuntos((prev) => (prev.length < MAX_ADJUNTOS ? [...prev, subido] : prev));
      } catch (e) {
        setErrorMedia(e instanceof Error ? e.message : 'No se pudo subir uno de los archivos.');
      } finally {
        setSubiendo((n) => Math.max(0, n - 1));
      }
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] border border-linea bg-white p-5">
        <p className="text-sm font-semibold">Escribir a Agente DK</p>
        <p className="mt-1 text-xs text-niebla">
          Agente DK lo lee al empezar cada sesión de trabajo. Puedes pegar capturas con Ctrl+V o adjuntar imágenes y vídeos cortos. No es para urgencias de clientes: para eso, Soporte o WhatsApp.
        </p>
        {ok && <p className="mt-3 rounded-2xl bg-exito/10 p-3 text-sm text-exito">Mensaje guardado. Lo verás abajo con su estado y la respuesta.</p>}
        {error && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERRORES[error] ?? 'No se pudo guardar.'}</p>}
        <form ref={formularioRef} action={escribir} className="mt-3 space-y-3">
          <input type="hidden" name="adjuntos" value={JSON.stringify(adjuntos)} />
          <fieldset>
            <legend className="text-sm">¿Qué es?</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(TIPOS_BUZON).map(([v, n], i) => (
                <label
                  key={v}
                  title={AYUDA[v]}
                  className="flex cursor-pointer items-center justify-center rounded-xl border border-acero px-3 py-2.5 text-sm font-medium has-[:checked]:border-tinta has-[:checked]:bg-tinta has-[:checked]:text-white"
                >
                  <input type="radio" name="tipo" value={v} defaultChecked={i === 0} className="sr-only" />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm">
            Mensaje
            <textarea
              name="mensaje"
              required
              minLength={3}
              maxLength={4000}
              rows={5}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files);
                if (files.length) {
                  e.preventDefault();
                  void manejarArchivos(files);
                }
              }}
              onDrop={(e) => {
                const files = Array.from(e.dataTransfer.files);
                if (files.length) {
                  e.preventDefault();
                  void manejarArchivos(files);
                }
              }}
              placeholder="Cuéntalo como se lo dirías a una persona: qué quieres, dónde y para cuándo. Puedes pegar capturas con Ctrl+V o soltar archivos aquí."
              className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta"
            />
          </label>

          <label className="block text-sm">
            Pantalla o cliente (opcional)
            <input
              name="pantalla"
              maxLength={300}
              placeholder="p. ej. Clientes → El Rincón del Flores"
              className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta"
            />
          </label>

          <div className="space-y-2 rounded-2xl border border-dashed border-acero bg-papel/50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={adjuntos.length >= MAX_ADJUNTOS}
                  onClick={() => entradaArchivo.current?.click()}
                  className="inline-flex min-h-[40px] items-center rounded-full border border-acero bg-white px-4 py-1.5 text-xs font-semibold text-carbon hover:border-vino disabled:opacity-50"
                >
                  Adjuntar captura o vídeo ({adjuntos.length}/{MAX_ADJUNTOS})
                </button>
                <input
                  ref={entradaArchivo}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    void manejarArchivos(files);
                  }}
                />
              </div>
              <span className="text-[11px] text-niebla">JPG, PNG, WebP o vídeo MP4/WebM/MOV (máx. 25 MB)</span>
            </div>

            {subiendo > 0 && <p className="text-xs font-medium text-vino">Subiendo {subiendo} archivo(s)...</p>}
            {errorMedia && <p className="text-xs text-red-700">{errorMedia}</p>}

            {adjuntos.length > 0 && (
              <ul className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3">
                {adjuntos.map((a) => (
                  <li key={a.url} className="relative overflow-hidden rounded-xl border border-linea bg-white p-1.5">
                    {a.tipo === 'video' ? (
                      <video src={a.url} controls preload="metadata" className="h-24 w-full rounded-lg bg-noche object-cover" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={a.url} alt={a.nombre ?? 'Captura adjunta'} className="h-24 w-full rounded-lg object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setAdjuntos((prev) => prev.filter((x) => x.url !== a.url))}
                      aria-label="Quitar adjunto"
                      className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-noche/90 text-xs font-bold text-white"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            disabled={subiendo > 0}
            className="inline-flex min-h-[44px] items-center rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white hover:bg-hondo disabled:opacity-50"
          >
            {subiendo > 0 ? 'Esperando subida...' : 'Enviar a Agente DK'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Estado de los mensajes" className="inline-flex rounded-full border border-linea bg-white p-1">
            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'pendientes'}
              onClick={() => setPestana('pendientes')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                pestana === 'pendientes' ? 'bg-tinta text-white' : 'text-carbon hover:bg-papel'
              }`}
            >
              Pendientes ({pendientes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'atendidos'}
              onClick={() => setPestana('atendidos')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                pestana === 'atendidos' ? 'bg-tinta text-white' : 'text-carbon hover:bg-papel'
              }`}
            >
              Atendidos ({atendidos.length})
            </button>
          </div>
          <p className="text-xs text-niebla">
            {mensajes ? `${mensajes.length} mensajes en total` : 'No se pudo leer el buzón.'}
          </p>
        </div>

        {mensajes && visibles.length === 0 && (
          <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">
            {pestana === 'pendientes'
              ? 'No hay mensajes pendientes en este momento.'
              : 'Todavía no hay mensajes atendidos o descartados.'}
          </p>
        )}

        <ul className="space-y-3">
          {visibles.map((m) => (
            <li key={m.id} className="rounded-[22px] border border-linea bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-papel px-2.5 py-0.5 font-semibold text-carbon">{TIPOS_BUZON[m.tipo]}</span>
                  {esAdmin && (
                    <span className="text-niebla">
                      {m.autorNombre}
                      {m.autorTipo === 'socio' ? ' (socio)' : ''}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADOS_BUZON[m.estado][1]}`}>
                    {ESTADOS_BUZON[m.estado][0]}
                  </span>
                  <span className="text-ceniza">{fechaHora.format(new Date(m.creadoEn))}</span>
                </span>
              </div>
              {m.pantalla && <p className="mt-2 text-xs text-niebla">{m.pantalla}</p>}
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.mensaje}</p>

              {m.adjuntos.length > 0 && (
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {m.adjuntos.map((a) => (
                    <li key={a.url} className="overflow-hidden rounded-xl border border-linea bg-papel/40 p-1.5">
                      {a.tipo === 'video' ? (
                        <video src={a.url} controls preload="metadata" className="max-h-64 w-full rounded-lg bg-noche" />
                      ) : (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt={a.nombre ?? 'Captura adjunta'} className="h-36 w-full rounded-lg object-cover" />
                        </a>
                      )}
                      {a.nombre && <p className="mt-1 truncate px-1 text-[11px] text-niebla">{a.nombre}</p>}
                    </li>
                  ))}
                </ul>
              )}

              {m.respuesta && (
                <div className="mt-3 rounded-2xl border-l-[3px] border-vino bg-papel px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">
                    Respuesta de Agente DK{m.respondidoEn ? ` · ${fechaHora.format(new Date(m.respondidoEn))}` : ''}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{m.respuesta}</p>
                </div>
              )}

              {esAdmin && cambiarEstado && (
                <form action={cambiarEstado} className="mt-3 flex flex-wrap gap-2 text-xs">
                  <input type="hidden" name="id" value={m.id} />
                  {(['hecho', 'descartado', 'nuevo'] as EstadoBuzon[])
                    .filter((e) => e !== m.estado)
                    .map((e) => (
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
