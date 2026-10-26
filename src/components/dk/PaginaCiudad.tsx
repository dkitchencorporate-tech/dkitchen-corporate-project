import Link from 'next/link';
import Aparecer from '@/components/qr-landing/Aparecer';
import PlanesQr from '@/components/qr-landing/PlanesQr';
import { CartasAutorDemo } from '@/components/dk/Modelos';
import { FondoVivo, Marquesina, TextoRevelado } from '@/components/dk/Movimiento';
import { BandaFoto, Boton, Cierre, Faq, Titulo } from '@/components/dk/Bloques';
import { CIUDADES, PREGUNTAS_COMUNES, VENTAJAS, type Ciudad } from '@/lib/ciudades';

/**
 * Página por ciudad (26/10/2026, tareas 8 y «7 páginas por ciudad»). Editorial y con
 * la identidad de cada ciudad: su color en el sello, los números y las citas; sus
 * barrios en la cinta; su escena, sus ventajas en su orden y sus preguntas.
 */

/** Sello giratorio con el nombre de la ciudad (se para con «reducir movimiento»). */
export function SelloCiudad({ c, className = '' }: { c: Ciudad; className?: string }) {
  const texto = `Carta digital · ${c.nombre} · DKitchen · `;
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin motion-reduce:animate-none" style={{ animationDuration: '48s' }}>
        <defs><path id={`circulo-${c.slug}`} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
        <text fill="#D9B25C" fontSize="13.5" letterSpacing="3.2" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
          <textPath href={`#circulo-${c.slug}`}>{texto.repeat(2)}</textPath>
        </text>
      </svg>
      <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full text-center text-white shadow-[0_30px_80px_rgba(0,0,0,.45)]" style={{ background: `radial-gradient(circle at 30% 25%, ${c.color}, #0A080C 120%)` }}>
        <span className="acento-serif text-[clamp(1.6rem,4vw,2.6rem)] leading-none">{c.nombre.charAt(0)}</span>
        <span className="mt-2 max-w-[80%] text-[10px] font-semibold uppercase leading-snug tracking-[0.18em] text-white/75 md:text-[11px]">{c.motivo}</span>
      </div>
    </div>
  );
}

export default function PaginaCiudad({ c }: { c: Ciudad }) {
  const otras = CIUDADES.filter((x) => x.slug !== c.slug);
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-noche pb-20 pt-32 text-white md:pb-28 md:pt-40">
        <FondoVivo />
        <p aria-hidden="true" className="font-display pointer-events-none absolute -bottom-[0.18em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[28vw] font-semibold leading-none text-transparent opacity-30 md:text-[19vw]" style={{ WebkitTextStroke: `1.5px ${c.color}` }}>{c.nombre}</p>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[1.3fr_1fr] md:px-8">
          <div>
            <Aparecer>
              <nav aria-label="Migas" className="text-sm text-white/50">
                <Link href="/" className="hover:text-white">Inicio</Link> <span aria-hidden="true">/</span> <Link href="/carta-digital" className="hover:text-white">Carta digital</Link> <span aria-hidden="true">/</span> <span className="text-white/80">{c.nombre}</span>
              </nav>
              <p className="mt-6 font-mono text-xs tracking-[0.25em] text-oro">{c.coords}</p>
            </Aparecer>
            <h1 className="font-display mt-4 text-[44px] font-semibold leading-[0.98] sm:text-6xl lg:text-[76px]">
              <span className="block">Carta digital QR</span>
              <span className="block">en <span className="acento-serif relative inline-block">{c.nombre}<span aria-hidden="true" className="absolute -bottom-1 left-0 h-[6px] w-full rounded-full" style={{ background: c.color }} /></span></span>
            </h1>
            <Aparecer retraso={0.2}><p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">{c.entradilla}</p></Aparecer>
            <Aparecer retraso={0.3} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Boton c={{ href: '/carta-de-autor', t: 'Mándanos la foto de tu carta' }} />
              <Boton c={{ href: '#planes', t: 'Ver precios', secundario: true }} />
            </Aparecer>
            <Aparecer retraso={0.4}><p className="mt-5 text-sm text-white/55">Para bares y restaurantes {c.provincia} · sin permanencia · te la montamos a distancia</p></Aparecer>
          </div>
          <SelloCiudad c={c} className="mx-auto w-[220px] sm:w-[280px] md:w-[360px]" />
        </div>
      </section>

      <Marquesina oscura items={c.zonas} />

      {/* Escena local */}
      <section className="bg-crema px-6 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Titulo etiqueta={`Hostelería ${c.provincia}`} texto={`${c.motivo}.`} />
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {c.escena.map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.08}>
                <div className="border-t-2 pt-6" style={{ borderColor: c.color }}>
                <span className="font-display block text-6xl font-semibold leading-none" style={{ color: c.color }}>{String(i + 1).padStart(2, '0')}</span>
                <h2 className="font-display mt-5 text-2xl font-semibold text-tinta">{t}</h2>
                <p className="mt-3 leading-relaxed text-grafito">{d}</p>
                </div>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      {/* Ventajas en el orden de la ciudad */}
      <section className="bg-white px-6 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Titulo etiqueta="Lo que hace distinta tu carta" texto={`Lo que tu carta necesita en ${c.nombre}.`} sub="Montada desde una foto, con tus platos, tu estilo y las funciones que de verdad mueven un local." />
          <ol className="mt-14 border-b border-linea">
            {c.ventajas.map(([id, local], i) => (
              <li key={id} className="border-t border-linea">
                <Aparecer retraso={(i % 2) * 0.06} className="grid gap-4 py-9 md:grid-cols-[90px_1fr_1fr] md:gap-10">
                  <span className="acento-serif text-4xl leading-none" style={{ color: c.color }}>{i + 1}</span>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-tinta md:text-3xl">{VENTAJAS[id].t}</h3>
                    <p className="mt-3 leading-relaxed text-niebla">{VENTAJAS[id].d}</p>
                  </div>
                  <blockquote className="self-center border-l-[3px] pl-5 text-lg leading-snug text-grafito" style={{ borderColor: c.color }}>
                    <span className="font-semibold text-tinta">En {c.nombre}:</span> {local}
                  </blockquote>
                </Aparecer>
              </li>
            ))}
          </ol>
          <Aparecer className="mt-10"><Link href="/carta-de-autor" className="text-sm font-semibold text-vino underline decoration-2 underline-offset-4">Mandar la foto de mi carta →</Link></Aparecer>
        </div>
      </section>

      <BandaFoto src={c.banda.foto} frase={c.banda.frase} firma={`${c.nombre} · ${c.coords}`} />

      <section className="relative overflow-hidden bg-noche py-24 text-white md:py-32">
        <FondoVivo className="opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Cartas de autor" texto="Así puede verse la tuya." sub="Cartas completas y funcionando: tócalas dentro del móvil o ábrelas en grande. La tuya lleva tu letra, tu color y tus platos." />
          <CartasAutorDemo />
        </div>
      </section>

      <PlanesQr />

      <Faq preguntas={[...c.preguntas, ...PREGUNTAS_COMUNES]} fondo="bg-crema" />

      {/* Otras ciudades: enlazado interno */}
      <nav aria-label="Otras ciudades" className="bg-white px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="etiqueta-dk text-vino">También en</p>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            {otras.map((o) => (
              <li key={o.slug}>
                <Link href={`/carta-digital/${o.slug}`} className="font-display group inline-flex items-baseline gap-2 text-3xl font-semibold text-tinta md:text-4xl">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} aria-hidden="true" />
                  <span className="decoration-2 underline-offset-8 group-hover:underline">{o.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <Cierre titulo={`Tu carta en ${c.nombre}, desde una foto.`} sub="Nos la mandas, te la devolvemos digital con tu estilo y la cambias desde el móvil cuando quieras." cta={{ href: '/carta-de-autor', t: 'Mandar mi foto' }} secundario={{ href: '/qr', t: 'Ver la carta QR' }} />
    </div>
  );
}

