import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obtenerLegalPublico } from '@/lib/menu';

/**
 * Páginas legales del negocio (0037): aviso legal, privacidad y cookies de la
 * carta de un restaurante, generadas con los datos que el propio cliente
 * escribió y publicó en Carta → Estudio → Páginas legales. Sin publicar, 404.
 */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await obtenerLegalPublico(slug).catch(() => null);
  return { title: d ? `Información legal · ${d.nombre}` : 'Información legal', robots: { index: false, follow: true } };
}

export default async function LegalNegocio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await obtenerLegalPublico(slug).catch(() => null);
  if (!d) notFound();
  const titular = `${d.titular}${d.nif ? `, con NIF/CIF ${d.nif}` : ''}${d.domicilio ? ` y domicilio en ${d.domicilio}` : ''}`;
  const h2 = 'mt-12 scroll-mt-6 font-semibold text-2xl tracking-tight';
  const p = 'mt-3 leading-relaxed text-black/70';

  return (
    <main className="min-h-screen bg-[#F7F5F2] text-[#1B1D22]">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <a href={`/m/${slug}`} className="text-sm text-black/50 hover:text-black">← Volver a la carta</a>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Información legal de {d.nombre}</h1>
        <nav className="mt-4 flex gap-4 text-sm font-medium"><a href="#aviso">Aviso legal</a><a href="#privacidad">Privacidad</a><a href="#cookies">Cookies</a></nav>

        <h2 id="aviso" className={h2}>Aviso legal</h2>
        <p className={p}>Esta carta digital es responsabilidad de {titular} (en adelante, «el titular»), en cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico.</p>
        <p className={p}>Contacto: <a className="underline" href={`mailto:${d.email}`}>{d.email}</a>{d.telefono ? <> · Teléfono: {d.telefono}</> : null}.</p>
        <p className={p}>La carta informa de los platos, precios y alérgenos del establecimiento. Los precios incluyen IVA salvo que se indique lo contrario y pueden cambiar sin previo aviso; prevalece el precio vigente en el local en el momento del servicio. Las fotografías pueden ser orientativas. Si tienes alguna alergia o intolerancia, consulta siempre al personal antes de pedir.</p>
        <p className={p}>La plataforma tecnológica de la carta la presta DKitchen Corporate (dkitchencorporate.es) por encargo del titular.</p>

        <h2 id="privacidad" className={h2}>Política de privacidad</h2>
        <p className={p}><strong>Responsable del tratamiento:</strong> {titular}. Contacto: {d.email}.</p>
        <p className={p}><strong>Qué datos tratamos y para qué:</strong> consultar la carta no requiere dar ningún dato personal. Si haces una reserva desde la carta, tratamos tu nombre, teléfono, correo (opcional), fecha, hora, número de personas y notas para gestionar tu reserva y avisarte de su estado.</p>
        <p className={p}><strong>Base legal:</strong> la gestión de la reserva que solicitas (ejecución de medidas precontractuales, art. 6.1.b del RGPD).</p>
        <p className={p}><strong>Conservación:</strong> el tiempo necesario para gestionar la reserva y atender posibles reclamaciones.</p>
        <p className={p}><strong>Destinatarios:</strong> no cedemos tus datos a terceros salvo obligación legal. DKitchen Corporate actúa como encargado del tratamiento, alojando la carta y el sistema de reservas en servidores de la Unión Europea.</p>
        <p className={p}><strong>Tus derechos:</strong> puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {d.email}. Si consideras que no se han atendido correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>

        <h2 id="cookies" className={h2}>Política de cookies</h2>
        <p className={p}>Esta carta no instala cookies publicitarias ni de seguimiento, y no guarda nada en tu dispositivo para identificarte. El idioma elegido va en la propia dirección de la página. Solo se cuenta, de forma agregada, cuántas veces se abre la carta desde el código QR, sin identificar a nadie. Por eso no es necesario pedir tu consentimiento.</p>

        <p className="mt-14 text-xs text-black/40">Información facilitada por el titular del establecimiento.</p>
      </div>
    </main>
  );
}
