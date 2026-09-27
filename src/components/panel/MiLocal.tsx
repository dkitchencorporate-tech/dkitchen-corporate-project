'use client';

import { useState, useTransition } from 'react';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { actualizarLocalAction } from '@/app/panel/actions';
import SubirImagen from './SubirImagen';

const campo = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/30';

const PLANTILLAS = [
  { id: 'clasica', nombre: 'Clásica', para: 'Restaurante, menú del día, cartas largas' },
  { id: 'visual', nombre: 'Visual', para: 'Gastro, brunch, hamburguesas: la foto vende' },
  { id: 'express', nombre: 'Express', para: 'Bar, cafetería, terraza: rápida y compacta' },
];

/** Miniatura esquemática de cada plantilla, con el color de marca elegido. */
function MiniPlantilla({ tipo, color }: { tipo: string; color: string }) {
  const barra = 'h-1.5 rounded bg-black/15';
  return (
    <div className="h-24 overflow-hidden rounded-lg bg-[#fbfaf8] p-2" aria-hidden="true">
      {tipo === 'visual' ? (
        <>
          <div className="h-8 rounded" style={{ background: color }} />
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="rounded bg-white p-1 shadow-sm">
                <div className="h-5 rounded bg-black/10" />
                <div className={`mt-1 ${barra}`} />
              </div>
            ))}
          </div>
        </>
      ) : tipo === 'express' ? (
        <>
          <div className="flex items-center gap-1 border-t-2 pt-1" style={{ borderColor: color }}>
            <div className="h-3 w-3 rounded-full bg-black/15" />
            <div className={`w-10 ${barra}`} />
          </div>
          <div className="mt-1.5 space-y-1.5 rounded bg-white p-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className={`w-12 ${barra}`} />
                <div className={`w-4 ${barra}`} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto h-4 w-4 rounded-full" style={{ background: color }} />
          <div className={`mx-auto mt-1 w-12 ${barra}`} />
          <div className="mt-2 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-1">
                <div className="h-4 w-4 rounded bg-black/10" />
                <div className="flex-1 space-y-0.5">
                  <div className={barra} />
                  <div className="h-1 w-3/4 rounded bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MiLocal({ restaurante }: { restaurante: MiRestaurante }) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [d, setD] = useState({
    nombre: restaurante.nombre,
    logoUrl: restaurante.logoUrl,
    colorMarca: restaurante.colorMarca ?? '#D9531E',
    descripcion: restaurante.descripcion ?? '',
    telefono: restaurante.telefono ?? '',
    direccion: restaurante.direccion ?? '',
    horario: restaurante.horario ?? '',
    instagram: restaurante.instagram ?? '',
    urlResenas: restaurante.urlResenas ?? '',
    plantilla: restaurante.plantilla ?? 'clasica',
    whatsapp: restaurante.whatsapp ?? '',
  });
  const ampliado = restaurante.plan === 'ampliado';
  const urlCarta = `https://dkitchencorporate.es/m/${restaurante.slug}`;
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));

  function guardar() {
    setAviso(null);
    iniciar(async () => {
      try {
        await actualizarLocalAction(d);
        setAviso({ ok: true, texto: 'Guardado. Tu carta ya muestra los cambios.' });
      } catch (e) {
        setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' });
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Mi Local</h2>
          <p className="text-sm text-white/40">Lo que tus clientes ven en la cabecera de la carta.</p>
        </div>
        <a
          href={`/m/${restaurante.slug}`}
          target="_blank"
          rel="noopener"
          className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:border-[#D9531E] hover:text-[#D9531E]"
        >
          Ver mi carta ↗
        </a>
      </div>

      <section className="bg-[#1c140b] border border-white/10 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-bold">Diseño de tu carta</h3>
          <p className="text-xs text-white/40">Elige el estilo. Todos usan tu logo y tu color de marca. Puedes cambiarlo cuando quieras.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Plantilla de la carta">
          {PLANTILLAS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={d.plantilla === p.id}
              onClick={() => setD((prev) => ({ ...prev, plantilla: p.id }))}
              className={`rounded-xl border p-3 text-left transition-colors ${
                d.plantilla === p.id ? 'border-[#D9531E] bg-[#D9531E]/10' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <MiniPlantilla tipo={p.id} color={d.colorMarca} />
              <p className="mt-2 text-sm font-semibold">{p.nombre}</p>
              <p className="text-xs text-white/40">{p.para}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40">
          Guarda y pulsa <strong>Ver mi carta</strong> para verla en vivo.
        </p>
      </section>

      <section className="bg-[#1c140b] border border-white/10 rounded-2xl p-6 space-y-5">
        <h3 className="font-bold">Identidad</h3>
        <SubirImagen valor={d.logoUrl} onCambio={(url) => setD((p) => ({ ...p, logoUrl: url }))} etiqueta="Logo" redonda />
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <label className="space-y-1">
            <span className="text-xs text-white/50">Nombre del local *</span>
            <input value={d.nombre} onChange={set('nombre')} maxLength={80} className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-white/50">Color de marca</span>
            <input type="color" value={d.colorMarca} onChange={set('colorMarca')} className="h-[42px] w-20 rounded-lg bg-black/30 border border-white/10 p-1" />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">Descripción corta ({d.descripcion.length}/280)</span>
          <textarea value={d.descripcion} onChange={set('descripcion')} maxLength={280} rows={2} placeholder="Ej: Cocina mediterránea de mercado desde 1998" className={campo} />
        </label>
      </section>

      <section className="bg-[#1c140b] border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold">Contacto y horario</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-white/50">Teléfono</span>
            <input value={d.telefono} onChange={set('telefono')} maxLength={30} placeholder="+34 600 000 000" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-white/50">Instagram</span>
            <input value={d.instagram} onChange={set('instagram')} maxLength={60} placeholder="@tulocal" className={campo} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">Dirección</span>
          <input value={d.direccion} onChange={set('direccion')} maxLength={160} placeholder="Calle, número, ciudad" className={campo} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">Horario</span>
          <input value={d.horario} onChange={set('horario')} maxLength={200} placeholder="L-V 13:00-16:00 y 20:00-23:30 · S-D 13:00-00:00" className={campo} />
        </label>
      </section>

      <section className="bg-[#1c140b] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold">Reservas y Google</h3>
          {!ampliado && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/60">Plan Ampliado</span>}
        </div>
        {ampliado ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs text-white/50">WhatsApp para recibir reservas</span>
              <input value={d.whatsapp} onChange={set('whatsapp')} maxLength={20} inputMode="tel" placeholder="600 000 000" className={campo} />
              <span className="block text-[11px] text-white/35">
                Tus clientes reservan desde la carta: te llega un correo y pueden enviártelo también por WhatsApp. Lo ves todo en la pestaña Reservas.
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-white/50">Enlace para dejar reseñas en Google</span>
              <input value={d.urlResenas} onChange={set('urlResenas')} maxLength={300} placeholder="https://g.page/r/..." className={campo} />
              <span className="block text-[11px] text-white/35">
                En tu Perfil de Empresa de Google: «Pedir reseñas» → copia el enlace y pégalo aquí. Aparecerá un botón al final de tu carta.
              </span>
            </label>
            <div className="rounded-lg bg-white/5 p-4 text-xs text-white/60 space-y-2">
              <p className="font-semibold text-white/80">Pon tu carta en Google Maps (2 minutos)</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Entra en tu Perfil de Empresa de Google (búscate en Google Maps estando conectado).</li>
                <li>Editar perfil → <strong>Menú</strong> (o «Enlace al menú») y pega esta dirección:</li>
              </ol>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-black/30 px-2 py-1.5 text-white/80 select-all">{urlCarta}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(urlCarta).then(() => setAviso({ ok: true, texto: 'Enlace copiado.' }))}
                  className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15"
                >
                  Copiar
                </button>
              </div>
              <p>Así quien te busque en Google ve tu carta siempre actualizada.</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-white/50">
            Reservas desde la carta (con aviso por correo y WhatsApp), botón de reseñas de Google y carta enlazada en Google Maps están
            incluidos en el plan Ampliado. Puedes activarlo desde <strong>Mi Plan</strong>.
          </p>
        )}
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={guardar}
          disabled={pendiente}
          className="bg-[#D9531E] hover:bg-[#B8451A] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg"
        >
          {pendiente ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {aviso && <p className={`text-sm ${aviso.ok ? 'text-green-400' : 'text-red-400'}`}>{aviso.texto}</p>}
      </div>
    </div>
  );
}
