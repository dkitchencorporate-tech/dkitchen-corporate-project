import type { Metadata } from 'next';
import Link from 'next/link';
import BarraSalida from '@/components/dk/BarraSalida';
import { titular, quienEs, CORREO_TITULAR } from '@/lib/titular';

export const metadata: Metadata = {
  title: 'Aviso legal · DKitchen Corporate',
  description: 'Quién está detrás de DKitchen, cómo contactar y las condiciones de uso de esta web.',
  alternates: { canonical: 'https://dkitchencorporate.es/aviso-legal' },
};

/**
 * Aviso legal (01/11/2026, fc61230e): información del artículo 10 de la LSSI. Los datos del titular
 * salen de las variables de Vercel (src/lib/titular.ts), nunca del repositorio.
 */
export default function AvisoLegal() {
  const t = titular();
  const SECCIONES: [string, React.ReactNode][] = [
    ['Titular de la web', t
      ? <>Nombre: <strong>{t.nombre}</strong><br />NIF: <strong>{t.nif}</strong><br />Domicilio: {t.domicilio ? <strong>{t.domicilio}</strong> : <>se facilita a petición en <a href={`mailto:${CORREO_TITULAR}`} className="underline">{CORREO_TITULAR}</a></>}<br />Nombre comercial: DKitchen<br />Correo: <a href={`mailto:${CORREO_TITULAR}`} className="underline">{CORREO_TITULAR}</a></>
      : <>{quienEs()}. Correo: <a href={`mailto:${CORREO_TITULAR}`} className="underline">{CORREO_TITULAR}</a>.</>],
    ['Actividad', <>Software y servicios digitales para hostelería: carta digital QR, apps de pedidos con marca propia (Signature), eventos con venta de entradas (Experience) y auditorías de canales. Actividad en toda España.</>],
    ['Uso de la web', <>Esta web informa de nuestros servicios y permite contratarlos. Quien la usa se compromete a hacerlo de buena fe, sin dañarla ni intentar acceder a zonas o datos que no le corresponden.</>],
    ['Propiedad intelectual', <>Los textos, diseños, logotipos, código y demás contenidos de esta web son de DKitchen o de sus licenciantes. No se pueden copiar, distribuir ni transformar sin permiso escrito, salvo para uso personal y para compartir enlaces. El contenido que cada local sube a su carta o a su app es de ese local.</>],
    ['Enlaces y contenidos de terceros', <>Algunas páginas enlazan a sitios de terceros (redes sociales, mapas o pasarelas de pago). No respondemos de sus contenidos ni de sus condiciones, que se rigen por las de cada sitio.</>],
    ['Responsabilidad', <>Ponemos todo nuestro cuidado en que la información sea correcta y la web esté disponible, pero puede haber interrupciones por mantenimiento o por causas ajenas. Los precios y condiciones vigentes son los que se muestran al contratar.</>],
    ['Privacidad y condiciones', <>Cómo tratamos los datos: <Link href="/privacy" className="underline">Política de privacidad</Link>. Cómo se contrata y se paga: <Link href="/terms" className="underline">Condiciones del servicio</Link>.</>],
    ['Ley aplicable', <>Esta web se rige por la legislación española, en particular la Ley 34/2002 de servicios de la sociedad de la información (LSSI) y el Reglamento General de Protección de Datos.</>],
  ];
  return (
    <div className="bg-crema px-6 pb-24 pt-36 text-tinta md:pt-44">
      <article className="mx-auto max-w-3xl">
        <p className="etiqueta-dk text-vino">Aviso legal</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-6xl">Quién está detrás de DKitchen.</h1>
        <p className="mt-4 text-sm text-niebla">Última actualización: 1 de noviembre de 2026</p>
        <ol className="mt-12 divide-y divide-linea border-y border-linea">
          {SECCIONES.map(([titulo, texto], i) => (
            <li key={titulo} className="grid gap-3 py-7 md:grid-cols-[56px_1fr]">
              <span className="acento-serif text-3xl leading-none">{i + 1}</span>
              <div>
                <h2 className="text-lg font-semibold">{titulo}</h2>
                <p className="mt-2 leading-relaxed text-grafito">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>
      <BarraSalida />
    </div>
  );
}
