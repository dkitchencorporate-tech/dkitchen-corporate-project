import React from 'react';
import AdminSidebar, { SubmenuZona } from '@/components/admin/AdminSidebar';
import AvisarFallo from '@/components/admin/AvisarFallo';
import Autocorrector from '@/components/admin/Autocorrector';
import { exigirAdmin } from '@/lib/guard-admin';
import { identidadActual } from '@/lib/sesion';
import { verDecisiones } from '@/lib/decisiones';
import { verTareas } from '@/lib/tareas';
import { verRevisiones } from '@/lib/revisiones';
import { tareasDeHoy } from '@/lib/tareas-hoy';

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
  const [yo, decisiones, tareas, revisiones] = await Promise.all([
    identidadActual().catch(() => null), verDecisiones(jwt).catch(() => null), verTareas(jwt).catch(() => null), verRevisiones(jwt).catch(() => null),
  ]);
  // Avisos del menú: lo que espera a karc0 (decidir, tareas de hoy, respuestas de Claude por aprobar, revisiones).
  const hoyT = tareas ? tareasDeHoy(tareas) : null;
  const avisos = {
    '/admin-dkitchen/decisiones': decisiones?.filter((d) => d.estado !== 'decidida').length ?? 0,
    '/admin-dkitchen/tareas': (hoyT ? hoyT.mias.length : 0) + (tareas?.filter((t) => t.comEstado === 'respondida').length ?? 0)
      + (revisiones?.filter((r) => r.estado === 'por_revisar' || (r.estado === 'cambios' && (r.estadoClaude === 'implementada' || r.estadoClaude === 'descartada'))).length ?? 0),
  };
  const cuenta = { nombre: yo?.nombre || 'Administrador', email: yo?.email ?? '' };
  return (
    <>
      <div className="flex h-[100dvh] overflow-hidden flex-col bg-crema text-carbon selection:bg-orange-500/30 md:flex-row">
        {/* Navigation Sidebar */}
        <AdminSidebar cuenta={cuenta} avisos={avisos} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-28 md:pb-0">
             {/* 18/10: pestañas de la zona actual (6 zonas con submenú) */}
             <SubmenuZona avisos={avisos} />
             {children}
          </div>
        </main>
        <AvisarFallo />
        <Autocorrector />
      </div>
    </>
  );
}
