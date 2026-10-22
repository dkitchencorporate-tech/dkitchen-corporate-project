import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Plaza reservada · DKitchen Corporate', robots: { index: false, follow: false } };

/** 22/10: destino de cualquier pago mientras los cobros están en pausa (PAGOS_PAUSADOS). No se cobra nada. */
export default function PagoReserva() {
  return (
    <section className="bg-crema px-4 pb-24 pt-28 text-tinta sm:px-6 md:pt-36">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Plaza reservada</p>
        <h1 className="font-display mt-3 text-3xl font-semibold">Tenemos tu solicitud</h1>
        <p className="mt-4 text-pizarra">Estamos activando nuestra nueva pasarela de pago. No se te ha cobrado nada: te escribimos en menos de 24 horas para confirmar tu plan y empezar a montar tu carta.</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-vino px-7 py-3.5 text-sm font-semibold text-white">Volver a la portada</Link>
      </div>
    </section>
  );
}
