'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import EnterpriseModal from './EnterpriseModal';
import ObjectionHandling from './sections/ObjectionHandling';
import TiltCard from './motion/TiltCard';
import { MARCAS } from '@/lib/marcas-data';
import { DARK_KITCHEN, formatPrecio } from '@/lib/pricing-config';

/**
 * src/components/DarkKitchen.tsx
 * Sección de ecosistema Dark Kitchen refactorizada a nivel Enterprise.
 * Protocolo: Ingeniería de procesos, sin precio visible, alta exclusividad.
 */

export default function DarkKitchen() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="py-24 bg-[#0A0A0A] border-y border-white/10 overflow-hidden relative text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none -ml-32 -mb-32"></div>
      
      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
        
        {/* ENCABEZADO ENTERPRISE */}
        <div className="text-center max-w-4xl mx-auto mb-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#6E0C2B] text-xs font-bold tracking-widest uppercase">
            <span className="w-2 h-2 bg-[#6E0C2B] rounded-full animate-pulse"></span> INGENIERÍA DE PROYECTOS & MARCAS VIRTUALES
          </div>
          <h2 className="text-4xl lg:text-6xl font-black leading-tight text-white tracking-tight text-balance">
            El Caos Operativo tiene un precio.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6E0C2B] to-orange-400">La Ingeniería, un retorno.</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium">
            Muchos hosteleros intentan escalar subiéndose a 4 aplicaciones de delivery a la vez. ¿El resultado? <strong>Fogones colapsados, pérdida de calidad y rentabilidad nula.</strong> El delivery masivo no necesita más apps; necesita procesos estandarizados.
          </p>
        </div>

        {/* POWER-STATEMENT — la hemorragia de comisión como cifra sola, sin
            comparación de tarjetas al lado (Parte 6, Sección 7: "el mejor
            gancho numérico de toda la página", hoy diluido en texto corrido). */}
        <div className="mb-24 max-w-3xl mx-auto text-center">
          <p className="text-red-500 font-bold uppercase text-xs tracking-[0.3em] mb-4">
            Facturar 10.000€ en apps de delivery
          </p>
          <p className="text-6xl md:text-8xl font-black text-white tracking-tight mb-4">
            −3.000€
          </p>
          <p className="text-gray-400 text-lg">
            Con tu propio ecosistema PWA, esa misma factura deja{' '}
            <span className="text-[#25D366] font-black">0€</span> en comisiones. El margen que hoy regalas es tuyo.
          </p>
        </div>

        {/* Ancla de precio — Parte 6, Sección 7: "sin precio visible nadie
            evalúa si le interesa". Ruta A sigue siendo venta consultiva (sin
            cifra exacta), pero un rango real es mejor que ningún número. */}
        <div className="mb-24 max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Rango de inversión</p>
          <p className="text-3xl font-black text-white">
            Desde {formatPrecio(DARK_KITCHEN.rutaA.rangoMin)} hasta {formatPrecio(DARK_KITCHEN.rutaA.rangoMax)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            La cifra exacta depende del alcance y se cierra en la auditoría de viabilidad — es venta consultiva, no
            un plan de catálogo.
          </p>
        </div>

        {/* LOS TRES PILARES OPERATIVOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
          <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 group hover:border-white/20 transition-all duration-500 flex flex-col relative overflow-hidden">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner border border-white/5">🍔</div>
            <h3 className="text-xl font-bold mb-4 text-white tracking-wide">Marcas Virtuales Listas para Operar (Llave en Mano)</h3>
            <p className="text-gray-400 flex-1 leading-relaxed text-sm">
                No inventes recetas. Te damos acceso a nuestro catálogo de seis marcas virtuales ya operadas en una cocina real (Santa Brazza, My Latin Bowl, Seven Food Fries...). Te entregamos las <strong>fichas técnicas de cocina, proveedores y tiempos de elaboración</strong>. Tu equipo solo tiene que seguir el protocolo y empaquetar.
            </p>
          </div>
          
          <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 group hover:border-white/20 transition-all duration-500 flex flex-col relative overflow-hidden">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner border border-white/5">🚀</div>
            <h3 className="text-xl font-bold mb-4 text-white tracking-wide">Infraestructura PWA de Pedidos Propios</h3>
            <p className="text-gray-400 flex-1 leading-relaxed text-sm">
                Diseñamos una aplicación web progresiva (PWA) de alta conversión. El cliente pide en dos clics y <strong>el dinero viaja directo a tu banco mediante pasarelas seguras</strong>. Sin intermediarios y generando tu propia base de datos para futuras campañas automáticas.
            </p>
          </div>

          <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 group hover:border-white/20 transition-all duration-500 flex flex-col relative overflow-hidden">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner border border-white/5">🎯</div>
            <h3 className="text-xl font-bold mb-4 text-white tracking-wide">Enrutamiento Multimarca (KDS Centralizado)</h3>
            <p className="text-gray-400 flex-1 leading-relaxed text-sm">
                La arquitectura tecnológica para operar hasta 7 marcas desde una sola cocina. <strong>Centralizamos todos los pedidos en una única Pantalla de Cocina (KDS).</strong> El chef solo ve lo que tiene que cocinar y en qué orden. Evitamos el estrés cognitivo y el colapso del pase.
            </p>
          </div>
        </div>

        {/* FEATURE-SPLIT — catálogo de marcas virtuales, de lista de texto a
            galería visual (Parte 6, Sección 7). Los seis nombres son reales,
            de marcas ya operadas — no ejemplos inventados. */}
        <div className="max-w-5xl mx-auto mb-24">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">Seis marcas, probadas en cocina real</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Cada una operó 2020-2022 en una dark kitchen en Madrid. Ficha técnica, proveedores y carta ya
              cerrados —{' '}
              <Link href="/marcas" className="text-[#6E0C2B] font-semibold hover:underline">
                ver el catálogo completo
              </Link>
              .
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {MARCAS.map((m) => (
              <TiltCard key={m.slug}>
                <Link
                  href={`/marcas#${m.slug}`}
                  className="block bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:border-[#6E0C2B]/50 hover:bg-white/10 transition-all"
                >
                  <div className="text-4xl mb-3">{m.emoji}</div>
                  <p className="font-bold text-white text-sm mb-1">{m.nombre}</p>
                  <p className="text-xs text-gray-500">{m.concepto}</p>
                </Link>
              </TiltCard>
            ))}
          </div>
        </div>

        {/* FASES DE ADMISIÓN (El Filtro High-Ticket) */}
        <div className="max-w-5xl mx-auto bg-gradient-to-b from-white/5 to-transparent p-1 rounded-[3rem] border border-white/10 mb-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6E0C2B] to-transparent opacity-50"></div>
          <div className="bg-[#0A0A0A] rounded-[2.8rem] p-8 md:p-16">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4">Proceso de Admisión y Desarrollo Enterprise</h3>
              <p className="text-gray-400 max-w-2xl mx-auto">Esto no es un software preconfigurado. Es una integración de procesos y tecnología a medida. Por ello, exigimos un análisis estricto antes de iniciar.</p>
            </div>

            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#6E0C2B] before:via-orange-500/20 before:to-transparent">
              
              {/* Fase 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0A0A0A] bg-[#6E0C2B] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_20px_rgba(255,69,0,0.5)] z-10 font-bold text-sm">1</div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white/5 rounded-2xl border border-white/10 ml-4 md:ml-0 text-left">
                  <div className="text-[#6E0C2B] font-black text-xs tracking-widest uppercase mb-2">Evaluación Estricta</div>
                  <h4 className="text-xl font-bold text-white mb-2">Auditoría Operativa y Viabilidad</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">Analizamos la capacidad instalada de tu cocina, radio de reparto y costes base (Food Cost). Si los números no garantizan rentabilidad, rechazaremos el proyecto antes de que gastes un euro.</p>
                </div>
              </div>
              
              {/* Fase 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0A0A0A] bg-gray-800 text-gray-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-bold text-sm transition-colors group-hover:bg-white group-hover:text-black">2</div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white/5 rounded-2xl border border-white/10 ml-4 md:ml-0 text-left">
                  <div className="text-gray-500 font-black text-xs tracking-widest uppercase mb-2">Protocolos</div>
                  <h4 className="text-xl font-bold text-white mb-2">Ingeniería del Menú y Estandarización</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">Adaptamos nuestras cartas a tu equipamiento. Diseñamos el flujo de trabajo en cocina y seleccionamos el packaging térmico idóneo para que el producto viaje sin perder calidad.</p>
                </div>
              </div>

              {/* Fase 3 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0A0A0A] bg-gray-800 text-gray-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-bold text-sm transition-colors group-hover:bg-[#25D366] group-hover:text-white">3</div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white/5 rounded-2xl border border-white/10 ml-4 md:ml-0 text-left">
                  <div className="text-gray-500 font-black text-xs tracking-widest uppercase mb-2">Lanzamiento</div>
                  <h4 className="text-xl font-bold text-white mb-2">Despliegue del Ecosistema Tecnológico</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">Montamos la PWA de pedidos, integramos pasarelas de pago y configuramos el enrutamiento automático de repartidores (Stuart, flotas propias, etc.) directamente a tu pantalla de cocina (KDS).</p>
                </div>
              </div>

            </div>
          </div>
        </div>
        
        {/* CTA EXCLUSIVO */}
        <div className="text-center max-w-3xl mx-auto">
          <button onClick={() => setIsModalOpen(true)} className="inline-block w-full sm:w-auto bg-white text-black px-10 py-5 rounded-full font-black text-lg md:text-xl hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105">
            Solicitar Entrevista de Admisión
          </button>
        </div>

      </div>

      {/* OBJECTION-HANDLING con tratamiento de escasez real (Parte 6, Sección 7):
          "2 proyectos simultáneos por trimestre" es un límite operativo real,
          no una táctica de urgencia artificial — se trata con el mismo peso
          visual que el resto del bloque, no como letra pequeña al final. */}
      <ObjectionHandling
        titulo="Antes de solicitar la entrevista"
        fondo="oscuro"
        preguntas={[
          {
            pregunta: '¿Por qué solo 2 proyectos por trimestre?',
            respuesta:
              'Es un límite operativo real, no una táctica: cada proyecto exige ingeniería de procesos a medida, y solo podemos garantizar ese nivel de atención en dos operaciones a la vez.',
          },
          {
            pregunta: '¿Qué pasa si no supero la evaluación de viabilidad?',
            respuesta:
              'Rechazamos el proyecto antes de que gastes un euro. Si tu food cost o tu capacidad instalada no garantizan rentabilidad, te lo decimos en la Fase 1, no después de firmar.',
          },
          {
            pregunta: '¿Puedo usar mi propia carta en vez del catálogo?',
            respuesta:
              'Sí. El catálogo de seis marcas acelera el arranque, pero la ingeniería de procesos y la infraestructura PWA se aplican igual sobre tu propio menú.',
          },
          {
            pregunta: '¿Esto reemplaza Glovo, Uber Eats o Just Eat?',
            respuesta:
              'No tiene por qué: puedes seguir vendiendo ahí sin ninguna atadura. El ecosistema propio es el canal donde no pagas comisión, no el único canal posible.',
          },
        ]}
      />

      <EnterpriseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
