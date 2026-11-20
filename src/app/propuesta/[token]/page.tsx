import QRCode from 'qrcode';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { comoVisitante } from '@/lib/db';
import { identidadActual } from '@/lib/sesion';
import { COOKIE_PUESTA } from '@/lib/socio-codigo';
import { estadoFundador } from '@/lib/fundador';
import { QR_MENU, FUNDADOR, puntosPlanQr } from '@/lib/pricing-config';
import { TIPOS, enlaceWhatsapp } from '@/lib/prospeccion';
import BotonImprimir from '@/components/prospeccion/BotonImprimir';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu propuesta · DKitchen', robots: { index: false, follow: false } };

/**
 * Propuesta personalizada «Hola, [local]» (0058/0120/0121). Enlace privado con token
 * que el comercial imprime o envía a mano. Cada apertura externa real queda en
 * el CRM (dk.propuesta_ver, máx. 1 cada 30 min); las sesiones del equipo y los
 * enlaces con ?preview=1 nunca incrementan el contador.
 */
const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
type PlatoMuestra = { nombre: string; precio: string; foto_url: string | null };
type Propuesta = {
  nombre: string; tipo: keyof typeof TIPOS; zona: string; texto: string | null; muestra_url: string | null;
  oferta: string; comercial: string; telefono: string | null; codigo: string | null;
  /** 0062/0121: demo montada en Central para este local, su enlace de pago y muestra visual. */
  demo_slug?: string | null; pago_url?: string | null;
  demo_logo?: string | null; demo_portada?: string | null; demo_color?: string | null;
  demo_plantilla?: string | null; demo_lema?: string | null; demo_platos?: PlatoMuestra[] | null;
};
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';
const eurPlato = (p: string) => `${Number(p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const TITULOS_COMP: Record<string, string> = {
  gastro: 'Diseño de Autor · Alta cocina',
  taberna: 'Diseño de Autor · Taberna',
  urbano: 'Diseño de Autor · Urbana',
};
/** Lo que cambia en el local (mismas ventajas que /qr; sin cifras ni clientes inventados). */
const CAMBIOS = [
  { t: 'Fotos que abren el apetito', d: 'Fotografía editorial de tus platos (o las preparamos desde tu carta) para que cada plato se vea como en la mesa.' },
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

export default async function PropuestaPublica({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const [identidad, jar] = await Promise.all([
    identidadActual().catch(() => null),
    cookies().catch(() => null),
  ]);
  const esInterno = Boolean(identidad) || sp?.preview === '1' || Boolean(jar?.get(COOKIE_PUESTA)?.value);
  const contarVista = !esInterno;

  const p = await comoVisitante(async (c) => (await c.query<{ p: Propuesta | null }>('SELECT dk.propuesta_ver($1, $2) AS p', [token, contarVista])).rows[0].p).catch(() => null);
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
  const colorDemo = p.demo_color || '#6E0C2B';
  const platosMuestra = Array.isArray(p.demo_platos) ? p.demo_platos.slice(0, 3) : [];

  return (
    <main className="min-h-screen overflow-x-clip bg-crema px-3 py-6 text-carbon print:bg-white print:p-0 sm:px-4 sm:py-12">
      <article className="mx-auto max-w-2xl space-y-6 rounded-[24px] bg-white p-5 ring-1 ring-linea print:max-w-none print:rounded-none print:p-0 print:ring-0 sm:rounded-[28px] sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vino sm:tracking-[0.2em]">Propuesta para tu {(TIPOS[p.tipo] ?? 'local').toLowerCase()} · {p.zona}</p>
            <h1 className="font-display mt-2 break-words text-3xl font-semibold leading-tight sm:text-4xl">Hola, {p.nombre}</h1>
          </div>
          <p className="shrink-0 text-[15px] font-bold">D<span className="text-vino">Kitchen</span></p>
        </header>

        {p.texto && <p className="whitespace-pre-line text-[15px] leading-relaxed text-carbon/90">{p.texto}</p>}

        <section className="space-y-4 rounded-[22px] bg-papel p-4 sm:p-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <h2 className="font-semibold">{muestra ? 'Tu carta, ya montada' : 'Tu carta digital con QR'}</h2>
              <p className="mt-1 text-sm text-niebla">
                {muestra
                  ? 'Escanea el código o pulsa el botón: así la verán tus clientes en el móvil, con tus platos y tus colores.'
                  : 'Escanea el código para activarla. La montamos contigo y la cambias desde el móvil cuando quieras.'}
              </p>
              {muestra && (
                <div className="mt-3 flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap">
                  <a href={muestra} className="inline-flex w-full items-center justify-center rounded-full bg-tinta px-5 py-3 text-center text-sm font-semibold text-white sm:w-auto">
                    Ver mi carta
                  </a>
                  {p.demo_slug && (
                    <a href={`${SITIO}/demo/panel?local=${p.demo_slug}${esInterno ? '&preview=1' : ''}`} className="inline-flex w-full items-center justify-center rounded-full bg-vino px-5 py-3 text-center text-sm font-semibold text-white sm:w-auto">
                      Probar mi panel y comandas
                    </a>
                  )}
                </div>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR" width={140} height={140} className="justify-self-center rounded-xl bg-white p-1.5 ring-1 ring-linea print:ring-0" />
          </div>

          {p.demo_slug && platosMuestra.length > 0 && (
            <div className="rounded-2xl bg-white p-3.5 ring-1 ring-linea sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-linea pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  {p.demo_logo && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.demo_logo} alt={p.nombre} width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-linea" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-carbon">{p.nombre}</p>
                    {p.demo_lema && <p className="truncate text-xs text-niebla">{p.demo_lema}</p>}
                  </div>
                </div>
                {p.demo_plantilla && TITULOS_COMP[p.demo_plantilla] && (
                  <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-white" style={{ backgroundColor: colorDemo }}>
                    {TITULOS_COMP[p.demo_plantilla]}
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {platosMuestra.map((pl, idx) => (
                  <div key={`${pl.nombre}-${idx}`} className="overflow-hidden rounded-xl border border-linea bg-papel/50">
                    {pl.foto_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={pl.foto_url} alt={pl.nombre} className="aspect-[16/10] w-full object-cover" />
                    )}
                    <div className="flex items-baseline justify-between gap-2 p-2.5">
                      <p className="min-w-0 truncate text-xs font-semibold text-carbon">{pl.nombre}</p>
                      <span className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums" style={{ color: colorDemo }}>{eurPlato(pl.precio)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <ul className="grid gap-2.5 text-sm sm:grid-cols-3">
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
          <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap">
            <a href={alta} className="inline-flex w-full items-center justify-center rounded-full bg-vino px-5 py-3 text-center text-sm font-semibold text-white sm:w-auto">{p.pago_url ? 'Activar mi carta' : conFundador ? 'Quiero ser Fundador' : `Activar por ${eur(QR_MENU.primerMes)}`}</a>
            {premium && <a href={`${SITIO}/${premium.ruta}?${utm}`} className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-center text-sm font-semibold ring-1 ring-linea sm:w-auto">Ver {premium.nombre}</a>}
          </div>
          {p.codigo && <p className="text-xs text-niebla">Código de tu asesor: <span className="font-mono font-semibold">{p.codigo}</span></p>}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-5 text-sm">
          <p>Te atiende <span className="font-semibold">{p.comercial}</span>{p.telefono ? ` · ${p.telefono}` : ''}</p>
          <div className="flex w-full flex-wrap gap-2 print:hidden sm:w-auto">
            {wa && <a href={`${wa}?text=${encodeURIComponent(`Hola, soy de ${p.nombre}. He visto la propuesta de DKitchen.`)}`} className="inline-flex flex-1 items-center justify-center rounded-full bg-tinta px-5 py-3 text-center text-sm font-semibold text-white sm:flex-initial">Escribir por WhatsApp</a>}
            <BotonImprimir />
          </div>
        </footer>
        <p className="text-[11px] text-ceniza">Precios sin IVA (21 %). Condiciones en dkitchencorporate.es/terms</p>
      </article>
    </main>
  );
}
