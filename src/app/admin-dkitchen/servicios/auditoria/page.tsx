import { exigirAdmin } from '@/lib/guard-admin';
import TableroProyectos from '@/components/admin/tablero/TableroProyectos';
import type { Columna } from '@/components/admin/tablero/Tablero';

export const dynamic = 'force-dynamic';

/** Servicios → Auditoría (decisión 2 de karc0, 01/11): su propio tablero, antes dentro de Proyectos. */
const COLUMNAS: Columna[] = [
  { clave: 'solicitud', nombre: 'Solicitud', fases: ['solicitud'] },
  { clave: 'pagada', nombre: 'Pagada', fases: ['pagada'] },
  { clave: 'reunion', nombre: 'Reunión fijada', fases: ['reunion_fijada'] },
  { clave: 'informe', nombre: 'Informe entregado', fases: ['informe_entregado'] },
  { clave: 'cerrada', nombre: 'Cerrada', fases: ['cerrada'] },
];

export default async function ServiciosAuditoriaPage({ searchParams }: { searchParams: Promise<{ ok?: string; id?: string }> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  return (
    <TableroProyectos jwt={jwt} producto="auditoria" titulo="Auditoría" columnas={COLUMNAS} volver="/admin-dkitchen/servicios/auditoria" resaltar={q.id} ok={q.ok}
      cifras={(l) => [
        [String(l.filter((p) => p.fase === 'pagada').length), 'por fijar reunión'],
        [String(l.filter((p) => p.fase === 'reunion_fijada').length), 'informes en curso'],
        [String(l.filter((p) => p.vencido).length), 'con fecha vencida'],
      ]} />
  );
}
