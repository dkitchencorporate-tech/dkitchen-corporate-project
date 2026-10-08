import { exigirAdmin } from '@/lib/guard-admin';
import { listaProspectos, miContacto, comercialesCentral, metricasCentral, esEstado } from '@/lib/prospeccion';
import CrmLista from '@/components/prospeccion/CrmLista';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Central → Prospección (0058): la cartera de karc0 y las de cada socio, con filtro, métricas y reasignación. */
export default async function ProspeccionCentral({ searchParams }: { searchParams: Promise<{ estado?: string; comercial?: string; e?: string; ok?: string }> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const comercial = sp.comercial && UUID.test(sp.comercial) ? sp.comercial : null;
  const [lista, contacto, comerciales, metricas] = await Promise.all([
    listaProspectos(jwt, null, comercial), miContacto(jwt), comercialesCentral(jwt), metricasCentral(jwt).catch(() => null),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-carbon sm:px-6 lg:px-10">
      <GuiaZona titulo="Prospección" ancla="prospeccion"
        que="Los locales a los que queremos vender (tuyos y de cada socio) y en qué punto está cada uno."
        pasos={['Filtra por estado o por comercial.', 'Abre un prospecto para ver sus datos y apuntar cada contacto y el siguiente paso.', 'Cuando diga que sí: Clientes → Nuevo cliente (o un enlace de pago desde su ficha).']} />
      <CrmLista base="/admin-dkitchen/prospeccion" lista={lista} estado={esEstado(sp.estado) ? sp.estado : null} aviso={sp.e} ok={sp.ok}
        contacto={contacto} central comerciales={comerciales} comercial={comercial} metricas={metricas} />
    </div>
  );
}
