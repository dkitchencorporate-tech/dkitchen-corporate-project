'use client';

import HerramientasTexto from './HerramientasTexto';
import { mensajeError } from '@/lib/mensaje-error';
import { useState, useTransition } from 'react';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { actualizarLocalAction } from '@/app/panel/actions';
import SubirImagen from './SubirImagen';

const campo = 'w-full rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-[#1B1D22] placeholder-[#9A9EA6]';

const PLANTILLAS = [
  { id: 'clasica', nombre: 'Clásica', para: 'Restaurante, menú del día, cartas largas' },
  { id: 'editorial', nombre: 'Editorial', para: 'Cocina de autor y vinos' },
  { id: 'visual', nombre: 'Visual', para: 'Gastro, brunch, hamburguesas: la foto vende' },
  { id: 'express', nombre: 'Express', para: 'Bar, cafetería, terraza: rápida y compacta' },
];

/** Paleta curada del nivel Esencial: la misma lista blanca que dk.paleta_esencial() (0026). */
const PALETA = [
  { hex: '#D9531E', nombre: 'Naranja teja' },
  { hex: '#B23A48', nombre: 'Burdeos' },
  { hex: '#C58B2A', nombre: 'Mostaza' },
  { hex: '#2F5D50', nombre: 'Verde oliva' },
  { hex: '#1F4E79', nombre: 'Azul marino' },
  { hex: '#5B3E8A', nombre: 'Ciruela' },
  { hex: '#6B4E2E', nombre: 'Café' },
  { hex: '#1A1714', nombre: 'Carbón' },
];

const NIVELES: Record<string, { nombre: string }> = {
  esencial: { nombre: 'Esencial' },
  autor: { nombre: 'Carta de Autor' },
  signature: { nombre: 'Signature' },
};

