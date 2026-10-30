import { exigirAdmin } from '@/lib/guard-admin';
import { verTareas } from '@/lib/tareas';
import { verRevisiones } from '@/lib/revisiones';
import { verDecisiones } from '@/lib/decisiones';
import { esDePlanificacion } from '@/lib/planificacion';

export const dynamic = 'force-dynamic';

/** Central → Lanzamiento → Planificación (30/10/2026, karc0): lo aparcado para DKitchen Venezuela y las pasarelas descartadas. */
export default async function Planificacion() {
  const jwt = await exigirAdmin();
  const [tareas, revisiones, decisiones] = await Promise.all([verTareas(jwt).catch(() => []), verRevisiones(jwt).catch(() => []), verDecisiones(jwt).catch(() => [])]);
  const t = (tareas ?? []).filter((x) => x.bloque === 'planificacion' && x.estado !== 'hecha');
  const r = (revisiones ?? []).filter((x) => esDePlanificacion(x.titulo, x.queCambio));
  const d = (decisiones ?? []).filter((x) => x.tema === 'planificacion' || (x.estado !== 'decidida' && esDePlanificacion(x.titulo, x.contexto)));
  const bloque = (titulo: string, filas: { id: string; titulo: string; texto: string | null }[]) => (
    <section className="rounded-[22px] border border-linea bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-vino">{titulo} <span className="text-ceniza">{filas.length}</span></h2>
      {filas.length === 0 ? <p className="mt-3 text-sm text-niebla">Nada aparcado aquí.</p> : (
        <ul className="mt-4 space-y-3">
          {filas.map((f) => (
            <li key={f.id} className="rounded-2xl bg-papel p-4">
              <p className="font-semibold">{f.titulo}</p>
              {f.texto && <p className="mt-1 whitespace-pre-line text-sm text-grafito">{f.texto.slice(0, 600)}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-6 text-carbon sm:p-6 lg:p-10">
      <header>
        <p className="etiqueta-dk text-vino">Lanzamiento</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">Planificación</h1>
        <p className="mt-2 max-w-2xl text-sm text-grafito">DKitchen opera hoy al 100 % en España y cobra con Stripe. Aquí queda aparcado, sin fecha, lo que se planificará aparte: la versión de DKitchen para Venezuela (equipo dk-vzl y su sistema de cobro) y las pasarelas o figuras descartadas. Nada de esto aparece en Mis tareas, Revisiones ni Decisiones.</p>
      </header>
      {bloque('Tareas', t.map((x) => ({ id: x.id, titulo: x.titulo, texto: x.detalle })))}
      {bloque('Decisiones', d.map((x) => ({ id: x.id, titulo: x.titulo, texto: x.contexto })))}
      {bloque('Revisiones', r.map((x) => ({ id: x.id, titulo: x.titulo, texto: x.queCambio })))}
    </div>
  );
}
