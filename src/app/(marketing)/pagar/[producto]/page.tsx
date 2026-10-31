import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRODUCTOS_PAGO } from '@/lib/productos-pago';
import { BASE_OPERATIVA, FUNDADOR } from '@/lib/pricing-config';
import { estadoFundador } from '@/lib/fundador';
import { PLAZAS_PARA_CONTAR } from '@/components/fundador/ContadorFundador';
import PagoDirecto from '@/components/pago/PagoDirecto';
import { FondoVivo, TextoRevelado } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { FORMATOS_EXPERIENCE, validarDatosExperience, type DatosExperienceValidados } from '@/lib/experience-formatos';
import Briefing from '@/components/experience/Briefing';

/**
 * Página de pago directo (29/09/2026, actualizada 31/10/2026): qué compras, qué pagas y qué pasa
 * después, con el cobro en la misma pantalla.
 * En Experience muestra el resumen completo y validado del evento configurado (P0.3).
 */
function modeloLegible(producto: string, modelo: string) {
  if (producto !== 'experience') return modelo ? `modelo ${modelo}` : '';
  const [codigo, fecha, plazas] = modelo.split(' ');
  const formato = FORMATOS_EXPERIENCE.find((x) => x.codigo === codigo || x.slug === codigo);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '') ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const aforo = /^\d+p?$/.test(plazas ?? '') ? `${parseInt(plazas, 10)} plazas` : '';
  return [formato?.nombre, dia, aforo].filter(Boolean).join(' · ');
}

export const revalidate = 300;

export function generateStaticParams() {
  return Object.keys(PRODUCTOS_PAGO).map((producto) => ({ producto }));
}

export async function generateMetadata({ params }: { params: Promise<{ producto: string }> }): Promise<Metadata> {
  const p = PRODUCTOS_PAGO[(await params).producto];
  return { title: p ? `Contratar ${p.nombre} · DKitchen Corporate` : 'DKitchen', robots: { index: false, follow: true } };
}

