import Link from 'next/link';
import RegistroRed from '@/components/dk/RegistroRed';

/** Pie de la web (rediseño 29/09/2026): enlaces agrupados para SEO interno y contacto directo. */
const COLUMNAS: [string, [string, string][]][] = [
  ['Productos', [['/qr', 'Carta digital QR'], ['/signature', 'DKitchen Signature'], ['/experience', 'Experience'], ['/dark-kitchen', 'Dark Kitchen'], ['/marcas', 'Marcas'], ['/auditoria', 'Auditoría'], ['/precios', 'Precios']]],
  ['Aprende', [['/blog', 'Blog'], ['/casos-de-exito', 'Casos de éxito'], ['/faq', 'Preguntas frecuentes']]],
  ['Cuenta', [['/panel/iniciar-sesion', 'Entrar en mi panel'], ['/qr#planes', 'Empezar por 1 €']]],
  ['Legal', [['/privacy', 'Privacidad'], ['/terms', 'Términos']]],
];

/** Perfiles oficiales; los mismos que el `sameAs` del JSON-LD de layout.tsx. */
const REDES: [string, string][] = [
  ['https://www.instagram.com/dkitchen_es/', 'Instagram'],
  ['https://www.facebook.com/dkitchencorporate', 'Facebook'],
  ['https://www.tiktok.com/@dkitchencorporate', 'TikTok'],
  ['https://x.com/dkitchen_es', 'X'],
  ['https://www.linkedin.com/company/dkitchencorporate/', 'LinkedIn'],
];

export default function Footer() {
  return (
    <footer className="bg-tinta text-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="font-display text-2xl font-bold">D<span className="text-vino">Kitchen</span></Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">Tecnología para hostelería sin comisiones. Tus clientes y tus datos, siempre en tu casa.</p>
            <a href="#solicitud-contacto" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40">Escríbenos</a>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Únete a la red DKitchen</p>
            <div className="mt-3"><RegistroRed /></div>
          </div>
          {COLUMNAS.map(([t, enlaces]) => (
            <nav key={t} aria-label={t}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">{t}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {enlaces.map(([h, n]) => <li key={h}><Link href={h} className="text-white/70 hover:text-white">{n}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} DKitchen · España · <a href="mailto:dkitchen@dkitchencorporate.es" className="hover:text-white">dkitchen@dkitchencorporate.es</a> · <a href="tel:+34622652659" className="hover:text-white">622 652 659</a> · Precios sin IVA (21 %)</p>
          <nav aria-label="Redes sociales" className="flex flex-wrap gap-x-4 gap-y-1">{REDES.map(([h, n]) => <a key={h} href={h} target="_blank" rel="noopener" className="hover:text-white">{n}</a>)}</nav>
        </div>
      </div>
    </footer>
  );
}
