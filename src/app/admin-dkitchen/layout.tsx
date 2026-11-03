import React from 'react';
import AdminSidebar, { SubmenuZona } from '@/components/admin/AdminSidebar';
import AvisarFallo from '@/components/admin/AvisarFallo';
import Autocorrector from '@/components/admin/Autocorrector';
import VidaCentral from '@/components/admin/VidaCentral';
import './central-viva.css';
import { exigirAdmin } from '@/lib/guard-admin';
import { identidadActual } from '@/lib/sesion';
import { verDecisiones } from '@/lib/decisiones';
import { verTareas } from '@/lib/tareas';
import { verRevisiones } from '@/lib/revisiones';
import { tareasDeHoy } from '@/lib/tareas-hoy';
import { miConfigComercial } from '@/lib/rol-central';

export const metadata = {
  title: 'DKitchen · Central de Operaciones',
  description: 'Central de Operaciones',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jwt = await exigirAdmin();
  const [yo, configComercial] = await Promise.all([
    identidadActual().catch(() => null),
    miConfigComercial(jwt),
  ]);
  const esComercial = configComercial.esComercial;
  const [decisiones, tareas, revisiones] = esComercial
    ? [null, null, null]
    : await Promise.all([
        verDecisiones(jwt).catch(() => null),
        verTareas(jwt).catch(() => null),
        verRevisiones(jwt).catch(() => null),
      ]);
  // Avisos del menú: lo que espera a Alex en Dirección (nunca se consulta ni se muestra a un comercial).
  const hoyT = tareas ? tareasDeHoy(tareas) : null;
  const avisos: Record<string, number> = esComercial
    ? {}
    : {
        '/admin-dkitchen/decisiones': decisiones?.filter((d) => d.estado !== 'decidida').length ?? 0,
        '/admin-dkitchen/tareas': (hoyT ? hoyT.mias.length : 0) + (tareas?.filter((t) => t.comEstado === 'respondida').length ?? 0)
          + (revisiones?.filter((r) => r.estado === 'por_revisar' || (r.estado === 'cambios' && (r.estadoClaude === 'implementada' || r.estadoClaude === 'descartada'))).length ?? 0),
      };
  const cuenta = { nombre: yo?.nombre || 'Administrador', email: yo?.email ?? '' };
  return (
    <>
      <div className="central-viva flex h-[100dvh] overflow-hidden flex-col bg-crema text-carbon selection:bg-orange-500/30 md:flex-row">
        {/* Navigation Sidebar */}
        <AdminSidebar
          cuenta={cuenta}
          avisos={avisos}
          esComercial={esComercial}
          zonasPermitidas={configComercial.zonas}
          serviciosPermitidos={configComercial.servicios}
        />

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
          <div data-cv-main className="flex-1 overflow-y-auto pb-28 md:pb-0">
             {/* 18/10: pestañas de la zona actual (filtradas según el perfil del comercial) */}
             <SubmenuZona
               avisos={avisos}
               esComercial={esComercial}
               zonasPermitidas={configComercial.zonas}
               serviciosPermitidos={configComercial.servicios}
             />
             {children}
          </div>
        </main>
        <AvisarFallo />
        <Autocorrector />
        <VidaCentral />
      </div>
    </>
  );
}
