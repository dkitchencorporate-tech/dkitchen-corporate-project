import type { Metadata } from 'next';
import { IndiceCiudades } from '@/components/dk/PaginaCiudad';

export const metadata: Metadata = {
  title: 'Carta digital QR por ciudad: Granada, Málaga, Sevilla y más',
  description: 'Carta digital QR para bares y restaurantes de Granada, Baza, Almería, Murcia, Málaga, Sevilla y Córdoba: montada desde una foto y sin permanencia.',
  alternates: { canonical: 'https://dkitchencorporate.es/carta-digital' },
};

/** /carta-digital — índice de las páginas por ciudad (26/10/2026). */
export default function Page() {
  return <IndiceCiudades />;
}
