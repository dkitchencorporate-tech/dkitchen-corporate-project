import React from 'react';
import { EXPERIENCE, formatPrecio } from '@/lib/pricing-config';
import PowerStatement from './PowerStatement';
import Hero3DLazy from '@/components/motion/Hero3DLazy';
import TiltCard from '@/components/motion/TiltCard';

const WHATSAPP = 'https://wa.me/34622652659';

const TARIFAS = [
  { etiqueta: 'Primera vez', precio: EXPERIENCE.tarifas.primeraVez.precio, detalle: 'Cliente nuevo, cualquiera de los 7 formatos.', destacada: true },
  { etiqueta: 'Nuevo evento', precio: EXPERIENCE.tarifas.nuevoEvento.precio, detalle: 'Ya trabajaste con nosotros y quieres un formato distinto.', destacada: false },
  { etiqueta: 'Reuso', precio: EXPERIENCE.tarifas.reuso.precio, detalle: 'El mismo evento que ya está construido, en una fecha nueva.', destacada: false },
  { etiqueta: 'Reuso fidelizado', precio: EXPERIENCE.tarifas.reusoFidelizado.precio, detalle: 'A partir del tercer evento contigo, reactivar cuesta casi nada.', destacada: false },
];

const FORMATOS = [
  { nombre: 'Cata de maridaje', marca: 'Cualquier marca', nota: 'El formato ya validado en un evento real.' },
  { nombre: 'Noche de Asado', marca: 'Santa Brazza', nota: 'Parrilla en vivo como espectáculo del propio evento.' },
  { nombre: 'Bowl Night', marca: 'My Latin Bowl', nota: 'Estación "arma tu bowl", alta interacción.' },
  { nombre: 'Fry Fest', marca: 'Seven Food Fries', nota: 'Degustación entre variantes de loaded fries.' },
  { nombre: 'Brunch Pop-Up', marca: 'Natureza Brunch', nota: 'Activa el domingo, que suele ser el día flojo.' },
  { nombre: 'Bocadillos Gourmet', marca: 'Bokadipan', nota: 'Formato casual de sobremesa nocturna.' },
  { nombre: 'Wings Battle', marca: 'Wing Boss', nota: 'Reto de picante, alto potencial viral.' },
];

