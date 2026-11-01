import type { Contrato } from '@/lib/contratos';

/** [[hueco]] → resaltado en oro: lo que falta decidir o lo que rellenan los datos del cliente. */
export function Texto({ t }: { t: string }) {
  const partes = t.split(/(\[\[[^\]]+\]\])/g);
  return <>{partes.map((p, i) => p.startsWith('[[')
    ? <mark key={i} className="rounded bg-oro/30 px-1 font-semibold text-carbon">{p.slice(2, -2).trim()}</mark>
    : <span key={i}>{p}</span>)}</>;
}

/**
 * Hoja A4 de un contrato (formato aprobado el 05/10): línea de marca, cabecera con tipo y sello
 * «Confidencial», reunidos, cláusulas a dos columnas, Anexo A y firmas. La usan Central → Contratos,
 * la vista previa antes de pagar y el contrato firmado del cliente.
 */
export default function HojaContrato({ c, firmado }: { c: Contrato; firmado?: string }) {
  return (
    <article className="mx-auto max-w-[210mm] overflow-hidden rounded-[6px] bg-white text-carbon shadow-[0_24px_60px_-30px_rgba(20,14,10,0.45)] ring-1 ring-linea print:shadow-none print:ring-0">
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

        <div className="gap-8 text-[13px] leading-relaxed lg:columns-2 print:columns-2">
          {c.clausulas.map((x) => (
            <section key={x.n} className="mb-5 break-inside-avoid">
              <h3 className="font-display text-base font-semibold"><span className="mr-1.5 text-vino">{x.n}.</span>{x.titulo}</h3>
              {x.texto.map((t, i) => <p key={i} className="mt-1.5"><Texto t={t} /></p>)}
            </section>
          ))}
        </div>

        <div className="break-inside-avoid">
          <p className="font-display text-lg font-semibold">Anexo A · Datos de este contrato</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[13px]">
              <tbody>
                {c.anexo.map((a) => (
                  <tr key={a.campo} className="border-t border-linea">
                    <th scope="row" className="w-2/5 bg-papel/70 px-3 py-2 text-left font-semibold">{a.campo}</th>
                    <td className="px-3 py-2 [overflow-wrap:anywhere]"><Texto t={a.valor} /></td>
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
              <p>{firmado ?? `Firma electrónica · fecha · IP · versión ${c.version}`}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
