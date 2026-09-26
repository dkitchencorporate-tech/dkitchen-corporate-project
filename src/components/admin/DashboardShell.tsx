'use client';

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, LayoutDashboard, ShoppingBag, BarChart3, Menu, LogOut, ShieldAlert } from 'lucide-react';
import SinBackendAviso from '@/components/SinBackendAviso';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(true);
  const pathname = usePathname();

  // Sin autenticación no hay forma de distinguir a un administrador, así que el
  // acceso al panel interno queda oculto hasta que Neon aporte sesiones reales.
  const isAdmin = false;

  const navItems = [
    { name: 'Eventos', href: '#events', icon: CalendarDays },
    { name: 'Autogestión', href: '#autogestion', icon: LayoutDashboard },
    { name: 'Up-sells', href: '#marketplace', icon: ShoppingBag },
    { name: 'Pipeline', href: '#pipeline', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-orange-500/30">
      {/* Dynamic Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900/50 backdrop-blur-md border-b border-white/10 z-20">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar V3 */}
      <aside 
        className={`absolute md:relative z-40 h-full bg-zinc-900/50 backdrop-blur-2xl border-r border-white/10 transform transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isDesktopExpanded ? 'md:w-64' : 'md:w-[80px]'}
        `}
      >
        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
          className="hidden md:flex absolute -right-3 top-6 bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white w-6 h-6 rounded-full items-center justify-center z-50 transition-colors"
        >
          <Menu size={12} />
        </button>

        <div className={`p-6 border-b border-white/10 hidden md:block transition-all duration-300`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 min-w-[32px] bg-gradient-to-br from-white to-zinc-400 text-black font-black text-lg flex items-center justify-center rounded-lg shadow-lg">
              C
            </div>
            <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isDesktopExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">CLIENT ZONE</h1>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mt-1">Operations</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {isDesktopExpanded && <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-4 px-2 md:block hidden">Navegación</p>}
          
          {navItems.map((item) => (
            <a 
              key={item.name}
              href={item.href} 
              className={`flex items-center rounded-xl transition-all duration-200 group relative
                ${isDesktopExpanded ? 'px-4 py-3' : 'p-3 justify-center'}
                ${item.name === 'Eventos' 
                  ? 'bg-zinc-800/80 text-white border border-white/10 shadow-lg' 
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white hover:border-white/5 border border-transparent'}
              `}
              title={!isDesktopExpanded ? item.name : undefined}
            >
              <item.icon size={isDesktopExpanded ? 18 : 22} className={`${item.name === 'Eventos' ? 'text-orange-500' : 'group-hover:text-white'}`} />
              
              <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 
                ${isDesktopExpanded ? 'ml-3 opacity-100 w-auto' : 'opacity-0 w-0 md:hidden'}`}
              >
                {item.name}
              </span>
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          {isAdmin && (
            <Link href="/admin-dkitchen/overview" className={`flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-colors group ${!isDesktopExpanded ? 'justify-center' : ''}`} title={!isDesktopExpanded ? "Volver a Admin" : undefined}>
              <ShieldAlert size={isDesktopExpanded ? 18 : 22} />
              <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isDesktopExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 md:hidden'}`}>
                Admin Console
              </span>
            </Link>
          )}

          <button className={`mt-2 flex items-center text-zinc-500 hover:text-white transition-colors w-full rounded-xl hover:bg-zinc-800/50 ${isDesktopExpanded ? 'px-4 py-3' : 'p-3 justify-center'}`} title={!isDesktopExpanded ? "Cerrar Sesión" : undefined}>
            <LogOut size={isDesktopExpanded ? 18 : 22} />
            <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isDesktopExpanded ? 'ml-3 opacity-100 w-auto' : 'opacity-0 w-0 hidden md:hidden'}`}>
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto relative z-10 custom-scrollbar p-4 md:p-8 max-w-7xl mx-auto">
        <SinBackendAviso detalle="El panel de cliente se muestra vacío a propósito: no hay base de datos ni autenticación conectadas." />
        {children}
      </main>

    </div>
  );
}