export default function EventLibraryHook() {
  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-[#111] to-[#0a0a0a] text-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#6E0C2B] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">

        <div className="text-center max-w-4xl mx-auto mb-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-orange-400 text-xs font-bold tracking-widest uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
            DKitchen Experience
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black leading-tight text-balance">
            Un evento entero, montado.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6E0C2B] to-orange-400">La taquilla entera, tuya.</span>
          </h2>

          {/* Elemento 3D del hero (Parte 7, Sección 2.3): composición ligada
              al caso Alhambra, entrada tipo "reveal". */}
          <Hero3DLazy preset="experience" className="w-full h-48 md:h-64" />

          <p className="text-lg md:text-xl text-gray-400 leading-relaxed text-pretty">
            Te entregamos un evento ya definido: concepto, guía de desarrollo, procesos, piezas de marketing,
            campaña de anuncios y la landing de venta de entradas. Tú lo ejecutas en tu local y cobras en tu propia cuenta.
            <strong className="text-white"> Sin comisión, sin porcentaje y sin que toquemos tu dinero en ningún momento.</strong>
          </p>
        </div>
      </div>

      {/* POWER-STATEMENT (Parte 6, Sección 4): cierra "¿de qué vive DKitchen
          entonces?" antes de que el visitante lo pregunte. */}
      <PowerStatement texto="Cero comisión. El dinero es tuyo desde el primer euro." fondo="brand" />

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          <div className="flex gap-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6E0C2B] to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20 shrink-0">🎯</div>
            <div>
              <h3 className="text-xl font-bold mb-2">Ya está construido</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                No diseñamos desde cero en cada conversación. Partimos de siete formatos ya desarrollados y probados,
                o usamos tu propia carta en formato híbrido.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">🔐</div>
            <div>
              <h3 className="text-xl font-bold mb-2">Nadie entra sin entrada</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Cada entrada vendida genera un QR único de un solo uso. Tú escaneas en puerta y se marca como usada.
                No gestionas listas, no gestionas efectivo, no discutes con nadie en la entrada.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">💳</div>
            <div>
              <h3 className="text-xl font-bold mb-2">El dinero va directo a ti</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                La pasarela de cobro es tuya (Stripe, SumUp o Revolut Pay, tú eliges). Nosotros solo la conectamos.
                Cada entrada cae en tu cuenta, nunca en la nuestra.
              </p>
            </div>
          </div>
        </div>

        {/* PRICING-BLOCK — escalera de fidelización, no tabla plana (Parte 6,
            Sección 4): el mensaje visual es "cuanto más repites, menos pagas",
            así que el orden y el tamaño decreciente lo comunican solos. */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-black text-white">Cuanto más repites, menos pagas.</h3>
            <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto">
              Cuatro tarifas fijas, sin letra pequeña — ninguna lleva componente variable. El trabajo pesado ya está
              hecho y amortizado, así que el precio baja con cada repetición.
            </p>
          </div>

          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {TARIFAS.map((t, i) => (
              <div
                key={t.etiqueta}
                className={`rounded-2xl border transition-colors flex items-center gap-6 ${
                  t.destacada
                    ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/40 p-7'
                    : 'bg-[#1A1A1A] border-white/10 hover:border-white/20 p-5'
                }`}
                style={{ marginLeft: `${i * 8}px` }}
              >
                <div
                  className={`shrink-0 font-black text-white ${t.destacada ? 'text-5xl' : 'text-3xl'}`}
                >
                  {formatPrecio(t.precio)}
                </div>
                <div>
                  <div className={`text-[11px] font-black uppercase tracking-widest mb-1 ${t.destacada ? 'text-orange-400' : 'text-gray-500'}`}>
                    {t.etiqueta}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{t.detalle}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-2xl shrink-0">⭐</span>
            <p className="text-sm text-gray-300 leading-relaxed">
              <strong className="text-white">¿Ya tienes el QR Menú activo con nosotros?</strong> Tu primera Experience cuesta{' '}
              <strong className="text-orange-400">{formatPrecio(EXPERIENCE.tarifas.primeraParaClienteQr.precio)}</strong> en lugar de{' '}
              {formatPrecio(EXPERIENCE.tarifas.primeraVez.precio)}. No es un descuento que haya que negociar: es tarifa publicada,
              porque contigo ya no hay coste de adquisición ni de construir confianza.
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6 max-w-2xl mx-auto leading-relaxed">
            El presupuesto de publicidad lo pones tú y se paga directo a Meta o Google: nosotros creamos y gestionamos la campaña,
            pero nunca ponemos ni intermediamos capital de marketing.
          </p>
        </div>

        {/* REPARTO DE RESPONSABILIDADES */}
        <div className="max-w-5xl mx-auto mb-20 relative z-10">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-black text-white">¿Cómo nos dividimos el trabajo?</h3>
            <p className="text-gray-400 text-sm mt-2">Sin ambigüedad, para que sepas exactamente qué esperas de cada lado.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-8 hover:border-orange-500/30 transition-colors shadow-2xl">
              <div className="w-14 h-14 bg-gradient-to-br from-[#6E0C2B] to-orange-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg shadow-orange-500/20">⚡</div>
              <h4 className="text-xl font-bold text-white mb-5">Lo que hacemos nosotros</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li className="flex items-start gap-3"><span className="text-[#6E0C2B] mt-0.5">✓</span> <span>Definir el concepto del evento y su guía de desarrollo.</span></li>
                <li className="flex items-start gap-3"><span className="text-[#6E0C2B] mt-0.5">✓</span> <span>Brief operativo: qué pasa antes, durante y después.</span></li>
                <li className="flex items-start gap-3"><span className="text-[#6E0C2B] mt-0.5">✓</span> <span>Piezas de marketing digital y diseño de flyer físico.</span></li>
                <li className="flex items-start gap-3"><span className="text-[#6E0C2B] mt-0.5">✓</span> <span>Landing de venta de entradas, conectada a tu pasarela.</span></li>
                <li className="flex items-start gap-3"><span className="text-[#6E0C2B] mt-0.5">✓</span> <span>Montar y gestionar la campaña de anuncios.</span></li>
                <li className="flex items-start gap-3"><span className="text-[#6E0C2B] mt-0.5">✓</span> <span>Informe de cierre con entradas vendidas e ingresos.</span></li>
              </ul>
            </div>
            <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-8 hover:border-white/20 transition-colors shadow-2xl">
              <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center text-3xl mb-6 border border-white/10">👨‍🍳</div>
              <h4 className="text-xl font-bold text-white mb-5">Lo que haces tú</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li className="flex items-start gap-3"><span className="text-white mt-0.5">✓</span> <span>Abrir y mantener tu propia cuenta de cobro.</span></li>
                <li className="flex items-start gap-3"><span className="text-white mt-0.5">✓</span> <span>Validar el concepto y fijar fecha, aforo y precio de entrada.</span></li>
                <li className="flex items-start gap-3"><span className="text-white mt-0.5">✓</span> <span>Pagar el presupuesto de publicidad y los flyers.</span></li>
                <li className="flex items-start gap-3"><span className="text-white mt-0.5">✓</span> <span>Escanear las entradas en la puerta el día del evento.</span></li>
                <li className="flex items-start gap-3"><span className="text-white mt-0.5">✓</span> <span>Cocinar, servir y dar una experiencia que se recuerde.</span></li>
                <li className="flex items-start gap-3"><span className="text-white mt-0.5">✓</span> <span>Quedarte el 100% de la taquilla.</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* LOS 7 FORMATOS */}
        <div className="text-center max-w-4xl mx-auto mb-14 space-y-6 relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] text-balance">
            Siete formatos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6E0C2B] to-orange-400">ya desarrollados</span>.
          </h2>
          <p className="text-gray-400 leading-relaxed text-lg text-pretty max-w-2xl mx-auto">
            Cada formato va emparejado con una de nuestras marcas propias, que ya operaron en una cocina real.
            Si prefieres tu propia carta, la usamos: el formato se mantiene, el menú lo pones tú.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {FORMATOS.map((f) => (
            <TiltCard key={f.nombre} className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
              <div className="text-white font-bold text-lg mb-1">{f.nombre}</div>
              <div className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-3">{f.marca}</div>
              <p className="text-xs text-gray-400 leading-relaxed">{f.nota}</p>
            </TiltCard>
          ))}
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <a
            href={`${WHATSAPP}?text=Hola,%20quiero%20montar%20un%20evento%20con%20DKitchen%20Experience`}
            className="inline-block bg-[#6E0C2B] text-white text-center py-4 px-10 rounded-xl font-black text-lg hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-500/50 hover:-translate-y-1"
          >
            Montar mi primer evento
          </a>
          <p className="text-xs text-gray-500 mt-4">
            Desde la primera reunión hasta el día del evento pasan unas tres semanas.
          </p>
        </div>

      </div>
    </section>
  );
}
