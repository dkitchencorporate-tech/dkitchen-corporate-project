import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { nombrePlan } from '@/lib/pricing-config';
import { atenderLeadAction } from './actions';
import { crearProyectoAction } from '../proyectos/actions';
import { listarClientesQr } from '@/lib/admin-clientes';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

/**
 * Oportunidades (punto 9, 0057; solo super admin). Leads de Signature que los
 * locales piden desde la tarjeta de su panel. Aquí irá también la lista de
 * locales objetivo de karc0 y de cada socio (9c).
 */
type Lead = { id: string; restaurante_id: string; nombre: string; slug: string; plan: string; datos: { escaneos?: number; reservas?: number; llamadas?: number; fundador?: boolean }; creado_en: string; atendido_en: string | null; nota: string | null };
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const fecha = (s: string) => new Date(s).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function Oportunidades() {
  const jwt = await exigirAdmin();
  const leads = await comoCliente(jwt, async (c) => (await c.query<Lead>('SELECT * FROM dk.admin_leads_signature()')).rows).catch(() => null);
  const clientes = new Map((await listarClientesQr(jwt).catch(() => [])).map((c) => [c.restauranteId, c]));
  const abiertos = leads?.filter((l) => !l.atendido_en) ?? [];
  const atendidos = leads?.filter((l) => l.atendido_en) ?? [];
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-carbon sm:px-6 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Oportunidades</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Oportunidades</h1>
        <p className="mt-1 text-sm text-niebla">Locales con tracción que han pedido una llamada para Signature desde su panel (≥600 escaneos, ≥40 reservas o ≥300 llamadas al camarero en 30 días). Si no se atienden en 48 h, el parte lo marca como urgente.</p>
      </div>
      <GuiaZona titulo="Oportunidades" ancla="oportunidades"
        que="Locales de carta QR que piden que les llamemos para dar el salto a Signature (su propia web y sistema)."
        pasos={['Llama al local (teléfono en el correo «LEAD SIGNATURE» o en su ficha).', 'Si hay interés, pulsa «Crear proyecto Signature»: se abre su proyecto con sus datos y lo sigues en Proyectos.', 'Escribe cómo fue la llamada y pulsa «Marcar atendido».']}
        ojo={['Si no se atiende en 48 h, el parte diario lo marca como urgente.']} />

      {leads === null ? <p className={`${tarjeta} text-sm font-semibold text-vino`}>No se pudieron leer las oportunidades.</p> : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Por llamar · {abiertos.length}</h2>
            {abiertos.length === 0 && <p className={`${tarjeta} text-sm text-ceniza`}>Nadie esperando una llamada.</p>}
            {abiertos.map((l) => (
              <article key={l.id} className={tarjeta}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/admin-dkitchen/qr/${l.restaurante_id}`} className="font-semibold hover:text-vino">{l.nombre}</Link>
                  <span className="text-xs text-ceniza">pidió llamada el {fecha(l.creado_en)}</span>
                </div>
                <p className="mt-1 text-sm text-niebla">Plan {nombrePlan(l.plan)}{l.datos.fundador ? ' · Fundador' : ''} · {l.datos.escaneos ?? 0} escaneos, {l.datos.reservas ?? 0} reservas y {l.datos.llamadas ?? 0} llamadas en 30 días</p>
                <p className="mt-1 text-xs text-ceniza">El teléfono que dejó está en el correo «LEAD SIGNATURE»; el del local, en su ficha.</p>
                {clientes.get(l.restaurante_id)?.email && (
                  <form action={crearProyectoAction} className="mt-3">
                    <input type="hidden" name="producto" value="signature" />
                    <input type="hidden" name="email" value={clientes.get(l.restaurante_id)!.email!} />
                    <input type="hidden" name="nombre" value={clientes.get(l.restaurante_id)!.contacto ?? ''} />
                    <input type="hidden" name="negocio" value={l.nombre} />
                    <button className="rounded-full border border-linea-fuerte px-4 py-2 text-sm font-semibold hover:border-vino">Crear proyecto Signature →</button>
                  </form>
                )}
                <form action={atenderLeadAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="lead" value={l.id} />
                  <input name="nota" maxLength={500} placeholder="Cómo fue la llamada (opcional)" className="min-w-0 flex-1 rounded-full border border-linea px-4 py-2.5 text-sm focus:border-vino focus:outline-none" />
                  <button className="rounded-full bg-tinta px-5 py-2.5 text-sm font-semibold text-white">Marcar atendido</button>
                </form>
              </article>
            ))}
          </section>
          {atendidos.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Atendidos · 60 días</h2>
              <ul className={`${tarjeta} divide-y divide-linea p-0`}>
                {atendidos.map((l) => (
                  <li key={l.id} className="px-5 py-3 text-sm">
                    <span className="font-medium">{l.nombre}</span> <span className="text-xs text-ceniza">· {fecha(l.atendido_en!)}</span>
                    {l.nota && <p className="mt-0.5 text-niebla">{l.nota}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
