import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { estadoFundador } from '@/lib/fundador';
import { obtenerCarta } from '@/lib/menu';
import { propuestaCorreo, type DatosCorreo } from '@/lib/propuesta-correo';
import CopiarCorreo from '@/components/prospeccion/CopiarCorreo';

export const dynamic = 'force-dynamic';

/**
 * Versión para correo de la propuesta (0102). Lee la propuesta sin contar una visita en el CRM
 * y la deja lista para copiar y pegar en Gmail u Outlook, con la portada de la demo y el QR.
 */
export default async function PropuestaCorreo({ params }: { params: Promise<{ id: string }> }) {
  const jwt = await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await comoCliente(jwt, async (c) => (await c.query<{ p: DatosCorreo | null }>('SELECT dk.admin_propuesta_correo($1) AS p', [id])).rows[0]?.p ?? null);
  if (!p) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-6">
        <h1 className="text-2xl font-semibold">Sin propuesta</h1>
        <p className="text-niebla">Este local no tiene enlace de propuesta (o pidió no ser contactado). Créalo desde su ficha.</p>
        <Link href={`/admin-dkitchen/prospeccion/${id}`} className="text-vino underline">Volver a la ficha</Link>
      </main>
    );
  }
  const fundador = p.oferta === 'fundador' ? await estadoFundador() : null;
  const carta = p.demo_slug ? await obtenerCarta(p.demo_slug).catch(() => null) : null;
  const portada = carta ? carta.portadaUrl || [...carta.secciones.flatMap((s) => s.platos), ...carta.sueltos].find((x) => x.fotoUrl)?.fotoUrl || null : null;
  const { asunto, html, texto } = propuestaCorreo(p, { fundadorQuedan: fundador?.abierto ? fundador.quedan : null, portada });

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Prospección · versión para correo</p>
        <h1 className="text-2xl font-semibold">Propuesta para {p.nombre}</h1>
        <p className="text-sm text-niebla">Abrir esta página no cuenta como visita. Copia el correo y pégalo en un correo nuevo de Gmail u Outlook (con formato). La visita se cuenta cuando el local abre la propuesta.</p>
      </header>
      <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-linea">
        <p className="text-sm"><span className="font-semibold">Asunto:</span> {asunto}</p>
        <CopiarCorreo html={html} texto={texto} asunto={asunto} />
      </section>
      <section className="overflow-hidden rounded-2xl ring-1 ring-linea" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
