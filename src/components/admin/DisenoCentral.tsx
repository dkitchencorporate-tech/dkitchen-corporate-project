'use client';

import { useState } from 'react';
import { VistaAutor } from '@/components/panel/EstiloCarta';
import { FICHAS_COMPOSICION, ADORNOS, esComposicion, type Firma } from '@/lib/composiciones';

/**
 * Ficha 360 · Diseño (R3 + tarea 4, 19/10/2026): DKitchen monta desde Central
 * la carta de autor completa del cliente, igual que él en su panel pero con el
 * color libre y el nivel: composición, fondo, letra, color, firma y vista previa
 * en vivo. Guarda con dk.admin_guardar_diseno (0096).
 */
const PREMIUM = [
  { id: 'premium', nombre: 'Premium · Gran foto' }, { id: 'clasica', nombre: 'Premium · Autor' },
  { id: 'editorial', nombre: 'Premium · Autor (vinos)' }, { id: 'visual', nombre: 'Premium · Gran foto (brunch)' }, { id: 'express', nombre: 'Premium · Autor (bar)' },
];

export default function DisenoCentral({ accion, restauranteId, slug, nombre, logo, portada, fotos, inicial }: {
  accion: (f: FormData) => Promise<void>; restauranteId: string; slug: string; nombre: string; logo: string | null; portada: string | null; fotos: string[];
  inicial: { plantilla: string; nivel: string; fondo: string; letra: string; color: string; firma: Firma };
}) {
  const [d, setD] = useState(inicial);
  const firma = (k: keyof Firma, v: string) => setD({ ...d, firma: { ...d.firma, [k]: v } as Firma });
  const caja = 'mt-1 w-full rounded-lg border border-acero bg-white px-3 py-2 text-sm';
  const tema = d.fondo === 'oscuro' ? 'noir' : 'crema';
  return (
    <form action={accion} className="mt-5 grid gap-8 lg:grid-cols-[1fr_250px]">
      <input type="hidden" name="restauranteId" value={restauranteId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="space-y-5 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ceniza">Composición de autor</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {FICHAS_COMPOSICION.map((x) => (
              <button key={x.id} type="button" onClick={() => setD({ ...d, plantilla: x.id })} aria-pressed={d.plantilla === x.id}
                className={`rounded-xl border p-3 text-left ${d.plantilla === x.id ? 'border-vino bg-vino/[.05]' : 'border-linea hover:border-linea-fuerte'}`}>
                <span className="block font-semibold">{x.nombre.replace('De autor · ', '')}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-niebla">{x.muestra.join(' · ')}</span>
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs text-niebla">O una Premium
            <select name="plantilla" value={d.plantilla} onChange={(e) => setD({ ...d, plantilla: e.target.value })} className={caja}>
              {FICHAS_COMPOSICION.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              {PREMIUM.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-xs text-niebla">Nivel
            <select name="nivel" value={d.nivel} onChange={(e) => setD({ ...d, nivel: e.target.value })} className={caja}>
              <option value="esencial">Esencial (el cliente puede cambiarlo)</option>
              <option value="autor">Carta de Autor (bloqueado)</option>
              <option value="signature">Signature (bloqueado)</option>
            </select>
          </label>
          <label className="block text-xs text-niebla">Fondo
            <select name="fondo" value={d.fondo} onChange={(e) => setD({ ...d, fondo: e.target.value })} className={caja}>
              <option value="papel">Papel</option><option value="blanco">Blanco</option><option value="oscuro">Oscuro</option>
            </select>
          </label>
          <label className="block text-xs text-niebla">Letra (Premium)
            <select name="letra" value={d.letra} onChange={(e) => setD({ ...d, letra: e.target.value })} className={caja}>
              <option value="sans">Moderna</option><option value="serif">Clásica</option>
            </select>
          </label>
          <label className="block text-xs text-niebla">Color (libre)
            <input type="color" name="color" value={d.color} onChange={(e) => setD({ ...d, color: e.target.value.toUpperCase() })} className="mt-1 h-[38px] w-full rounded-lg border border-acero bg-white p-1" />
          </label>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ceniza">Firma de la carta</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-niebla">Lema bajo el nombre<input name="lema" maxLength={120} value={d.firma.lema ?? ''} onChange={(e) => firma('lema', e.target.value)} className={caja} placeholder="Cocina de mercado desde 1987" /></label>
            <label className="block text-xs text-niebla">Título de los recomendados<input name="destacados" maxLength={40} value={d.firma.destacados ?? ''} onChange={(e) => firma('destacados', e.target.value)} className={caja} placeholder="Selección del chef" /></label>
            <label className="block text-xs text-niebla">Quién firma la nota<input name="autor" maxLength={60} value={d.firma.autor ?? ''} onChange={(e) => firma('autor', e.target.value)} className={caja} placeholder="Chef Marta Ruiz" /></label>
            <label className="block text-xs text-niebla">Adorno
              <select name="adorno" value={d.firma.adorno ?? 'rombo'} onChange={(e) => firma('adorno', e.target.value)} className={caja}>
                {ADORNOS.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </label>
            <label className="block text-xs text-niebla sm:col-span-2">Nota del chef o de la casa<textarea name="nota" maxLength={400} rows={3} value={d.firma.nota ?? ''} onChange={(e) => firma('nota', e.target.value)} className={caja} /></label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-full bg-vino px-5 py-2.5 font-bold text-white hover:bg-vino-hondo">Aplicar diseño</button>
          <a href={`/m/${slug}${esComposicion(d.plantilla) ? `?vista=${d.plantilla}&tema=${tema}` : ''}`} target="_blank" rel="noopener" className="rounded-full border border-linea-fuerte px-4 py-2.5 font-semibold hover:border-vino">Ver su carta así ↗</a>
          <span className="text-xs text-niebla">La vista previa usa sus fotos; el color y la firma se ven en la carta al aplicar.</span>
        </div>
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-ceniza">Vista previa</p>
        {esComposicion(d.plantilla)
          ? <VistaAutor e={{ plantilla: d.plantilla, fondo: d.fondo, letra: d.letra, color: d.color, firma: d.firma }} nombre={nombre} fotos={fotos} portada={portada} logo={logo} />
          : <p className="rounded-xl border border-linea p-4 text-center text-xs text-niebla">Las Premium se ven en «Ver su carta así».</p>}
      </div>
    </form>
  );
}
