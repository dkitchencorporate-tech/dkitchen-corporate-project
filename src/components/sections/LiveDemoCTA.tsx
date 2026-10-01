import React from 'react';

export default function LiveDemoCTA() {
  return (
    <section className="bg-[#6E0C2B] py-20 relative overflow-hidden">
      {/* Patrón de fondo */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>
      
      <div className="max-w-5xl mx-auto px-6 sm:px-8 relative z-10">
        <div className="bg-gray-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center gap-10 border border-gray-800">
          
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 font-black px-3 py-1 rounded-full text-xs uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Live Demo
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight text-balance">
              La misma experiencia fluida que exigirán <span className="text-[#6E0C2B]">tus mejores clientes.</span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl font-medium mb-8 text-pretty">
              Escanea el código QR o haz clic en el botón para vivir la experiencia exacta que tendrán tus clientes al sentarse en tu mesa. Una carta interactiva ultra-rápida y persuasiva.
            </p>
            
            <a 
              href="/demo/carta" 
              className="inline-flex items-center justify-center bg-white text-gray-900 px-8 py-4 rounded-full font-black text-xl hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              Abrir Carta Interactiva
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
          </div>

          <div className="shrink-0 flex flex-col items-center">
            <div className="bg-white p-4 rounded-3xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border-8 border-gray-800">
              <img
                src="/images/demo-qr-carta.png"
                alt="QR de la carta demo de DKitchen"
                className="w-48 h-48 rounded-xl"
              />
            </div>
            <span className="text-gray-500 font-bold text-sm mt-4 uppercase tracking-widest flex items-center gap-2">
              <span>📱</span> Escanea con tu móvil
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
