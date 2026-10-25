import QRCode from 'qrcode';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { comoVisitante } from '@/lib/db';
import { estadoFundador } from '@/lib/fundador';
import { QR_MENU, FUNDADOR, puntosPlanQr } from '@/lib/pricing-config';
import { TIPOS, enlaceWhatsapp } from '@/lib/prospeccion';
import BotonImprimir from '@/components/prospeccion/BotonImprimir';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu propuesta · DKitchen', robots: { index: false, follow: false } };

/**
 * Propuesta personalizada «Hola, [local]» (0058). Enlace privado con token
 * que el comercial imprime o envía a mano. Cada apertura queda en el CRM
 * (dk.propuesta_ver, como mucho 1 cada 30 min). Si el local pidió no ser
 * contactado, el enlace deja de funcionar.
 */
const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
type Propuesta = {
  nombre: string; tipo: keyof typeof TIPOS; zona: string; texto: string | null; muestra_url: string | null;
  oferta: string; comercial: string; telefono: string | null; codigo: string | null;
  /** 0062: demo ya montada en Central para este local y su enlace de pago pendiente. */
  demo_slug?: string | null; pago_url?: string | null;
};
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';
/** Lo que cambia en el local (mismas ventajas que /qr; sin cifras ni clientes inventados). */
const CAMBIOS = [
  { t: 'Fotos que abren el apetito', d: 'Mejoramos tus fotos con IA (o las hacemos desde tu carta) para que cada plato se vea como en la mesa.' },
  { t: 'Alérgenos siempre al día', d: 'Los 14 alérgenos en cada plato, como pide la normativa, y los cambias tú desde el móvil en un minuto.' },
  { t: 'Tu carta en otros idiomas', d: 'El turista la lee en su idioma sin que tengas que traducir nada.' },
  { t: 'La mesa avisa al camarero', d: 'Llamar al camarero y pedir la cuenta desde el móvil: suena en el de tu equipo y sabe a qué mesa ir.' },
];
const PASOS = [
  { n: '1', t: 'Nos mandas una foto de tu carta', d: 'Por WhatsApp o por correo. Nada más.' },
  { n: '2', t: 'Te la montamos', d: 'Con tus platos, tus precios y tus colores. La revisas en tu móvil antes de ponerla.' },
  { n: '3', t: 'QR en las mesas', d: 'Te damos los QR listos para imprimir y la cambias tú cuando quieras.' },
];
const PREMIUM: Record<string, { ruta: string; nombre: string }> = {
  signature: { ruta: 'signature', nombre: 'Signature' },
  experience: { ruta: 'experience', nombre: 'Experience' },
  dark_kitchen: { ruta: 'dark-kitchen', nombre: 'Dark Kitchen' },
};

