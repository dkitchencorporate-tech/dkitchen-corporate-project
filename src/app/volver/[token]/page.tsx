import type { Metadata } from 'next';
import { comoVisitante } from '@/lib/db';
import { nombrePlan } from '@/lib/pricing-config';
import { volverConMiCartaAction, anularMiBajaAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Vuelve con tu carta · DKitchen', robots: { index: false, follow: false } };

/**
 * «Las puertas siguen abiertas» (0081): destino del botón de los correos de baja (día 0, 30 y 53).
 * Según el estado de la cuenta: anular la baja que aún no ha llegado, volver pagando el plan
 * (importe fijado por la base) o, si ya se borró, empezar de nuevo.
 */
type Vuelta = {
  nombre: string; plan: string; precio_centimos: number;
  estado: 'activa' | 'baja_programada' | 'suspendida';
  baja_programada_en: string | null; borrado_el: string | null;
};
const fecha = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
const eur = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: c % 100 ? 2 : 0 }) + ' €';

function Marco({ antetitulo, titulo, children }: { antetitulo: string; titulo: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-crema px-4 py-10 text-carbon sm:py-16">
      <article className="mx-auto max-w-xl overflow-hidden rounded-[28px] bg-white ring-1 ring-linea">
        <div className="bg-vino-fondo px-6 pb-8 pt-7 text-white sm:px-10">
          <p className="text-[15px] font-bold">D<span className="text-oro">Kitchen</span></p>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{antetitulo}</p>
          <h1 className="font-display mt-2 break-words text-3xl font-semibold leading-tight sm:text-4xl">{titulo}</h1>
        </div>
        <div className="space-y-5 px-6 py-8 text-[15px] leading-relaxed sm:px-10">{children}</div>
      </article>
    </main>
  );
}

const botonPrincipal = 'inline-flex w-full items-center justify-center rounded-full bg-vino px-6 py-4 text-[15px] font-semibold text-white transition hover:bg-vino-hondo sm:w-auto';
const Aviso = ({ children }: { children: React.ReactNode }) => (
  <p role="status" className="rounded-2xl bg-crema px-4 py-3 text-sm text-carbon ring-1 ring-linea">{children}</p>
);

export default async function Volver({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; anulada?: string; revision?: string }>;
}) {
  const { token } = await params;
  const q = await searchParams;
  const v = /^[0-9a-f]{32}$/.test(token)
    ? await comoVisitante(async (c) => (await c.query<{ v: Vuelta | null }>('SELECT dk.vuelta_ver($1) AS v', [token])).rows[0].v).catch(() => null)
    : null;

  if (!v) {
    return (
      <Marco antetitulo="Este enlace ya no está activo" titulo="Tu carta ya no está guardada">
        <p>Pasados 60 días desde la baja, borramos la carta y sus fotos, como te avisamos. Si quieres volver, empezar de nuevo es rápido y te la montamos nosotros.</p>
        <a href="/qr?utm_source=volver&utm_medium=correo" className={botonPrincipal}>Ver la carta digital</a>
      </Marco>
    );
  }

  const nombre = v.nombre;
  if (v.estado === 'activa') {
    return (
      <Marco antetitulo={nombre} titulo={q.anulada ? 'Baja anulada. Seguimos contigo' : 'Tu carta está activa'}>
        {q.anulada && <Aviso>Hemos vuelto a activar la renovación: tu carta y tu panel siguen como siempre.</Aviso>}
        <p>Puedes entrar en tu panel cuando quieras para cambiar platos, precios o fotos.</p>
        <a href="/panel" className={botonPrincipal}>Entrar en mi panel</a>
      </Marco>
    );
  }

  if (v.estado === 'baja_programada') {
    return (
      <Marco antetitulo={nombre} titulo="Las puertas siguen abiertas">
        {q.error && <Aviso>No hemos podido anular la baja ahora mismo. Inténtalo en unos minutos o responde al correo y lo hacemos nosotros.</Aviso>}
        <p>Tu baja se hace efectiva el <strong>{v.baja_programada_en ? fecha(v.baja_programada_en) : 'final del periodo pagado'}</strong>. Hasta entonces tu carta funciona igual.</p>
        <p>Si has cambiado de idea, anúlala aquí: la renovación vuelve a quedar activa, con el mismo plan y el mismo QR, y no tienes que hacer nada más.</p>
        <form action={anularMiBajaAction}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={botonPrincipal}>Anular mi baja</button>
        </form>
      </Marco>
    );
  }

  return (
    <Marco antetitulo={nombre} titulo="Tu carta sigue guardada">
      {q.error && <Aviso>No hemos podido preparar el pago ahora mismo. Inténtalo en unos minutos o responde al correo y te ayudamos.</Aviso>}
      {q.revision && <Aviso>Tenemos que revisar un cobro anterior antes de reactivarla. Ya nos ha llegado el aviso: te escribimos hoy mismo.</Aviso>}
      <p>Platos, fotos, precios y el mismo QR que ya tienes en las mesas: todo está como lo dejaste{v.borrado_el ? <>, guardado hasta el <strong>{fecha(v.borrado_el)}</strong></> : null}.</p>
      <div className="rounded-[22px] bg-crema p-5 ring-1 ring-linea">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Tu plan</p>
        <p className="font-display mt-1 text-2xl font-semibold">{nombrePlan(v.plan)}</p>
        <p className="mt-1">{eur(v.precio_centimos)} + IVA al mes · sin permanencia</p>
        <p className="mt-2 text-sm text-pizarra">Hoy pagas el primer mes. En cuanto se confirme el pago, tu carta vuelve a funcionar sola.</p>
      </div>
      <form action={volverConMiCartaAction}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className={botonPrincipal}>Volver con mi carta</button>
      </form>
      <p className="text-sm text-pizarra">¿Prefieres que te mandemos una copia o tienes dudas? Responde al correo que te enviamos y te contestamos en el día.</p>
    </Marco>
  );
}
