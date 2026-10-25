'use client';

import { useState } from 'react';

/** Copia la propuesta con formato (text/html) para pegarla tal cual en Gmail u Outlook; si el navegador no deja, copia el texto. */
export default function CopiarCorreo({ html, texto, asunto }: { html: string; texto: string; asunto: string }) {
  const [hecho, setHecho] = useState<string | null>(null);
  async function copiar(que: 'correo' | 'asunto') {
    try {
      if (que === 'asunto') await navigator.clipboard.writeText(asunto);
      else if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([texto], { type: 'text/plain' }) })]);
      } else await navigator.clipboard.writeText(texto);
      setHecho(que === 'asunto' ? 'Asunto copiado.' : 'Correo copiado: pégalo en el cuerpo de un correo nuevo.');
    } catch {
      setHecho('El navegador no ha dejado copiar. Selecciona la vista previa y cópiala a mano.');
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => copiar('correo')} className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Copiar correo</button>
      <button onClick={() => copiar('asunto')} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold ring-1 ring-linea">Copiar asunto</button>
      {hecho && <span className="text-sm text-niebla" role="status">{hecho}</span>}
    </div>
  );
}
