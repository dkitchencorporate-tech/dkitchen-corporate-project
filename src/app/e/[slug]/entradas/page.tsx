import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { emitirEntradas, enviarCorreoEntradas, eventoPublico, fechaEvento, marcarCorreoEnviado } from '@/lib/entradas';

export const metadata: Metadata = { title: 'Tus entradas', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Vuelta de Stripe tras pagar entradas. El servidor comprueba el pago en la cuenta del local y emite las
 * entradas (idempotente). El enlace con `payment_intent` es el «billete»: se manda por correo para volver.
 */
export default async function MisEntradas({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ payment_intent?: string; redirect_status?: string }>;
}) {
  const { slug } = await params;
  const q = await searchParams;
  const e = await eventoPublico(slug).catch(() => null);
  if (!e) notFound();
  const intento = String(q.payment_intent ?? '');
  const r = await emitirEntradas(e, intento).catch((err) => { console.error('Emitir entradas:', err); return null; });

  if (!r) {
    return (
      <main className="min-h-screen bg-papel px-4 py-16 text-carbon">
        <div className="mx-auto max-w-md rounded-[22px] border border-linea bg-white p-6 text-center">
          <h1 className="font-display text-2xl font-semibold">Estamos confirmando tu pago</h1>
          <p className="mt-3 text-pizarra">Si acabas de pagar, recarga esta página en unos segundos. Si el pago no se completó, no se te ha cobrado nada.</p>
          <Link href={`/e/${slug}`} className="mt-6 inline-block rounded-full bg-vino px-6 py-3 font-semibold text-white">Volver al evento</Link>
        </div>
      </main>
    );
  }

  if (r.correoPendiente && r.email) {
    try {
      const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dkitchencorporate.es'}/e/${slug}/entradas?payment_intent=${intento}`;
      await enviarCorreoEntradas(e, r.email, r.nombre, url, r.entradas.length);
      await marcarCorreoEnviado(e, intento);
    } catch (err) {
      console.error('Correo de entradas:', err);
    }
  }

  return (
    <main className="min-h-screen bg-papel px-4 py-10 text-carbon">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wide text-vino">{e.local_nombre}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">{e.titulo}</h1>
        <p className="mt-2 capitalize text-grafito">{fechaEvento(e.fecha)}</p>
        <p className="mt-4 text-sm text-pizarra">Enseña cada código en la puerta. También te las hemos enviado a {r.email}. Guarda esta página.</p>
        <ul className="mt-6 grid gap-4">
          {r.entradas.map((x) => (
            <li key={x.codigo} className="rounded-[22px] border border-linea bg-white p-5 text-center">
              <p className="text-sm font-semibold">Entrada {x.numero} de {r.entradas.length} · {r.nombre}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.qr} alt={`Código QR de la entrada ${x.numero}`} className="mx-auto mt-3 w-64 max-w-full" />
              <p className="mt-2 break-all font-mono text-xs text-niebla">{x.codigo}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
