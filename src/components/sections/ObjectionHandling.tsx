import React from 'react';

/**
 * Bloque OBJECTION-HANDLING (DKITCHEN_MIGRATION_PLAN_PARTE6.md, Sección 1):
 * pregunta/respuesta corta con tratamiento visual propio — tarjetas con
 * acento de marca, no un acordeón de FAQ genérico relegado al final.
 */
export default function ObjectionHandling({
  titulo = 'Antes de que lo preguntes',
  preguntas,
  fondo = 'crema',
}: {
  titulo?: string;
  preguntas: { pregunta: string; respuesta: string }[];
  fondo?: 'crema' | 'oscuro';
}) {
  const clasesSeccion = fondo === 'oscuro' ? 'bg-[#171008] text-white' : 'bg-[#FDFCF8] text-gray-900';
  const clasesTarjeta =
    fondo === 'oscuro'
      ? 'bg-white/5 border border-white/10'
      : 'bg-white border border-gray-100 shadow-sm';
  const clasesRespuesta = fondo === 'oscuro' ? 'text-gray-400' : 'text-gray-600';

  return (
    <section className={`py-16 md:py-24 ${clasesSeccion}`}>
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-12 text-balance">{titulo}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {preguntas.map((p) => (
            <div key={p.pregunta} className={`rounded-2xl p-6 border-l-4 border-l-vino ${clasesTarjeta}`}>
              <p className="font-bold text-lg mb-2">{p.pregunta}</p>
              <p className={`leading-relaxed ${clasesRespuesta}`}>{p.respuesta}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
