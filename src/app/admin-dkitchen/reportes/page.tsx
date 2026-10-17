import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { verReportes } from '@/lib/reportes';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const diaLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

/** Central → Reportes (17/10): auditorías, mapeos y cierres fechados. Fuente: docs/reportes del repo. */
export default async function Reportes() {
  await exigirAdmin();
  const lista = await verReportes();
  const dias = [...new Set(lista.map((r) => r.fecha))];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-oro/20 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Memoria del proyecto</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Reportes</h1>
        <p className="relative mt-2 max-w-xl text-sm text-white/70">Cada auditoría, mapeo y cierre de sesión, por fecha. Es lo mismo que hay en el repo y en tu escritorio: si el chat se borra, aquí sigue todo.</p>
        <p className="relative mt-5 font-display text-4xl font-semibold text-oro">{lista.length}<span className="ml-2 text-base font-normal text-white/60">{lista.length === 1 ? 'reporte' : 'reportes'}</span></p>
      </header>

      <GuiaZona titulo="Reportes" ancla="reportes"
        que="Claude deja aquí un reporte fechado al terminar cada fase de trabajo: qué ha comprobado, qué ha encontrado, qué ha cambiado y qué queda. Las tareas que salen de cada reporte están en Mis tareas."
        pasos={['Abre el reporte del día que quieras revisar.', 'Si algo no cuadra o quieres priorizarlo, déjale una nota a Claude en Mis tareas o en el Buzón.', 'Los reportes no se editan desde aquí: son el registro de lo que se hizo.']} />

      {!lista.length && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Todavía no hay reportes.</p>}

      {dias.map((d) => (
        <section key={d} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-vino first-letter:uppercase">{diaLargo.format(new Date(`${d}T12:00:00Z`))}</h2>
          <ul className="space-y-3">
            {lista.filter((r) => r.fecha === d).map((r) => (
              <li key={r.slug}>
                <Link href={`/admin-dkitchen/reportes/${r.slug}`} className="group block rounded-[22px] border border-linea bg-white p-5 transition hover:border-oro">
                  <p className="font-display text-xl font-semibold leading-snug group-hover:text-vino">{r.titulo}</p>
                  {r.resumen && <p className="mt-1.5 text-sm leading-relaxed text-niebla">{r.resumen}</p>}
                  <p className="mt-3 text-xs font-semibold text-vino">Leer el reporte →</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
