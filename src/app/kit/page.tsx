import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { obtenerMiRestaurante, obtenerCodigoQr } from '@/lib/mi-restaurante';
import { KitImprimible, parametrosKit } from '@/components/kit/KitImprimible';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kit para imprimir · DKitchen', robots: { index: false, follow: false } };

/** Kit del propio local (tarea 5): siempre el de la sesión, nunca el de otro por parámetro. */
export default async function KitPagina({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  const r = await obtenerMiRestaurante(jwt).catch(() => null);
  if (!r) redirect('/panel');
  const codigo = await obtenerCodigoQr(jwt, r.id).catch(() => null);
  if (!codigo) redirect('/panel?pestana=qr');
  const { pieza, mesas } = parametrosKit(await searchParams);
  return (
    <KitImprimible
      d={{
        nombre: r.nombre, slug: r.slug, codigo, plan: r.plan, logoUrl: r.logoUrl, colorMarca: r.colorMarca, estiloFondo: r.estiloFondo,
        estiloLetra: r.estiloLetra, descripcion: r.descripcion, direccion: r.direccion, horario: r.horario, telefono: r.telefono,
        instagram: r.instagram, portadaUrl: r.portadaUrl ?? null,
      }}
      pieza={pieza} mesas={mesas} base="/kit" volver={{ href: '/panel?pestana=qr', texto: 'Volver al panel' }}
    />
  );
}
