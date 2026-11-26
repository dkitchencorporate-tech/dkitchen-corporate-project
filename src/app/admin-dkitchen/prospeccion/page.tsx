import { exigirAdmin } from '@/lib/guard-admin';
import { listaProspectos, miContacto, comercialesCentral, metricasCentral, enviosWhatsappHoy, esEstado } from '@/lib/prospeccion';
import CrmLista, { type DemoProspecto, type ZonaCrm } from '@/components/prospeccion/CrmLista';
import { comoCliente } from '@/lib/db';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Central → Prospección (0058/0117/0118/0120): por defecto muestra «Mi cartera» en Dirección; pestañas 1 clic por comercial, exclusión de script por defecto y selección en lote. */
export default async function ProspeccionCentral({ searchParams }: { searchParams: Promise<{ estado?: string; comercial?: string; modo?: string; e?: string; ok?: string; vista?: string; zona?: string }> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const comerciales = await comercialesCentral(jwt).catch(() => null);
  const miCarteraId = comerciales?.[0]?.id ?? null;
  const comercialFiltro = sp.comercial === 'todas'
    ? null
    : sp.comercial && UUID.test(sp.comercial)
      ? sp.comercial
      : miCarteraId;
  const [lista, contacto, metricas, demos, enviosWaHoy] = await Promise.all([
    listaProspectos(jwt, null, comercialFiltro), miContacto(jwt), metricasCentral(jwt).catch(() => null),
    // 0097: la demo ligada a cada local (miniatura en la tarjeta). Si falla, las tarjetas salen sin demo.
    comoCliente(jwt, async (c) => (await c.query<{ d: Record<string, DemoProspecto> }>('SELECT dk.admin_prosp_demos() AS d')).rows[0].d).catch(() => ({} as Record<string, DemoProspecto>)),
    enviosWhatsappHoy(jwt),
  ]);
  const modo = sp.modo === 'digital' ? 'digital' : sp.modo === 'pie' ? 'pie' : 'todos';
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-carbon sm:px-6 lg:px-10">
      <GuiaZona titulo="Prospección" ancla="prospeccion"
        que="Cuatro zonas separadas: Enviar (WhatsApp en 3 mensajes), Ruta (mapa y visitas a pie), Seguimiento (los que ya recibieron algo) y Cartera (todos los locales, demos, lotes y comerciales)."
        pasos={['Enviar: pulsa «Enviar» en cada local, manda los 3 mensajes y vuelve; pasa solo a Seguimiento.', 'Ruta: el mapa y las paradas de hoy; al terminar cada visita pulsa «Registrar».', 'Seguimiento: quién abrió la propuesta y a quién toca llamar o visitar hoy.']} />
      <CrmLista base="/admin-dkitchen/prospeccion" lista={lista} estado={esEstado(sp.estado) ? sp.estado : null} aviso={sp.e} ok={sp.ok}
        contacto={contacto} central={Boolean(comerciales && comerciales.length > 0)} comerciales={comerciales ?? undefined}
        comercial={sp.comercial === 'todas' ? 'todas' : comercialFiltro} modo={modo} metricas={metricas} demos={demos}
        vista={sp.vista === 'tablero' ? 'tablero' : 'tarjetas'} enviosWaHoy={enviosWaHoy} zona={(['enviar', 'ruta', 'seguimiento', 'cartera'] as const).find((z) => z === sp.zona) ?? ('enviar' as ZonaCrm)} />
    </div>
  );
}
