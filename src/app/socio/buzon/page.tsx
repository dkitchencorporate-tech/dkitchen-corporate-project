import { exigirSocio } from '@/lib/guard-admin';
import { verBuzon } from '@/lib/buzon';
import BuzonVista from '@/components/buzon/BuzonVista';
import { escribirBuzonSocioAction } from './actions';

export const dynamic = 'force-dynamic';

/** /socio → Buzón para Claude (0065): el socio escribe y ve solo lo suyo. */
export default async function BuzonSocio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirSocio();
  const sp = await searchParams;
  const mensajes = await verBuzon(jwt, 100).catch(() => null);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Socio · Cuenta</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">Buzón para Claude</h1>
        <p className="mt-1 text-sm text-niebla">Ideas para vender mejor, fallos que encuentres o preguntas. Lo lee Claude al empezar cada sesión y también lo ve DKitchen.</p>
      </header>
      <BuzonVista mensajes={mensajes} esAdmin={false} escribir={escribirBuzonSocioAction} ok={sp.ok === '1'} error={sp.e} />
    </div>
  );
}
