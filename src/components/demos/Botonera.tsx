import Link from 'next/link';
import Image from 'next/image';
import { FondoVivo } from '@/components/dk/Movimiento';
import RastreoClics from '@/components/demos/RastreoClics';

/**
 * Botoneras de demos (12/10, encargo flyer v3 §4): destino de los QR del flyer
 * y de la tarjeta. Tarjetas grandes, móvil primero, cada una con un móvil que
 * enseña la captura REAL de la demo (public/demos, capturadas en Actions). noindex en cada página.
 */
export interface Boton {
  titulo: string;
  texto: string;
  href: string;
  /** Enlace externo (demo en su subdominio): abre en otra pestaña. */
  externo?: boolean;
  destacado?: boolean;
  /** Captura real que se ve dentro del móvil de la tarjeta (ruta de /public). */
  imagen?: string;
  /** Etiqueta pequeña sobre el título (p. ej. «App real · modo demo»). */
  etiqueta?: string;
  /** Tarjeta de contacto: icono de conversación en lugar de captura. */
  contacto?: boolean;
  /** Texto del enlace (por defecto «Abrir demo», «Empezar» o «Ver»). */
  accion?: string;
  /** Icono de conversación sin ser la tarjeta de contacto (p. ej. WhatsApp). */
  charla?: boolean;
}

/** Conserva el origen (flyer, tarjeta…) en los enlaces internos. */
export const conOrigen = (href: string, origen: string) =>
  href.startsWith('/') ? `${href}${href.includes('?') ? '&' : '?'}utm_source=${encodeURIComponent(origen)}&utm_medium=qr` : href;

function Movil({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative block h-[150px] w-[86px] shrink-0 rotate-[4deg] overflow-hidden rounded-[18px] border-[3px] border-[#141015] bg-[#141015] shadow-[0_16px_34px_-10px_rgba(0,0,0,0.75)] transition duration-300 group-hover:rotate-0 group-hover:scale-[1.03] sm:h-[180px] sm:w-[104px]">
      <Image src={src} alt={alt} fill sizes="110px" className="object-cover object-top" />
      <span aria-hidden="true" className="absolute left-1/2 top-1.5 h-1.5 w-7 -translate-x-1/2 rounded-full bg-[#141015]" />
    </span>
  );
}

function Charla() {
  return (
    <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#1F8A5B] shadow-[0_12px_30px_-10px_rgba(31,138,91,0.8)] sm:h-20 sm:w-20">
      <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white sm:h-10 sm:w-10"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
    </span>
  );
}

export default function Botonera({ etiqueta, titulo, sub, botones, origen, qr }: { etiqueta: string; titulo: string; sub: string; botones: Boton[]; origen: string; qr: string | null }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-noche px-5 pb-24 pt-32 text-white md:pt-40">
      <FondoVivo />
      <RastreoClics codigo={qr} />
      <div className="relative mx-auto max-w-2xl">
        <p className="etiqueta-dk text-oro">{etiqueta}</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.04] md:text-5xl">{titulo}</h1>
        <p className="mt-4 text-lg text-white/70">{sub}</p>
        <ul className="mt-10 space-y-5">
          {botones.map((b) => {
            const clase = `group relative flex items-center justify-between gap-4 overflow-hidden rounded-[28px] border p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] transition duration-300 hover:-translate-y-1 sm:gap-6 sm:p-6 ${
              b.destacado
                ? 'border-oro/50 bg-[linear-gradient(135deg,#7A0F31_0%,#4A0618_100%)] hover:border-oro'
                : 'border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] backdrop-blur hover:border-oro/50'
            }`;
            const dentro = (
              <>
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-oro/10 blur-3xl transition group-hover:bg-oro/20" />
                <span className="relative min-w-0">
                  {b.etiqueta && <span className="mb-2 inline-block rounded-full border border-oro/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-oro">{b.etiqueta}</span>}
                  <span className="block text-xl font-semibold leading-tight sm:text-2xl">{b.titulo}</span>
                  <span className={`mt-1.5 block text-[15px] ${b.destacado ? 'text-white/85' : 'text-white/65'}`}>{b.texto}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-oro">
                    {b.accion ?? (b.externo ? 'Abrir demo' : b.contacto ? 'Empezar' : 'Ver')} <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                  </span>
                </span>
                {b.imagen ? <Movil src={b.imagen} alt={`Captura de ${b.titulo}`} /> : b.contacto || b.charla ? <Charla /> : null}
              </>
            );
            return (
              <li key={b.titulo}>
                {b.externo ? (
                  <a href={b.href} target="_blank" rel="noopener" className={clase} data-rastreo={b.titulo}>{dentro}</a>
                ) : (
                  <Link href={conOrigen(b.href, origen)} className={clase} data-rastreo={b.titulo}>{dentro}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
