'use client';

import { useState, useTransition } from 'react';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { actualizarLocalAction } from '@/app/panel/actions';
import SubirImagen from './SubirImagen';

const campo = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/30';

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
  });
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
        <label className="block space-y-1">
          <span className="text-xs text-white/50">Enlace de reseñas de Google (plan Ampliado)</span>
          <input value={d.urlResenas} onChange={set('urlResenas')} maxLength={300} placeholder="https://g.page/r/..." className={campo} />
        </label>
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
