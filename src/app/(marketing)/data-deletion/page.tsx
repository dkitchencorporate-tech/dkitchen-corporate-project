import React from 'react';

export const metadata = {
  title: "Instrucciones de Eliminación de Datos | DKitchen",
  description: "Protocolo oficial para la solicitud de borrado permanente de datos personales en el ecosistema DKitchen, conforme al RGPD y políticas de Meta.",
  alternates: { canonical: 'https://dkitchencorporate.es/data-deletion' }
};

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-[#FDFCF8] text-zinc-900 font-sans p-8 md:p-24 selection:bg-vino selection:text-white">
      <div className="max-w-3xl mx-auto">
        <header className="mb-16 border-b border-zinc-100 pb-8 text-center md:text-left">
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-vino mb-4">Soberanía de Datos</h1>
          <p className="text-4xl md:text-5xl font-black tracking-tighter">Eliminación de Datos</p>
          <p className="text-zinc-400 mt-4 font-medium">Protocolo de Purga Segura</p>
        </header>

        <section className="space-y-12 leading-relaxed text-zinc-600">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Instrucciones de Eliminación</h2>
            <p>
              Conforme a los requerimientos de la plataforma Meta y el cumplimiento del RGPD, 
              DKitchen provee un mecanismo directo para que los usuarios soliciten la 
              eliminación total de su rastro digital en nuestro ecosistema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-zinc-100">
              <h3 className="font-bold text-zinc-900 mb-2">Vía WhatsApp</h3>
              <p className="text-sm">Escriba <span className="font-bold text-vino">"ELIMINAR MIS DATOS"</span> al número oficial del establecimiento, o al WhatsApp de DKitchen. Revisamos la solicitud de forma manual y procedemos al borrado permanente de sus datos.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-zinc-100">
              <h3 className="font-bold text-zinc-900 mb-2">Vía Email</h3>
              <p className="text-sm">Envíe un correo a <span className="font-bold text-vino">hola@dkitchencorporate.es</span> indicando su número de teléfono. La purga se completará en un plazo máximo de 48 horas.</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">¿Qué se elimina?</h2>
            <p>
              Al completar la solicitud, se borrarán de forma irreversible:
            </p>
            <ul className="list-disc ml-6 mt-4 space-y-2">
              <li>Historial de conversaciones en la tabla `chats`.</li>
              <li>Configuraciones personalizadas en `bot_settings`.</li>
              <li>Cualquier metadato sociodemográfico capturado por la IA.</li>
            </ul>
          </div>
        </section>

        <footer className="mt-24 pt-12 border-t border-zinc-100 text-center">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">© DKitchen Ecosystem | Secure Node</p>
        </footer>
      </div>
    </div>
  );
}
