'use client';
import React, { useState } from 'react';

const faqs = [
  {
    question: "¿Tengo que saber de tecnología para usar este sistema?",
    answer: "Absolutamente no. Nuestro modelo es 100% 'Llave en Mano'. Nosotros diseñamos, programamos y conectamos todo el ecosistema. Tú solo sigues haciendo lo que mejor sabes: llevar tu restaurante. Y si tienes equipo nuevo, nosotros nos encargamos de educarlos en el uso de las nuevas cartas digitales."
  },
  {
    question: "¿Pierdo la carta física de toda la vida?",
    answer: "Al contrario, la elevamos. Creemos en un ecosistema híbrido. Integramos neuroventas tanto en tu carta digital como en tu menú físico, ubicando los platos de mayor margen donde la vista del cliente va primero. Lo digital acelera el pedido, lo físico ancla la experiencia."
  },
  {
    question: "¿De quién es la web, el dominio y los datos de clientes?",
    answer: "Son tuyos desde el minuto uno. A diferencia de quienes registran tu dominio a su nombre, o de las plataformas de delivery que te ocultan los datos de tus clientes, con DKitchen tú eres el único propietario de tus bases de datos, tu código y tu presencia digital."
  },
  {
    question: "¿Qué pasa si cancelo el QR Menú antes de que acabe el mes a 1€?",
    answer: "Cancelas cuando quieras, sin permanencia. Si cancelas dentro del primer mes simbólico, no se te cobra el precio completo del plan. El montaje de 159€ es un regalo permanente de activación, no algo que tengas que devolver."
  },
  {
    question: "¿Qué pasa con mis datos si dejo de ser cliente?",
    answer: "Son tuyos desde el minuto uno, en cualquier peldaño de la escalera. Si te vas, te llevas tu carta, tu QR y tus datos — nosotros no los retenemos ni los usamos para nada distinto de lo que ya te prestamos como servicio."
  },
  {
    question: "¿Existen costes ocultos o comisiones por reserva?",
    answer: "Cero comisiones por venta. Nunca. El pago de Núcleo Operativo es de 700€ en pago único, o fraccionado en 2 cuotas de 375€ (750€ en total) si lo prefieres. Además, te regalamos los 2 primeros meses de mantenimiento. A partir del tercer mes, el soporte premium y servidor cuesta desde 99€/mes según el volumen de ventas, sin permanencia."
  },
  {
    question: "¿Cómo es el formato de trabajo y la comunicación?",
    answer: "Nos comunicamos directamente por un canal privado, sin intermediarios. Además de nuestra asistencia técnica continua, también celebramos eventos y consultorías donde tratamos estrategias de crecimiento para asegurar que tu inversión inicial se recupere en tiempo récord."
  }
];

export default function FAQ() {
  const [openIndices, setOpenIndices] = useState<number[]>([]);

  const toggleFAQ = (index: number) => {
    setOpenIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <section className="py-24 bg-[#FDFCF8] border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6 tracking-tight text-balance">
            Dudas frecuentes antes de arrancar
          </h2>
          <p className="text-lg text-gray-600 font-medium text-pretty">
            Transparencia total. Sin letra pequeña.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${openIndices.includes(index) ? 'border-vino shadow-md bg-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <button
                className="w-full text-left px-6 py-5 sm:px-8 sm:py-6 flex justify-between items-center focus:outline-none"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg sm:text-xl font-bold text-gray-900 pr-8">{faq.question}</span>
                <span className={`text-2xl text-vino transform transition-transform duration-300 flex-shrink-0 ${openIndices.includes(index) ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              <div 
                className={`px-6 sm:px-8 text-gray-600 text-base sm:text-lg leading-relaxed transition-all duration-300 ease-in-out ${openIndices.includes(index) ? 'pb-6 sm:pb-8 opacity-100 max-h-96' : 'max-h-0 opacity-0 overflow-hidden'}`}
              >
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
