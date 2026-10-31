import { redirect } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';

/** Experience unificado (decisión 1 de karc0, 01/11): los eventos viven en Servicios → Experience. */
export default async function Entradas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirAdmin();
  const q = await searchParams;
  redirect(q.ev ? `/admin-dkitchen/servicios/experience?ev=${encodeURIComponent(q.ev)}` : q.nuevo ? '/admin-dkitchen/servicios/experience?evento=nuevo' : '/admin-dkitchen/servicios/experience');
}
