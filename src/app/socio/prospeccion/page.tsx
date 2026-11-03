import { exigirSocio } from '@/lib/guard-admin';
import { listaProspectos, miContacto, esEstado } from '@/lib/prospeccion';
import CrmLista, { type DemoProspecto } from '@/components/prospeccion/CrmLista';
import { comoCliente } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** /socio → Prospección (0058/0117): cartera del comercial con Zona de Prospección Digital, demos interactivas y editor. */
export default async function ProspeccionSocio({ searchParams }: { searchParams: Promise<{ estado?: string; modo?: string; vista?: string; e?: string; ok?: string }> }) {
  const jwt = await exigirSocio();
  const sp = await searchParams;
  const [lista, contacto, demos] = await Promise.all([
    listaProspectos(jwt, null, null),
    miContacto(jwt),
    comoCliente(jwt, async (c) => (await c.query<{ d: Record<string, DemoProspecto> }>('SELECT dk.admin_prosp_demos() AS d')).rows[0].d).catch(() => ({} as Record<string, DemoProspecto>)),
  ]);
  const modo = sp.modo === 'digital' ? 'digital' : sp.modo === 'pie' ? 'pie' : 'todos';
  return (
    <CrmLista
      base="/socio/prospeccion"
      lista={lista}
      estado={esEstado(sp.estado) ? sp.estado : null}
      aviso={sp.e}
      ok={sp.ok}
      contacto={contacto}
      demos={demos}
      modo={modo}
      vista={sp.vista === 'tablero' ? 'tablero' : 'tarjetas'}
    />
  );
}
