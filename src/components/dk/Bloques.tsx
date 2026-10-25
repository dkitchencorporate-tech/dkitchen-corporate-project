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
      ? 'inline-flex items-center justify-center rounded-full border border-white/40 bg-white/5 px-8 py-4 text-[15px] font-semibold backdrop-blur hover:border-white/50'
      : 'inline-flex items-center justify-center rounded-full bg-vino px-8 py-4 text-[15px] font-semibold text-white shadow-[0_10px_40px_rgba(163,24,74,.45)] hover:bg-vino-hondo'}>{c.t}</BotonMagnetico>
  );
}

export function HeroPagina({ etiqueta, titulo, sub, ctas, visual, nota }: { etiqueta: string; titulo: string; sub: string; ctas: Cta[]; visual: React.ReactNode; nota?: string }) {
  return (
    <section className="relative overflow-hidden bg-noche pb-24 pt-36 text-white md:pb-32 md:pt-44">
      <FondoVivo />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-[1.1fr_1fr] md:px-8">
        <div>
          <Aparecer><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vino" /> {etiqueta}</p></Aparecer>
          <TextoRevelado como="h1" texto={titulo} className="font-display mt-6 text-[46px] font-semibold leading-[0.98] sm:text-7xl lg:text-[80px]" />
          <Aparecer retraso={0.3}><p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">{sub}</p></Aparecer>
          <Aparecer retraso={0.4} className="mt-9 flex flex-col gap-3 sm:flex-row">{ctas.map((c) => <Boton key={c.t} c={c} />)}</Aparecer>
          {nota && <Aparecer retraso={0.5}><p className="mt-5 text-sm text-white/70">{nota}</p></Aparecer>}
        </div>
        <div>{visual}</div>
      </div>
    </section>
  );
}

/** Banda de fotografía a sangre con una frase editorial encima (se desplaza más lento que la página). */
export function BandaFoto({ src, frase, firma }: { src: string; frase: string; firma?: string }) {
  return (
    <section className="relative h-[72svh] min-h-[420px] overflow-hidden bg-noche text-white">
      <div className="absolute inset-0 bg-cover bg-center md:bg-fixed" style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,12,.2),rgba(10,8,12,.35)_35%,rgba(10,8,12,.92))]" aria-hidden="true" />
      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-6 pb-14 md:px-8 md:pb-20">
        <TextoRevelado texto={frase} className="font-display max-w-4xl text-4xl font-semibold leading-[1.02] md:text-7xl" />
        {firma && <Aparecer retraso={0.3}><p className="etiqueta-dk mt-6 text-oro">{firma}</p></Aparecer>}
      </div>
    </section>
  );
}

export function Titulo({ etiqueta, texto, sub, oscuro = false, centrado = false }: { etiqueta: string; texto: string; sub?: string; oscuro?: boolean; centrado?: boolean }) {
  return (
    <div className={centrado ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="etiqueta-dk text-vino">{etiqueta}</p>
      <TextoRevelado texto={texto} className={`font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-6xl ${oscuro ? 'text-white' : 'text-tinta'}`} />
      {sub && <Aparecer retraso={0.2}><p className={`mt-5 text-lg ${oscuro ? 'text-white/60' : 'text-niebla'}`}>{sub}</p></Aparecer>}
    </div>
  );
}

export function Dolores({ items, cta }: { items: [string, string][]; cta?: Cta }) {
  return (
    <div>
      <div className="mt-14 grid md:grid-cols-2 md:gap-x-14">
        {items.map(([a, b], i) => (
          <Aparecer key={a} retraso={(i % 2) * 0.08} className="group grid grid-cols-[56px_1fr] gap-4 border-t border-linea-fuerte py-8">
            <span className="acento-serif text-4xl leading-none text-vino">{i + 1}</span>
            <div><p className="text-xl font-semibold leading-snug text-tinta">{a}</p><p className="mt-2 text-niebla">{b}</p></div>
          </Aparecer>
        ))}
      </div>
      {cta && <Aparecer className="mt-10"><BotonMagnetico href={cta.href} className="inline-flex rounded-full bg-tinta px-7 py-4 text-[15px] font-semibold text-white">{cta.t}</BotonMagnetico></Aparecer>}
    </div>
  );
}

export function Faq({ preguntas, fondo = 'bg-white' }: { preguntas: [string, string][]; fondo?: string }) {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: preguntas.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return (
    <section className={`${fondo} py-16 md:py-28`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-[1fr_1.4fr] md:px-8">
        <TextoRevelado texto="Antes de que lo preguntes." className="font-display text-4xl font-semibold text-tinta md:text-5xl" />
        <div className="divide-y divide-linea border-y border-linea">
          {preguntas.map(([p, r]) => (
            <details key={p} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold text-tinta">{p}<span aria-hidden="true" className="text-2xl font-light text-niebla transition-transform group-open:rotate-45">+</span></summary>
              <p className="mt-3 leading-relaxed text-niebla">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cierre({ titulo, sub, cta, secundario }: { titulo: string; sub: string; cta: Cta; secundario?: Cta }) {
  return (
    <section className="relative overflow-hidden bg-noche py-28 text-center text-white md:py-36">
      <FondoVivo />
      <div className="relative mx-auto max-w-3xl px-6">
        <TextoRevelado texto={titulo} className="font-display text-5xl font-semibold leading-[1.0] md:text-7xl" />
        <Aparecer retraso={0.2}><p className="mx-auto mt-6 max-w-lg text-lg text-white/65">{sub}</p></Aparecer>
        <Aparecer retraso={0.3} className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><Boton c={cta} />{secundario && <Boton c={{ ...secundario, secundario: true }} />}</Aparecer>
      </div>
    </section>
  );
}
