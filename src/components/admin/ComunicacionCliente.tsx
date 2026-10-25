'use client';

import { useRef, useState } from 'react';

/**
 * Ficha 360 → Comunicación (0089). Eliges plantilla (o mensaje libre), la retocas y:
 * enviar por correo (Arsys, con su diseño), enviar por WhatsApp (abre wa.me con el
 * texto y lo anota), guardar como nota interna, anotar una llamada o crear un
 * recordatorio con fecha (sale en Inicio). Todo queda en el historial de la ficha.
 */
type P = { id: string; nombre: string; cuando: string; asunto: string; texto: string };

export default function ComunicacionCliente({ restauranteId, email, telefono, plantillas, accion }: {
  restauranteId: string; email: string | null; telefono: string | null; plantillas: P[]; accion: (f: FormData) => void;
}) {
  const [sel, setSel] = useState(plantillas[0]?.id ?? '');
  const p = plantillas.find((x) => x.id === sel);
  const [asunto, setAsunto] = useState(p?.asunto ?? '');
  const [cuerpo, setCuerpo] = useState(p?.texto ?? '');
  const canal = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const tel = (telefono ?? '').replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1');
  const elegir = (id: string) => { const n = plantillas.find((x) => x.id === id); setSel(id); setAsunto(n?.asunto ?? ''); setCuerpo(n?.texto ?? ''); };
  const enviar = (c: string) => { if (canal.current) canal.current.value = c; form.current?.requestSubmit(); };
  const boton = 'rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-40';

  return (
    <form ref={form} action={accion} className="space-y-4">
      <input type="hidden" name="restauranteId" value={restauranteId} />
      <input type="hidden" name="email" value={email ?? ''} />
      <input type="hidden" name="plantilla" value={sel} />
      <input ref={canal} type="hidden" name="canal" value="email" />
      <div className="flex flex-wrap gap-2">
        {plantillas.map((x) => (
          <button key={x.id} type="button" onClick={() => elegir(x.id)} title={x.cuando}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${sel === x.id ? 'bg-tinta text-white' : 'border border-acero bg-white'}`}>{x.nombre}</button>
        ))}
      </div>
      {p && <p className="text-xs text-niebla">Cuándo usarla: {p.cuando}</p>}
      <label className="block text-sm font-medium">Asunto (correo)
        <input name="asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm" />
      </label>
      <label className="block text-sm font-medium">Mensaje
        <textarea name="cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={9} maxLength={8000} className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm leading-relaxed" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!email} onClick={() => enviar('email')} className={`${boton} bg-vino text-white`} title={email ? `A ${email}` : 'Sin correo'}>✉ Enviar por correo</button>
        <button type="button" disabled={!tel} onClick={() => { window.open(`https://wa.me/${tel}?text=${encodeURIComponent(cuerpo)}`, '_blank', 'noopener'); enviar('whatsapp'); }} className={`${boton} bg-[#25D366] text-white`} title={tel ? 'Abre WhatsApp con el texto y lo anota' : 'Sin teléfono en su ficha'}>WhatsApp</button>
        <button type="button" onClick={() => enviar('nota')} className={`${boton} border border-acero bg-white`}>Guardar como nota interna</button>
        <button type="button" onClick={() => enviar('llamada')} className={`${boton} border border-acero bg-white`}>Anotar llamada</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-papel p-3 text-sm">
        <span className="font-medium">Recordármelo el</span>
        <input type="date" name="recordar" className="rounded-lg border border-acero bg-white px-3 py-2 text-sm" />
        <button type="button" onClick={() => enviar('recordatorio')} className={`${boton} bg-tinta text-white`}>Crear recordatorio</button>
        <span className="w-full text-xs text-niebla">El texto del mensaje se guarda como recordatorio y sale en Inicio el día indicado.</span>
      </div>
    </form>
  );
}
