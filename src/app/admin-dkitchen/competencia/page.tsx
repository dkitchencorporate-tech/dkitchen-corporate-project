import { exigirAdmin } from '@/lib/guard-admin';
import { verCompetidores, CATEGORIAS, ESTADOS, type Competidor } from '@/lib/competencia';
import GuiaZona from '@/components/admin/GuiaZona';
import { nuevoCompetidorAction, notaCompetidorAction } from './actions';

export const dynamic = 'force-dynamic';

const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
const OK: Record<string, string> = {
  nuevo: 'Añadido. Claude lo verá al empezar su próxima sesión y lo auditará.', nota: 'Nota guardada.',
  reauditar: 'Nota guardada y ficha devuelta a «Por auditar»: Claude la revisará de nuevo.',
};
const ERR: Record<string, string> = {
  nombre: 'Escribe el nombre del competidor.', existe: 'Ese competidor ya está en la lista.',
  web: 'La web no parece válida (p. ej. competidor.es).', base: 'No se pudo guardar. Inténtalo de nuevo.',
};
const AMENAZA: Record<string, string> = { alta: 'bg-red-600 text-white', media: 'bg-oro text-noche', baja: 'bg-acero/40 text-carbon' };

/** Central → Competencia (0082): base viva para ir por delante (no para igualar) y prospectar a sus clientes. */
export default async function Competencia({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const lista = await verCompetidores(jwt).catch(() => null);
  const porAuditar = lista?.filter((c) => c.estado === 'por_auditar').length ?? 0;
  const altas = lista?.filter((c) => c.amenaza === 'alta' && c.estado !== 'descartado').length ?? 0;
  const cifras: [string, number][] = [['En la lista', lista?.length ?? 0], ['Por auditar', porAuditar], ['Amenaza alta', altas]];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-vino/50 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Central · Inteligencia</p>
        <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Competencia</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-white/70">No es para igualarlos: es para ir por delante. Qué venden, qué les funciona, a quién tienen de cliente (para prospectarlos) y qué hacemos mejor.</p>
        <dl className="relative mt-6 grid grid-cols-3 gap-3 text-center">
          {cifras.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/[0.06] px-2 py-3 ring-1 ring-white/10">
              <dd className="font-display text-3xl font-semibold text-oro">{v}</dd>
              <dt className="mt-0.5 text-[11px] uppercase tracking-[0.15em] text-white/60">{k}</dt>
            </div>
          ))}
        </dl>
      </header>

      {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">{OK[sp.ok] ?? 'Guardado.'}</p>}
      {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERR[sp.e] ?? 'No se pudo guardar.'}</p>}

      <GuiaZona titulo="Competencia" ancla="competencia"
        que="La base de competidores de DKitchen. Tú añades los que veas (un anuncio, una web, un nombre); Claude los audita con el mismo método y rellena la ficha. Cada auditoría nueva sale también en Reportes."
        pasos={['Abajo, en «Añadir competidor», escribe el nombre y, si la tienes, la web. En la nota cuenta dónde lo viste (p. ej. «anuncio en Instagram, captura en el escritorio»).', 'Claude lo verá al empezar su sesión, lo auditará y lo pasará a «Auditado» o «En vigilancia».', 'Si un competidor cambia (precio nuevo, anuncio nuevo), deja una nota y pulsa «Guardar y volver a auditar».']}
        ojo={['Solo datos públicos de empresas. Los «clientes visibles» son negocios que ellos enseñan en su web o sus redes; se usan para prospectar con nuestro método, nunca para copiar sus datos.']} />

      {!lista && <p className="rounded-[22px] border border-linea bg-white p-8 text-center text-sm text-niebla">No se pudo leer la lista.</p>}

      <ul className="space-y-4">{lista?.map((c) => <Ficha key={c.id} c={c} />)}</ul>

      <section id="nuevo" className="scroll-mt-6 rounded-[28px] border border-oro/40 bg-papel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Para Claude</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Añadir competidor</h2>
        <form action={nuevoCompetidorAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Nombre
            <input name="nombre" required minLength={2} maxLength={120} className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta" />
          </label>
          <label className="block text-sm">Web (opcional)
            <input name="web" maxLength={300} inputMode="url" placeholder="competidor.es" className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta" />
          </label>
          <label className="block text-sm sm:col-span-2">Dónde lo viste y qué te llamó la atención (opcional)
            <textarea name="nota" maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta" />
          </label>
          <div className="sm:col-span-2"><button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Añadir para auditar</button></div>
        </form>
      </section>
    </div>
  );
}

