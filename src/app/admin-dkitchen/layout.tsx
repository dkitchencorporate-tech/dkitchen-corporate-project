import React from 'react';
import AdminSidebar, { SubmenuZona } from '@/components/admin/AdminSidebar';
import AvisarFallo from '@/components/admin/AvisarFallo';
import Autocorrector from '@/components/admin/Autocorrector';
import { exigirAdmin } from '@/lib/guard-admin';
import { identidadActual } from '@/lib/sesion';

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
  await exigirAdmin();
  const yo = await identidadActual().catch(() => null);
  const cuenta = { nombre: yo?.nombre || 'Administrador', email: yo?.email ?? '' };
  return (
    <>
      <div className="flex min-h-screen flex-col bg-crema text-carbon selection:bg-orange-500/30 md:flex-row">
        {/* Navigation Sidebar */}
        <AdminSidebar cuenta={cuenta} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-28 md:pb-0">
             {/* 18/10: pestañas de la zona actual (6 zonas con submenú) */}
             <SubmenuZona />
             {children}
          </div>
        </main>
        <AvisarFallo />
        <Autocorrector />
      </div>
    </>
  );
}
