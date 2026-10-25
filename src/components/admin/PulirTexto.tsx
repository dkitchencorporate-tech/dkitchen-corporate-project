'use client';

import { useRef, useState, useTransition } from 'react';
import { pulirTextoAction } from '@/app/admin-dkitchen/tareas/actions';

/**
 * «✨ Pulir con IA» (18/10/2026): corrige el campo de texto del mismo formulario con AI Gateway
 * (céntimos; solo cuando karc0 lo pulsa). Se reemplaza con execCommand, así Ctrl+Z lo deshace.
 */
export default function PulirTexto({ campo }: { campo: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState('');
  const [pendiente, iniciar] = useTransition();
  function pulir() {
    const el = ref.current?.closest('form')?.querySelector<HTMLTextAreaElement>(`textarea[name="${campo}"]`);
    if (!el || el.value.trim().length < 3) { setError('Escribe algo primero.'); return; }
    setError('');
    iniciar(async () => {
      const r = await pulirTextoAction(el.value);
      if (!r.ok) { setError(r.error); return; }
      el.focus();
      el.setSelectionRange(0, el.value.length);
      if (!document.execCommand('insertText', false, r.texto)) el.value = r.texto;
    });
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button ref={ref} type="button" onClick={pulir} disabled={pendiente}
        className="rounded-full border border-oro/60 bg-papel px-3.5 py-1.5 text-xs font-semibold text-vino disabled:opacity-50">
        {pendiente ? 'Puliendo…' : '✨ Pulir con IA'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
