import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { clavePuerta, euros, leerLanding, urlAltaCobro } from '@/lib/entradas';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';
import { cambiarEstadoAction, conectarCobroAction, guardarEventoAction, nuevaClavePuertaAction } from './actions';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

/**
 * Central → Entradas (0067, 09/10/2026): eventos de Experience con venta de entradas.
 * Flujo: crear evento → crear cuenta de cobro del local y mandarle el enlace de alta → activar puerta →
 * poner en venta → el local comparte /e/<slug> → la puerta escanea en /e/<slug>/puerta.
 */
type Evento = {
  id: string; slug: string; local_nombre: string; titulo: string; fecha: string; precio_centimos: number; aforo: number;
  vendidas: number; usadas: number; ingresos_centimos: string; estado: string; stripe_cuenta: string | null; tiene_clave: boolean;
  descripcion: string; lugar: string; max_por_compra: number; imagen_url: string | null;
  landing: unknown; muestra: boolean; formato: string | null;
};
type Entrada = { codigo: string; numero: number; nombre: string; email: string; estado: string; usada_en: string | null; creado_en: string };

const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const input = 'w-full rounded-xl border border-acero bg-white px-3 py-2.5 text-sm';
const boton = 'rounded-full bg-noche px-4 py-2 text-sm font-semibold text-white';
const SITIO = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const MENSAJES: Record<string, string> = {
  guardado: 'Evento guardado.', cuenta: 'Cuenta de cobro creada: manda al local el enlace de alta.', estado: 'Estado cambiado.', clave: 'Puerta activada.',
  datos: 'Datos no válidos.', guardar: 'No se pudo guardar: revisa el slug (único, minúsculas y guiones), la fecha, el precio y el aforo.',
  connect: 'No se pudo crear la cuenta en Stripe. ¿Está activado Stripe Connect en el panel de Stripe?',
  cobro: 'El local aún no ha terminado su alta en Stripe: no se puede abrir la venta.', estado_error: 'No se pudo cambiar el estado.',
};
const aLocal = (s: string) => new Date(s).toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 16).replace(' ', 'T');

