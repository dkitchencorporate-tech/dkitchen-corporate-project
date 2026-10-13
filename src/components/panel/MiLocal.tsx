'use client';

import HerramientasTexto from './HerramientasTexto';
import { mensajeError } from '@/lib/mensaje-error';
import { useState, useTransition } from 'react';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { actualizarLocalAction } from '@/app/panel/actions';
import SubirImagen from './SubirImagen';
import { avisarEstudio } from './EstudioMarco';

const campo = 'w-full rounded-lg bg-white border border-acero px-3 py-2 text-carbon placeholder-ceniza';

/** Paleta curada del nivel Esencial: la misma lista blanca que dk.paleta_esencial() (0026). */
const PALETA = [
  { hex: '#6E0C2B', nombre: 'Naranja teja' },
  { hex: '#B23A48', nombre: 'Burdeos' },
  { hex: '#C58B2A', nombre: 'Mostaza' },
  { hex: '#2F5D50', nombre: 'Verde oliva' },
  { hex: '#1F4E79', nombre: 'Azul marino' },
  { hex: '#5B3E8A', nombre: 'Ciruela' },
  { hex: '#6B4E2E', nombre: 'Café' },
  { hex: '#1A1714', nombre: 'Carbón' },
];

export default function MiLocal({ restaurante }: { restaurante: MiRestaurante }) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [d, setD] = useState({
    nombre: restaurante.nombre,
    logoUrl: restaurante.logoUrl,
    colorMarca: restaurante.colorMarca ?? '#6E0C2B',
    descripcion: restaurante.descripcion ?? '',
    telefono: restaurante.telefono ?? '',
    direccion: restaurante.direccion ?? '',
    horario: restaurante.horario ?? '',
    instagram: restaurante.instagram ?? '',
    urlResenas: restaurante.urlResenas ?? '',
    whatsapp: restaurante.whatsapp ?? '',
  });
  const ampliado = restaurante.plan !== 'basico';
  const urlCarta = `https://dkitchencorporate.es/m/${restaurante.slug}`;
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));

  function guardar() {
    setAviso(null);
    iniciar(async () => {
      try {
        await actualizarLocalAction(d);
        setAviso({ ok: true, texto: 'Guardado. Tu carta y tu landing ya muestran los cambios.' });
        avisarEstudio({ recargar: true });
      } catch (e) {
        setAviso({ ok: false, texto: mensajeError(e, 'No se pudo guardar.') });
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Identidad</h2>
          <p className="text-sm text-niebla">Nombre, logo, horario, dirección y contacto: salen en tu carta y en tu landing a la vez.</p>
        </div>
        <a
          href={`/m/${restaurante.slug}`}
          target="_blank"
          rel="noopener"
          className="shrink-0 rounded-lg border border-linea-fuerte px-3 py-2 text-sm font-semibold hover:border-vino hover:text-vino"
        >
          Ver mi carta ↗
        </a>
      </div>



      <section className="bg-white border border-linea rounded-2xl p-6 space-y-5">
        <h3 className="text-lg font-semibold">Identidad</h3>
        <div data-tutorial="logo">
          <SubirImagen valor={d.logoUrl} onCambio={(url) => setD((p) => ({ ...p, logoUrl: url }))} etiqueta="Logo" redonda ia={{ modo: 'logo' }} />
        </div>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <label className="space-y-1">
            <span className="text-xs text-niebla">Nombre del local *</span>
            <input value={d.nombre} onChange={set('nombre')} maxLength={80} className={campo} />
          </label>
        </div>
        <p className="text-xs text-niebla">El estilo, el fondo, la letra y el color de tu carta se eligen en <a href="/panel?pestana=diseno" className="font-semibold text-vino underline">Estudio → Estilo</a>.</p>
        <label className="block space-y-1">
          <span className="text-xs text-niebla">Descripción corta ({d.descripcion.length}/280)</span>
          <textarea value={d.descripcion} onChange={set('descripcion')} maxLength={280} rows={2} spellCheck lang="es" placeholder="Ej: Cocina mediterránea de mercado desde 1998" className={campo} />
          <HerramientasTexto valor={d.descripcion} onCambio={(v) => setD((p) => ({ ...p, descripcion: v.slice(0, 280) }))} tipo="descripcion" />
        </label>
      </section>

      <section className="bg-white border border-linea rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">Contacto y horario</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-niebla">Teléfono</span>
            <input value={d.telefono} onChange={set('telefono')} maxLength={30} placeholder="+34 600 000 000" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-niebla">Instagram</span>
            <input value={d.instagram} onChange={set('instagram')} maxLength={60} placeholder="@tulocal" className={campo} />
          </label>
        </div>
        <div data-tutorial="datos-local" className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs text-niebla">Dirección</span>
          <input value={d.direccion} onChange={set('direccion')} maxLength={160} placeholder="Calle, número, ciudad" className={campo} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-niebla">Horario</span>
          <input value={d.horario} onChange={set('horario')} maxLength={200} placeholder="L-V 13:00-16:00 y 20:00-23:30 · S-D 13:00-00:00" className={campo} />
        </label>
        </div>
      </section>

      <section className="bg-white border border-linea rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Reservas y Google</h3>
        </div>
        {(
          <>
            <label className="block space-y-1">
              <span className="text-xs text-niebla">WhatsApp para recibir reservas</span>
              <input value={d.whatsapp} onChange={set('whatsapp')} maxLength={20} inputMode="tel" placeholder="600 000 000" className={campo} />
              <span className="block text-[11px] text-ceniza">
                Tus clientes reservan desde la carta: te llega un correo y pueden enviártelo también por WhatsApp. Lo ves todo en la pestaña Reservas.
              </span>
            </label>
            {ampliado ? <label className="block space-y-1">
              <span className="text-xs text-niebla">Enlace para dejar reseñas en Google</span>
              <input value={d.urlResenas} onChange={set('urlResenas')} maxLength={300} placeholder="https://g.page/r/..." className={campo} />
              <span className="block text-[11px] text-ceniza">
                En tu Perfil de Empresa de Google: «Pedir reseñas» → copia el enlace y pégalo aquí. Aparecerá un botón al final de tu carta.
              </span>
            </label> : <p className="text-xs text-niebla">El botón de reseñas de Google en tu carta está en el plan Local. Puedes subir desde <strong>Mi Plan</strong>.</p>}
            <div className="rounded-lg bg-papel p-4 text-xs text-niebla space-y-2">
              <p className="font-semibold text-grafito">Pon tu carta en Google Maps (2 minutos)</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Entra en tu Perfil de Empresa de Google (búscate en Google Maps estando conectado).</li>
                <li>Editar perfil → <strong>Menú</strong> (o «Enlace al menú») y pega esta dirección:</li>
              </ol>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-grafito select-all">{urlCarta}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(urlCarta).then(() => setAviso({ ok: true, texto: 'Enlace copiado.' }))}
                  className="shrink-0 rounded-md bg-papel px-3 py-1.5 font-semibold hover:bg-linea"
                >
                  Copiar
                </button>
              </div>
              <p>Así quien te busque en Google ve tu carta siempre actualizada.</p>
            </div>
          </>
        )}
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={guardar}
          disabled={pendiente}
          className="bg-vino hover:bg-vino-hondo disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-full"
        >
          {pendiente ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {aviso && <p className={`text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
      </div>
    </div>
  );
}
