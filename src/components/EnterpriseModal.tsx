"use client";

import React, { useState, useEffect } from 'react';

interface EnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnterpriseModal({ isOpen, onClose }: EnterpriseModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    projectName: '',
    revenue: '',
    budget: '',
    consent: false
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      document.body.style.overflow = 'hidden';
      window.dispatchEvent(new Event('modal_opened'));
    } else {
      document.body.style.overflow = 'unset';
      window.dispatchEvent(new Event('modal_closed'));
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.dispatchEvent(new Event('modal_closed'));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.revenue || !formData.budget || !formData.consent) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        source: 'Formulario Enterprise (Dark Kitchen)',
        message: `Cargo: ${formData.role} | Proyecto: ${formData.projectName} | Facturación: ${formData.revenue} | Presupuesto: ${formData.budget}`
      };
      
      // Enviamos el lead a la API (que enviará el email a dkitchencorporate y al cliente)
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setStep(2);
    } catch (error) {
      console.error('Error enviando solicitud Enterprise:', error);
      setStep(2); // Pasamos a la pantalla final igualmente
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] w-full max-w-2xl overflow-hidden relative flex flex-col transition-all duration-500 max-h-[95vh] text-white">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-20"
        >
          ✕
        </button>

        <div className="overflow-y-auto flex-grow relative p-6 sm:p-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-widest uppercase mb-4">
                  PROCESO DE ADMISIÓN
                </div>
                <h3 className="text-3xl font-black text-white mb-3">Solicitud de Ingeniería de Proyecto</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto">
                  Por favor, completa este perfil operativo. Nuestro equipo evaluará la viabilidad de tu proyecto y, si encaja en nuestro volumen trimestral, te enviaremos el acceso para tu entrevista privada.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                    <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-vino outline-none transition-colors" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Cargo / Perfil</label>
                    <select required value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-white/10 text-white focus:border-vino outline-none transition-colors appearance-none cursor-pointer">
                      <option value="" disabled>Selecciona tu perfil</option>
                      <option value="Propietario">Propietario / Fundador</option>
                      <option value="Director Operaciones">Director de Operaciones</option>
                      <option value="Inversor">Inversor de Capital</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Profesional</label>
                    <input required type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-vino outline-none transition-colors" placeholder="email@empresa.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Teléfono (WhatsApp)</label>
                    <input required type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-vino outline-none transition-colors" placeholder="+34 600 000 000" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre del Proyecto o Restaurante</label>
                  <input required type="text" value={formData.projectName} onChange={e=>setFormData({...formData, projectName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-vino outline-none transition-colors" placeholder="Ej. Burger Station o Nueva Apertura" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Facturación Mensual Promedio (Actual)</label>
                  <select required value={formData.revenue} onChange={e=>setFormData({...formData, revenue: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-white/10 text-white focus:border-vino outline-none transition-colors appearance-none cursor-pointer">
                    <option value="" disabled>Selecciona un rango</option>
                    <option value="Proyecto desde Cero (Sin facturación)">Proyecto desde Cero (Sin facturación)</option>
                    <option value="Menos de 10.000€/mes">Menos de 10.000€/mes</option>
                    <option value="10.000€ - 30.000€/mes">10.000€ - 30.000€/mes</option>
                    <option value="30.000€ - 60.000€/mes">30.000€ - 60.000€/mes</option>
                    <option value="Más de 60.000€/mes">Más de 60.000€/mes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Presupuesto de Inversión Inicial Disponible</label>
                  <select required value={formData.budget} onChange={e=>setFormData({...formData, budget: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-white/10 text-white focus:border-vino outline-none transition-colors appearance-none cursor-pointer">
                    <option value="" disabled>Selecciona una opción</option>
                    <option value="Menos de 3.000€ (Buscamos soluciones básicas)">Menos de 3.000€ (Buscamos soluciones básicas)</option>
                    <option value="3.000€ - 6.000€">3.000€ - 6.000€</option>
                    <option value="6.000€ - 10.000€">6.000€ - 10.000€</option>
                    <option value="Más de 10.000€ (Listos para escalar alto nivel)">Más de 10.000€ (Listos para escalar alto nivel)</option>
                  </select>
                </div>

                <div className="flex items-start gap-3 pt-2 bg-white/5 p-4 rounded-xl border border-white/5">
                  <input required type="checkbox" id="consent" checked={formData.consent} onChange={e=>setFormData({...formData, consent: e.target.checked})} className="mt-1 bg-black border-gray-600 rounded text-vino focus:ring-vino" />
                  <label htmlFor="consent" className="text-[11px] text-gray-400 leading-tight">Entiendo que esta es una solicitud sujeta a evaluación y no garantiza la aceptación del proyecto. Consiento ser contactado para recibir la evaluación de viabilidad.</label>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:bg-gray-200 transition-colors mt-6 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                     <span className="flex items-center gap-2">
                       <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                       Enviando a comité...
                     </span>
                  ) : (
                     "Enviar Perfil a Evaluación Operativa"
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 border-2 border-green-500/50 rounded-full animate-ping opacity-20"></div>
                <span className="text-4xl">✓</span>
              </div>
              <h3 className="text-3xl font-black text-white mb-4">Solicitud Recibida</h3>
              <div className="text-gray-400 font-medium text-sm max-w-md mx-auto mb-8 leading-relaxed space-y-4">
                <p>
                  Tu perfil ha sido enviado a nuestro comité de ingeniería. <strong>Hemos remitido una copia a tu email.</strong>
                </p>
                <p>
                  Actualmente estamos procesando las solicitudes para este trimestre. Si tus números garantizan la viabilidad del proyecto, te enviaremos el acceso privado a la agenda en las próximas 24 horas.
                </p>
              </div>
              
              <div className="w-full bg-[#1A1A1A] border border-white/5 p-4 rounded-xl mb-8">
                 <p className="text-vino font-bold text-xs uppercase tracking-widest mb-1">Estado de tu plaza:</p>
                 <p className="text-white font-black">EN LISTA DE ESPERA DE EVALUACIÓN</p>
              </div>

              <button 
                onClick={onClose} 
                className="bg-white/10 text-white border border-white/20 font-bold px-8 py-3 rounded-xl text-sm hover:bg-white/20 transition-all duration-300"
              >
                Volver a la web
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
