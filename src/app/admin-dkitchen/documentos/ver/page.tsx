import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exigirAdmin } from '@/lib/guard-admin';
import { verDocumento, verDocumentos, base, enlaceDocumento } from '@/lib/documentos';

export const dynamic = 'force-dynamic';

const diaLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

/** Visor de un reporte o documento de la base (0083). Markdown sin HTML crudo; .txt tal cual. */
export default async function VerDocumento({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const jwt = await exigirAdmin();
  const { r } = await searchParams;
  const d = r ? await verDocumento(jwt, r).catch(() => null) : null;
  if (!d) notFound();
  // 19/10: si esta copia del escritorio es también un reporte, se dice y se enlaza (no hay dos verdades).
  const reporte = d.tipo === 'documento' ? (await verDocumentos(jwt, 'reporte').catch(() => [])).find((x) => base(x.ruta) === base(d.ruta)) : undefined;
  const esTexto = /\.txt$/i.test(d.ruta);
  const cuerpo = esTexto ? d.contenido : d.contenido.replace(/^﻿?# .*\r?\n/, '');
  const volver = d.tipo === 'reporte' ? { href: '/admin-dkitchen/reportes', txt: '← Todos los reportes' } : { href: '/admin-dkitchen/documentos', txt: '← Todos los documentos' };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <Link href={volver.href} className="text-sm font-medium text-vino">{volver.txt}</Link>
      <header className="rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-oro first-letter:uppercase">
          {d.fecha ? diaLargo.format(new Date(`${d.fecha}T12:00:00Z`)) : d.carpeta || 'Documento'}{d.archivado ? ' · archivado' : ''}
        </p>
        <h1 className="font-display mt-2 break-words text-3xl font-semibold leading-tight md:text-4xl">{d.titulo}</h1>
        <p className="mt-3 break-all text-xs text-white/50">{d.tipo === 'documento' ? `Escritorio: dkitchen corporate/${d.ruta}` : `Reporte: ${d.ruta}`}</p>
      </header>
      {reporte && (
        <Link href={enlaceDocumento(reporte.ruta)} className="block rounded-[22px] border-2 border-oro/60 bg-white p-4 text-sm hover:border-oro">
          Esta es la copia del escritorio. Su reporte, con la clase, si está vigente y las tareas que salen de él, está en <span className="font-semibold text-vino underline">Reportes → {reporte.titulo}</span>.
        </Link>
      )}
      {esTexto ? (
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[28px] border border-linea bg-white p-5 font-sans text-sm leading-relaxed sm:p-8">{cuerpo}</pre>
      ) : (
        <article className="prose prose-sm max-w-none overflow-hidden break-words rounded-[28px] border border-linea bg-white p-5 sm:prose-base sm:p-8 prose-headings:font-display prose-headings:text-carbon prose-h2:mt-10 prose-h2:border-t prose-h2:border-linea prose-h2:pt-6 prose-a:text-vino prose-strong:text-carbon prose-blockquote:border-oro prose-blockquote:text-niebla prose-th:bg-papel prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:align-top prose-table:text-[13px] prose-pre:whitespace-pre-wrap">
          <ReactMarkdown remarkPlugins={[remarkGfm]}
            components={{ table: ({ children }) => <div className="-mx-1 overflow-x-auto"><table>{children}</table></div> }}>
            {cuerpo}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
