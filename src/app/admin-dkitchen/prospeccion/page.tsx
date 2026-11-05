import { exigirAdmin } from '@/lib/guard-admin';
import { listaProspectos, miContacto, comercialesCentral, metricasCentral, esEstado } from '@/lib/prospeccion';
import CrmLista, { type DemoProspecto } from '@/components/prospeccion/CrmLista';
import { comoCliente } from '@/lib/db';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Central → Prospección (0058/0117/0118): por defecto muestra «Mi cartera» en Dirección; pestañas 1 clic por comercial, exclusión de script por defecto y selección en lote. */
export default async function ProspeccionCentral({ searchParams }: { searchParams: Promise<{ estado?: string; comercial?: string; modo?: string; e?: string; ok?: string; vista?: string }> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const comerciales = await comercialesCentral(jwt).catch(() => null);
  const miCarteraId = comerciales?.[0]?.id ?? null;
  const comercialFiltro = sp.comercial === 'todas'
    ? null
    : sp.comercial && UUID.test(sp.comercial)
      ? sp.comercial
      : miCarteraId;
  const [lista, contacto, metricas, demos] = await Promise.all([
    listaProspectos(jwt, null, comercialFiltro), miContacto(jwt), metricasCentral(jwt).catch(() => null),
    // 0097: la demo ligada a cada local (miniatura en la tarjeta). Si falla, las tarjetas salen sin demo.
    comoCliente(jwt, async (c) => (await c.query<{ d: Record<string, DemoProspecto> }>('SELECT dk.admin_prosp_demos() AS d')).rows[0].d).catch(() => ({} as Record<string, DemoProspecto>)),
  ]);
  const modo = sp.modo === 'digital' ? 'digital' : sp.modo === 'pie' ? 'pie' : 'todos';
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-carbon sm:px-6 lg:px-10">
      <GuiaZona titulo="Prospección" ancla="prospeccion"
        que="Los locales a los que queremos vender (tu cartera separada de la de cada comercial), con Zona de Prospección Digital, generador de demos y reparto por lotes."
        pasos={['Usa las pestañas de cartera o el repartidor por lotes (6 o 12) para pasar locales a un comercial (a pie o digital).', 'Crea o edita la demo real del local en 1 clic (subiendo fotos de platos al momento) y genera su propuesta con plantilla.', 'Cuando diga que sí: conviértelo en cliente reutilizando su misma demo.']} />
      <CrmLista base="/admin-dkitchen/prospeccion" lista={lista} estado={esEstado(sp.estado) ? sp.estado : null} aviso={sp.e} ok={sp.ok}
        contacto={contacto} central={Boolean(comerciales && comerciales.length > 0)} comerciales={comerciales ?? undefined}
        comercial={sp.comercial === 'todas' ? 'todas' : comercialFiltro} modo={modo} metricas={metricas} demos={demos}
        vista={sp.vista === 'tablero' ? 'tablero' : 'tarjetas'} />
    </div>
  );
}
