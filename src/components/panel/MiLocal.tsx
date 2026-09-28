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

/**
 * Upsell de diseño (QR_ANALISIS_DISENO_NIVELES §3.2). La vista previa con su
 * propia carta en diseño de autor llega con el Nivel 2; mientras, el modal
 * explica los niveles y lleva a contratar el Setup.
 */
function ModalNiveles({ onCerrar, slug }: { onCerrar: () => void; slug: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="niveles-titulo" onClick={(e) => e.stopPropagation()}
           className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1c140b] p-6 text-white sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="niveles-titulo" className="text-lg font-bold">Tu carta, a otro nivel</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-white/40 hover:text-white">✕</button>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#D9531E]/60 bg-[#D9531E]/10 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Setup Experto · Carta de Autor</p>
              <p className="text-right"><span className="text-xs text-white/40 line-through">280 €</span> <span className="text-lg font-black">199 €</span></p>
            </div>
            <p className="text-[11px] font-semibold text-[#D9531E]">Precio de lanzamiento · solo para los primeros 20 locales</p>
            <ul className="mt-2 space-y-1 text-sm text-white/75">
              <li>✓ Diseño de autor: portada con tu imagen, categorías con foto y tipografía editorial</li>
              <li>✓ Te cargamos toda la carta y optimizamos tus fotos</li>
              <li>✓ Banner de lanzamiento y ficha de Google Business optimizada</li>
              <li>✓ Contenido para tus redes del primer mes</li>
              <li>✓ 100 pegatinas QR + 100 flyers</li>
              <li>✓ Soporte premium el primer mes y 3 formaciones para tu equipo</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Setup Esencial</p>
              <p className="text-lg font-black">149 €</p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-white/65">
              <li>✓ Te cargamos toda la carta, fotos optimizadas y paleta ajustada</li>
              <li>✓ Banner de lanzamiento y ficha de Google Business</li>
              <li>✓ 50 pegatinas QR y 1 formación</li>
            </ul>
          </div>
          <p className="text-xs text-white/40">Pago único. Tu diseño lo prepara un experto de DKitchen y lo ves antes de publicarlo.</p>
          <a
            href={`/panel?pestana=soporte&asunto=${encodeURIComponent('Quiero el Setup para mi carta')}`}
            className="block rounded-xl bg-[#D9531E] py-3 text-center font-bold hover:bg-[#B8451A]"
          >
            Lo quiero
          </a>
          <a href={`/m/${slug}`} target="_blank" rel="noopener" className="block text-center text-xs text-white/40 hover:text-white">Ver mi carta actual ↗</a>
        </div>
      </div>
    </div>
  );
}

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
    whatsapp: restaurante.whatsapp ?? '',
  });
  const [verNiveles, setVerNiveles] = useState(false);
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
        <div className="flex items-start gap-4">
          <div className="w-32 shrink-0"><MiniPlantilla tipo={plantillaActual.id} color={d.colorMarca} /></div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Tu diseño</p>
            <h3 className="font-bold">{NIVELES[restaurante.nivelDiseno]?.nombre ?? 'Esencial'} · {plantillaActual.nombre}</h3>
            <p className="text-xs text-white/50">
              El diseño de tu carta lo prepara DKitchen para que se vea profesional en cualquier móvil. Tú gestionas el contenido: platos,
              fotos, precios, banners y datos del local.
            </p>
          </div>
        </div>
        {esencial ? (
          <button
            type="button"
            onClick={() => setVerNiveles(true)}
            className="w-full rounded-xl border border-[#D9531E]/50 bg-[#D9531E]/10 p-4 text-left hover:bg-[#D9531E]/15"
          >
            <p className="font-semibold">✨ Sube tu carta al diseño de autor</p>
            <p className="text-xs text-white/60">Portada con tu imagen, categorías con foto, tipografía editorial… y te la dejamos cargada y optimizada.</p>
          </button>
        ) : (
          <p className="text-xs text-white/40">¿Quieres un cambio en el diseño? Pídelo en Soporte y lo revisamos contigo.</p>
        )}
      </section>

      {verNiveles && <ModalNiveles onCerrar={() => setVerNiveles(false)} slug={restaurante.slug} />}

      <section className="bg-[#1c140b] border border-white/10 rounded-2xl p-6 space-y-5">
        <h3 className="font-bold">Identidad</h3>
        <SubirImagen valor={d.logoUrl} onCambio={(url) => setD((p) => ({ ...p, logoUrl: url }))} etiqueta="Logo" redonda />
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <label className="space-y-1">
            <span className="text-xs text-white/50">Nombre del local *</span>
            <input value={d.nombre} onChange={set('nombre')} maxLength={80} className={campo} />
          </label>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-white/50">Color de tu carta</span>
          {esencial ? (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color de la carta">
              {PALETA.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  role="radio"
                  aria-checked={d.colorMarca.toUpperCase() === c.hex}
                  aria-label={c.nombre}
                  title={c.nombre}
                  onClick={() => setD((p) => ({ ...p, colorMarca: c.hex }))}
                  className={`h-9 w-9 rounded-full border-2 ${d.colorMarca.toUpperCase() === c.hex ? 'border-white' : 'border-transparent'}`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-white/50">
              <span className="inline-block h-5 w-5 rounded-full" style={{ background: d.colorMarca }} /> Fijado por DKitchen en tu diseño de autor.
            </p>
          )}
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
