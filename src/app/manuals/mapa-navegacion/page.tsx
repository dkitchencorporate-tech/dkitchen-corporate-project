'use client';

import React from 'react';
import Link from 'next/link';

export default function MapaNavegacionManual() {
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
        <h1>1. Mapa Integral de Navegación y URLs</h1>
        <p className="lead">
          Directorio completo de enrutamiento del ecosistema DKitchen. Refleja el
          código realmente desplegado, no un diseño planeado: una ruta que
          aparece aquí existe en <code>src/app/</code> con este comportamiento
          exacto en la fecha indicada abajo.
        </p>
        <p><em>Actualizado: 20 de septiembre de 2026.</em></p>

        <h2>Área pública (sin autenticación)</h2>
        <ul>
          <li><strong>Landing principal:</strong> <code>/</code> <br/>Presentación de servicios y matriz de precios (fuente única: <code>src/lib/pricing-config.ts</code>).</li>
          <li><strong>Carta interactiva de demostración:</strong> <code>/demo/carta</code> <br/>Simulación con datos de ejemplo, para enseñar el producto a un prospecto. No lee de Neon.</li>
          <li><strong>Carta viva de un restaurante real:</strong> <code>/m/[slug]</code> <br/>Se renderiza en el servidor, lee de Neon (con respaldo si Neon falla, ver <code>src/lib/cache-resiliencia.ts</code>). Indexable.</li>
          <li><strong>Redirector de QR:</strong> <code>/r/[codigo]</code> <br/>No tiene interfaz: registra el escaneo y redirige a <code>/m/[slug]</code>. Ver <code>MOTOR_QR_ANALISIS_PROFESIONAL_Y_PLAN.md</code>.</li>
          <li><strong>Carta no disponible:</strong> <code>/carta-no-disponible</code> <br/>Lo que ve quien escanea un QR que ya no resuelve.</li>
          <li><strong>Legal:</strong> <code>/privacy</code>, <code>/terms</code>, <code>/data-deletion</code>.</li>
          <li><strong>Onboarding comercial:</strong> <code>/onboarding</code> <br/>Sin backend real todavía (ver <code>ESTADO_FRONT.md</code>).</li>
        </ul>

        <h2>Área de autenticación</h2>
        <p>
          <strong>No existe todavía.</strong> El middleware y las rutas
          <code>/auth/*</code> que hubo con Supabase se eliminaron por completo
          en la migración (Fase 2c). BetterAuth (Neon Auth) está aprovisionado
          en el proyecto de Neon pero sin cablear: es una decisión aplazada a
          propósito (tarea #15) hasta que haya a quién autenticar de verdad.
          Ahora mismo, <code>/panel</code> y <code>/admin-dkitchen</code>
          son rutas públicas de facto — están en la lista de cierre antes del
          primer cliente real (Sección 7 de <code>SEGURIDAD_Y_PERSISTENCIA_NEON.md</code>).
        </p>

        <h2>Área privada (hueca, sin backend detrás)</h2>
        <p>Renderizan interfaz, pero <code>data-source.ts</code> devuelve listas vacías: no hay datos reales que mostrar todavía.</p>
        <ul>
          <li><strong>Panel del cliente:</strong> <code>/panel</code></li>
          <li><strong>Panel de administración:</strong> <code>/admin-dkitchen</code>, <code>/admin-dkitchen/clients</code>, <code>/admin-dkitchen/overview</code>, <code>/admin-dkitchen/prospeccion</code>, <code>/admin-dkitchen/events-master</code></li>
        </ul>
        <p><strong>Ya no existe:</strong> <code>/creative-factory</code> y todas sus rutas de API — se eliminó junto con Gemini (Fase 2c).</p>

        <h2>Centro de manuales</h2>
        <ul>
          <li><strong>Índice:</strong> <code>/manuals</code> <br/><code>noindex, nofollow</code>, pero accesible a quien conozca la URL — no hay control de acceso real (V-08, pendiente de cerrar con autenticación).</li>
        </ul>

        <h2>APIs de servidor (rutas reales, no planeadas)</h2>
        <ul>
          <li><strong>Formulario de contacto:</strong> <code>POST /api/lead</code> <br/>Único endpoint de escritura vivo del despliegue. Con límite de frecuencia respaldado por Neon y HTML escapado (V-11 sigue abierto: usa Gmail, pendiente de un proveedor transaccional).</li>
          <li><strong>Exportación de leads:</strong> <code>POST /api/admin/export-leads</code> <br/>Neutralizada, devuelve 503. Era el hallazgo más grave de la auditoría (V-05: no tenía ninguna autenticación).</li>
        </ul>
        <p>
          <strong>Ya no existen:</strong> <code>/api/diagnostic</code>,
          <code>/api/webhooks/kommo</code>, <code>/api/webhooks/woztell</code>,
          <code>/api/demo/*</code>, <code>/api/creative-factory/*</code>,
          <code>/api/leads/from-assistant</code> — eliminadas con Kommo,
          Woztell, Meta Cloud API y el bot de WhatsApp ("Arqui"), por decisión
          explícita: se erradicaron del proyecto, no se aplazaron.
        </p>
      </div>
    </div>
  );
}
