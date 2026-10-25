import type { Metadata } from 'next';
import { Suspense } from 'react';
import FormularioNuevaContrasena from './FormularioNuevaContrasena';

export const metadata: Metadata = {
  title: 'Fija tu contraseña | DKitchen',
  robots: { index: false, follow: false },
};

export default function NuevaContrasenaPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-6 py-24">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-black text-gray-900 mb-2 text-center">Fija tu contraseña</h1>
        <p className="text-gray-600 text-center mb-8">
          Con esto activas el acceso a tu panel, donde gestionas tu carta y tu QR.
        </p>
        <Suspense fallback={null}>
          <FormularioNuevaContrasena />
        </Suspense>
      </div>
    </div>
  );
}
