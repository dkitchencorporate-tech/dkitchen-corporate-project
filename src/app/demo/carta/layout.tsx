import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo en vivo: carta digital interactiva | DKitchen',
  description:
    'Prueba la carta digital interactiva de DKitchen tal como la ve tu cliente: fotos, alérgenos, varios idiomas y pedido en el móvil, sin descargar nada.',
  alternates: { canonical: 'https://dkitchencorporate.es/demo/carta' },
  robots: { index: false, follow: true },
};

export default function DemoCartaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
