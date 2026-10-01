import React from 'react';
import Hero3DLazy from '@/components/motion/Hero3DLazy';

export default function DigitalPresenceValue() {
  return (
    <>
      {/* HERO propio de /qr (Parte 6, Sección 3). Las dos cifras de prueba que
          vivían aquí (14h/semana, +15% ticket medio) se retiraron por
          corrección explícita de la Parte 11: no hay todavía un cliente real
          que las respalde, y publicar una cifra sin caso detrás es el mismo
          riesgo de credibilidad que el resto de la web ya evita. Vuelven
          cuando /casos-de-exito tenga un caso propio con esa cifra real. */}
      <header className="relative bg-[#171008] text-white pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#6E0C2B] rounded-full blur-[150px] opacity-[0.15] pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-bold tracking-widest uppercase mb-6">
            QR Menú
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.1] mb-6 text-balance">
            La tecnología no es un gasto.<br/>Es tu mejor empleado.
          </h1>

          {/* Elemento 3D del hero (Parte 7, Sección 2.3): carta/QR flotando
              con inclinación reactiva al cursor. */}
          <Hero3DLazy preset="qr" className="w-full h-48 md:h-64" />
        </div>
      </header>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-xl text-gray-600">Entiende por qué los negocios que se digitalizan aplastan a la competencia local en menos de 3 meses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Beneficio 1 */}
          <div className="bg-[#FDFCF8] p-10 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-orange-100 text-[#6E0C2B] rounded-2xl flex items-center justify-center text-3xl mb-6">⏳</div>
            <h3 className="text-2xl font-bold mb-4">Recupera 14h a la semana</h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              Un camarero pierde de media 4 minutos por mesa solo llevando la carta, esperando a que decidan y apuntando. Con la Carta Interactiva QR, el cliente se sienta, ve fotos que le abren el apetito y decide al instante. Menos paseos, servicio más rápido.
            </p>
          </div>

          {/* Beneficio 2 */}
          <div className="bg-[#FDFCF8] p-10 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-orange-100 text-[#6E0C2B] rounded-2xl flex items-center justify-center text-3xl mb-6">💶</div>
            <h3 className="text-2xl font-bold mb-4">El Ticket Medio sube un 15%</h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              La gente come por los ojos. Un menú en papel sucio y sin fotos no vende postres ni raciones extra. Una carta digital en el móvil del cliente, con fotos profesionales y recomendaciones, hace *upselling* automático sin que tú digas una palabra.
            </p>
          </div>

          {/* Beneficio 3 */}
          <div className="bg-[#FDFCF8] p-10 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-orange-100 text-[#6E0C2B] rounded-2xl flex items-center justify-center text-3xl mb-6">⭐</div>
            <h3 className="text-2xl font-bold mb-4">Percepción Premium</h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              Tener un Agente en tu web o un sistema rápido da una imagen de restaurante moderno, limpio y eficiente. Esa percepción justifica precios más altos y atrae mejores reseñas en Google, lo que a su vez atrae a más clientes. Es un ciclo de crecimiento.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center animate-fade-in-up">
          <a href="/demo/carta" className="inline-flex bg-[#6E0C2B] text-white px-8 py-4 rounded-full font-black text-lg hover:bg-orange-600 transition-all shadow-xl hover:shadow-orange-500/30 hover:-translate-y-1 items-center gap-3">
            <span>Probar Carta Interactiva en Vivo</span>
            <span className="bg-white/20 px-2 py-1 rounded text-xs">GRATIS</span>
          </a>
        </div>
        </div>
      </section>
    </>
  );
}
