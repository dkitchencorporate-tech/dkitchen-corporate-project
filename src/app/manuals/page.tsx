'use client';

import React from 'react';
import Link from 'next/link';

export default function ManualsIndex() {
  const manuals = [
    {
      title: '1. Mapa Integral de Navegación y URLs',
      description: 'Directorio completo de todos los enlaces y rutas de DKitchen, incluyendo los niveles de acceso requeridos.',
      href: '/manuals/mapa-navegacion',
      date: '12 Junio 2026',
      tag: 'Directorio'
    },
    {
      title: '2. Arquitectura SaaS y Base de Datos',
      description: 'Esquemas de Supabase, tablas de clientes, reglas de seguridad RLS y el Trigger de registro automatizado.',
      href: '/manuals/arquitectura-saas',
      date: '12 Junio 2026',
      tag: 'Infraestructura'
    },
    {
      title: '3. Embudos de Venta y Psicología B2B',
      description: 'Lógica comercial detrás de la Landing Page, justificación de planes High-Ticket y posicionamiento de mercado.',
      href: '/manuals/estrategia-ventas',
      date: '12 Junio 2026',
      tag: 'Ventas'
    },
    {
      title: '4. Onboarding de Clientes B2B',
      description: 'Flujo post-compra, asistente de configuración inicial del restaurante y solicitud de campañas en el Dashboard.',
      href: '/manuals/onboarding-b2b',
      date: '12 Junio 2026',
      tag: 'Operaciones'
    },
    {
      title: '6. Centro de Control de Administración',
      description: 'Manejo del panel de monitoreo de clientes, gestión de proyectos y activación del Modo Demo para presentaciones.',
      href: '/manuals/centro-control',
      date: '12 Junio 2026',
      tag: 'Administración'
    },
    {
      title: '7. Configuración de Google OAuth',
      description: 'Protocolo para autorizar el botón de inicio de sesión con Google y publicar la aplicación de autenticación para producción.',
      href: '/manuals/google-oauth',
      date: '12 Junio 2026',
      tag: 'Seguridad'
    }
  ];

  return (
    <div className="space-y-8 print:block">
      <div>
        <h2 className="text-3xl font-black text-white print:text-black tracking-tighter">Índice Operativo</h2>
        <p className="text-zinc-400 print:text-zinc-600 mt-2">Protocolos y manuales (SOP) estandarizados de DKitchen.</p>
      </div>

      <div className="grid gap-4 print:grid-cols-1">
        {manuals.map((manual, idx) => (
          <Link key={idx} href={manual.href} className="block group">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors print:border-black print:bg-transparent">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-white print:text-black group-hover:text-vino transition-colors">{manual.title}</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 text-zinc-300 print:bg-zinc-200 print:text-black px-2 py-1 rounded-md">{manual.tag}</span>
              </div>
              <p className="text-sm text-zinc-400 print:text-zinc-600 mb-4">{manual.description}</p>
              <div className="text-xs text-zinc-500 font-medium">Actualizado: {manual.date}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
