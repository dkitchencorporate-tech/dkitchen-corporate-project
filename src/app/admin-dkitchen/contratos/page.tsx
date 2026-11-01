import Link from 'next/link';
import { redirect } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { identidadActual } from '@/lib/sesion';
import { administradores } from '@/lib/buzon';
import { CONTRATOS, contratoDe, huecos } from '@/lib/contratos';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

/** [[hueco]] → resaltado en oro: lo que falta decidir o lo que rellena la base al generar el contrato. */
function Texto({ t }: { t: string }) {
  const partes = t.split(/(\[\[[^\]]+\]\])/g);
  return <>{partes.map((p, i) => p.startsWith('[[')
    ? <mark key={i} className="rounded bg-oro/30 px-1 font-semibold text-carbon">{p.slice(2, -2).trim()}</mark>
    : <span key={i}>{p}</span>)}</>;
}

/**
 * Central → Contratos (01/11/2026, tareas 3fc6a2df y 27835609). Los contratos tipo de DKitchen
 * en el formato aprobado el 05/10 (A4, «Confidencial», cláusulas numeradas, Anexo A). Solo dirección:
 * un comercial no ve las condiciones de comisión ni los contratos de clientes.
 */
export default async function Contratos({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const jwt = await exigirAdmin();
  const [yo, equipo] = await Promise.all([identidadActual().catch(() => null), administradores(jwt).catch(() => [])]);
  if ((equipo.find((m) => m.id === yo?.id) as any)?.rolAdmin === 'comercial') redirect('/admin-dkitchen/comerciales');
  const c = contratoDe((await searchParams).c ?? '');
  const faltan = huecos(c);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-vino/50 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Legal</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Contratos</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-white/70">Los contratos tipo de DKitchen. Texto fijo y versionado; lo resaltado en oro es lo que falta decidir o lo que se rellena solo con los datos de cada cliente.</p>
        <nav aria-label="Contratos" className="relative mt-5 flex flex-wrap gap-2">
          {CONTRATOS.map((x) => (
            <Link key={x.id} href={`/admin-dkitchen/contratos?c=${x.id}`} aria-current={x.id === c.id ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${x.id === c.id ? 'bg-oro text-noche' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {x.titulo}
            </Link>
          ))}
        </nav>
      </header>

      <GuiaZona titulo="Contratos" ancla="contratos"
        que="Los contratos que firmamos con comerciales y clientes. Mientras tengan huecos en oro son BORRADOR y no se envían."
        pasos={['Elige el contrato arriba.', 'Lee el resumen y los huecos pendientes; las decisiones se toman en el chat con Claude.', 'Cuando no quede ningún hueco de decisión, Claude lo marca como vigente y lo conecta al envío automático tras el pago.']} />

      <section className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="rounded-[22px] border border-linea bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">En una frase</p>
          <p className="mt-1.5 text-sm">{c.resumen}</p>
        </div>
        <div className="rounded-[22px] border-2 border-oro/60 bg-white p-5 md:w-72">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">{c.estado === 'borrador' ? 'Borrador' : 'Vigente'} · {c.version}</p>
          <p className="mt-1 font-display text-3xl font-semibold">{faltan.length}<span className="ml-2 text-sm font-normal text-niebla">huecos</span></p>
          <p className="mt-1 text-xs text-niebla">{faltan.slice(0, 6).join(' · ')}{faltan.length > 6 ? '…' : ''}</p>
        </div>
      </section>

      {/* Hoja A4 (formato 05/10): línea de marca, cabecera con tipo y sello, cláusulas a dos columnas, Anexo A y firmas */}
      <article className="mx-auto max-w-[210mm] overflow-hidden rounded-[6px] bg-white shadow-[0_24px_60px_-30px_rgba(20,14,10,0.45)] ring-1 ring-linea">
        <div className="h-1.5 bg-gradient-to-r from-vino via-oro to-vino" />
        <div className="space-y-6 p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-linea pb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-niebla">{c.tipo}</p>
              <h2 className="font-display mt-1 text-2xl font-semibold sm:text-3xl">{c.titulo}</h2>
              <p className="mt-1 text-xs text-niebla">DKitchen · dkitchencorporate.es · {c.version} · {c.fecha}</p>
            </div>
            <span className="shrink-0 -rotate-3 rounded-md border-2 border-vino px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-vino">Confidencial</span>
          </div>

          <div className="space-y-2 text-sm leading-relaxed">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">Reunidos</p>
            <p>De una parte, <Texto t={c.partes[0]} />.</p>
            <p>Y de otra, <Texto t={c.partes[1]} />.</p>
            <p>Ambas partes se reconocen capacidad para firmar este contrato y acuerdan las siguientes cláusulas.</p>
          </div>

          <div className="gap-8 text-[13px] leading-relaxed lg:columns-2">
            {c.clausulas.map((x) => (
              <section key={x.n} className="mb-5 break-inside-avoid">
                <h3 className="font-display text-base font-semibold"><span className="mr-1.5 text-vino">{x.n}.</span>{x.titulo}</h3>
                {x.texto.map((t, i) => <p key={i} className="mt-1.5"><Texto t={t} /></p>)}
              </section>
            ))}
          </div>

          <div>
            <p className="font-display text-lg font-semibold">Anexo A · Datos de este contrato</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13px]">
                <tbody>
                  {c.anexo.map((a) => (
                    <tr key={a.campo} className="border-t border-linea">
                      <th scope="row" className="w-2/5 bg-papel/70 px-3 py-2 text-left font-semibold">{a.campo}</th>
                      <td className="px-3 py-2"><Texto t={a.valor} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 pt-4 sm:grid-cols-2">
            {c.firmas.map((f) => (
              <div key={f} className="border-t-2 border-carbon/70 pt-2 text-xs text-niebla">
                <p className="font-semibold text-carbon">{f}</p>
                <p>Firma electrónica · fecha · IP · versión {c.version}</p>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
