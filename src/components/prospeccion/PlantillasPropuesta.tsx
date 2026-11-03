'use client';

import { useState, useTransition } from 'react';
import type { BaseCrm } from '@/lib/prospeccion';
import { OFERTAS, PLANTILLAS_PROPUESTA, construirTextoPropuesta } from '@/lib/prospeccion-catalogo';
import { guardarPropuestaPlantillaAction, consultarAgenteProspeccionAction } from '@/lib/prospeccion-acciones';

const campo = 'w-full rounded-2xl border border-linea bg-white px-4 py-3 text-[15px] focus:border-vino focus:outline-none';

export default function PlantillasPropuesta({
  base,
  id,
  nombre,
  zona,
  textoInicial,
  muestraUrlInicial,
  ofertaInicial,
  demoSlug,
  sitio,
}: {
  base: BaseCrm;
  id: string;
  nombre: string;
  zona: string;
  textoInicial: string | null;
  muestraUrlInicial: string | null;
  ofertaInicial: keyof typeof OFERTAS;
  demoSlug: string | null;
  sitio: string;
}) {
  const demoUrl = demoSlug ? `${sitio}/m/${demoSlug}` : muestraUrlInicial || null;
  const panelUrl = demoSlug ? `${sitio}/demo/panel?local=${demoSlug}` : null;

  const porDefecto = textoInicial
    ? { texto: textoInicial, oferta: ofertaInicial }
    : construirTextoPropuesta(PLANTILLAS_PROPUESTA[0].id, { nombre, zona, demoUrl, panelUrl });

  const [plantillaActiva, setPlantillaActiva] = useState<string>(textoInicial ? '' : PLANTILLAS_PROPUESTA[0].id);
  const [texto, setTexto] = useState<string>(porDefecto.texto);
  const [oferta, setOferta] = useState<string>(porDefecto.oferta);
  const [muestraUrl, setMuestraUrl] = useState<string>(muestraUrlInicial || (demoSlug ? `${sitio}/m/${demoSlug}` : ''));
  const [pendienteIa, iniciarIa] = useTransition();
  const [errorIa, setErrorIa] = useState<string | null>(null);

  const mejorarConIa = () => {
    setErrorIa(null);
    iniciarIa(async () => {
      const r = await consultarAgenteProspeccionAction({
        prospectoId: id,
        modo: 'mejorar_propuesta',
        texto,
        demoSlug,
      });
      if (!r.ok) {
        setErrorIa(r.error);
        return;
      }
      setTexto(r.respuesta);
    });
  };

  const aplicarPlantilla = (pid: string) => {
    setPlantillaActiva(pid);
    const res = construirTextoPropuesta(pid, {
      nombre,
      zona,
      demoUrl: demoSlug ? `${sitio}/m/${demoSlug}` : muestraUrl || null,
      panelUrl,
    });
    setTexto(res.texto);
    setOferta(res.oferta);
    if (demoSlug && !muestraUrl) {
      setMuestraUrl(`${sitio}/m/${demoSlug}`);
    }
  };

  return (
    <form action={guardarPropuestaPlantillaAction} className="mt-3 space-y-4">
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="id" value={id} />

      <div className="rounded-2xl border border-linea bg-papel/60 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-vino">
          1. Elige una plantilla según el perfil del local y lo hablado
        </p>
        <p className="mt-0.5 text-xs text-niebla">
          Al tocar una plantilla se rellena con los datos de <span className="font-semibold text-carbon">{nombre}</span> ({zona})
          {demoSlug ? ' e incluye automáticamente el enlace a su demo y panel.' : '.'}
        </p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {PLANTILLAS_PROPUESTA.map((pl) => {
            const activa = plantillaActiva === pl.id;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => aplicarPlantilla(pl.id)}
                className={`rounded-xl border p-2.5 text-left transition ${
                  activa
                    ? 'border-vino bg-vino/10 ring-1 ring-vino'
                    : 'border-linea bg-white hover:border-vino/50'
                }`}
              >
                <p className="text-xs font-bold text-carbon">{pl.titulo}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-niebla">{pl.perfil}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-grafito">
            2. Texto personalizado de la propuesta (puedes ajustarlo antes de enviar)
          </span>
          <button
            type="button"
            disabled={pendienteIa}
            onClick={mejorarConIa}
            className="rounded-full border border-[#b08d57] bg-[#faf6ee] px-3 py-1 text-xs font-semibold text-[#5a421c] hover:bg-[#efe2c8] disabled:opacity-50"
          >
            {pendienteIa ? '✨ Mejorando con IA…' : '✨ Mejorar y personalizar propuesta con IA'}
          </button>
        </div>
        {errorIa && <p className="mt-1 text-xs text-red-700">{errorIa}</p>}
        <textarea
          name="propuesta_texto"
          maxLength={1500}
          rows={6}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={`${campo} mt-1 text-carbon`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-niebla">
          Enlace de la demo incluida en la propuesta
          <input
            name="muestra_url"
            maxLength={300}
            value={muestraUrl}
            onChange={(e) => setMuestraUrl(e.target.value)}
            placeholder="https://dkitchencorporate.es/m/…"
            className={`${campo} mt-1 text-carbon`}
          />
        </label>
        <label className="text-xs text-niebla">
          Oferta asociada
          <select
            name="oferta"
            value={oferta}
            onChange={(e) => setOferta(e.target.value)}
            className={`${campo} mt-1 text-carbon`}
          >
            {Object.entries(OFERTAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-full bg-vino px-5 py-3 text-sm font-semibold text-white hover:bg-tinta">
          Guardar propuesta y generar enlace listo para enviar →
        </button>
        {demoSlug && (
          <span className="text-xs font-medium text-emerald-800">
            ✓ Link de demo (/m/{demoSlug}) incluido automáticamente
          </span>
        )}
      </div>
    </form>
  );
}
