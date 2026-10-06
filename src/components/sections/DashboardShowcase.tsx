'use client';
import React, { useState } from 'react';
import Pipeline from '@/components/dashboard/Pipeline';
import EventsLibrary from '@/components/dashboard/EventsLibrary';

export default function DashboardShowcase() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'events'>('pipeline');

  return (
    <div className="w-full mt-12 mb-12">
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">Lo que tu cliente jamás ve (pero te hace ganar dinero)</h3>
        <p className="text-gray-600 font-medium max-w-2xl mx-auto">
          No compras una web, compras un centro de mando operativo. Transparencia total sobre nuestro trabajo y herramientas de escalado en un solo clic.
        </p>
      </div>

      {/* Selector de vistas */}
      <div className="flex justify-center gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('pipeline')}
          className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'pipeline' ? 'bg-vino text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Vista: Pipeline de Proyectos
        </button>
        <button 
          onClick={() => setActiveTab('events')}
          className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'events' ? 'bg-vino text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Vista: Biblioteca de Eventos
        </button>
      </div>

      {/* Mac Window Mockup */}
      <div className="mx-auto max-w-5xl rounded-2xl overflow-hidden border border-gray-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative">
        {/* Mac title bar */}
        <div className="bg-[#1A1A1A] h-10 flex items-center px-4 gap-2 border-b border-gray-800">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
          <div className="mx-auto text-gray-500 text-xs font-bold font-mono tracking-widest uppercase">
            DKitchen / Panel de Control
          </div>
        </div>

        {/* Dashboard Content Container */}
        <div className="bg-[#020202] text-white h-[600px] overflow-y-auto overflow-x-hidden p-6 md:p-10 relative">
          
          {/* Falso Sidebar para dar contexto */}
          <div className="absolute top-0 left-0 bottom-0 w-64 border-r border-[#1A1A1A] bg-[#171008] hidden lg:block opacity-50 pointer-events-none">
            <div className="p-6 border-b border-[#1A1A1A]">
              <div className="h-6 w-32 bg-[#1A1A1A] rounded"></div>
            </div>
            <div className="p-6 space-y-4">
              <div className="h-4 w-40 bg-[#1A1A1A] rounded"></div>
              <div className="h-4 w-32 bg-[#1A1A1A] rounded"></div>
              <div className="h-4 w-36 bg-[#1A1A1A] rounded"></div>
              <div className="h-4 w-48 bg-[#1A1A1A] rounded"></div>
            </div>
          </div>

          <div className="lg:ml-64 relative z-10 transition-opacity duration-500">
            {activeTab === 'pipeline' && (
              <div className="animate-fade-in-up">
                <Pipeline />
              </div>
            )}
            
            {activeTab === 'events' && (
              <div className="animate-fade-in-up pointer-events-none">
                {/* Solo visualización: es un escaparate del panel, no el panel real */}
                <EventsLibrary />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