function Campo({ titulo, texto, destacado }: { titulo: string; texto: string | null; destacado?: boolean }) {
  if (!texto) return null;
  return (
    <div className={destacado ? 'rounded-2xl border-l-[3px] border-oro bg-papel px-4 py-3' : ''}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">{titulo}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{texto}</p>
    </div>
  );
}

function Ficha({ c }: { c: Competidor }) {
  const fuentes = (c.fuentes ?? '').split(/\s+/).filter((u) => /^https?:\/\//.test(u));
  const tamano = c.tamano === 'mayor' ? 'Más grande' : c.tamano === 'menor' ? 'Más pequeño' : c.tamano ? 'Similar' : null;
  return (
    <li id={`c-${c.id}`} className={`scroll-mt-6 rounded-[24px] bg-white ${c.estado === 'por_auditar' ? 'border-2 border-dashed border-oro' : 'border border-linea'}`}>
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-start gap-3 p-5">
          <span className="min-w-0 flex-1">
            <span className="font-display block break-words text-xl font-semibold">{c.nombre}</span>
            {c.propuesta && <span className="mt-1 block text-sm text-niebla">{c.propuesta}</span>}
            <span className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-papel px-2.5 py-0.5 font-medium">{CATEGORIAS[c.categoria] ?? c.categoria}</span>
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${c.estado === 'por_auditar' ? 'bg-oro/20 text-vino' : 'bg-tinta/10 text-tinta'}`}>{ESTADOS[c.estado]}</span>
              {c.amenaza && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${AMENAZA[c.amenaza]}`}>Amenaza {c.amenaza}</span>}
              {c.compite_con && <span className="rounded-full border border-linea px-2.5 py-0.5">Compite con: {c.compite_con}</span>}
              {tamano && <span className="rounded-full border border-linea px-2.5 py-0.5">{tamano}</span>}
              {c.origen === 'karc0' && <span className="rounded-full border border-vino/30 px-2.5 py-0.5 text-vino">Lo trajiste tú</span>}
            </span>
          </span>
          <span className="text-xs text-niebla group-open:hidden">Ver ficha</span>
        </summary>
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          {c.web && <p className="text-sm md:col-span-2"><a href={c.web} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-medium text-vino underline">{c.web}</a>{c.zona ? <span className="text-niebla"> · {c.zona}</span> : null}</p>}
          <Campo titulo="Precio" texto={c.precio} />
          <Campo titulo="Lo que les funciona" texto={c.les_funciona} />
          <Campo titulo="Dónde nos ganan" texto={c.fuerte} />
          <Campo titulo="Dónde les ganamos" texto={c.debil} />
          <Campo titulo="Qué hacemos nosotros (mejor)" texto={c.copiar} destacado />
          <Campo titulo="Clientes visibles (para prospectar)" texto={c.clientes} destacado />
          {fuentes.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-vino">Fuentes</p>
              <ul className="mt-1 space-y-0.5 text-xs">{fuentes.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-niebla underline">{u}</a></li>)}</ul>
            </div>
          )}
          <p className="text-xs text-ceniza md:col-span-2">{c.auditado_en ? `Auditado el ${dia.format(new Date(c.auditado_en))}` : 'Aún sin auditar'} · en la lista desde el {dia.format(new Date(c.creado_en))}</p>
          <form action={notaCompetidorAction} className="space-y-2 md:col-span-2">
            <input type="hidden" name="id" value={c.id} />
            <label className="block text-sm">Tu nota para Claude
              <textarea name="nota" maxLength={2000} rows={2} defaultValue={c.nota_karc0 ?? ''} className="mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full border border-acero px-4 py-2.5 text-sm font-medium">Guardar nota</button>
              <button name="reauditar" value="1" className="rounded-full bg-vino px-4 py-2.5 text-sm font-semibold text-white">Guardar y volver a auditar</button>
            </div>
          </form>
        </div>
      </details>
    </li>
  );
}