export default async function PropuestaPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const p = await comoVisitante(async (c) => (await c.query<{ p: Propuesta | null }>('SELECT dk.propuesta_ver($1) AS p', [token])).rows[0].p).catch(() => null);
  if (!p) notFound();

  const { basico, ampliado, sala } = QR_MENU.planes;
  const fundador = p.oferta === 'fundador' ? await estadoFundador() : null;
  const conFundador = !!fundador?.abierto;
  const utm = 'utm_source=propuesta&utm_medium=directo&utm_campaign=crm';
  // Si hay demo con enlace de pago preparado en Central, activar = pagar ESA cuenta (demo → cliente, 08/10).
  const alta = p.pago_url || `${SITIO}/${conFundador ? 'fundador' : 'qr'}?${p.codigo ? `v=${p.codigo}&` : ''}${utm}`;
  const muestra = p.muestra_url || (p.demo_slug ? `${SITIO}/m/${p.demo_slug}` : null);
  const premium = PREMIUM[p.oferta];
  const qr = await QRCode.toDataURL(muestra || alta, { width: 320, margin: 1 });
  const wa = enlaceWhatsapp(p.telefono);

  return (
    <main className="min-h-screen bg-crema px-4 py-8 text-carbon print:bg-white print:p-0 sm:py-12">
      <article className="mx-auto max-w-2xl space-y-6 rounded-[28px] bg-white p-6 ring-1 ring-linea print:max-w-none print:rounded-none print:p-0 print:ring-0 sm:p-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Propuesta para tu {(TIPOS[p.tipo] ?? 'local').toLowerCase()} · {p.zona}</p>
            <h1 className="font-display mt-2 break-words text-4xl font-semibold leading-tight">Hola, {p.nombre}</h1>
          </div>
          <p className="shrink-0 text-[15px] font-bold">D<span className="text-vino">Kitchen</span></p>
        </header>

        {p.texto && <p className="whitespace-pre-line text-[15px] leading-relaxed text-carbon/90">{p.texto}</p>}

        <section className="grid gap-5 rounded-[22px] bg-papel p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="font-semibold">{muestra ? 'Tu carta, ya montada' : 'Tu carta digital con QR'}</h2>
            <p className="mt-1 text-sm text-niebla">
              {muestra
                ? 'Escanea el código o pulsa el botón: así la verán tus clientes en el móvil, con tus platos y tus colores.'
                : 'Escanea el código para activarla. La montamos contigo y la cambias desde el móvil cuando quieras.'}
            </p>
            {muestra && <a href={muestra} className="mt-3 inline-flex rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white print:hidden">Ver mi carta</a>}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR" width={140} height={140} className="justify-self-center" />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Qué cambia en tu local</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CAMBIOS.map((c) => (
              <li key={c.t} className="rounded-2xl p-4 ring-1 ring-linea">
                <p className="font-semibold">{c.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-niebla">{c.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Cómo empezamos</h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {PASOS.map((x) => (
              <li key={x.n} className="rounded-2xl bg-papel p-4">
                <p className="font-display text-2xl font-semibold text-vino">{x.n}</p>
                <p className="mt-1 font-semibold">{x.t}</p>
                <p className="mt-1 text-sm text-niebla">{x.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">La oferta</h2>
          {premium ? (
            <p className="text-[15px]">Para un local como el tuyo encaja <span className="font-semibold">{premium.nombre}</span>: te lo explicamos en una llamada de 15 minutos y te damos el precio cerrado. Mientras tanto, puedes empezar con la carta QR.</p>
          ) : conFundador && fundador ? (
            <p className="text-[15px]"><span className="font-semibold">Plan Fundador:</span> todo el plan {sala.nombre} con un {Math.round(FUNDADOR.descuento * 100)} % de descuento de por vida: {eur(FUNDADOR.mensual)} al mes + IVA, pagado por trimestre ({eur(FUNDADOR.trimestre)} + IVA). Quedan {fundador.quedan} de {FUNDADOR.plazas} plazas.</p>
          ) : (
            <p className="text-[15px]"><span className="font-semibold">Plan {ampliado.nombre}: el primer mes por {eur(QR_MENU.primerMes)} + IVA.</span> Después, {eur(ampliado.mensual)} al mes + IVA, sin permanencia. Si en 30 días no te convence, te devolvemos ese euro y te quedas tu carta en PDF.</p>
          )}
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            {[basico, ampliado, sala].map((pl) => (
              <li key={pl.id} className={`rounded-2xl p-4 ring-1 ${pl.id === 'ampliado' ? 'bg-vino/5 ring-vino/30' : 'ring-linea'}`}>
                <p className="font-semibold">{pl.nombre}{pl.id === 'ampliado' ? <span className="ml-2 text-xs font-semibold text-vino">el más elegido</span> : null}</p>
                <p className="text-niebla">{eur(pl.mensual)}/mes + IVA</p>
                <ul className="mt-2 space-y-1 text-[13px] text-carbon/80">
                  {puntosPlanQr(pl.id as 'basico' | 'ampliado' | 'sala').slice(0, 3).map((x) => <li key={x}>· {x}</li>)}
                  {pl.id !== 'basico' && <li>· Pedido desde la mesa</li>}
                </ul>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 print:hidden">
            <a href={alta} className="rounded-full bg-vino px-5 py-3 text-sm font-semibold text-white">{p.pago_url ? 'Activar mi carta' : conFundador ? 'Quiero ser Fundador' : `Activar por ${eur(QR_MENU.primerMes)}`}</a>
            {premium && <a href={`${SITIO}/${premium.ruta}?${utm}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold ring-1 ring-linea">Ver {premium.nombre}</a>}
          </div>
          {p.codigo && <p className="text-xs text-niebla">Código de tu asesor: <span className="font-mono font-semibold">{p.codigo}</span></p>}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-5 text-sm">
          <p>Te atiende <span className="font-semibold">{p.comercial}</span>{p.telefono ? ` · ${p.telefono}` : ''}</p>
          <div className="flex flex-wrap gap-2 print:hidden">
            {wa && <a href={`${wa}?text=${encodeURIComponent(`Hola, soy de ${p.nombre}. He visto la propuesta de DKitchen.`)}`} className="rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white">Escribir por WhatsApp</a>}
            <BotonImprimir />
          </div>
        </footer>
        <p className="text-[11px] text-ceniza">Precios sin IVA (21 %). Condiciones en dkitchencorporate.es/terms</p>
      </article>
    </main>
  );
}
