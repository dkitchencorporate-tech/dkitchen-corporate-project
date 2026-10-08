import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRODUCTOS_PAGO } from '@/lib/productos-pago';
import { BASE_OPERATIVA } from '@/lib/pricing-config';
import PagoDirecto from '@/components/pago/PagoDirecto';
import { FondoVivo, TextoRevelado } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';
import Briefing from '@/components/experience/Briefing';

/**
 * Página de pago directo (29/09/2026): qué compras, qué pagas y qué pasa
 * después, con el cobro en la misma pantalla. El formulario de contacto
 * queda discreto abajo para quien tenga dudas.
 */
/** «chef 2026-11-10 15p» (lo que manda el configurador) → «Mesa del chef · 10 nov 2026 · 15 plazas». */
function modeloLegible(producto: string, modelo: string) {
  if (producto !== 'experience') return modelo ? `modelo ${modelo}` : '';
  const [codigo, fecha, plazas] = modelo.split(' ');
  const formato = FORMATOS_EXPERIENCE.find((x) => x.codigo === codigo);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '') ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const aforo = /^\d+p$/.test(plazas ?? '') ? `${parseInt(plazas, 10)} plazas` : '';
  return [formato?.nombre, dia, aforo].filter(Boolean).join(' · ');
}

export function generateStaticParams() {
  return Object.keys(PRODUCTOS_PAGO).map((producto) => ({ producto }));
}

export async function generateMetadata({ params }: { params: Promise<{ producto: string }> }): Promise<Metadata> {
  const p = PRODUCTOS_PAGO[(await params).producto];
  return { title: p ? `Contratar ${p.nombre} · DKitchen Corporate` : 'DKitchen', robots: { index: false, follow: true } };
}

export default async function Pagar({ params, searchParams }: { params: Promise<{ producto: string }>; searchParams: Promise<{ modelo?: string }> }) {
  const p = PRODUCTOS_PAGO[(await params).producto];
  if (!p) notFound();
  const modelo = String((await searchParams).modelo ?? '').replace(/[^a-z0-9 áéíóúñ-]/gi, '').slice(0, 40);

  return (
    <div className="bg-crema text-tinta">
      <section className="relative overflow-hidden bg-noche pb-20 pt-36 text-white md:pb-24 md:pt-40">
        <FondoVivo />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <Link href={p.volver.href} className="text-sm text-white/55 hover:text-white">← {p.volver.t}</Link>
          <p className="etiqueta-dk mt-8 text-oro">{p.registro ? 'Solicitar' : 'Contratar'} {p.nombre}{modelo && modeloLegible(p.id, modelo) ? ` · ${modeloLegible(p.id, modelo)}` : ''}</p>
          <TextoRevelado como="h1" texto={p.titular} className="font-display mt-4 max-w-3xl text-[42px] font-semibold leading-[1.02] sm:text-6xl" />
          <Aparecer retraso={0.2}><p className="mt-6 max-w-2xl text-lg text-white/70">{p.resumen}</p></Aparecer>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.15fr_1fr] md:px-8 md:py-24">
        <div className="space-y-14">
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
            <div className="my-6 h-px bg-linea" />
            <PagoDirecto producto={p.id} precio={p.precio} boton="Pagar y empezar" detalle={modelo}
              fraccionable={p.id === 'signature' && BASE_OPERATIVA.fraccionable ? { cuotas: BASE_OPERATIVA.fraccionado.cuotas, importeCuota: BASE_OPERATIVA.fraccionado.importeCuota } : undefined} />
          </div>
          <p className="mt-5 text-center text-sm text-ceniza">¿Dudas antes de pagar? <a href={`#solicitud-${p.id === 'signature' ? 'signature' : p.id}`} className="underline hover:text-tinta">Escríbenos</a> y te respondemos.</p>
        </div>
        )}
      </section>
    </div>
  );
}
