import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { fichaCliente } from '@/lib/admin-clientes';
import { KitImprimible, parametrosKit } from '@/components/kit/KitImprimible';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kit del cliente · Central', robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Kit de cualquier cliente desde Central (solo admin con 2FA). Fuera del layout de Central para que al imprimir no salga el menú. */
export default async function KitClientePagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const jwt = await exigirAdmin();
  const ficha = await fichaCliente(jwt, id).catch(() => null);
  const codigo = ficha?.codigos[0];
  if (!ficha || !codigo) notFound();
  const r = ficha.restaurante;
  const { pieza, mesas } = parametrosKit(await searchParams);
  return (
    <KitImprimible
      d={{
        nombre: r.nombre, slug: r.slug, codigo, plan: r.plan, logoUrl: r.logo_url, colorMarca: r.color_marca, estiloFondo: r.estilo_fondo ?? null,
        estiloLetra: r.estilo_letra ?? null, descripcion: r.descripcion, direccion: r.direccion, horario: r.horario, telefono: r.telefono,
        instagram: r.instagram, portadaUrl: r.portada_url ?? null,
      }}
      pieza={pieza} mesas={mesas} base={`/kit/${id}`} volver={{ href: `/admin-dkitchen/qr/${id}`, texto: 'Volver a la ficha' }}
    />
  );
}
