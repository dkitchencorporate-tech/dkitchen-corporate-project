import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { verDocumentos, enlaceDocumento } from '@/lib/documentos';
import { verTareas } from '@/lib/tareas';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

/**
 * Central → Fiscal (22/10, karc0): área única para el traslado de DKitchen a Francia (micro-entrepreneur de la
 * titular) y, más adelante, la contabilidad propia. Sus documentos (ruta fiscal/…) no salen en Reportes y sus
 * tareas (bloque «fiscal») no salen en Mis tareas. Regla nº 1: nada puede afectar al paro (ARE) de la titular.
 */
export default async function Fiscal() {
  const jwt = await exigirAdmin();
  const [docs, tareas] = await Promise.all([verDocumentos(jwt, 'reporte').catch(() => []), verTareas(jwt).catch(() => [])]);
  const fiscales = docs.filter((d) => d.ruta.startsWith('fiscal/')).sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  const abiertas = tareas.filter((t) => t.bloque === 'fiscal' && t.estado !== 'hecha');
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Fiscal</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">DKitchen en Francia</h1>
        <p className="mt-2 max-w-2xl text-pizarra">Alta de micro-entrepreneur, IVA en franquicia, Stripe Francia, paro de la titular y, más adelante, la contabilidad. <b>Regla nº 1: nada puede afectar al paro.</b> Mientras tanto, los cobros están en pausa (PAGOS_PAUSADOS): quien intenta pagar queda como reserva y llega por correo.</p>
      </header>
      <GuiaZona titulo="Cómo se usa" que="Todo lo fiscal en un solo sitio: tareas, guías y estado." pasos={['Tareas fiscales: lo que toca, con fecha y responsable.', 'Documentos: guía maestra, checklist, estado de la titular y traspaso para su ordenador.', 'Contabilidad: llegará con Stripe Francia (ingresos, límites y DES).']} />
      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/admin-dkitchen/tareas?area=fiscal" className="rounded-[22px] border border-linea bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-niebla">Tareas fiscales</p>
          <p className="font-display mt-2 text-4xl font-semibold">{abiertas.length}</p>
          <p className="mt-1 text-sm text-pizarra">abiertas · {abiertas.filter((t) => t.urgencia === 'urgente').length} urgentes</p>
        </Link>
        <div className="rounded-[22px] border border-linea bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-niebla">Documentos</p>
          <p className="font-display mt-2 text-4xl font-semibold">{fiscales.length}</p>
          <p className="mt-1 text-sm text-pizarra">guías y estados</p>
        </div>
        <div className="rounded-[22px] border border-dashed border-acero bg-white/60 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-niebla">Contabilidad</p>
          <p className="mt-2 text-sm text-pizarra">Próximamente: ingresos de Stripe Francia, límites (37.500 € de IVA, 10.000 € de ventas UE a particulares, 83.600 € de la micro) y la lista mensual de la DES.</p>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-vino">Documentos fiscales</h2>
        <ul className="mt-3 divide-y divide-linea rounded-[22px] border border-linea bg-white">
          {fiscales.map((d) => (
            <li key={d.ruta} className="p-4">
              <Link href={enlaceDocumento(d.ruta)} className="font-semibold underline-offset-4 hover:underline">{d.titulo}</Link>
              {d.resumen && <p className="mt-1 line-clamp-2 text-sm text-pizarra">{d.resumen}</p>}
            </li>
          ))}
          {!fiscales.length && <li className="p-4 text-sm text-niebla">Aún no hay documentos fiscales.</li>}
        </ul>
      </section>
    </div>
  );
}
