import type { Metadata } from 'next';
import { comoVisitante } from '@/lib/db';
import { darmeDeBajaAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Baja de la lista · DKitchen', robots: { index: false, follow: false } };

/**
 * Baja de la lista de exclientes (0081). Un solo botón: GET no da de baja para que los
 * antivirus del correo, que abren los enlaces, no lo hagan por la persona. Gmail y Outlook
 * usan además la cabecera List-Unsubscribe (POST a /api/lista/baja, RFC 8058).
 */
export default async function BajaLista({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = /^[0-9a-f]{32}$/.test(token)
    ? await comoVisitante(async (c) => (await c.query<{ v: { nombre: string | null; estado: 'activo' | 'baja' } | null }>('SELECT dk.lista_ver($1) AS v', [token])).rows[0].v).catch(() => null)
    : null;
  const deBaja = !s || s.estado === 'baja';

  return (
    <main className="flex min-h-screen items-center justify-center bg-crema px-4 py-10 text-carbon">
      <article className="w-full max-w-md rounded-[28px] bg-white p-7 text-center ring-1 ring-linea sm:p-10">
        <p className="text-[15px] font-bold">D<span className="text-vino">Kitchen</span></p>
        <h1 className="font-display mt-6 text-3xl font-semibold leading-tight">
          {deBaja ? 'Ya no te escribiremos' : '¿Dejamos de escribirte?'}
        </h1>
        {deBaja ? (
          <p className="mt-4 text-[15px] leading-relaxed text-pizarra">
            Te hemos quitado de la lista de exclientes de DKitchen. Solo recibirás, si los hubiera, los avisos obligatorios sobre tus datos.
          </p>
        ) : (
          <>
            <p className="mt-4 text-[15px] leading-relaxed text-pizarra">
              Te escribimos de vez en cuando porque {s?.nombre ? <strong className="text-carbon">{s.nombre}</strong> : 'tu local'} fue cliente de DKitchen. Con un clic dejas de recibir estos correos.
            </p>
            <form action={darmeDeBajaAction} className="mt-7">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="inline-flex w-full items-center justify-center rounded-full bg-vino px-6 py-4 text-[15px] font-semibold text-white transition hover:bg-vino-hondo">
                Darme de baja de la lista
              </button>
            </form>
          </>
        )}
      </article>
    </main>
  );
}
