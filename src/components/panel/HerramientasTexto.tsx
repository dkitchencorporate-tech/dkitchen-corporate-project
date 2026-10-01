'use client';

import { useState } from 'react';
import { mejorarTextoAction } from '@/app/panel/actions';

/**
 * Botones bajo cualquier campo de texto (01/10/2026):
 * - «Corregir»: arregla ortografía, tildes y puntuación sin cambiar lo que dices.
 * - «Mejorar»: lo reescribe más claro y apetecible, sin inventar ingredientes ni precios.
 * - «Deshacer»: vuelve a tu texto si no te gusta.
 * El «?» explica para qué sirve cada uno.
 */
export default function HerramientasTexto({
  valor, onCambio, tipo, contexto, demo = false,
}: {
  valor: string;
  onCambio: (v: string) => void;
  tipo: 'titulo' | 'descripcion' | 'instruccion';
  contexto?: string;
  demo?: boolean;
}) {
  const [pendiente, setPendiente] = useState<'' | 'corregir' | 'mejorar'>('');
  const [anterior, setAnterior] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [ayuda, setAyuda] = useState(false);
  const vacio = valor.trim().length < 2;

  async function usar(modo: 'corregir' | 'mejorar') {
    setAviso('');
    if (demo) { setAviso('En la demo no se usa el asistente.'); return; }
    setPendiente(modo);
    try {
      const r = await mejorarTextoAction(modo === 'corregir' ? 'corregir' : tipo, valor, contexto);
      if (!r.ok) throw new Error(r.error);
      if (r.texto && r.texto !== valor) { setAnterior(valor); onCambio(r.texto); setAviso(modo === 'corregir' ? 'Corregido.' : 'Mejorado. Si no te gusta, pulsa «Deshacer».'); }
      else setAviso(modo === 'corregir' ? 'No había nada que corregir.' : 'Ya estaba bien.');
    } catch (e) {
      setAviso(e instanceof Error && e.message && !/Server Components/.test(e.message) ? e.message : 'No se pudo usar el asistente ahora.');
    } finally { setPendiente(''); }
  }

  const boton = 'inline-flex items-center gap-1 rounded-full border border-[#E6E2DC] bg-white px-2.5 py-1 text-[12px] font-medium text-[#3F434B] hover:border-[#6E0C2B]/40 disabled:opacity-40';
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" disabled={vacio || !!pendiente} onClick={() => usar('corregir')} className={boton} title="Corrige ortografía, tildes y puntuación sin cambiar lo que dices">
          {pendiente === 'corregir' ? 'Corrigiendo…' : 'Aa Corregir'}
        </button>
        <button type="button" disabled={vacio || !!pendiente} onClick={() => usar('mejorar')} className={boton} title="Lo reescribe más claro y apetecible, sin inventar nada">
          {pendiente === 'mejorar' ? 'Mejorando…' : tipo === 'instruccion' ? '✨ Mejorar instrucción' : '✨ Mejorar texto'}
        </button>
        {anterior !== null && <button type="button" onClick={() => { onCambio(anterior); setAnterior(null); setAviso('Has vuelto a tu texto.'); }} className={boton}>↺ Deshacer</button>}
        <button type="button" onClick={() => setAyuda(!ayuda)} aria-expanded={ayuda} aria-label="¿Para qué sirven estos botones?" className="h-6 w-6 rounded-full border border-[#E6E2DC] bg-white text-[12px] text-[#6B7079]">?</button>
        {aviso && <span className="text-[12px] text-[#6B7079]" role="status">{aviso}</span>}
      </div>
      {ayuda && (
        <p className="mt-1.5 rounded-lg bg-[#F7F5F2] px-3 py-2 text-[12px] leading-relaxed text-[#3F434B]">
          <strong>Aa Corregir</strong> arregla faltas, tildes y puntuación sin cambiar lo que has escrito.{' '}
          {tipo === 'instruccion'
            ? <><strong>✨ Mejorar instrucción</strong> convierte lo que pides en una descripción clara para la IA (encuadre, luz, ambiente), así la imagen se parece más a lo que imaginas.</>
            : <><strong>✨ Mejorar texto</strong> lo reescribe más claro y apetecible, usando solo lo que pusiste (no inventa ingredientes ni precios).</>}{' '}
          Si no te convence, pulsa <strong>↺ Deshacer</strong>.
        </p>
      )}
    </div>
  );
}
