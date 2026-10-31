import { exigirAdmin } from '@/lib/guard-admin';
import TableroProyectos from '@/components/admin/tablero/TableroProyectos';
import type { Columna } from '@/components/admin/tablero/Tablero';

export const dynamic = 'force-dynamic';

/** Servicios → Signature (decisiones 3 y 8 de karc0, 01/11): tablero Propuesta → … → Mantenimiento + «+ Nuevo Signature». */
const COLUMNAS: Columna[] = [
  { clave: 'propuesta', nombre: 'Propuesta', fases: ['solicitud'] },
  { clave: 'pago', nombre: 'Pago y contrato', fases: ['pagado', 'contrato_enviado', 'contrato_firmado'], destino: 'pagado' },
  { clave: 'diseno', nombre: 'Diseño', fases: ['datos_recibidos'] },
  { clave: 'desarrollo', nombre: 'Desarrollo', fases: ['en_construccion'] },
  { clave: 'entrega', nombre: 'Entrega', fases: ['primera_version', 'publicado'], destino: 'primera_version' },
  { clave: 'mantenimiento', nombre: 'Mantenimiento', fases: ['mantenimiento'] },
];

export default async function ServiciosSignaturePage({ searchParams }: { searchParams: Promise<{ ok?: string; id?: string }> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  return (
    <TableroProyectos jwt={jwt} producto="signature" titulo="Signature" columnas={COLUMNAS} volver="/admin-dkitchen/servicios/signature" resaltar={q.id} ok={q.ok}
      cifras={(l) => [
        [String(l.filter((p) => ['en_construccion', 'datos_recibidos', 'primera_version'].includes(p.fase)).length), 'en producción'],
        [String(l.filter((p) => ['publicado', 'mantenimiento'].includes(p.fase)).length), 'apps publicadas'],
        [String(l.filter((p) => p.vencido).length), 'con fecha vencida'],
      ]} />
  );
}
