import { exigirSocio } from '@/lib/guard-admin';
import { listaProspectos, miContacto, esEstado } from '@/lib/prospeccion';
import CrmLista from '@/components/prospeccion/CrmLista';

export const dynamic = 'force-dynamic';

/** /socio → Prospección (0058): solo la cartera del socio; karc0 la ve y la guía desde Central. */
export default async function ProspeccionSocio({ searchParams }: { searchParams: Promise<{ estado?: string; e?: string; ok?: string }> }) {
  const jwt = await exigirSocio();
  const sp = await searchParams;
  const [lista, contacto] = await Promise.all([listaProspectos(jwt, null, null), miContacto(jwt)]);
  return <CrmLista base="/socio/prospeccion" lista={lista} estado={esEstado(sp.estado) ? sp.estado : null} aviso={sp.e} ok={sp.ok} contacto={contacto} />;
}
