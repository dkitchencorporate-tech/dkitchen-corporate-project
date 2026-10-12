import Link from 'next/link';
import { FondoVivo } from '@/components/dk/Movimiento';

/**
 * Botoneras de demos (12/10, encargo flyer v3 §4): destino de los QR del flyer
 * y de la tarjeta. Tarjetas grandes, móvil primero. noindex en cada página.
 */
export interface Boton {
  titulo: string;
  texto: string;
  href: string;
  /** Enlace externo (demo en su subdominio o WhatsApp): abre en otra pestaña. */
  externo?: boolean;
  destacado?: boolean;
}

/** Conserva el origen (flyer, tarjeta…) en los enlaces internos. */
export const conOrigen = (href: string, origen: string) =>
  href.startsWith('/') ? `${href}${href.includes('?') ? '&' : '?'}utm_source=${encodeURIComponent(origen)}&utm_medium=qr` : href;

export default function Botonera({ etiqueta, titulo, sub, botones, origen }: { etiqueta: string; titulo: string; sub: string; botones: Boton[]; origen: string }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-noche px-5 pb-24 pt-32 text-white md:pt-40">
      <FondoVivo />
      <div className="relative mx-auto max-w-2xl">
        <p className="etiqueta-dk text-oro">{etiqueta}</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.04] md:text-5xl">{titulo}</h1>
        <p className="mt-4 text-lg text-white/70">{sub}</p>
        <ul className="mt-10 space-y-4">
          {botones.map((b) => {
            const clase = `group flex items-center justify-between gap-5 rounded-[26px] border p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.6)] transition duration-300 hover:-translate-y-0.5 md:p-7 ${
              b.destacado ? 'border-oro/50 bg-vino text-white hover:bg-vino-hondo' : 'border-white/12 bg-white/[0.06] backdrop-blur hover:border-oro/40 hover:bg-white/[0.1]'
            }`;
            const dentro = (
              <>
                <span>
                  <span className="block text-xl font-semibold leading-tight">{b.titulo}</span>
                  <span className={`mt-1.5 block text-[15px] ${b.destacado ? 'text-white/85' : 'text-white/60'}`}>{b.texto}</span>
                </span>
                <span aria-hidden="true" className="text-2xl text-oro transition group-hover:translate-x-1">→</span>
              </>
            );
            return (
              <li key={b.titulo}>
                {b.externo ? (
                  <a href={b.href} target="_blank" rel="noopener" className={clase}>{dentro}</a>
                ) : (
                  <Link href={conOrigen(b.href, origen)} className={clase}>{dentro}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
