"use client";

import React, { useState, useEffect } from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';

interface ConsultingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConsultingModal({ isOpen, onClose }: ConsultingModalProps) {
  const [step, setStep] = useState(1);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [answers, setAnswers] = useState<any>({});
  
  // Form state
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', consent: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setShowExitIntent(false);
      setAnswers({});
      document.body.style.overflow = 'hidden';
      window.dispatchEvent(new Event('modal_opened'));
    } else {
      document.body.style.overflow = 'unset';
      window.dispatchEvent(new Event('modal_closed'));
    }
    return () => { 
      document.body.style.overflow = 'unset'; 
      window.dispatchEvent(new Event('modal_closed'));
    }
  }, [isOpen]);

  // Listener oficial de Calendly para el evento de reserva completada
  useCalendlyEventListener({
    onEventScheduled: (e) => {
      setStep(4); // Transición mágica a la Fase 4
    }
  });

  if (!isOpen) return null;

  const handleCloseAttempt = () => {
    if (step === 1 || step === 2) {
      setShowExitIntent(true);
    } else {
      onClose();
    }
  };

  const handleAnswer = (question: string, answer: string) => {
    setAnswers({ ...answers, [question]: answer });
    if (step === 1 && Object.keys(answers).length === 2) {
      // 3 questions total (length will be 3 after this render), go to step 2
      setStep(2);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email || !formData.consent) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        source: 'Consulting Modal (Núcleo Operativo)',
        answers: answers
      };
      
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Siempre pasamos al calendario, incluso si la API falla, para no perder la reserva
      setStep(3);
    } catch (error) {
      console.error('Error enviando lead:', error);
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = Object.keys(answers).length;

  const renderQuestions = () => {
    if (currentQ === 0) {
      return (
        <div className="animate-fade-in">
          <h3 className="text-2xl font-black text-gray-900 mb-6">Pregunta 1 de 3</h3>
          <p className="text-xl text-gray-700 mb-8 font-medium">¿Cómo ven tus clientes la carta actualmente?</p>
          <div className="space-y-4">
            <button onClick={() => handleAnswer('carta', 'pdf')} className="w-full text-left px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-vino hover:bg-orange-50 font-bold text-gray-700 transition-colors shadow-sm">
              En un PDF estático o carta de papel/cartón.
            </button>
            <button onClick={() => handleAnswer('carta', 'web')} className="w-full text-left px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-vino hover:bg-orange-50 font-bold text-gray-700 transition-colors shadow-sm">
              Tengo un QR básico o web.
            </button>
          </div>
        </div>
      );
    }
    if (currentQ === 1) {
      return (
        <div className="animate-fade-in">
          <h3 className="text-2xl font-black text-gray-900 mb-6">Pregunta 2 de 3</h3>
          <p className="text-xl text-gray-700 mb-8 font-medium">¿Tienes un sistema para enviar ofertas (cumpleaños, promociones) y hacer que el cliente vuelva en días flojos?</p>
          <div className="space-y-4">
            <button onClick={() => handleAnswer('bd', 'no')} className="w-full text-left px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-vino hover:bg-orange-50 font-bold text-gray-700 transition-colors shadow-sm">
              No, dependemos totalmente del paso de gente o la intuición.
            </button>
            <button onClick={() => handleAnswer('bd', 'si')} className="w-full text-left px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-vino hover:bg-orange-50 font-bold text-gray-700 transition-colors shadow-sm">
              Sí, intento guardar datos pero no tengo un proceso automático.
            </button>
          </div>
        </div>
      );
    }
    if (currentQ === 2) {
      return (
        <div className="animate-fade-in">
          <h3 className="text-2xl font-black text-gray-900 mb-6">Pregunta 3 de 3</h3>
          <p className="text-xl text-gray-700 mb-8 font-medium">¿Sientes que tu negocio facturaría más y tu equipo tendría menos estrés si estuviera digitalizado profesionalmente?</p>
          <div className="space-y-4">
            <button onClick={() => handleAnswer('mindset', 'si')} className="w-full text-left px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-vino hover:bg-orange-50 font-bold text-gray-700 transition-colors shadow-sm">
              Sí, necesito actualizar mi local lo antes posible.
            </button>
            <button onClick={() => handleAnswer('mindset', 'talvez')} className="w-full text-left px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-vino hover:bg-orange-50 font-bold text-gray-700 transition-colors shadow-sm">
              Quiero modernizarlo, pero necesito ver opciones claras.
            </button>
          </div>
        </div>
      );
    }
  };

  const renderForm = () => (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-sm">✓</div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">¡Perfecto! Tu perfil encaja.</h3>
        <p className="text-gray-600 font-medium text-sm">Déjanos tus datos para asegurar tus bonos de 980€ y elegir la hora de tu consultoría gratuita.</p>
      </div>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo / Encargado</label>
          <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-0 focus:border-vino outline-none transition-colors" placeholder="Tu nombre" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono (WhatsApp)</label>
          <input required type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-0 focus:border-vino outline-none transition-colors" placeholder="+34 600 000 000" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Email Profesional</label>
          <input required type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-0 focus:border-vino outline-none transition-colors" placeholder="correo@restaurante.com" />
        </div>
        <div className="flex items-start gap-2 pt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
          <input required type="checkbox" id="consent" checked={formData.consent} onChange={e=>setFormData({...formData, consent: e.target.checked})} className="mt-1" />
          <label htmlFor="consent" className="text-xs text-gray-600 leading-tight">Acepto la política de privacidad y autorizo el contacto para agendar la consultoría de Núcleo Operativo.</label>
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white font-black py-4 rounded-xl text-lg hover:bg-vino transition-colors mt-4 shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
             <span className="flex items-center gap-2">
               <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
               Asegurando bonos...
             </span>
          ) : (
             <>Continuar al Calendario <span className="text-xl">📅</span></>
          )}
        </button>
      </form>
    </div>
  );

  const renderCalendar = () => {
    return (
      <div className="animate-fade-in w-full h-full bg-white relative rounded-xl overflow-hidden min-h-[600px] sm:min-h-[700px]">
        <InlineWidget 
          url="https://calendly.com/dkitchencorporate/30min"
          prefill={{
            name: formData.name,
            email: formData.email
          }}
          pageSettings={{
            hideEventTypeDetails: true,
            hideGdprBanner: true
          }}
          styles={{
            height: '100%',
            width: '100%',
            position: 'absolute',
            inset: 0
          }}
        />
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="animate-fade-in py-10 px-4 text-center flex flex-col items-center justify-center">
      <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 relative">
        <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-ping opacity-20"></div>
        <svg className="w-12 h-12 text-green-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h3 className="text-3xl font-black text-gray-900 mb-4">¡Reserva Confirmada!</h3>
      <p className="text-gray-600 font-medium text-lg max-w-md mx-auto mb-8 leading-relaxed">
        Tu Fundación Digital está en marcha. Te hemos enviado un correo con la confirmación y las instrucciones previas a nuestra reunión.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto">
        <button 
          onClick={onClose} 
          className="w-full sm:w-auto bg-gray-900 text-white font-black px-8 py-4 rounded-xl text-lg shadow-xl hover:bg-gray-800 transition-all duration-300"
        >
          Finalizar
        </button>
        <a 
          href={`https://wa.me/34622652659?text=Hola,%20acabo%20de%20agendar%20mi%20sesión%20estratégica%20(${formData.name}).%20Tengo%20una%20duda...`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto bg-[#25D366] text-white font-black px-8 py-4 rounded-xl text-lg shadow-lg hover:bg-[#1ebd5a] transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.437-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          Dudas por WhatsApp
        </a>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
      
      {/* Main Modal */}
      {!showExitIntent && (
        <div className={`bg-white rounded-[2rem] shadow-2xl w-full overflow-hidden relative flex flex-col transition-all duration-500 ${step === 3 ? 'max-w-4xl h-[90vh] sm:h-[85vh]' : 'max-w-lg max-h-[95vh]'}`}>
          {/* Progress Bar */}
          {step < 3 && (
            <div className="w-full bg-gray-100 h-2">
              <div className="bg-vino h-2 transition-all duration-500" style={{ width: `${(step === 1 ? (currentQ/3)*100 : 100)}%` }}></div>
            </div>
          )}
          
          <div className={`overflow-y-auto flex-grow relative ${step === 3 ? 'flex flex-col p-0 sm:p-0' : 'p-6 sm:p-10'}`}>
            {step !== 4 && (
              <button onClick={handleCloseAttempt} className={`absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-colors z-[100] ${step === 3 ? 'bg-white shadow-md' : ''}`}>✕</button>
            )}
            
            {step === 1 && renderQuestions()}
            {step === 2 && renderForm()}
            {step === 3 && renderCalendar()}
            {step === 4 && renderSuccess()}
          </div>
        </div>
      )}

      {/* Exit Intent Downsell Modal */}
      {showExitIntent && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 sm:p-12 text-center animate-bounce-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border border-red-100 shadow-inner">⚠️</div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">¿Vas a dejar pasar tus bonos de 980€?</h2>
          <p className="text-gray-600 mb-8 font-medium leading-relaxed">La digitalización de tu negocio no debería posponerse. Si no tienes tiempo para el formulario, hablemos directo por WhatsApp en menos de 1 minuto.</p>
          
          <div className="space-y-4">
            <a href="https://wa.me/34622652659?text=Hola,%20prefiero%20hablar%20por%20WhatsApp%20sobre%20la%20Base%20Operativa%20Digital." className="block w-full bg-[#25D366] text-white px-6 py-4 rounded-xl font-black text-lg hover:bg-green-600 transition-colors shadow-lg flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.437-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Hablar rápido por WhatsApp
            </a>
            
            <div className="pt-4 mt-2">
              <button onClick={onClose} className="text-gray-400 text-xs sm:text-sm font-bold hover:text-red-500 transition-colors underline decoration-transparent hover:decoration-red-500 underline-offset-4 text-balance">
                No, prefiero seguir perdiendo reservas y dejar pasar los bonos gratuitos.
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
