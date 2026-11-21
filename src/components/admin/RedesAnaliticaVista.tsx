'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ESTADOS_ANALITICA,
  REDES_SOCIALES,
  type CapturaRed,
  type EntradaRedAnalitica,
  type EstadoAnaliticaRed,
  type RedSocial,
} from '@/lib/redes-analitica-tipos';
import { subirMediaCentral } from '@/lib/subir-media-cliente';

const MAX_CAPTURAS = 10;

const formatoDia = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
});

const formatoHora = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Madrid',
});

export default function RedesAnaliticaVista({
  entradas,
  fechaHoy,
  ok,
  crearAction,
  actualizarAction,
  borrarAction,
}: {
  entradas: EntradaRedAnalitica[];
  fechaHoy: string;
  ok?: string;
  crearAction: (f: FormData) => Promise<void>;
  actualizarAction: (f: FormData) => Promise<void>;
  borrarAction: (f: FormData) => Promise<void>;
}) {
  const [capturas, setCapturas] = useState<CapturaRed[]>([]);
  const [subiendo, setSubiendo] = useState(0);
  const [errorMedia, setErrorMedia] = useState<string | null>(null);
  const [filtroRed, setFiltroRed] = useState<'todas' | RedSocial>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoAnaliticaRed>('todos');
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const formCrearRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (ok === 'creado') {
      setCapturas([]);
      setErrorMedia(null);
      formCrearRef.current?.reset();
    }
  }, [ok, entradas.length]);

  async function manejarCapturas(files: File[]) {
    const disponibles = MAX_CAPTURAS - capturas.length;
    if (disponibles <= 0 || !files.length) return;
    const lote = files.slice(0, disponibles);
    setErrorMedia(null);
    setSubiendo((n) => n + lote.length);

    for (const f of lote) {
      try {
        const subido = await subirMediaCentral(f, 'redes');
        if (subido.tipo !== 'imagen') continue;
        const cap: CapturaRed = { url: subido.url, tipo: 'imagen', nombre: subido.nombre };
        setCapturas((prev) => (prev.length < MAX_CAPTURAS ? [...prev, cap] : prev));
      } catch (e) {
        setErrorMedia(e instanceof Error ? e.message : 'No se pudo subir una captura.');
      } finally {
        setSubiendo((n) => Math.max(0, n - 1));
      }
    }
  }

  const visibles = entradas.filter((e) => {
    if (filtroRed !== 'todas' && e.red !== filtroRed) return false;
    if (filtroEstado !== 'todos' && e.estado !== filtroEstado) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] border border-linea bg-white p-5">
        <h2 className="text-base font-semibold">Subir capturas de resultados</h2>
        <p className="mt-1 text-xs text-niebla">
          Sube las capturas del panel profesional (Instagram, Facebook, TikTok o resumen general) y anota lo relevante. Puedes elegir archivos, arrastrarlos o pegarlos con Ctrl+V.
        </p>

        <form ref={formCrearRef} action={crearAction} className="mt-4 space-y-4">
          <input type="hidden" name="capturas" value={JSON.stringify(capturas)} />

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              Red
              <select
                name="red"
                defaultValue="instagram"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-acero bg-white px-3.5 py-2 text-sm outline-none focus:border-tinta"
              >
                {Object.entries(REDES_SOCIALES).map(([k, info]) => (
                  <option key={k} value={k}>
                    {info.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Fecha del corte
              <input
                type="date"
                name="fecha"
                defaultValue={fechaHoy}
                required
                className="mt-1 min-h-[44px] w-full rounded-xl border border-acero bg-white px-3.5 py-2 text-sm outline-none focus:border-tinta"
              />
            </label>

            <label className="block text-sm">
              Título o referencia
              <input
                name="titulo"
                required
                minLength={2}
                maxLength={160}
                placeholder="p. ej. Resultados Reels 21/11"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-acero bg-white px-3.5 py-2 text-sm outline-none focus:border-tinta"
              />
            </label>
          </div>

          <label className="block text-sm">
            Notas de Dirección (cifras clave, observaciones o campaña)
            <textarea
              name="notas_alex"
              rows={3}
              maxLength={4000}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files);
                if (files.length) {
                  e.preventDefault();
                  void manejarCapturas(files);
                }
              }}
              onDrop={(e) => {
                const files = Array.from(e.dataTransfer.files);
                if (files.length) {
                  e.preventDefault();
                  void manejarCapturas(files);
                }
              }}
              placeholder="Ej.: alcance, retención a 3 s, clics al perfil, DMs o dudas concretas. Pega capturas aquí con Ctrl+V."
              className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta"
            />
          </label>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void manejarCapturas(Array.from(e.dataTransfer.files));
            }}
            className="space-y-3 rounded-2xl border border-dashed border-acero bg-papel/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={capturas.length >= MAX_CAPTURAS}
                onClick={() => entradaArchivo.current?.click()}
                className="inline-flex min-h-[42px] items-center rounded-full border border-acero bg-white px-4 py-2 text-xs font-semibold text-carbon hover:border-vino disabled:opacity-50"
              >
                Añadir capturas ({capturas.length}/{MAX_CAPTURAS})
              </button>
              <span className="text-[11px] text-niebla">JPG, PNG o WebP (se comprimen automáticamente)</span>
              <input
                ref={entradaArchivo}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  void manejarCapturas(files);
                }}
              />
            </div>

            {subiendo > 0 && <p className="text-xs font-medium text-vino">Subiendo {subiendo} captura(s)...</p>}
            {errorMedia && <p className="text-xs text-red-700">{errorMedia}</p>}

            {capturas.length > 0 && (
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                {capturas.map((c) => (
                  <li key={c.url} className="relative overflow-hidden rounded-xl border border-linea bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt={c.nombre ?? 'Captura de redes'} className="h-24 w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setCapturas((prev) => prev.filter((x) => x.url !== c.url))}
                      aria-label="Quitar captura"
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-noche/90 text-xs font-bold text-white"
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
            {subiendo > 0 ? 'Esperando capturas...' : 'Registrar capturas para análisis'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(['todas', 'instagram', 'facebook', 'tiktok', 'general'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFiltroRed(r)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filtroRed === r ? 'bg-tinta text-white' : 'border border-linea bg-white text-carbon hover:bg-papel'
                }`}
              >
                {r === 'todas' ? 'Todas las redes' : REDES_SOCIALES[r].nombre}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['todos', 'pendiente_analisis', 'analizado', 'aplicado'] as const).map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setFiltroEstado(est)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filtroEstado === est ? 'bg-oro text-noche font-semibold' : 'border border-linea bg-white text-niebla hover:text-carbon'
                }`}
              >
                {est === 'todos' ? 'Todos los estados' : ESTADOS_ANALITICA[est].nombre}
              </button>
            ))}
          </div>
        </div>

        {visibles.length === 0 ? (
          <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">
            No hay entradas registradas con este filtro.
          </p>
        ) : (
          <ul className="space-y-4">
            {visibles.map((e) => (
              <li key={e.id} id={`e-${e.id}`} className="scroll-mt-24 rounded-[22px] border border-linea bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${REDES_SOCIALES[e.red].chip}`}>
                        {REDES_SOCIALES[e.red].nombre}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADOS_ANALITICA[e.estado].chip}`}>
                        {ESTADOS_ANALITICA[e.estado].nombre}
                      </span>
                      <span className="text-niebla">{formatoDia.format(new Date(`${e.fecha}T12:00:00`))}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-tinta">{e.titulo}</h3>
                  </div>
                  <p className="text-[11px] text-ceniza">
                    {e.autorNombre} · act. {formatoHora.format(new Date(e.actualizadoEn))}
                  </p>
                </div>

                {e.notasAlex && (
                  <div className="mt-3 rounded-2xl border border-linea bg-papel/50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-niebla">Notas de Dirección</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{e.notasAlex}</p>
                  </div>
                )}

                {e.capturas.length > 0 && (
                  <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                    {e.capturas.map((cap) => (
                      <li key={cap.url} className="overflow-hidden rounded-xl border border-linea bg-papel/40">
                        <a href={cap.url} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cap.url} alt={cap.nombre ?? e.titulo} className="h-32 w-full object-cover transition hover:opacity-90" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border-l-[3px] border-vino bg-papel px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">Análisis de Agente DK</p>
                    {e.analisisDk ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm">{e.analisisDk}</p>
                    ) : (
                      <p className="mt-1 text-xs text-niebla">Pendiente de lectura y análisis de Agente DK.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border-l-[3px] border-oro bg-noche px-4 py-3 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-oro">Rumbo diario</p>
                    {e.rumboDiario ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">{e.rumboDiario}</p>
                    ) : (
                      <p className="mt-1 text-xs text-white/60">Sin rumbo fijado todavía para esta tanda.</p>
                    )}
                  </div>
                </div>

                <details className="mt-4 rounded-2xl border border-linea p-3.5">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-vino">
                    Editar análisis, rumbo diario o estado
                  </summary>
                  <div className="mt-3 space-y-4">
                    <form action={actualizarAction} className="space-y-3">
                      <input type="hidden" name="id" value={e.id} />
                      <label className="block text-xs font-medium">
                        Estado
                        <select
                          name="estado"
                          defaultValue={e.estado}
                          className="mt-1 min-h-[42px] w-full rounded-xl border border-acero bg-white px-3 py-2 text-sm outline-none focus:border-tinta"
                        >
                          {Object.entries(ESTADOS_ANALITICA).map(([k, info]) => (
                            <option key={k} value={k}>
                              {info.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-medium">
                        Notas de Dirección
                        <textarea
                          name="notas_alex"
                          defaultValue={e.notasAlex ?? ''}
                          rows={2}
                          maxLength={4000}
                          className="mt-1 w-full rounded-xl border border-acero bg-white px-3 py-2 text-sm outline-none focus:border-tinta"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Análisis de Agente DK
                        <textarea
                          name="analisis_dk"
                          defaultValue={e.analisisDk ?? ''}
                          rows={3}
                          maxLength={8000}
                          className="mt-1 w-full rounded-xl border border-acero bg-white px-3 py-2 text-sm outline-none focus:border-tinta"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Rumbo diario / Siguiente paso
                        <textarea
                          name="rumbo_diario"
                          defaultValue={e.rumboDiario ?? ''}
                          rows={2}
                          maxLength={4000}
                          className="mt-1 w-full rounded-xl border border-acero bg-white px-3 py-2 text-sm outline-none focus:border-tinta"
                        />
                      </label>
                      <button className="inline-flex min-h-[40px] items-center rounded-full bg-tinta px-4 py-2 text-xs font-semibold text-white hover:bg-vino">
                        Guardar cambios
                      </button>
                    </form>

                    <form action={borrarAction} className="flex flex-wrap items-center gap-2 border-t border-linea pt-3 text-xs">
                      <input type="hidden" name="id" value={e.id} />
                      <label className="flex items-center gap-1.5 text-niebla">
                        <input type="checkbox" name="confirmo" value="si" required /> Confirmo borrar esta entrada
                      </label>
                      <button className="inline-flex min-h-[36px] items-center rounded-full border border-red-300 px-3 py-1 font-semibold text-red-700 hover:bg-red-600 hover:text-white">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
