"use client";
import React, { useState } from 'react';
import ConsultingModal from './ConsultingModal';
import DashboardShowcase from './DashboardShowcase';
import FeatureSplit from './FeatureSplit';
import PowerStatement from './PowerStatement';
import Hero3DLazy from '@/components/motion/Hero3DLazy';
import ActivarNucleoOperativoBoton from './ActivarNucleoOperativoBoton';

export default function TheTrojanHorse() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="bg-white py-24 border-t border-gray-100 relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-50 rounded-full blur-[100px] opacity-50 -z-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-vino text-sm font-bold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-vino animate-pulse"></span>
            🔥 FUNDACIÓN DIGITAL
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-gray-900 text-balance">
            Núcleo Operativo: tu sistema, no una web más.<br/>
            <span className="text-vino">Conectado a tu TPV, sincronizado con tu gestoría.</span>
          </h2>
          <p className="text-lg text-gray-500 font-bold -mt-2">
            Moderniza tu local y dispara tu rentabilidad hoy. Recupera el control de tu negocio.
          </p>

          {/* Elemento 3D del hero (Parte 7, Sección 2.3): pantalla flotante
              con el flujo de pedido en bucle. */}
          <Hero3DLazy preset="base-operativa" className="w-full h-56 md:h-72" />

          <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
            La infraestructura tecnológica premium que necesitas para que tus clientes pidan más rápido, reserven directamente en tu web y tu equipo trabaje sin estrés. Todo el control, bajo tu propia marca y sin depender de terceros.
          </p>
        </div>
      </div>

      {/* FEATURE-SPLIT × 4 — la profundidad real de la PWA (Parte 6, Sección 6:
          "esto es lo más urgente de toda la Parte 6"). Cada bloque agrupa las
          funciones relacionadas de Parte 3, Sección 1, en vez de listarlas
          todas por igual en tarjetas idénticas. */}
      <FeatureSplit icono="🛎️" titulo="Todo pedido, un solo sitio" fondo="crema">
        Autopedido en mesa, por teléfono, para recoger o desde casa, y modo camarero para cuando el cliente
        prefiere que tome nota tu equipo. Cada pedido genera su ticket de cocina y de barra automáticamente —
        nadie transcribe nada a mano dos veces.
      </FeatureSplit>

      <FeatureSplit icono="📡" titulo="El cliente ve su pedido en vivo" invertido fondo="claro">
        Tracking persistente de principio a fin: recibido → en preparación → en reparto → entregado. La cocina
        imprime directo en tu impresora térmica ya conectada — sin pasar por una app externa que se queda con
        parte de la información del pedido.
      </FeatureSplit>

      <FeatureSplit icono="📋" titulo="Catálogo que nunca miente" fondo="crema">
        Reactivo y atómico: un producto que se agota desaparece o se marca &quot;agotado&quot; al instante en
        todos los canales, sin reimprimir nada. Disponible en varios idiomas para la carta que ve tu cliente
        turista, sin duplicar el trabajo de mantenerla.
      </FeatureSplit>

      <FeatureSplit icono="🚨" titulo="Control incluso en el peor momento" invertido fondo="claro">
        Bloqueo de emergencia para frenar la entrada de pedidos ante un pico que tu cocina no puede absorber,
        fidelización propia integrada para que cada cliente repita, y cierre de día que migra la venta al
        sistema fiscal (Verifactu) que ya usas — no uno nuevo que aprender.
      </FeatureSplit>

      <PowerStatement texto="Cada función existe para que factures más, no para que gestiones más." fondo="dark" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-24">
        {/* Sección de Bonus "El Pack de Arranque" */}
        <div className="max-w-6xl mx-auto mb-20 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-vino to-orange-300 rounded-[2.5rem] blur-xl opacity-20"></div>
          <div className="relative bg-[#FDFCF8] rounded-[2.5rem] p-8 sm:p-10 lg:p-16 border border-orange-200 shadow-2xl">
            <div className="text-center mb-16">
              <div className="inline-block bg-red-100 text-red-600 px-6 py-2.5 rounded-full text-sm font-black tracking-widest uppercase mb-6 border border-red-200 shadow-sm">
                PROMOCIÓN DE LANZAMIENTO (POR TIEMPO LIMITADO)
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6 leading-tight text-balance">
                Tu Pack de Arranque Exclusivo,<br/>
                <span className="text-vino">incluido en tu activación.</span>
              </h3>
              <p className="text-gray-800 text-xl max-w-4xl mx-auto font-medium leading-relaxed">
                Nuestros clientes no empiezan desde cero. Activando hoy tu Núcleo Operativo, te incluimos <strong className="bg-vino text-white px-3 py-1 rounded-md mx-1 shadow-md">consultorías y activos premium</strong> que normalmente solo están al alcance de grandes cadenas. Queremos que la imagen de tu negocio brille con luz propia desde el primer día. Sin costes ocultos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              
              {/* Bonus 1 */}
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 sm:p-10 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-sm">📍</div>
                <h4 className="text-gray-900 font-black text-2xl mb-4">Auditoría de Fuga de Clientes (Google Maps)</h4>
                <p className="text-gray-700 text-lg mb-8 flex-grow leading-relaxed font-medium">
                  ¿Por qué el bar de la competencia sale primero cuando alguien busca "dónde cenar"? Te entregamos un <strong>análisis de 14 factores de posicionamiento en Google Maps</strong>, y un informe en PDF de 8 páginas con acciones priorizadas que tú o tu encargado debéis aplicar hoy mismo para robarle ese tráfico.
                </p>
                <div className="mt-auto border-t border-gray-100 pt-6">
                  <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Precio habitual en el mercado:</div>
                  <div className="flex items-center gap-4">
                    <span className="line-through decoration-red-500/50 decoration-4 text-gray-400 font-black text-3xl">180€</span>
                    <span className="text-vino font-black text-4xl">GRATIS</span>
                  </div>
                </div>
              </div>

              {/* Bonus 2 */}
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 sm:p-10 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-sm">📄</div>
                <h4 className="text-gray-900 font-black text-2xl mb-4">Ingeniería de Carta Física (Neuromarketing)</h4>
                <p className="text-gray-700 text-lg mb-8 flex-grow leading-relaxed font-medium">
                  Una carta fea en un PDF no vende. Trasladamos tu menú a un diseño físico elegante, ubicando estratégicamente tus <strong>platos de mayor margen de beneficio</strong> en los puntos donde la vista del cliente va primero. Te lo entregamos en alta resolución, listo para la imprenta.
                </p>
                <div className="mt-auto border-t border-gray-100 pt-6">
                  <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Valor de diseño estratégico:</div>
                  <div className="flex items-center gap-4">
                    <span className="line-through decoration-red-500/50 decoration-4 text-gray-400 font-black text-3xl">250€</span>
                    <span className="text-vino font-black text-4xl">GRATIS</span>
                  </div>
                </div>
              </div>

              {/* Bonus 3 */}
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 sm:p-10 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="w-16 h-16 bg-orange-100 text-vino rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-sm">🔥</div>
                <h4 className="text-gray-900 font-black text-2xl mb-4">Estrategia de Inyección de Tráfico (Días Valle)</h4>
                <p className="text-gray-700 text-lg mb-8 flex-grow leading-relaxed font-medium">
                  Los martes vacíos matan la rentabilidad. Te diseñamos un gancho irresistible (ej. un menú maridaje o tardeo) y la táctica paso a paso para promocionarlo en tu local usando tu nueva carta digital. <strong>El objetivo: llenar mesas el día más flojo de tu semana.</strong>
                </p>
                <div className="mt-auto border-t border-gray-100 pt-6">
                  <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Consultoría de negocio:</div>
                  <div className="flex items-center gap-4">
                    <span className="line-through decoration-red-500/50 decoration-4 text-gray-400 font-black text-3xl">300€</span>
                    <span className="text-vino font-black text-4xl">GRATIS</span>
                  </div>
                </div>
              </div>

              {/* Bonus 4 */}
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 sm:p-10 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-sm">📱</div>
                <h4 className="text-gray-900 font-black text-2xl mb-4">Kit de Anuncios y Lanzamiento en Redes</h4>
                <p className="text-gray-700 text-lg mb-8 flex-grow leading-relaxed font-medium">
                  Tu modernización debe hacer ruido. Para quitarte el "síndrome de la página en blanco", te entregamos <strong>12 publicaciones profesionales</strong> (imágenes y textos persuasivos generados por IA). Solo tienes que copiar, pegar en tu Instagram y empezar a atraer miradas.
                </p>
                <div className="mt-auto border-t border-gray-100 pt-6">
                  <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Valor de producción de contenidos:</div>
                  <div className="flex items-center gap-4">
                    <span className="line-through decoration-red-500/50 decoration-4 text-gray-400 font-black text-3xl">250€</span>
                    <span className="text-vino font-black text-4xl">GRATIS</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* MOCKUP INTERACTIVO DEL DASHBOARD DE JULES */}
        <DashboardShowcase />

        {/* Pricing Card Unica: Base Operativa Digital (Luminosa/Confiable) */}
        <div className="max-w-4xl mx-auto mt-16 animate-fade-in-up">
          <div className="bg-[#FDFCF8] rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden border-2 border-vino">
            
            {/* Header del Servicio */}
            <div className="bg-vino p-6 text-center">
              <h3 className="text-3xl md:text-4xl font-black text-white mb-2">Núcleo Operativo</h3>
              <p className="text-orange-100 font-bold text-lg">La infraestructura indispensable para recuperar el control de tu local.</p>
            </div>
            
            <div className="p-8 md:p-12">
              <div className="text-center mb-10">
                <div className="flex justify-center items-baseline gap-2 text-gray-900 mb-2">
                  <span className="text-7xl font-black">700€</span>
                </div>
                <div className="inline-block bg-orange-50 text-vino font-black px-4 py-2 rounded-full text-sm mt-2 border border-orange-200 shadow-sm">
                  ¿Prefieres fraccionar? 2 cuotas de 375€ (750€ en total)
                </div>
                <p className="text-gray-600 font-medium mt-4 max-w-lg mx-auto text-lg">
                  Servicio <strong className="text-gray-900 font-black">100% Llave en Mano</strong>. Nosotros diseñamos, programamos y publicamos todo el ecosistema. Tú solo dedícate a atender mesas. Sin alquileres abusivos: una vez activado, el sistema es tuyo.
                </p>
              </div>

              {/* Qué problemas soluciona (Sin Glovo, Enfoque en Visibilidad y Control) */}
              <div className="space-y-6 text-gray-700 mb-10">
                <div className="flex items-start gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 shrink-0 text-xl font-bold mt-1 shadow-sm">✓</span>
                  <div>
                    <span className="font-black text-gray-900 text-xl block mb-1">Control Total de tu Imagen.</span>
                    <p className="text-gray-600 font-medium leading-relaxed">Tu propia Web Profesional. Dejas de depender de directorios genéricos de internet y controlas exactamente qué ve tu cliente antes de visitarte.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 shrink-0 text-xl font-bold mt-1 shadow-sm">✓</span>
                  <div>
                    <span className="font-black text-gray-900 text-xl block mb-1">Mesas veloces, camareros sin estrés.</span>
                    <p className="text-gray-600 font-medium leading-relaxed">Carta Digital Interactiva ultra-rápida. El cliente se sienta, escanea y sabe lo que quiere. Aumenta el ticket medio y la rotación de mesas los fines de semana.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 shrink-0 text-xl font-bold mt-1 shadow-sm">✓</span>
                  <div>
                    <span className="font-black text-gray-900 text-xl block mb-1">Dejas de ser invisible.</span>
                    <p className="text-gray-600 font-medium leading-relaxed">Incluye la creación y optimización de tu entorno digital para captar a los turistas y vecinos que buscan dónde cenar en Google Maps antes que tu competencia.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 shrink-0 text-xl font-bold mt-1 shadow-sm">✓</span>
                  <div>
                    <span className="font-black text-gray-900 text-xl block mb-1">Base de Datos Propia.</span>
                    <p className="text-gray-600 font-medium leading-relaxed">Cada reserva en tu sistema es un contacto que te guardas. Empiezas a conocer quién te visita para poder fidelizarlo en el futuro.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 text-vino shrink-0 text-xl font-bold mt-1 shadow-sm">🎁</span>
                  <div>
                    <span className="font-black text-vino text-xl block mb-1">Los 4 Bonos Consultivos Incluidos.</span>
                    <p className="text-gray-700 font-medium leading-relaxed">Al reservar tu activación hoy, te llevas los 980€ en valor de los bonos estratégicos sin ningún tipo de coste adicional.</p>
                  </div>
                </div>
              </div>

              {/* Soporte continuo y Bono 2 meses */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200/50 rounded-2xl p-6 mb-10 text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vino to-orange-400"></div>
                <h4 className="text-vino font-black text-lg mb-2">🎁 Bono Especial: 2 Meses de Mantenimiento GRATIS</h4>
                <p className="text-gray-700 font-medium leading-relaxed">
                  Queremos que tu única preocupación sea atender mesas. Como regalo extra, cubrimos los primeros 2 meses de alojamiento en servidores ultrarrápidos a coste cero. Tiempo de sobra para afinar el sistema juntos. Después, el soporte premium será de solo <strong className="text-gray-900 font-black">desde 99€/mes</strong>, cubriendo el servidor, protección anti-caídas y actualizaciones de seguridad. Sin permanencia.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <a
                  href="/casos-de-exito"
                  className="text-sm text-gray-500 font-bold hover:text-vino transition-colors underline decoration-transparent hover:decoration-vino underline-offset-4"
                >
                  Ver negocios reales que ya lo usan →
                </a>
                <ActivarNucleoOperativoBoton className="w-full sm:w-auto bg-vino text-white px-10 py-5 rounded-full font-black text-xl md:text-2xl hover:bg-orange-600 transition-colors shadow-[0_10px_30px_rgba(255,69,0,0.4)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(255,69,0,0.6)]" />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-gray-700 font-bold hover:text-vino transition-colors underline decoration-transparent hover:decoration-vino underline-offset-4 text-sm"
                >
                  Prefiero hablar antes — agendar consultoría gratuita
                </button>
                <a href="https://wa.me/34622652659?text=Hola,%20tengo%20dudas%20urgentes%20sobre%20N%C3%BAcleo%20Operativo." className="text-gray-500 font-bold hover:text-[#25D366] transition-colors underline decoration-transparent hover:decoration-[#25D366] underline-offset-4 text-sm mt-2">
                  ¿Tienes dudas urgentes? Habla con un asesor por WhatsApp
                </a>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Modal de Agendamiento */}
      <ConsultingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

    </section>
  );
}