function Formulario({ e }: { e?: Evento }) {
  const l = leerLanding(e?.landing);
  const area = (filas: string[]) => filas.join('\n');
  return (
    <form action={guardarEventoAction} className="grid gap-3 sm:grid-cols-2">
      {e && <input type="hidden" name="id" value={e.id} />}
      <label className="grid gap-1 text-sm">Local<input name="local_nombre" required defaultValue={e?.local_nombre} className={input} /></label>
      <label className="grid gap-1 text-sm">Título del evento<input name="titulo" required defaultValue={e?.titulo} className={input} /></label>
      {!e && <label className="grid gap-1 text-sm">Dirección web (slug)<input name="slug" required pattern="[a-z0-9-]{3,60}" placeholder="cata-vinos-bar-pepe-nov" className={input} /></label>}
      <label className="grid gap-1 text-sm">Fecha y hora (Madrid)<input type="datetime-local" name="fecha" required defaultValue={e ? aLocal(e.fecha) : undefined} className={input} /></label>
      <label className="grid gap-1 text-sm">Precio por entrada (€, IVA incluido)<input name="precio" required inputMode="decimal" defaultValue={e ? String(e.precio_centimos / 100) : undefined} className={input} /></label>
      <label className="grid gap-1 text-sm">Aforo<input type="number" name="aforo" min={1} max={5000} required defaultValue={e?.aforo} className={input} /></label>
      <label className="grid gap-1 text-sm">Máximo por compra<input type="number" name="max_por_compra" min={1} max={20} defaultValue={e?.max_por_compra ?? 6} className={input} /></label>
      <label className="grid gap-1 text-sm">Lugar<input name="lugar" defaultValue={e?.lugar} className={input} /></label>
      <label className="grid gap-1 text-sm sm:col-span-2">Imagen (URL https de Vercel Blob, o /images/experience/experience-&lt;formato&gt;-16x9.webp)<input name="imagen_url" defaultValue={e?.imagen_url ?? ''} className={input} /></label>
      <label className="grid gap-1 text-sm">Formato
        <select name="formato" defaultValue={e?.formato ?? ''} className={input}>
          <option value="">Sin formato</option>
          {FORMATOS_EXPERIENCE.map((f) => <option key={f.slug} value={f.slug}>{f.nombre}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="muestra" value="1" defaultChecked={!!e?.muestra} /> Evento de muestra (nunca vende)</label>
      <label className="grid gap-1 text-sm sm:col-span-2">Descripción corta (si no hay historia)<textarea name="descripcion" rows={2} defaultValue={e?.descripcion} className={input} /></label>
      <fieldset className="grid gap-3 rounded-2xl border border-oro/40 bg-papel p-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-vino">Landing de venta (lo que ve el comensal)</legend>
        <label className="grid gap-1 text-sm sm:col-span-2">Subtítulo (fecha, hora, plazas…)<input name="l_subtitulo" maxLength={160} defaultValue={l.subtitulo} className={input} /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Historia del evento (un párrafo por bloque, separados por una línea en blanco)<textarea name="l_historia" rows={4} maxLength={3000} defaultValue={l.historia.join('\n\n')} className={input} /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Menú: una línea por pase · «Pase | Plato | Bebida»<textarea name="l_menu" rows={5} defaultValue={area(l.menu.map((m) => `${m.pase} | ${m.plato} | ${m.bebida}`))} className={input} /></label>
        <label className="grid gap-1 text-sm">Programa: «Hora | Qué pasa»<textarea name="l_programa" rows={4} defaultValue={area(l.programa.map((p) => `${p.hora} | ${p.que}`))} className={input} /></label>
        <label className="grid gap-1 text-sm">La entrada incluye (una por línea)<textarea name="l_incluye" rows={4} defaultValue={area(l.incluye)} className={input} /></label>
        <label className="grid gap-1 text-sm">Anfitrión o chef<input name="l_anf_nombre" maxLength={80} defaultValue={l.anfitrion?.nombre ?? ''} className={input} /></label>
        <label className="grid gap-1 text-sm">Su papel<input name="l_anf_rol" maxLength={80} defaultValue={l.anfitrion?.rol ?? ''} className={input} /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Sobre el anfitrión<input name="l_anf_texto" maxLength={400} defaultValue={l.anfitrion?.texto ?? ''} className={input} /></label>
        <label className="grid gap-1 text-sm">Dirección<input name="l_direccion" maxLength={200} defaultValue={l.direccion} className={input} /></label>
        <label className="grid gap-1 text-sm">Enlace de Google Maps<input name="l_mapa" maxLength={400} defaultValue={l.mapa ?? ''} className={input} /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Preguntas: «Pregunta | Respuesta»<textarea name="l_faq" rows={3} defaultValue={area(l.faq.map((x) => `${x.p} | ${x.r}`))} className={input} /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Avisos (edad, alérgenos, aforo…)<input name="l_avisos" maxLength={400} defaultValue={l.avisos} className={input} /></label>
      </fieldset>
      <div className="sm:col-span-2"><button className={boton}>{e ? 'Guardar cambios' : 'Crear evento'}</button></div>
    </form>
  );
}

export default async function Entradas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const eventos = await comoCliente(jwt, async (c) => (await c.query<Evento>('SELECT * FROM dk.admin_eventos()')).rows).catch(() => null);
  const sel = eventos?.find((x) => x.id === q.ev);
  const entradas = sel ? await comoCliente(jwt, async (c) => (await c.query<Entrada>('SELECT * FROM dk.admin_entradas($1)', [sel.id])).rows).catch(() => []) : [];
  const aviso = q.ok ? MENSAJES[q.ok] : q.e ? MENSAJES[q.e] ?? MENSAJES.datos : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Entradas · Experience</h1>
        <p className="mt-1 text-sm text-pizarra">Eventos con venta de entradas. El dinero va directo a la cuenta de Stripe del local; DKitchen no cobra comisión.</p>
      </header>
      <GuiaZona titulo="Entradas" que="Venta de entradas de los eventos de Experience, cobrada directamente por el local." pasos={['Crea el evento.', 'Pulsa «Crear cuenta de cobro» y manda al local su enlace de alta (identidad y cuenta bancaria en Stripe).', 'Pulsa «Activar puerta» y pasa el enlace de puerta a quien controle el acceso.', 'Cuando el local termine su alta, pulsa «Abrir venta» y comparte la página del evento.']} ojo={['Requiere Stripe Connect activado en la cuenta de Stripe de DKitchen.']} />
      {aviso && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${q.ok ? 'bg-exito/10 text-exito' : 'bg-vino/10 text-vino'}`}>{aviso}</p>}

      {sel ? (
        <section className={tarjeta}>
          <Link href="/admin-dkitchen/entradas" className="text-sm text-vino">← Todos los eventos</Link>
          <h2 className="mt-2 text-xl font-semibold">{sel.titulo} · {sel.local_nombre}</h2>
          <p className="text-sm text-pizarra">{sel.vendidas}/{sel.aforo} vendidas · {sel.usadas} dentro · {euros(Number(sel.ingresos_centimos))} cobrados por el local · estado: <strong>{sel.estado}</strong></p>
          <ul className="mt-4 grid gap-2 text-sm">
            <li>Página pública: <a className="break-all text-vino underline" href={`/e/${sel.slug}`} target="_blank">{SITIO()}/e/{sel.slug}</a></li>
            {sel.stripe_cuenta && <li>Enlace de alta de cobro para el local: <span className="break-all font-mono text-xs">{urlAltaCobro(SITIO(), sel.stripe_cuenta, sel.slug)}</span></li>}
            {sel.tiene_clave && <li>Enlace de puerta (no lo publiques): <span className="break-all font-mono text-xs">{SITIO()}/e/{sel.slug}/puerta#k={clavePuerta(sel.id)}</span></li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {!sel.stripe_cuenta && (
              <form action={conectarCobroAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={sel.id} /><input type="hidden" name="local_nombre" value={sel.local_nombre} />
                <input name="email" type="email" placeholder="Correo del local (opcional)" className={input + ' w-64'} />
                <button className={boton}>Crear cuenta de cobro</button>
              </form>
            )}
            {!sel.tiene_clave && <form action={nuevaClavePuertaAction}><input type="hidden" name="id" value={sel.id} /><button className={boton}>Activar puerta</button></form>}
            {sel.estado !== 'venta' && (
              <form action={cambiarEstadoAction}><input type="hidden" name="id" value={sel.id} /><input type="hidden" name="estado" value="venta" /><input type="hidden" name="cuenta" value={sel.stripe_cuenta ?? ''} /><button className={boton}>Abrir venta</button></form>
            )}
            {sel.estado === 'venta' && (
              <form action={cambiarEstadoAction}><input type="hidden" name="id" value={sel.id} /><input type="hidden" name="estado" value="cerrado" /><button className={boton}>Cerrar venta</button></form>
            )}
          </div>
          <details className="mt-6"><summary className="cursor-pointer text-sm font-semibold">Editar evento</summary><div className="mt-4"><Formulario e={sel} /></div></details>
          <h3 className="mt-6 font-semibold">Entradas ({entradas.length})</h3>
          <ul className="mt-2 divide-y divide-linea text-sm">
            {entradas.map((x) => (
              <li key={x.codigo} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{x.nombre} · {x.email} · n.º {x.numero}</span>
                <span className={x.estado === 'usada' ? 'text-exito' : 'text-pizarra'}>{x.estado}{x.usada_en ? ` ${new Date(x.usada_en).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className={tarjeta}>
            <h2 className="font-semibold">Eventos</h2>
            {eventos === null && <p className="mt-2 text-sm text-vino">No se pudieron cargar los eventos.</p>}
            {eventos?.length === 0 && <p className="mt-2 text-sm text-pizarra">Aún no hay eventos.</p>}
            <ul className="mt-2 divide-y divide-linea">
              {eventos?.map((x) => (
                <li key={x.id}>
                  <Link href={`/admin-dkitchen/entradas?ev=${x.id}`} className="flex flex-wrap justify-between gap-2 py-3 hover:text-vino">
                    <span className="font-semibold">{x.titulo} · {x.local_nombre}</span>
                    <span className="text-sm text-pizarra">{new Date(x.fecha).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })} · {x.vendidas}/{x.aforo} · {x.estado}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className={tarjeta}><h2 className="mb-4 font-semibold">Nuevo evento</h2><Formulario /></section>
        </>
      )}
    </div>
  );
}
