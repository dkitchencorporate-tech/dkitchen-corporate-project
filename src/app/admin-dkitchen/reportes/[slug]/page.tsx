import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exigirAdmin } from '@/lib/guard-admin';
import { verReporte } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

const diaLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

/** Un reporte de docs/reportes, tal cual está en el repo (sin HTML crudo: react-markdown lo ignora). */
export default async function VerReporte({ params }: { params: Promise<{ slug: string }> }) {
  await exigirAdmin();
  const { slug } = await params;
  const r = await verReporte(slug);
  if (!r) notFound();
  const cuerpo = r.texto.replace(/^# .*\r?\n/, '');

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <Link href="/admin-dkitchen/reportes" className="text-sm font-medium text-vino">← Todos los reportes</Link>
      <header className="rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-oro first-letter:uppercase">{diaLargo.format(new Date(`${r.fecha}T12:00:00Z`))}</p>
        <h1 className="font-display mt-2 break-words text-3xl font-semibold leading-tight md:text-4xl">{r.titulo}</h1>
      </header>
      <article className="prose prose-sm max-w-none overflow-hidden rounded-[28px] border border-linea bg-white p-5 sm:prose-base sm:p-8 prose-headings:font-display prose-headings:text-carbon prose-h2:mt-10 prose-h2:border-t prose-h2:border-linea prose-h2:pt-6 prose-a:text-vino prose-strong:text-carbon prose-blockquote:border-oro prose-blockquote:text-niebla prose-th:bg-papel prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:align-top prose-table:text-[13px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}
          components={{ table: ({ children }) => <div className="-mx-1 overflow-x-auto"><table>{children}</table></div> }}>
          {cuerpo}
        </ReactMarkdown>
      </article>
    </div>
  );
}
