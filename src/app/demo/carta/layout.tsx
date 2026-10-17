import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo en vivo: carta digital interactiva | DKitchen',
  description:
    'Prueba la carta digital QR de DKitchen tal como la ve tu cliente: fotos, alérgenos, idiomas y llamada al camarero, sin descargar nada.',
  alternates: { canonical: 'https://dkitchencorporate.es/demo/carta' },
  robots: { index: false, follow: true },
};

export default function DemoCartaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
