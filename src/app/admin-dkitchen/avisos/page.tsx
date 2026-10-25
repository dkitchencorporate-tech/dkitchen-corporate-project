import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { avisosFallo } from '@/lib/admin-clientes';
import GuiaZona from '@/components/admin/GuiaZona';
import { estadoAvisoAction } from './actions';

export const dynamic = 'force-dynamic';

const fechaHora = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const ESTADO: Record<string, [string, string]> = {
  nuevo: ['Nuevo', 'bg-vino/10 text-vino'],
  en_curso: ['En curso', 'bg-amber-500/15 text-amber-700'],
  resuelto: ['Resuelto', 'bg-exito/15 text-exito'],
};

/** Avisos de fallo enviados desde cualquier pantalla de Central (0061). */
export default async function Avisos() {
  const jwt = await exigirAdmin();
  const avisos = await avisosFallo(jwt, 200).catch(() => null);
  const abiertos = avisos?.filter((a) => a.estado !== 'resuelto').length ?? 0;
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Avisos de fallo</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Avisos de fallo</h1>
        <p className="mt-1 text-sm text-niebla">{avisos ? `${abiertos} sin resolver · ${avisos.length} en total` : 'No se pudieron leer los avisos.'}</p>
      </header>
      <GuiaZona titulo="Avisos de fallo" ancla="avisos"
        que="Todo lo que se envía con el botón «Avisar de un fallo» (abajo a la derecha en cada pantalla). Llega también por correo y se revisa al empezar cada sesión de trabajo."
        pasos={['Si algo no funciona, ve a esa pantalla y pulsa «Avisar de un fallo»: la pantalla exacta se guarda sola.', 'Escribe qué intentabas hacer y qué ha pasado (con el nombre del cliente si lo hay).', 'Aquí ves si está nuevo, en curso o resuelto, con la nota de lo que se hizo.']} />
      {avisos && avisos.length === 0 && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">Ningún aviso todavía.</p>}
      <ul className="space-y-3">
        {avisos?.map((a) => (
          <li key={a.id} className="rounded-[22px] border border-linea bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={a.pantalla.startsWith('/') ? a.pantalla : '#'} className="font-mono text-xs text-niebla underline">{a.pantalla}</Link>
              <span className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${ESTADO[a.estado][1]}`}>{ESTADO[a.estado][0]}</span>
                <span className="text-ceniza">{fechaHora.format(new Date(a.creadoEn))}</span>
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{a.mensaje}</p>
            {a.nota && <p className="mt-2 rounded-xl bg-papel px-3 py-2 text-xs text-niebla">Nota: {a.nota}</p>}
            <form action={estadoAvisoAction} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <input type="hidden" name="id" value={a.id} />
              <input name="nota" maxLength={1000} placeholder="Nota (opcional)" className="min-w-0 flex-1 rounded-lg border border-acero bg-white px-3 py-1.5" />
              {(['nuevo', 'en_curso', 'resuelto'] as const).filter((e) => e !== a.estado).map((e) => (
                <button key={e} name="estado" value={e} className="rounded-full bg-papel px-3 py-1.5 font-semibold hover:bg-linea">Marcar {ESTADO[e][0].toLowerCase()}</button>
              ))}
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
