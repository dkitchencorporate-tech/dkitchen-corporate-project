import { exigirAdmin } from '@/lib/guard-admin';
import { verBuzon } from '@/lib/buzon';
import GuiaZona from '@/components/admin/GuiaZona';
import BuzonVista from '@/components/buzon/BuzonVista';
import { escribirBuzonAdminAction, estadoBuzonAction } from './actions';

export const dynamic = 'force-dynamic';

/** Central → Cuenta → Buzón Agente DK (0065 / 0123): lo de los admins y lo de los socios. */
export default async function BuzonCentral({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const mensajes = await verBuzon(jwt, 200).catch(() => null);
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Cuenta</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Buzón Agente DK</h1>
      </header>
      <GuiaZona titulo="Buzón Agente DK" ancla="buzon"
        que="Encargos, ideas, fallos y preguntas para Agente DK, con capturas o vídeos cortos adjuntos. Se guardan en la base y quedan separados entre Pendientes y Atendidos. También llegan los mensajes de los socios."
        pasos={['Elige el tipo: Encargo (hazlo), Idea (para más adelante), Fallo (algo no funciona) o Pregunta.', 'Escribe el mensaje, indica pantalla o cliente y adjunta hasta 6 capturas o vídeos (puedes pegarlos con Ctrl+V).', 'Los nuevos y en curso aparecen en la pestaña Pendientes; los cerrados o descartados pasan a Atendidos.', 'Cuando Agente DK termine, verás su respuesta y el mensaje pasará a Atendidos.']} />
      <BuzonVista mensajes={mensajes} esAdmin escribir={escribirBuzonAdminAction} cambiarEstado={estadoBuzonAction} ok={sp.ok === '1'} error={sp.e} />
    </div>
  );
}
