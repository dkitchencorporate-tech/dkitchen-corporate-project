import { FondoVivo, TextoRevelado, BotonMagnetico } from './Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';

/**
 * Bloques comunes de las páginas de producto (29/09/2026): misma estructura en
 * todas (hero → dolor → escena → cómo funciona → pruebas → precio → FAQ →
 * cierre) para que la web se sienta un solo producto.
 */
type Cta = { href: string; t: string; secundario?: boolean };

export function Boton({ c }: { c: Cta }) {
  return (
    <BotonMagnetico href={c.href} className={c.secundario
      ? 'inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-semibold backdrop-blur hover:border-white/50'
      : 'inline-flex items-center justify-center rounded-full bg-[#6E0C2B] px-8 py-4 text-[15px] font-semibold text-white shadow-[0_10px_40px_rgba(163,24,74,.45)] hover:bg-[#4A0819]'}>{c.t}</BotonMagnetico>
  );
}

export function HeroPagina({ etiqueta, titulo, sub, ctas, visual, nota }: { etiqueta: string; titulo: string; sub: string; ctas: Cta[]; visual: React.ReactNode; nota?: string }) {
  return (
    <section className="relative overflow-hidden bg-[#0A080C] pb-24 pt-36 text-white md:pb-32 md:pt-44">
      <FondoVivo />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-[1.1fr_1fr] md:px-8">
        <div>
          <Aparecer><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6E0C2B]" /> {etiqueta}</p></Aparecer>
          <TextoRevelado como="h1" texto={titulo} className="font-display mt-6 text-[46px] font-semibold leading-[0.98] sm:text-7xl lg:text-[80px]" />
          <Aparecer retraso={0.3}><p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">{sub}</p></Aparecer>
          <Aparecer retraso={0.4} className="mt-9 flex flex-col gap-3 sm:flex-row">{ctas.map((c) => <Boton key={c.t} c={c} />)}</Aparecer>
          {nota && <Aparecer retraso={0.5}><p className="mt-5 text-sm text-white/45">{nota}</p></Aparecer>}
        </div>
        <div>{visual}</div>
      </div>
    </section>
  );
}

export function Titulo({ etiqueta, texto, sub, oscuro = false, centrado = false }: { etiqueta: string; texto: string; sub?: string; oscuro?: boolean; centrado?: boolean }) {
  return (
    <div className={centrado ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6E0C2B]">{etiqueta}</p>
      <TextoRevelado texto={texto} className={`font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-6xl ${oscuro ? 'text-white' : 'text-[#17191E]'}`} />
      {sub && <Aparecer retraso={0.2}><p className={`mt-5 text-lg ${oscuro ? 'text-white/60' : 'text-[#6B7079]'}`}>{sub}</p></Aparecer>}
    </div>
  );
}

export function Dolores({ items, cta }: { items: [string, string][]; cta?: Cta }) {
  return (
    <div>
      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {items.map(([a, b], i) => (
          <Aparecer key={a} retraso={(i % 2) * 0.08} className="rounded-[28px] border border-[#E6E6E2] bg-white p-7 transition duration-500 hover:-translate-y-1 hover:border-[#17191E]">
            <span className="font-display text-sm font-semibold text-[#6E0C2B]">0{i + 1}</span>
            <p className="mt-3 text-xl font-semibold leading-snug text-[#17191E]">{a}</p>
            <p className="mt-2 text-[#6B7079]">{b}</p>
          </Aparecer>
        ))}
      </div>
      {cta && <Aparecer className="mt-10"><BotonMagnetico href={cta.href} className="inline-flex rounded-full bg-[#17191E] px-7 py-4 text-[15px] font-semibold text-white">{cta.t}</BotonMagnetico></Aparecer>}
    </div>
  );
}

export function Faq({ preguntas }: { preguntas: [string, string][] }) {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: preguntas.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return (
    <section className="bg-white py-24 md:py-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-[1fr_1.4fr] md:px-8">
        <TextoRevelado texto="Antes de que lo preguntes." className="font-display text-4xl font-semibold text-[#17191E] md:text-5xl" />
        <div className="divide-y divide-[#E6E6E2] border-y border-[#E6E6E2]">
          {preguntas.map(([p, r]) => (
            <details key={p} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold text-[#17191E]">{p}<span aria-hidden="true" className="text-2xl font-light text-[#9A9EA6] transition-transform group-open:rotate-45">+</span></summary>
              <p className="mt-3 leading-relaxed text-[#6B7079]">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cierre({ titulo, sub, cta, secundario }: { titulo: string; sub: string; cta: Cta; secundario?: Cta }) {
  return (
    <section className="relative overflow-hidden bg-[#0A080C] py-28 text-center text-white md:py-36">
      <FondoVivo />
      <div className="relative mx-auto max-w-3xl px-6">
        <TextoRevelado texto={titulo} className="font-display text-5xl font-semibold leading-[1.0] md:text-7xl" />
        <Aparecer retraso={0.2}><p className="mx-auto mt-6 max-w-lg text-lg text-white/65">{sub}</p></Aparecer>
        <Aparecer retraso={0.3} className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><Boton c={cta} />{secundario && <Boton c={{ ...secundario, secundario: true }} />}</Aparecer>
      </div>
    </section>
  );
}
