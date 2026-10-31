import { listarProyectos, type ProductoProyecto, type ProyectoFila } from '@/lib/proyectos';
import { esComercialActual } from '@/lib/rol-central';
import Tablero, { type Columna, type Tarjeta } from '@/components/admin/tablero/Tablero';
import NuevoCliente from '@/components/admin/NuevoCliente';
import type { ServicioAlta } from '@/components/admin/AltaUnicaModal';

/**
 * Pantalla de tablero de un servicio con proyecto (Signature, Auditoría): cabecera con su «+ Nuevo»,
 * 3 cifras vivas y el tablero de columnas. Una sola acción principal: «+ Nuevo …».
 */
const euros = (c: number | null) => (c ? (c / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €' : null);

export default async function TableroProyectos({ jwt, producto, titulo, columnas, volver, resaltar, ok, cifras }: {
  jwt: string; producto: ProductoProyecto & ServicioAlta; titulo: string; columnas: Columna[]; volver: string; resaltar?: string; ok?: string;
  cifras: (l: ProyectoFila[]) => [string, string][];
}) {
  const [proyectos, esComercial] = await Promise.all([
    listarProyectos(jwt, { producto }).catch(() => [] as ProyectoFila[]),
    esComercialActual(jwt),
  ]);
  const vivos = proyectos.filter((p) => p.fase !== 'descartado');
  const tarjetas: Tarjeta[] = vivos.map((p) => ({
    id: p.id, titulo: p.negocio || p.nombre || p.email, sub: p.siguiente_paso || p.nombre || p.email, fase: p.fase,
    fecha: p.siguiente_fecha, vencido: p.vencido, href: `/admin-dkitchen/proyectos/${p.id}`, importe: euros(p.importe_centimos),
    etiqueta: (p.negocio ?? '').startsWith('PRUEBA') ? 'prueba' : null,
  }));
  return (
    <div className="space-y-5 px-4 py-6 text-tinta sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Servicios</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{titulo}</h1>
        </div>
        <NuevoCliente servicio={producto} etiqueta={`+ Nuevo ${titulo}`} esComercial={esComercial} />
      </div>
      {ok === 'fase' && <p role="status" className="rounded-2xl bg-exito/10 px-4 py-3 text-sm text-exito">Fase cambiada. Si tocaba, el cliente ya tiene su aviso por correo.</p>}
      <div className="grid grid-cols-3 gap-2.5">
        {cifras(vivos).map(([v, t]) => (
          <div key={t} className="rounded-[20px] bg-white p-3.5 shadow-[0_10px_30px_-24px_rgba(62,5,21,.5)]"><b className="cv-cifra block font-display text-2xl">{v}</b><span className="text-xs text-niebla">{t}</span></div>
        ))}
      </div>
      <Tablero columnas={columnas} tarjetas={tarjetas} volver={volver} resaltar={resaltar} />
    </div>
  );
}
