import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ChatWeb from '@/components/ChatWeb';
import ExitIntent from '@/components/ExitIntent';
import LenisProvider from '@/components/motion/LenisProvider';
import PageTransition from '@/components/motion/PageTransition';

/**
 * Layout compartido de las páginas de marketing.
 *
 * Deliberadamente NO envuelve `/m/{slug}` (la carta de un restaurante real,
 * que no debe llevar nuestra navegación encima — es la pantalla del cliente,
 * no la nuestra), ni `/demo/carta` (la simulación de la experiencia del
 * comensal, que rompería su inmersión con una barra de ventas), ni
 * `/panel`, `/admin-dkitchen`, `/manuals` (superficie interna con su
 * propio layout), ni `/onboarding` (un flujo, no una página de captación).
 * El grupo de rutas `(marketing)` no aparece en la URL: es solo una forma de
 * compartir este layout entre las páginas que sí lo necesitan.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LenisProvider />
      <ExitIntent />
      <NavBar />
      {/*
        Sin relleno superior aquí a propósito: la barra es `fixed` y no ocupa
        espacio en el flujo, pero el primer bloque visible de cada página ya
        trae su propio hueco para no quedar tapado (mismo patrón que ya usaba
        AggressiveHero con `pt-32 md:pt-20`). Ponerlo aquí también lo
        duplicaría en la home.
      */}
      <main className="web-dk">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <ChatWeb />
    </>
  );
}
