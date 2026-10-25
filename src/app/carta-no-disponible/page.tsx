import CartaNoDisponible from '@/components/CartaNoDisponible';

/**
 * Destino de `/r/{codigo}` cuando el código no resuelve. Existe como página
 * propia porque un manejador de ruta no puede renderizar interfaz: solo
 * redirige. Y quien escanea merece una explicación, no un 404 del navegador.
 */
export const metadata = { title: 'Carta no disponible', robots: { index: false } };

export default function Pagina() {
  return <CartaNoDisponible />;
}