/** Índice /carta-digital: las 7 ciudades como portadas editoriales. */
export function IndiceCiudades() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-noche pb-20 pt-32 text-white md:pb-28 md:pt-40">
        <FondoVivo />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-oro">Carta digital por ciudad</p>
          <TextoRevelado como="h1" texto="Carta digital QR para la hostelería del sur." className="font-display mt-5 max-w-4xl text-[44px] font-semibold leading-[0.98] sm:text-6xl lg:text-[76px]" />
          <Aparecer retraso={0.2}><p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">Cada ciudad come distinto. Elige la tuya y mira qué necesita una carta digital allí: idiomas, pedido desde la mesa, reseñas o una carta que cambia con la temporada.</p></Aparecer>
        </div>
      </section>
      <section className="px-6 py-16 md:px-8 md:py-24">
        <ul className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CIUDADES.map((c, i) => (
            <li key={c.slug}>
              <Aparecer retraso={(i % 3) * 0.06} className="h-full">
                <Link href={`/carta-digital/${c.slug}`} className="group relative flex h-full min-h-[240px] flex-col justify-between overflow-hidden rounded-[28px] bg-tinta p-7 text-white transition hover:-translate-y-1">
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: c.color }} />
                  <span aria-hidden="true" className="font-display pointer-events-none absolute -bottom-6 -right-2 text-[120px] font-semibold leading-none text-transparent opacity-40" style={{ WebkitTextStroke: `1px ${c.color}` }}>{c.nombre.charAt(0)}</span>
                  <span className="font-mono text-[11px] tracking-[0.2em] text-oro">{c.coords}</span>
                  <span>
                    <span className="font-display block text-4xl font-semibold">{c.nombre}</span>
                    <span className="mt-2 block text-white/65">{c.motivo}</span>
                    <span className="mt-5 inline-block text-sm font-semibold text-white/85 group-hover:text-white">Ver la carta para {c.nombre} →</span>
                  </span>
                </Link>
              </Aparecer>
            </li>
          ))}
        </ul>
      </section>
      <Cierre titulo="¿Tu ciudad no está?" sub="Trabajamos a distancia en toda España: nos mandas la foto de tu carta y te la devolvemos digital." cta={{ href: '/carta-de-autor', t: 'Mandar mi foto' }} secundario={{ href: '/qr', t: 'Ver la carta QR' }} />
    </div>
  );
}
