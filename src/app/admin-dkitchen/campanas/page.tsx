import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import GuiaZona from '@/components/admin/GuiaZona';
import { guardarQrCampanaAction, estadoContactoAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * QR de campaña y contactos (0071, karc0 12/10): los QR del flyer y de la tarjeta
 * apuntan a dkitchencorporate.es/q/<código>. Aquí se ve qué rinde cada uno
 * (escaneos, clics en la botonera, formularios y saltos a WhatsApp) y se cambia
 * su destino sin reimprimir. Debajo, los contactos que llegan antes de WhatsApp.
 */
type Qr = { codigo: string; nombre: string; destino: string; activo: boolean; escaneos: string; escaneos_7d: string; clics: string; formularios: string; whatsapp: string; ultimo: string | null };
type Clic = { detalle: string | null; total: string };
type Contacto = { id: string; origen: string; nombre: string; negocio: string | null; tipo_negocio: string; localidad: string | null; interes: string; consulta: string; franja: string | null; estado: string; creado_en: string };

const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const fecha = (s: string) => new Date(s).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const INTERES: Record<string, string> = { carta: 'Carta QR', signature: 'Signature', experience: 'Experience', no_se: 'No lo sabe' };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '—');

export default async function Campanas() {
  const jwt = await exigirAdmin();
  const { qrs, clics, contactos } = await comoCliente(jwt, async (c) => {
    const qrs = (await c.query<Qr>('SELECT * FROM dk.admin_qr_campanas()')).rows;
    const clics: Record<string, Clic[]> = {};
    for (const q of qrs) clics[q.codigo] = (await c.query<Clic>('SELECT * FROM dk.admin_qr_campana_clics($1)', [q.codigo])).rows;
    const contactos = (await c.query<Contacto>('SELECT * FROM dk.admin_contactos_web(100)')).rows;
    return { qrs, clics, contactos };
  });
  const total = (k: keyof Qr) => qrs.reduce((t, q) => t + Number(q[k] ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Campañas</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">QR de campaña y contactos</h1>
        <p className="mt-1 text-sm text-niebla">Cada QR impreso apunta a dkitchencorporate.es/q/código. Su destino se cambia aquí sin reimprimir.</p>
      </div>

      <GuiaZona titulo="Campañas" ancla="campanas"
        que="Lo que rinde cada QR del flyer y de la tarjeta, y los contactos que llegan antes de WhatsApp."
        pasos={['Mira escaneos, clics y formularios de cada QR.', 'Cambia el destino de un QR sin reimprimir.', 'Marca cada contacto como atendido cuando le hayas escrito.']} />

      <div className="grid gap-3 sm:grid-cols-4">
        {([['Escaneos', total('escaneos')], ['Clics en botoneras', total('clics')], ['Formularios', total('formularios')], ['Contactos sin atender', contactos.filter((x) => x.estado === 'nuevo').length]] as [string, number][]).map(([t, n]) => (
          <div key={t} className={tarjeta}><p className="text-xs text-niebla">{t}</p><p className="font-display mt-1 text-3xl font-semibold">{n}</p></div>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">QR de campaña</h2>
        {qrs.map((q) => (
          <div key={q.codigo} className={tarjeta}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{q.nombre} <span className="ml-1 rounded bg-crema px-2 py-0.5 font-mono text-xs">/q/{q.codigo}</span>{!q.activo && <span className="ml-2 text-xs font-semibold text-vino">APAGADO</span>}</p>
              <p className="text-xs text-niebla">{q.ultimo ? `Último movimiento: ${fecha(q.ultimo)}` : 'Sin movimiento todavía'}</p>
            </div>
            <p className="mt-2 text-sm text-niebla">
              <strong className="text-tinta">{q.escaneos}</strong> escaneos ({q.escaneos_7d} en 7 días) · <strong className="text-tinta">{q.clics}</strong> clics · <strong className="text-tinta">{q.formularios}</strong> formularios ({pct(Number(q.formularios), Number(q.escaneos))} de los escaneos) · <strong className="text-tinta">{q.whatsapp}</strong> a WhatsApp
            </p>
            {clics[q.codigo]?.length > 0 && (
              <p className="mt-1 text-xs text-ceniza">Botones: {clics[q.codigo].map((c) => `${c.detalle ?? '—'} (${c.total})`).join(' · ')}</p>
            )}
            <form action={guardarQrCampanaAction} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto_auto] lg:items-center [&>input]:min-w-0">
              <input type="hidden" name="codigo" value={q.codigo} />
              <input name="nombre" defaultValue={q.nombre} className="rounded-xl border border-linea px-3 py-2 text-sm" aria-label="Nombre" />
              <input name="destino" defaultValue={q.destino} className="rounded-xl border border-linea px-3 py-2 font-mono text-xs" aria-label="Destino" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="activo" value="si" defaultChecked={q.activo} /> Activo</label>
              <button className="rounded-full bg-vino px-4 py-2 text-sm font-semibold text-white">Guardar</button>
            </form>
          </div>
        ))}
        <details className={tarjeta}>
          <summary className="cursor-pointer font-semibold">Crear un QR nuevo</summary>
          <form action={guardarQrCampanaAction} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto] [&>input]:min-w-0">
            <input name="codigo" required placeholder="código (p. ej. t-carta)" className="rounded-xl border border-linea px-3 py-2 font-mono text-sm" />
            <input name="nombre" required placeholder="Nombre (p. ej. Tarjeta · Carta QR)" className="rounded-xl border border-linea px-3 py-2 text-sm" />
            <input name="destino" required placeholder="/demos/carta?utm_source=tarjeta" className="rounded-xl border border-linea px-3 py-2 font-mono text-xs" />
            <input type="hidden" name="activo" value="si" />
            <button className="rounded-full bg-vino px-4 py-2 text-sm font-semibold text-white">Crear</button>
          </form>
          <p className="mt-2 text-xs text-ceniza">El QR que se imprime es https://dkitchencorporate.es/q/código. Para el formulario de WhatsApp usa /contacto?i=carta (o signature, experience).</p>
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contactos antes de WhatsApp</h2>
        {contactos.length === 0 && <p className={`${tarjeta} text-sm text-niebla`}>Todavía no hay contactos.</p>}
        {contactos.map((x) => (
          <div key={x.id} className={`${tarjeta} ${x.estado === 'nuevo' ? 'border-vino/40' : ''}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{x.nombre}{x.negocio ? ` · ${x.negocio}` : ''} <span className="text-sm font-normal text-niebla">({x.tipo_negocio}{x.localidad ? `, ${x.localidad}` : ''})</span></p>
              <p className="text-xs text-niebla">{fecha(x.creado_en)} · Ref. {x.id.slice(0, 6).toUpperCase()} · origen {x.origen}</p>
            </div>
            <p className="mt-1 text-sm"><strong>{INTERES[x.interes] ?? x.interes}</strong> · {x.consulta}{x.franja ? ` · prefiere: ${x.franja.replace('_', ' ')}` : ''}</p>
            <form action={estadoContactoAction} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={x.id} />
              {(['nuevo', 'atendido', 'descartado'] as const).map((e) => (
                <button key={e} name="estado" value={e} className={`rounded-full px-3 py-1 text-xs font-semibold ${x.estado === e ? 'bg-tinta text-white' : 'border border-linea'}`}>{e}</button>
              ))}
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
