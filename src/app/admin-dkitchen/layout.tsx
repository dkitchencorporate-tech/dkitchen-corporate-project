import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { exigirAdmin } from '@/lib/guard-admin';

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
  return (
    <>
      <div className="flex min-h-screen flex-col bg-[#F7F5F2] text-[#1B1D22] selection:bg-orange-500/30 md:flex-row">
        {/* Navigation Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-28 md:pb-0">
             {children}
          </div>
        </main>
      </div>
    </>
  );
}
