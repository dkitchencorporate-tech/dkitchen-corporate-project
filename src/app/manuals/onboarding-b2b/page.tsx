'use client';

import React from 'react';
import Link from 'next/link';

export default function OnboardingManual() {
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
        <h1>4. Onboarding de Clientes B2B</h1>
        <p className="lead">
          Guía sobre la experiencia del usuario (UX) inmediatamente después del registro, cómo se captura la inteligencia de negocio y el funcionamiento de la Creative Factory.
        </p>

        <h2>El Flujo Inicial (First Time Login)</h2>
        <p>
          Cuando un cliente de hostelería paga el plan y recibe su enlace privado para registrarse (ya sea mediante Email o Google OAuth), la plataforma lo redirige inmediatamente a la ruta <code>/panel</code>.
        </p>
        <p>
          En este punto, el sistema realiza una consulta a la base de datos (tabla <code>projects</code>). Si el cliente <strong>no tiene ningún proyecto asociado a su ID</strong>, el Dashboard oculta las métricas normales y activa el <strong>Asistente de Configuración Inicial (Onboarding Wizard)</strong>.
        </p>

        <h2>Onboarding Wizard (Recolección de Inteligencia)</h2>
        <p>El formulario de bienvenida está dividido estratégicamente para no abrumar al cliente. Recolecta:</p>
        <ol>
          <li><strong>Datos Base:</strong> Nombre del restaurante, Nombre del propietario, Teléfono de contacto.</li>
          <li><strong>Presencia Digital:</strong> Redes sociales (Instagram, TikTok) y página web.</li>
          <li><strong>Foco Comercial:</strong> ¿Cuál es el producto estrella? ¿Cuál es el ticket medio? Esto servirá para entrenar al Agente IA posteriormente.</li>
        </ol>
        <p>
          Al darle a "Completar Onboarding", el código hace un <code>INSERT</code> directo en Supabase. A partir de ese segundo, el panel principal se desbloquea.
        </p>

        <h2>Dashboard Principal</h2>
        <p>El dashboard actúa como el "lobby" del Ecosistema Operativo. Está diseñado para mantener al cliente informado y enganchado al servicio SaaS.</p>
        <ul>
          <li><strong>Estado del Ecosistema:</strong> Informa si la Carta Digital está activa y qué escaneos ha tenido.</li>
        </ul>
        <p className="text-sm italic">
          Nota del 20/09/2026: la conexión con CRM y el "agente Arqui" que
          describían las versiones anteriores de este manual se erradicaron
          del proyecto por decisión explícita (Kommo, Woztell, el bot de
          WhatsApp). No hay bot de ventas ni CRM externo en este ecosistema, ni
          está previsto que lo haya. Ver <code>ESTADO_FRONT.md</code> para el
          estado real del dashboard.
        </p>

        <h2>Creative Factory (Retención de Clientes)</h2>
        <p>
          La ruta <code>/creative-factory</code> es una de las piezas más importantes de retención del software.
        </p>
        <p>
          En lugar de que el restaurante tenga que pensar "qué promoción hacer" (lo cual causa parálisis y cancelación del servicio por falta de uso), la Creative Factory le ofrece un catálogo de campañas ya estructuradas (Día de la Madre, Halloween, San Valentín).
        </p>
        <p>
          <strong>Lógica de Botón:</strong> Cuando el cliente le da a "Solicitar Lanzamiento", el frontend inserta una fila en Supabase (tabla <code>client_events</code>). Automáticamente, esta solicitud aparece en tu Centro de Control de Administrador para que tu equipo ejecute la campaña, garantizando una relación duradera con el cliente.
        </p>
      </div>
    </div>
  );
}
