'use client';

import React from 'react';
import Link from 'next/link';

export default function CentroControlManual() {
  return (
    <div className="print:block">
      <div className="flex justify-between items-center mb-8 print:hidden border-b border-white/10 pb-6">
        <Link href="/manuals" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">
          &larr; Volver al Índice
        </Link>
        <button 
          onClick={() => window.print()}
          className="bg-white text-black text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Exportar PDF
        </button>
      </div>

      <div className="prose prose-invert prose-orange max-w-none print:prose-p:text-black print:prose-headings:text-black print:prose-strong:text-black print:prose-li:text-black print:prose-a:text-blue-700">
        <h1>6. Centro de Control de Administración</h1>
        <p className="lead">
          Documentación técnica sobre el panel interno de DKitchen y su estado real de acceso.
        </p>
        <p className="text-sm italic">
          Esta página describía, como si fuera una funcionalidad legítima, un "Modo Demo" que
          concedía datos falsos y acceso especial a un correo concreto (<code>klarx94@gmail.com</code>)
          comparado en el propio código. Eso no era una funcionalidad: era el hallazgo <strong>V-02</strong>
          de <code>SEGURIDAD_Y_PERSISTENCIA_NEON.md</code> — un privilegio concedido por un <code>if</code>
          en el cliente, agravado por V-01 (el middleware fabricaba ese mismo usuario en desarrollo) y
          V-03 (cualquier correo que contuviera la subcadena <code>klar</code> pasaba el control de
          administrador). **Los tres están eliminados.** Esta página se reescribe para que ningún agente
          futuro los lea como una feature a preservar o reintroducir.
        </p>

        <h2>El Panel de Clientes</h2>
        <p>
          Ruta: <code>/admin-dkitchen/qr</code> — junto con el resto de <code>/admin-dkitchen/*</code> y
          <code> /panel</code>.
        </p>
        <p>
          Estado real hoy: rutas públicas, sin protección — porque están vacías (V-09, todavía abierto).
          No hay middleware que las proteja porque el que existía dependía de Supabase y se eliminó junto
          con V-01. <strong>Esto bloquea la entrada del primer cliente real</strong>: antes de cargar datos
          reales aquí hay que cerrar el acceso con la identidad de Neon (<code>dk.es_admin()</code>,
          Sección 3 de <code>arquitectura-saas</code>), nunca con una comparación de correo.
        </p>

        <h2>Cómo se resuelve el acceso administrativo ahora</h2>
        <p>
          La pertenencia al rol <code>admin</code> es una fila en una tabla de identidades, verificada
          contra el token de la petición — nunca una cadena de correo, nunca un valor por defecto en
          desarrollo. Revocar el acceso de alguien es un <code>UPDATE</code> (<code>activo = false</code>),
          no un despliegue de código. Cualquier lectura con rol <code>admin</code> queda registrada en la
          tabla <code>auditoria</code>, que ninguna conexión del despliegue puede escribir directamente.
        </p>
        <p>
          Si en el futuro hace falta una cuenta de demostración para ventas, la forma correcta es una fila
          más en la base con un rol propio (<code>demo</code>), sujeta exactamente a las mismas políticas
          de RLS que cualquier otro cliente — nunca un atajo de frontend que decide por correo qué datos
          mostrar.
        </p>
      </div>
    </div>
  );
}
