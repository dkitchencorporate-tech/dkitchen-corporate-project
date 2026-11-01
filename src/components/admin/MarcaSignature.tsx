import { pedirMarcaAction } from '@/app/admin-dkitchen/servicios/signature/marca-actions';
import { PASOS_MARCA, PREAJUSTES, slugMarca, type Marca } from '@/lib/marcas-signature';

/**
 * Marca Signature con el motor white label (0113, 02/11): una sola acción principal.
 * Sin marca: datos de marca ya rellenos (los manda el cliente en /mis-servicios) y «Preparar marca».
 * Con marca: checklist vivo de 4 pasos (repo, base, Vercel, subdominio) y enlace a la app.
 */
type Proyecto = { id: string; fase: string; negocio: string | null; nombre: string | null; datos?: Record<string, unknown> | null };
const AVISO: Record<string, [string, string]> = {
  lanzada: ['ok', 'Marca pedida: el motor ya está trabajando (unos 5 minutos).'],
  cola: ['ok', 'Marca pedida: entra en la próxima ejecución del motor (como mucho, 1 hora).'],
  ya: ['mal', 'Esta marca ya está en marcha o lista.'],
  pago: ['mal', 'La marca se prepara después del pago.'],
  permiso: ['mal', 'Solo dirección puede preparar marcas.'],
  nombre: ['mal', 'El nombre corto no vale o ya lo usa otra marca: solo minúsculas, números y guiones.'],
  base: ['mal', 'No se pudo pedir la marca. Inténtalo de nuevo.'],
  error: ['mal', 'Falta el proyecto.'],
};
const hora = (s: string) => new Date(s).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function MarcaSignature({ proyecto, marca, volver, aviso }: { proyecto: Proyecto; marca: Marca | null; volver: string; aviso?: string }) {
  const cliente = (proyecto.datos?.cliente ?? {}) as Record<string, unknown>;
  const txt = (k: string) => (typeof cliente[k] === 'string' ? (cliente[k] as string) : '');
  const prueba = (proyecto.negocio ?? '').startsWith('PRUEBA');
  const nombre = marca?.nombre ?? (txt('marca') || (proyecto.negocio ?? '').replace(/^PRUEBA\s*·\s*/i, '') || proyecto.nombre || '');
  const color = marca?.color ?? (/^#[0-9a-f]{6}$/i.test(txt('color_1')) ? txt('color_1') : '#6E0C2B');
  const slug = marca?.slug ?? slugMarca(nombre, prueba);
  const enviado = typeof cliente.enviado_en === 'string';
  const a = aviso ? AVISO[aviso] : null;
  const pagado = !['solicitud', 'descartado'].includes(proyecto.fase);
  const hechos = marca ? PASOS_MARCA.filter(([k]) => marca.pasos[k]?.estado === 'hecho').length : 0;

  return (
    <section className="overflow-hidden rounded-[22px] border border-linea bg-white" data-testid="marca-signature">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-noche px-4 py-3.5 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-9 w-9 shrink-0 rounded-xl ring-2 ring-white/15" style={{ background: color }} aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-oro">App con el motor</p>
            <p className="truncate font-display text-base font-bold">{nombre || 'Marca sin nombre'}</p>
          </div>
        </div>
        {marca && <span className={`rounded-full px-3 py-1 text-xs font-bold ${marca.estado === 'lista' ? 'bg-exito text-white' : marca.estado === 'error' ? 'bg-red-600 text-white' : 'bg-oro text-tinta'}`} data-testid="marca-estado">
          {marca.estado === 'lista' ? 'Lista' : marca.estado === 'error' ? 'Con error' : `${hechos}/4 · ${marca.estado === 'pedida' ? 'en cola' : 'en marcha'}`}
        </span>}
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {a && <p role="status" className={`rounded-2xl px-4 py-3 text-sm ${a[0] === 'ok' ? 'bg-exito/10 text-exito' : 'bg-red-50 text-red-700'}`}>{a[1]}</p>}

        {marca && (
          <ol className="grid gap-2 sm:grid-cols-2" aria-label="Checklist de la marca">
            {PASOS_MARCA.map(([k, t], i) => {
              const p = marca.pasos[k];
              const est = p?.estado === 'hecho' ? 'hecho' : p?.estado === 'en_curso' ? (marca.estado === 'error' ? 'fallo' : 'curso') : 'espera';
              return (
                <li key={k} className={`flex items-start gap-3 rounded-2xl border p-3 ${est === 'hecho' ? 'border-exito/30 bg-exito/5' : est === 'fallo' ? 'border-red-200 bg-red-50' : 'border-linea bg-papel/50'}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${est === 'hecho' ? 'bg-exito text-white' : est === 'fallo' ? 'bg-red-600 text-white' : est === 'curso' ? 'animate-pulse bg-oro text-tinta' : 'bg-linea text-niebla'}`}>
                    {est === 'hecho' ? '✓' : est === 'fallo' ? '!' : i + 1}
                  </span>
                  <span className="min-w-0 text-sm"><b className="block">{t}</b>
                    <span className="block truncate text-xs text-niebla">{p?.detalle ?? (est === 'curso' ? 'En marcha…' : 'Pendiente')}{p?.en ? ` · ${hora(p.en)}` : ''}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {marca?.estado === 'error' && marca.error && <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700"><b>Qué falló:</b> {marca.error}</p>}
        {marca?.estado === 'lista' && marca.url && (
          <div className="grid gap-2 sm:grid-cols-2">
            <a href={marca.url} target="_blank" rel="noopener" className="dk-btn flex min-h-[48px] items-center justify-center rounded-full bg-vino px-5 text-sm font-bold text-white" data-testid="marca-url">Abrir {marca.url.replace('https://', '')} ↗</a>
            {marca.repo && <a href={`https://github.com/${marca.repo}`} target="_blank" rel="noopener" className="flex min-h-[48px] items-center justify-center rounded-full border border-linea px-5 text-sm font-bold">Repo de la marca ↗</a>}
          </div>
        )}
        {marca?.estado === 'lista' && (
          <p className="text-xs text-niebla">Siguen a mano (diseño de autor): logo e icono, portada propia en <code>brands/{marca.slug}/huecos.tsx</code>, carta real en la semilla y acceso del dueño. Su dominio propio{txt('dominio') ? ` (${txt('dominio')})` : ''} se conecta después.</p>
        )}

        {(!marca || marca.estado === 'error') && (
          pagado ? (
            <form action={pedirMarcaAction} className="space-y-3">
              <input type="hidden" name="proyecto" value={proyecto.id} />
              <input type="hidden" name="volver" value={volver} />
              {!marca && <p className="text-sm text-niebla">{enviado ? 'El cliente ya mandó sus datos de marca: están rellenos abajo.' : 'El cliente aún no ha mandado sus datos de marca; puedes prepararla ya y ajustar el diseño después.'}</p>}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="text-xs font-semibold text-niebla">Nombre de la app
                  <input name="nombre" defaultValue={nombre} required minLength={2} maxLength={80} className="mt-1 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-base text-tinta outline-none focus:border-vino" />
                </label>
                <label className="text-xs font-semibold text-niebla">Color
                  <input name="color" type="color" defaultValue={color} className="mt-1 block h-[50px] w-full cursor-pointer rounded-2xl border border-linea bg-white sm:w-24" />
                </label>
              </div>
              <fieldset>
                <legend className="text-xs font-semibold text-niebla">Tipo de negocio</legend>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PREAJUSTES.map(([k, t]) => (
                    <label key={k} className="cursor-pointer">
                      <input type="radio" name="preajuste" value={k} defaultChecked={(marca?.preajuste ?? 'restaurante') === k} className="peer sr-only" />
                      <span className="flex min-h-[44px] items-center justify-center rounded-2xl border border-linea px-2 text-center text-sm font-semibold peer-checked:border-vino peer-checked:bg-vino/[0.06] peer-checked:text-vino">{t}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <details className="text-xs text-niebla">
                <summary className="cursor-pointer font-semibold">Subdominio y ciudad</summary>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label>Subdominio
                    <span className="mt-1 flex items-center rounded-2xl border border-linea bg-white pr-3 focus-within:border-vino">
                      <input name="slug" defaultValue={slug} readOnly={!!marca} pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" className="min-w-0 flex-1 rounded-2xl bg-transparent px-4 py-3 text-base text-tinta outline-none" />
                      <span className="shrink-0 text-xs">.dkitchencorporate.es</span>
                    </span>
                  </label>
                  <label>Ciudad<input name="ciudad" defaultValue={marca?.ciudad ?? txt('ciudad')} maxLength={60} className="mt-1 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-base text-tinta outline-none focus:border-vino" /></label>
                </div>
              </details>
              <button className="dk-btn min-h-[52px] w-full rounded-full bg-vino px-6 text-sm font-bold text-white hover:bg-vino-hondo" data-testid="marca-preparar">
                {marca ? 'Reintentar la marca' : 'Preparar marca con el motor'}
              </button>
              <p className="text-center text-[11px] text-niebla">Repo, base, app y subdominio en GitHub Actions (nunca en el portátil).</p>
            </form>
          ) : <p className="rounded-2xl bg-papel p-3 text-sm text-niebla">La marca se prepara en cuanto el cliente pague.</p>
        )}
        {marca && marca.estado !== 'lista' && marca.estado !== 'error' && <p className="text-xs text-niebla">Actualizado {hora(marca.actualizadoEn)}. Recarga para ver el avance.</p>}
      </div>
    </section>
  );
}
