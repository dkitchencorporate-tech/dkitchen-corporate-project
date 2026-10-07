import { notFound } from 'next/navigation';
import { exigirSocio } from '@/lib/guard-admin';
import { fichaProspecto } from '@/lib/prospeccion';
import CrmFicha from '@/components/prospeccion/CrmFicha';

export const dynamic = 'force-dynamic';

export default async function FichaSocio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  const jwt = await exigirSocio();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const f = await fichaProspecto(jwt, id).catch(() => null);
  if (!f) notFound();
  return <CrmFicha base="/socio/prospeccion" f={f} aviso={sp.e} ok={sp.ok} />;
}