/** Miniatura esquemática de cada plantilla, con el color de marca elegido. */
function MiniPlantilla({ tipo, color }: { tipo: string; color: string }) {
  const barra = 'h-1.5 rounded bg-white';
  return (
    <div className="h-24 overflow-hidden rounded-lg bg-[#fbfaf8] p-2" aria-hidden="true">
      {tipo === 'visual' ? (
        <>
          <div className="h-8 rounded" style={{ background: color }} />
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="rounded bg-white p-1 shadow-sm">
                <div className="h-5 rounded bg-white" />
                <div className={`mt-1 ${barra}`} />
              </div>
            ))}
          </div>
        </>
      ) : tipo === 'express' ? (
        <>
          <div className="flex items-center gap-1 border-t-2 pt-1" style={{ borderColor: color }}>
            <div className="h-3 w-3 rounded-full bg-white" />
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
                <div className="h-4 w-4 rounded bg-white" />
                <div className="flex-1 space-y-0.5">
                  <div className={barra} />
                  <div className="h-1 w-3/4 rounded bg-white" />
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
    whatsapp: restaurante.whatsapp ?? '',
  });
  const esencial = restaurante.nivelDiseno === 'esencial';
  const plantillaActual = PLANTILLAS.find((p) => p.id === restaurante.plantilla) ?? PLANTILLAS[0];
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
        setAviso({ ok: false, texto: mensajeError(e, 'No se pudo guardar.') });
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Mi Local</h2>
          <p className="text-sm text-[#6B7079]">Lo que tus clientes ven en la cabecera de la carta.</p>
        </div>
        <a
          href={`/m/${restaurante.slug}`}
          target="_blank"
          rel="noopener"
          className="shrink-0 rounded-lg border border-[#D6D6D1] px-3 py-2 text-sm font-semibold hover:border-[#6E0C2B] hover:text-[#6E0C2B]"
        >
          Ver mi carta ↗
        </a>
      </div>

      <section className="bg-white border border-[#E6E6E2] rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-32 shrink-0"><MiniPlantilla tipo={plantillaActual.id} color={d.colorMarca} /></div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7079]">Tu diseño</p>
            <h3 className="text-lg font-semibold">{NIVELES[restaurante.nivelDiseno]?.nombre ?? 'Esencial'} · {plantillaActual.nombre}</h3>
            <p className="text-xs text-[#6B7079]">
              El diseño de tu carta lo prepara DKitchen para que se vea profesional en cualquier móvil. Tú gestionas el contenido: platos,
              fotos, precios, banners y datos del local.
            </p>
          </div>
        </div>
        {esencial ? (
          <a
            href="/panel?pestana=diseno"
            className="block w-full rounded-full border border-[#6E0C2B]/50 bg-[#6E0C2B]/10 p-4 text-left hover:bg-[#6E0C2B]/15"
          >
            <p className="font-semibold">Sube tu carta al diseño de autor</p>
            <p className="text-xs text-[#6B7079]">Portada con tu imagen, categorías con foto, tipografía editorial… y te la dejamos cargada y optimizada. Ver niveles de diseño →</p>
          </a>
        ) : (
          <p className="text-xs text-[#6B7079]">¿Quieres un cambio en el diseño? Pídelo en Soporte y lo revisamos contigo.</p>
        )}
      </section>


      <section className="bg-white border border-[#E6E6E2] rounded-2xl p-6 space-y-5">
        <h3 className="text-lg font-semibold">Identidad</h3>
        <SubirImagen valor={d.logoUrl} onCambio={(url) => setD((p) => ({ ...p, logoUrl: url }))} etiqueta="Logo" redonda ia={{ modo: 'logo' }} />
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <label className="space-y-1">
            <span className="text-xs text-[#6B7079]">Nombre del local *</span>
            <input value={d.nombre} onChange={set('nombre')} maxLength={80} className={campo} />
          </label>
        </div>
        <p className="text-xs text-[#6B7079]">El estilo, el fondo, la letra y el color de tu carta se eligen en la pestaña <a href="/panel?pestana=diseno" className="font-semibold text-[#6E0C2B] underline">Diseño</a>.</p>
        <label className="block space-y-1">
          <span className="text-xs text-[#6B7079]">Descripción corta ({d.descripcion.length}/280)</span>
          <textarea value={d.descripcion} onChange={set('descripcion')} maxLength={280} rows={2} spellCheck lang="es" placeholder="Ej: Cocina mediterránea de mercado desde 1998" className={campo} />
          <HerramientasTexto valor={d.descripcion} onCambio={(v) => setD((p) => ({ ...p, descripcion: v.slice(0, 280) }))} tipo="descripcion" />
        </label>
      </section>

      <section className="bg-white border border-[#E6E6E2] rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">Contacto y horario</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-[#6B7079]">Teléfono</span>
            <input value={d.telefono} onChange={set('telefono')} maxLength={30} placeholder="+34 600 000 000" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#6B7079]">Instagram</span>
            <input value={d.instagram} onChange={set('instagram')} maxLength={60} placeholder="@tulocal" className={campo} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-[#6B7079]">Dirección</span>
          <input value={d.direccion} onChange={set('direccion')} maxLength={160} placeholder="Calle, número, ciudad" className={campo} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-[#6B7079]">Horario</span>
          <input value={d.horario} onChange={set('horario')} maxLength={200} placeholder="L-V 13:00-16:00 y 20:00-23:30 · S-D 13:00-00:00" className={campo} />
        </label>
      </section>

      <section className="bg-white border border-[#E6E6E2] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Reservas y Google</h3>
          {!ampliado && <span className="rounded-full bg-[#EDEDEA] px-2 py-0.5 text-[11px] font-semibold text-[#6B7079]">Plan Ampliado</span>}
        </div>
        {ampliado ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs text-[#6B7079]">WhatsApp para recibir reservas</span>
              <input value={d.whatsapp} onChange={set('whatsapp')} maxLength={20} inputMode="tel" placeholder="600 000 000" className={campo} />
              <span className="block text-[11px] text-[#9A9EA6]">
                Tus clientes reservan desde la carta: te llega un correo y pueden enviártelo también por WhatsApp. Lo ves todo en la pestaña Reservas.
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[#6B7079]">Enlace para dejar reseñas en Google</span>
              <input value={d.urlResenas} onChange={set('urlResenas')} maxLength={300} placeholder="https://g.page/r/..." className={campo} />
              <span className="block text-[11px] text-[#9A9EA6]">
                En tu Perfil de Empresa de Google: «Pedir reseñas» → copia el enlace y pégalo aquí. Aparecerá un botón al final de tu carta.
              </span>
            </label>
            <div className="rounded-lg bg-[#F3F3F0] p-4 text-xs text-[#6B7079] space-y-2">
              <p className="font-semibold text-[#3F434B]">Pon tu carta en Google Maps (2 minutos)</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Entra en tu Perfil de Empresa de Google (búscate en Google Maps estando conectado).</li>
                <li>Editar perfil → <strong>Menú</strong> (o «Enlace al menú») y pega esta dirección:</li>
              </ol>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-[#3F434B] select-all">{urlCarta}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(urlCarta).then(() => setAviso({ ok: true, texto: 'Enlace copiado.' }))}
                  className="shrink-0 rounded-md bg-[#EDEDEA] px-3 py-1.5 font-semibold hover:bg-[#E5E5E1]"
                >
                  Copiar
                </button>
              </div>
              <p>Así quien te busque en Google ve tu carta siempre actualizada.</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#6B7079]">
            Reservas desde la carta (con aviso por correo y WhatsApp), botón de reseñas de Google y carta enlazada en Google Maps están
            incluidos en el plan Ampliado. Puedes activarlo desde <strong>Mi Plan</strong>.
          </p>
        )}
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={guardar}
          disabled={pendiente}
          className="bg-[#6E0C2B] hover:bg-[#4A0819] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-full"
        >
          {pendiente ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {aviso && <p className={`text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
      </div>
    </div>
  );
}
