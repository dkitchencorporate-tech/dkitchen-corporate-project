import type { Metadata } from 'next';
import { pedidoPorToken } from '@/lib/pedidos-nivel-b';
import FormularioIntakeNivelB from '@/components/FormularioIntakeNivelB';

export const metadata: Metadata = {
  title: 'Activación | DKitchen',
  robots: { index: false, follow: false },
};

export default async function CompletarNucleoOperativo({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pedido = await pedidoPorToken(token).catch(() => null);

  if (!pedido) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-6 py-24 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-black text-gray-900 mb-3">Enlace no válido</h1>
          <p className="text-gray-600">
            Este enlace de activación no existe o ya expiró. Escríbenos por WhatsApp y te lo reenviamos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <FormularioIntakeNivelB token={token} />
    </div>
  );
}
