import Link from 'next/link';
import RegistroRed from '@/components/dk/RegistroRed';

/** Pie de la web (rediseño 29/09/2026): enlaces agrupados para SEO interno y contacto directo. */
const COLUMNAS: [string, [string, string][]][] = [
  ['Productos', [['/qr', 'Carta digital QR'], ['/base-operativa', 'DKitchen Signature'], ['/experience', 'Experience'], ['/dark-kitchen', 'Dark Kitchen'], ['/marcas', 'Marcas'], ['/auditoria', 'Auditoría']]],
  ['Aprende', [['/blog', 'Blog'], ['/casos-de-exito', 'Casos de éxito'], ['/faq', 'Preguntas frecuentes']]],
  ['Cuenta', [['/panel/iniciar-sesion', 'Entrar en mi panel'], ['/qr#planes', 'Empezar por 1 €']]],
  ['Legal', [['/privacy', 'Privacidad'], ['/terms', 'Términos']]],
];

export default function Footer() {
  return (
    <footer className="bg-[#17191E] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="font-display text-2xl font-bold">D<span className="text-[#E8592A]">Kitchen</span></Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">Tecnología para hostelería sin comisiones. Tus clientes y tus datos, siempre en tu casa.</p>
            <a href="https://wa.me/34622652659" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40">Escríbenos por WhatsApp</a>
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
          <p>© {new Date().getFullYear()} DKitchen Corporate SL · Alcobendas, Madrid</p>
          <p>Hecho con cariño para la hostelería</p>
        </div>
      </div>
    </footer>
  );
}
