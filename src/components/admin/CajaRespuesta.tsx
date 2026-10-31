'use client';

import { useRef } from 'react';

/** Caja de respuesta de Soporte con respuestas rápidas (decisión 7 de karc0, 01/11): un toque rellena el texto. */
const RAPIDAS: [string, string][] = [
  ['Ya está', 'Hola, ya lo hemos dejado resuelto. Pruébalo y, si ves algo raro, respóndenos a este mensaje.'],
  ['Lo miramos', 'Hola, gracias por avisarnos. Lo estamos revisando y te escribimos hoy mismo con la solución.'],
  ['Necesito un dato', 'Hola, para ayudarte necesitamos un dato más: ¿nos mandas una captura de la pantalla donde lo ves?'],
  ['Paso a paso', 'Hola, te lo explicamos en tres pasos:\n1. \n2. \n3. \nSi te atascas en alguno, respóndenos y lo hacemos contigo.'],
];

export default function CajaRespuesta({ inicial, hayRespuesta }: { inicial?: string; hayRespuesta: boolean }) {
  const caja = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {RAPIDAS.map(([t, txt]) => (
          <button key={t} type="button" onClick={() => { if (caja.current) { caja.current.value = txt; caja.current.focus(); } }}
            className="min-h-[36px] rounded-full border border-linea bg-white px-3 text-xs font-semibold hover:border-vino hover:text-vino">{t}</button>
        ))}
      </div>
      <textarea ref={caja} name="respuesta" required maxLength={4000} rows={6} defaultValue={inicial}
        placeholder={hayRespuesta ? 'Añadir otra respuesta (sustituye a la anterior)…' : 'Escribe la respuesta. Le llega por correo y en su panel.'}
        className="w-full rounded-2xl border border-linea bg-white px-4 py-3 text-[15px] outline-none focus:border-vino" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cerrar" className="h-4 w-4 accent-vino" /> Cerrar al enviar</label>
        <button className="dk-btn min-h-[44px] rounded-full bg-vino px-6 text-sm font-bold text-white hover:bg-vino-hondo">Enviar respuesta</button>
      </div>
    </div>
  );
}
