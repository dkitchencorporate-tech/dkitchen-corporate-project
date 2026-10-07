import { notFound } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { fichaProspecto, comercialesCentral } from '@/lib/prospeccion';
import CrmFicha from '@/components/prospeccion/CrmFicha';

export const dynamic = 'force-dynamic';

export default async function FichaCentral({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  const jwt = await exigirAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [f, comerciales] = await Promise.all([fichaProspecto(jwt, id).catch(() => null), comercialesCentral(jwt)]);
  if (!f) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-carbon sm:px-6 lg:px-10">
      <CrmFicha base="/admin-dkitchen/prospeccion" f={f} aviso={sp.e} ok={sp.ok} comerciales={comerciales} />
    </div>
  );
}
