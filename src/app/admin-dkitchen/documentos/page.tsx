import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { verDocumentos, enlaceDocumento, type FichaDocumento } from '@/lib/documentos';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

const kb = (b: number) => (b < 1024 ? `${b} B` : `${Math.round(b / 1024)} KB`);
const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

/**
 * Central → Documentos (0083): copia viva de toda la documentación del escritorio (dkitchen corporate),
 * por carpetas. La sube docs.cjs; si el escritorio se pierde, aquí sigue. Lo archivado, aparte.
 */
export default async function Documentos({ searchParams }: { searchParams: Promise<{ q?: string; archivo?: string }> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const todos = await verDocumentos(jwt, 'documento').catch(() => null);
  const q = (sp.q ?? '').trim().toLowerCase().slice(0, 80);
  const conArchivo = sp.archivo === '1';
  const vivos = todos?.filter((d) => !d.archivado).length ?? 0;
  const lista = (todos ?? []).filter((d) => (conArchivo || !d.archivado) && (!q || `${d.titulo} ${d.ruta}`.toLowerCase().includes(q)));
  const carpetas = [...new Set(lista.map((d) => d.carpeta || 'Raíz'))];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-vino/50 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Biblioteca</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Documentos</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-white/70">Toda la documentación del proyecto (ventas, publicar, Antigravity, referencia, estado, bitácora…), copiada del escritorio. Sin claves ni datos personales.</p>
        <p className="relative mt-5 font-display text-4xl font-semibold text-oro">{vivos}<span className="ml-2 text-base font-normal text-white/60">vigentes · {(todos?.length ?? 0) - vivos} archivados</span></p>
      </header>

      <GuiaZona titulo="Documentos" ancla="documentos"
        que="Copia de los documentos del escritorio, por carpeta. Claude la actualiza al cerrar cada tarea. Los reportes fechados están en Reportes."
        pasos={['Busca por título o carpeta.', 'Abre un documento para leerlo entero.', 'Lo superado está en «Archivo» (marca «Ver también lo archivado»).']} />

      <form className="flex flex-wrap items-center gap-3 rounded-[22px] border border-linea bg-white p-4">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar: oferta, flyer, Signature…" maxLength={80} className="min-w-0 flex-1 rounded-xl border border-acero px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="archivo" value="1" defaultChecked={conArchivo} /> Ver también lo archivado</label>
        <button className="rounded-full bg-tinta px-5 py-2.5 text-sm font-semibold text-white">Buscar</button>
      </form>

      {!todos && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudieron leer los documentos.</p>}
      {todos && !lista.length && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Nada con esa búsqueda.</p>}

      {/* 18/10 noche (karc0: «en Documentos no hay casi nada de lo que hemos hecho»): lo último que ha cambiado, delante */}
      {!q && lista.length > 0 && (
        <section className="rounded-[24px] border-2 border-oro/60 bg-white">
          <p className="flex items-center justify-between gap-3 p-5 pb-3">
            <span className="font-display text-lg font-semibold">Actualizado recientemente</span>
            <Link href="/admin-dkitchen/reportes" className="text-xs font-semibold text-vino underline">Reportes de cada sesión →</Link>
          </p>
          <ul className="divide-y divide-linea border-t border-linea">
            {[...lista].sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn)).slice(0, 12).map((d) => <Fila key={'r-' + d.ruta} d={d} />)}
          </ul>
        </section>
      )}

      {carpetas.map((c) => {
        const docs = lista.filter((d) => (d.carpeta || 'Raíz') === c);
        return (
          <details key={c} open={!!q || carpetas.length <= 3} className="group rounded-[24px] border border-linea bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
              <span className="min-w-0 break-words font-display text-lg font-semibold">{c}</span>
              <span className="shrink-0 rounded-full bg-papel px-3 py-1 text-xs font-semibold text-vino">{docs.length}</span>
            </summary>
            <ul className="divide-y divide-linea border-t border-linea">
              {docs.map((d) => <Fila key={d.ruta} d={d} />)}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

function Fila({ d }: { d: FichaDocumento }) {
  return (
    <li>
      <Link href={enlaceDocumento(d.ruta)} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-papel">
        <span className="min-w-0 flex-1 break-words font-medium">{d.titulo}{d.archivado && <span className="ml-2 rounded-full bg-acero/40 px-2 py-0.5 text-[11px] font-semibold text-carbon">Archivado</span>}</span>
        <span className="text-xs text-niebla">{kb(d.bytes)} · {dia.format(new Date(d.actualizadoEn))}</span>
      </Link>
    </li>
  );
}