export default async function Pagar({
  params,
  searchParams,
}: {
  params: Promise<{ producto: string }>;
  searchParams: Promise<{
    modelo?: string;
    formato?: string;
    fecha?: string;
    aforo?: string;
    precioEntrada?: string;
    cocina?: string;
  }>;
}) {
  const p = PRODUCTOS_PAGO[(await params).producto];
  if (!p) notFound();
  const sp = await searchParams;
  const modelo = String(sp.modelo ?? '').replace(/[^a-z0-9 áéíóúñ-]/gi, '').slice(0, 40);
  const fundador = p.id === 'signature' ? await estadoFundador() : null;

  // Validación y resumen de Experience (P0.3)
  let expData: DatosExperienceValidados | null = null;
  if (p.id === 'experience') {
    let raw = {
      formato: sp.formato,
      fecha: sp.fecha,
      aforo: sp.aforo,
      precioEntrada: sp.precioEntrada,
      cocina: sp.cocina,
    };
    if (!raw.formato && sp.modelo) {
      const [c, f, pl] = sp.modelo.split(' ');
      const fmt = FORMATOS_EXPERIENCE.find((x) => x.codigo === c || x.slug === c);
      if (fmt) {
        raw = {
          formato: fmt.slug,
          fecha: f,
          aforo: pl?.endsWith('p') ? pl.slice(0, -1) : pl,
          precioEntrada: String(Math.round((fmt.entrada[0] + fmt.entrada[1]) / 2)),
          cocina: sp.cocina || 'Mediterránea',
        };
      }
    }
    const val = validarDatosExperience(raw);
    if (val.ok) {
      expData = val.datos;
    }
  }

  const subtituloEtiqueta = expData
    ? ` · ${expData.formato.nombre} · ${new Date(`${expData.fecha}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${expData.aforo} plazas`
    : modelo && modeloLegible(p.id, modelo)
      ? ` · ${modeloLegible(p.id, modelo)}`
      : '';

  return (
    <div className="bg-crema text-tinta">
      <section className="relative overflow-hidden bg-noche pb-20 pt-36 text-white md:pb-24 md:pt-40">
        <FondoVivo />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <Link href={p.volver.href} className="text-sm text-white/55 hover:text-white">← {p.volver.t}</Link>
          <p className="etiqueta-dk mt-8 text-oro">{p.registro ? 'Solicitar' : 'Contratar'} {p.nombre}{subtituloEtiqueta}</p>
          <TextoRevelado como="h1" texto={p.titular} className="font-display mt-4 max-w-3xl text-[42px] font-semibold leading-[1.02] sm:text-6xl" />
          <Aparecer retraso={0.2}><p className="mt-6 max-w-2xl text-lg text-white/70">{p.resumen}</p></Aparecer>
          {fundador?.abierto && (
            <Link href="/pagar/signature-fundador" className="mt-8 block max-w-2xl rounded-2xl border border-oro/50 bg-oro/10 p-5 transition hover:bg-oro/15">
              <span className="etiqueta-dk text-oro">Oferta de lanzamiento · precio de fundador · {fundador.plazas - fundador.quedan >= PLAZAS_PARA_CONTAR ? `quedan ${fundador.quedan} de ${fundador.plazas} plaza` : 'plazas limitada'}s</span>
              <span className="mt-2 block text-xl font-semibold">Entrada {FUNDADOR.signature.entrada} € en lugar de {BASE_OPERATIVA.pagoUnico} € y {FUNDADOR.signature.mensual} €/mes el primer año →</span>
              <span className="mt-1 block text-sm text-white/60">Pago único, sin cuotas · precios + IVA · contratar con el precio de fundador</span>
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.15fr_1fr] md:px-8 md:py-24">
        <div className="space-y-14">
          {/* Bloque de resumen específico para Experience (P0.3) */}
          {expData && (
            <div className="rounded-[28px] border border-vino/30 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="etiqueta-dk text-vino">Tu evento reservado</span>
                <Link href={`/experience/${expData.formato.slug}`} className="text-xs font-semibold text-vino hover:underline">Cambiar en configurador →</Link>
              </div>
              <h2 className="font-display mt-3 text-2xl font-bold sm:text-3xl text-tinta">{expData.formato.nombre}</h2>
              <p className="mt-1 text-sm text-niebla">{expData.formato.frase}</p>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl bg-papel p-5 border border-linea text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-niebla">Fecha deseada</dt>
                  <dd className="mt-1 font-semibold text-tinta">{new Date(`${expData.fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-niebla">Aforo del evento</dt>
                  <dd className="mt-1 font-semibold text-tinta">{expData.aforo} personas</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-niebla">Tipo de cocina</dt>
                  <dd className="mt-1 font-semibold text-tinta">{expData.cocina}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-niebla">Precio entrada estimado</dt>
                  <dd className="mt-1 font-semibold text-tinta">{expData.precioEntrada} € / comensal</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-2xl bg-noche p-5 text-white">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-white/70">Taquilla estimada si llenas ({expData.aforo} × {expData.precioEntrada} €)</span>
                  <span className="font-display text-xl font-bold text-oro">{(expData.aforo * expData.precioEntrada).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                </div>
                <div className="mt-2 flex justify-between items-baseline text-xs text-white/60 border-t border-white/10 pt-2">
                  <span>Comisión DKitchen sobre tu taquilla</span>
                  <span className="font-semibold text-white">0 € (recaudación 100 % para ti)</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="etiqueta-dk text-vino">{p.registro ? 'Qué incluye' : 'Qué compras'}</p>
            <ul className="mt-6 divide-y divide-linea border-y border-linea">
              {p.incluye.map((x) => (
                <li key={x} className="flex gap-4 py-4 text-[17px]"><span className="acento-serif text-xl leading-6">✓</span>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="etiqueta-dk text-vino">{p.registro ? 'Cómo funciona' : 'Qué pasa después de pagar'}</p>
            <ol className="mt-6 space-y-0">
              {(p.registro?.despues ?? p.despues).map(([cuando, que], i, lista) => (
                <li key={cuando} className="relative grid grid-cols-[40px_1fr] gap-4 pb-8 last:pb-0">
                  {i < lista.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-linea-fuerte" />}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vino text-sm font-semibold text-white">{i + 1}</span>
                  <div><p className="font-semibold">{cuando}</p><p className="mt-1 text-niebla">{que}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.garantias.map((g) => <span key={g} className="rounded-full border border-linea bg-white px-4 py-2 text-sm text-grafito">{g}</span>)}
          </div>
        </div>

        {p.registro ? (
          <div className="md:sticky md:top-28 md:self-start">
            <div className="rounded-[28px] bg-noche p-6 text-white shadow-[0_30px_80px_-40px_rgba(62,5,21,.45)] md:p-8">
              <p className="text-sm text-white/60">{p.nombre} · plazas de lanzamiento</p>
              <p className="font-display mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">Desde {p.precio} €<span className="ml-2 whitespace-nowrap align-middle font-sans text-base font-medium text-white/60">+ IVA</span></p>
              <p className="mt-2 text-sm text-white/60">Hoy no pagas nada: primero cerramos contigo formato y fecha.</p>
              <Briefing registro />
            </div>
          </div>
        ) : (
          <div className="md:sticky md:top-28 md:self-start">
            <div className="rounded-[28px] border border-linea bg-white p-6 shadow-[0_30px_80px_-40px_rgba(62,5,21,.45)] md:p-8">
              <p className="text-sm text-niebla">{p.nombre}</p>
              <p className="font-display mt-1 text-6xl font-semibold tracking-tight">{p.precio} €<span className="ml-2 align-middle font-sans text-base font-medium text-niebla">+ IVA</span></p>
              <p className="mt-2 text-sm text-niebla">{p.nota}</p>
              <p className="mt-1 text-sm text-niebla">Total con IVA (21 %): <strong className="text-tinta">{(p.precio * 1.21).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong></p>
              {expData && (
                <div className="mt-4 rounded-xl border border-vino/20 bg-vino/5 p-3 text-xs text-tinta">
                  <strong>Evento:</strong> {expData.formato.nombre} · {expData.aforo} plazas · {expData.fecha}
                </div>
              )}
              <div className="my-6 h-px bg-linea" />
              <PagoDirecto
                producto={p.id}
                precio={p.precio}
                boton="Pagar y empezar"
                detalle={modelo}
                fraccionable={p.id === 'signature' && BASE_OPERATIVA.fraccionable ? { cuotas: BASE_OPERATIVA.fraccionado.cuotas, importeCuota: BASE_OPERATIVA.fraccionado.importeCuota } : undefined}
                experience={expData ? { formato: expData.formato.slug, fecha: expData.fecha, aforo: expData.aforo, precioEntrada: expData.precioEntrada, cocina: expData.cocina } : undefined}
              />
            </div>
            <p className="mt-5 text-center text-sm text-ceniza">¿Dudas antes de pagar? <a href={`#solicitud-${p.id === 'signature' ? 'signature' : p.id}`} className="underline hover:text-tinta">Escríbenos</a> y te respondemos.</p>
          </div>
        )}
      </section>
    </div>
  );
}
