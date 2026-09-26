"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Wand2, 
  Rocket, 
  BookOpen, 
  Monitor,
  Menu,
  X,
  Activity
} from 'lucide-react';

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(true);
  const pathname = usePathname();

  const navItems = [
    { name: 'Clientes QR Menú', href: '/admin-dkitchen/qr', icon: Users },
    { name: 'Live Overview', href: '/admin-dkitchen/overview', icon: LayoutDashboard },
    { name: 'Directorio de Clientes', href: '/admin-dkitchen/clients', icon: Users },
    { name: 'Base de Eventos', href: '/admin-dkitchen/events-master', icon: Calendar },
    { name: 'Creative Factory', href: '/admin-dkitchen/creative', icon: Wand2 },
    { name: 'Pipeline de Proyectos', href: '/admin-dkitchen/pipeline', icon: Rocket },
    { name: 'SOPs y Manuales', href: '/manuals', icon: BookOpen },
    { name: 'Visión SaaS (Demo)', href: '/dashboard', icon: Monitor }
  ];

  return (
    <>
      {/* Mobile Header / Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-200 to-zinc-400 rounded-lg flex items-center justify-center font-black text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            A.
          </div>
          <span className="text-white font-black tracking-tighter">DKITCHEN</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-zinc-400 hover:text-white p-2 transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen z-50
        flex flex-col
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${isDesktopExpanded ? 'md:w-64' : 'md:w-[88px]'}
        md:m-4 md:h-[calc(100vh-2rem)] md:rounded-[2rem]
        bg-zinc-900/40 backdrop-blur-2xl border-r md:border border-white/10
        shadow-[0_8px_30px_rgb(0,0,0,0.5)]
      `}>
        {/* Desktop Toggle Button */}
        <button 
          onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
          className="hidden md:flex absolute -right-3 top-8 w-6 h-6 bg-zinc-800 border border-white/10 rounded-full items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors z-50 shadow-lg"
        >
          <Menu size={12} />
        </button>

        <div className={`p-6 md:p-8 transition-all duration-300 ${isDesktopExpanded ? '' : 'md:px-4 md:flex md:justify-center'}`}>
          <div className="flex items-center gap-3 hidden md:flex">
            <div className={`w-10 h-10 shrink-0 bg-gradient-to-br from-zinc-200 to-white rounded-xl flex items-center justify-center font-black text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all ${isDesktopExpanded ? '' : 'w-12 h-12 rounded-2xl'}`}>
              A.
            </div>
            {isDesktopExpanded && (
              <div className="overflow-hidden whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                <h1 className="text-xl font-black tracking-tighter text-white">DKITCHEN</h1>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Master Console</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 custom-scrollbar overflow-x-hidden">
          <div>
            {isDesktopExpanded && (
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-4 mb-3 animate-in fade-in duration-300">Core Systems</p>
            )}
            {!isDesktopExpanded && <div className="h-[22px] mb-3"></div>}
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    title={!isDesktopExpanded ? item.name : undefined}
                    className={`
                      flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all group relative
                      ${!isDesktopExpanded ? 'justify-center' : 'gap-3'}
                      ${isActive 
                        ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}
                    `}
                  >
                    <Icon size={18} className={`shrink-0 transition-all duration-300 ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'group-hover:scale-110 group-hover:text-white'}`} />
                    {isDesktopExpanded && (
                      <span className="truncate animate-in fade-in duration-300">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className={`p-4 md:p-6 mt-auto transition-all ${isDesktopExpanded ? '' : 'md:flex md:justify-center md:px-2'}`}>
          <div className={`flex items-center ${isDesktopExpanded ? 'gap-3 px-4 py-3' : 'justify-center w-12 h-12 rounded-xl'} bg-black/40 rounded-2xl border border-white/10 shadow-inner`}>
            <Activity size={14} className="text-green-500 animate-pulse shrink-0" />
            {isDesktopExpanded && (
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate animate-in fade-in duration-300">System Online</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
