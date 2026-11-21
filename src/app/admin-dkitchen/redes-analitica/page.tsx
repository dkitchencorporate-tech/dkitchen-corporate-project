import { redirect } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { esComercialActual } from '@/lib/rol-central';
import { listarRedesAnalitica } from '@/lib/redes-analitica';
import GuiaZona from '@/components/admin/GuiaZona';
import RedesAnaliticaVista from '@/components/admin/RedesAnaliticaVista';
import {
  actualizarEntradaRedAction,
  borrarEntradaRedAction,
  crearEntradaRedAction,
} from './actions';

export const dynamic = 'force-dynamic';

const MENSAJES_OK: Record<string, string> = {
  creado: 'Capturas registradas. Agente DK las revisará para fijar análisis y rumbo diario.',
  actualizado: 'Análisis y rumbo diario actualizados.',
  borrado: 'Entrada eliminada.',
};

const MENSAJES_ERROR: Record<string, string> = {
  red: 'Selecciona una red válida.',
  titulo: 'Escribe un título breve de entre 2 y 160 caracteres.',
  vacio: 'Añade al menos una captura de pantalla o una nota.',
  muchos: 'Has registrado demasiadas entradas en una hora. Espera un poco.',
  datos: 'Datos no válidos o falta confirmar el borrado.',
  base: 'No se pudo guardar en la base. Inténtalo de nuevo.',
};

function fechaHoyMadrid(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '11';
  const d = parts.find((p) => p.type === 'day')?.value ?? '21';
  return `${y}-${m}-${d}`;
}

/** Central → Ventas → Analítica de redes (0123): solo Dirección. */
export default async function RedesAnaliticaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const jwt = await exigirAdmin();
  if (await esComercialActual(jwt)) redirect('/admin-dkitchen/inicio');

  const sp = await searchParams;
  const entradas = await listarRedesAnalitica(jwt, null, 80).catch(() => []);
  const pendientes = entradas.filter((e) => e.estado === 'pendiente_analisis').length;
  const ultimoRumbo = entradas.find((e) => e.rumboDiario)?.rumboDiario ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-vino/45 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Dirección</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Analítica de redes</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-white/75">
          Bitácora diaria de Instagram, Facebook y TikTok: capturas reales de rendimiento, lectura técnica de Agente DK y rumbo diario para ajustar ganchos, horarios y formatos.
        </p>
        <dl className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Entradas totales</dt>
            <dd className="font-display mt-1 text-2xl font-semibold text-oro">{entradas.length}</dd>
          </div>
          <div className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Pendientes de análisis</dt>
            <dd className="font-display mt-1 text-2xl font-semibold text-white">{pendientes}</dd>
          </div>
          <div className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/60">Rumbo activo</dt>
            <dd className="mt-1 line-clamp-2 text-xs text-white/85">{ultimoRumbo ?? 'Sin rumbo activo todavía.'}</dd>
          </div>
        </dl>
      </header>

      <GuiaZona
        titulo="Analítica de redes"
        ancla="redes-analitica"
        que="Espacio privado de Dirección para centralizar capturas de alcance, retención, reproducciones y conversiones de Instagram, Facebook y TikTok, junto al análisis y el rumbo diario."
        pasos={[
          'Elige la red, la fecha del corte y pon un título corto para identificar la tanda o pieza.',
          'Adjunta hasta 10 capturas del panel profesional (puedes pegarlas con Ctrl+V) y añade tus notas.',
          'Agente DK revisará las capturas para dejar el análisis y el rumbo del día siguiente.',
        ]}
      />

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3.5 text-sm text-exito">{MENSAJES_OK[sp.ok] ?? 'Guardado.'}</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3.5 text-sm text-red-700">{MENSAJES_ERROR[sp.e] ?? 'No se pudo completar la acción.'}</p>}

      <RedesAnaliticaVista
        entradas={entradas}
        fechaHoy={fechaHoyMadrid()}
        ok={sp.ok}
        crearAction={crearEntradaRedAction}
        actualizarAction={actualizarEntradaRedAction}
        borrarAction={borrarEntradaRedAction}
      />
    </div>
  );
}
