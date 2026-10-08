import { exigirAdmin } from '@/lib/guard-admin';
import { verBuzon } from '@/lib/buzon';
import GuiaZona from '@/components/admin/GuiaZona';
import BuzonVista from '@/components/buzon/BuzonVista';
import { escribirBuzonAdminAction, estadoBuzonAction } from './actions';

export const dynamic = 'force-dynamic';

/** Central → Cuenta → Buzón para Claude (0065): lo de los admins y lo de los socios. */
export default async function BuzonCentral({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const mensajes = await verBuzon(jwt, 200).catch(() => null);
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Cuenta</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Buzón para Claude</h1>
      </header>
      <GuiaZona titulo="Buzón para Claude" ancla="buzon"
        que="Encargos, ideas, fallos y preguntas para Claude. Se guardan en la base y Claude los lee al empezar cada sesión de trabajo; aquí ves si los ha leído, si están hechos y su respuesta. También llegan los de los socios."
        pasos={['Elige el tipo: Encargo (hazlo), Idea (para más adelante), Fallo (algo no funciona) o Pregunta.', 'Escribe el mensaje como se lo dirías a una persona y, si ayuda, la pantalla o el cliente.', 'Cuando Claude lo lea pasará a «Leído por Claude»; cuando lo termine, verás su respuesta y «Hecho».', 'Puedes cerrarlo tú (Hecho / Descartado) o volver a abrirlo.']} />
      <BuzonVista mensajes={mensajes} esAdmin escribir={escribirBuzonAdminAction} cambiarEstado={estadoBuzonAction} ok={sp.ok === '1'} error={sp.e} />
    </div>
  );
}
