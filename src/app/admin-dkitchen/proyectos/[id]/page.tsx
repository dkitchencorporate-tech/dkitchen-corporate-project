import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirAdmin } from '@/lib/guard-admin';
import { fichaProyecto, nombreFase, textoFaseCliente, PRODUCTOS_PROYECTO } from '@/lib/proyectos';
import { avanzarFaseAction, anotarAction, guardarDatosAction } from '../actions';
import { listarClientesQr } from '@/lib/admin-clientes';
import GuiaZona from '@/components/admin/GuiaZona';

export const dynamic = 'force-dynamic';

/**
 * Ficha de un proyecto (0060, H13): fase con «Avanzar» y aviso opcional al
 * cliente, siguiente paso, notas, datos y fiscales, contrato, enlaces de
 * Stripe e historial completo.
 */
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const entrada = 'mt-1 w-full rounded-lg border border-acero bg-white px-3 py-2 text-sm focus:border-vino focus:outline-none';
const boton = 'rounded-full bg-vino px-5 py-2.5 text-sm font-bold text-white hover:bg-vino-hondo';
const fechaHora = (s: string) => new Date(s).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dia = (s: string) => new Date(s + 'T12:00:00Z').toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short' });
const TIPO: Record<string, string> = { alta: 'Alta', solicitud: 'Solicitud', pago: 'Pago', fase: 'Fase', nota: 'Nota', llamada: 'Llamada', correo: 'Correo', contrato: 'Contrato', datos: 'Datos' };
const AVISOS: Record<string, string> = { fase: 'Fase actualizada.', fase_aviso: 'Fase actualizada y cliente avisado por correo.', anotado: 'Apunte guardado.', datos: 'Datos guardados.', creado: 'Proyecto creado.' };
const ERRORES: Record<string, string> = { fase: 'Esa fase no vale para este producto.', correo: 'La fase se guardó, pero el correo al cliente no salió.', anotar: 'No se pudo guardar el apunte.', datos: 'No se pudieron guardar los datos (revisa el correo).' };
const STRIPE = 'https://dashboard.stripe.com';

/** Lo que nos contó, legible (fallo 5 del recorrido 114): sin claves crudas ni fechas ISO. */
const CLAVE: Record<string, string> = {
  pagina: 'Página desde la que escribió', interes: 'Le interesa', mensaje: 'Mensaje', negocio: 'Negocio', ciudad: 'Ciudad', locales: 'Locales',
  presupuesto: 'Presupuesto', plazo: 'Plazo', formato: 'Formato', fecha: 'Fecha', fecha_evento: 'Fecha del evento', personas: 'Personas',
  aforo: 'Aforo', horario: 'Horario', web: 'Web actual', instagram: 'Instagram', comercial: 'Comercial', origen: 'Origen', utm_source: 'Campaña (origen)',
  utm_medium: 'Campaña (medio)', utm_campaign: 'Campaña', telefono: 'Teléfono', nombre: 'Nombre', email: 'Correo', tipo: 'Tipo', canal: 'Canal',
};
const nombreClave = (k: string) => CLAVE[k] ?? k.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase());
function legible(v: unknown): string {
  const t = String(v);
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(t)) {
    const d = new Date(t.length === 10 ? t + 'T12:00:00Z' : t);
    return t.length === 10 ? d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' })
      : d.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  if (v === true) return 'Sí';
  if (v === false) return 'No';
  return t;
}
const planos = (o: unknown): [string, unknown][] => (o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o as Record<string, unknown>) : [])
  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
  .map(([k, v]): [string, unknown] => [k, Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? planos(v).map(([a, b]) => `${nombreClave(a)}: ${legible(b)}`).join(' · ') : v]);

export default async function FichaProyecto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const [{ id }, q] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await fichaProyecto(jwt, id);
  if (!p) notFound();
  // Enlace proyecto ↔ cliente (fallo 10): sus locales con carta QR, por correo.
  const susLocales = (await listarClientesQr(jwt).catch(() => [])).filter((c) => c.email && c.email.toLowerCase() === p.email.toLowerCase());
  const indice = p.fases.indexOf(p.fase);
  const siguiente = p.fases[indice + 1] && p.fases[indice + 1] !== 'descartado' ? p.fases[indice + 1] : null;
  const fiscales: Record<string, string> = p.datos_fiscales ?? {};
  const extra = planos(p.datos);
  const intake = planos(p.intake);
  const enlaces: [string, string | null][] = [
    ['Cliente de Stripe', p.stripe_cliente && `${STRIPE}/customers/${p.stripe_cliente}`],
    ['Factura', p.stripe_factura && `${STRIPE}/invoices/${p.stripe_factura}`],
    ['Suscripción', p.stripe_suscripcion && `${STRIPE}/subscriptions/${p.stripe_suscripcion}`],
    ['Contrato (PDF)', p.contrato_pdf_url],
    ['Formulario de datos del cliente', p.token_intake && `/nucleo-operativo/completar/${p.token_intake}`],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 text-carbon sm:px-6 lg:px-10 lg:py-10">
      <header>
        <Link href="/admin-dkitchen/proyectos" className="text-sm text-niebla hover:text-vino">← Proyectos</Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-vino">{PRODUCTOS_PROYECTO[p.producto]} · {p.origen === 'pago' ? 'entró pagando' : p.origen === 'solicitud' ? 'entró por solicitud' : 'creado en Central'}</p>
        <h1 className="font-display mt-2 break-words text-3xl font-semibold md:text-4xl">{p.negocio || p.nombre || p.email}</h1>
        <p className="mt-1 break-all text-sm text-niebla">
          {[p.nombre, p.email, p.telefono].filter(Boolean).join(' · ')}
          {p.telefono && <> · <a className="text-vino underline" href={`https://wa.me/${p.telefono.replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1')}`}>WhatsApp</a></>}
        </p>
      </header>

      {susLocales.length > 0 && (
        <p className="rounded-2xl bg-papel px-4 py-3 text-sm">También es cliente de carta QR: {susLocales.map((c, i) => <span key={c.restauranteId}>{i ? ', ' : ''}<Link href={`/admin-dkitchen/qr/${c.restauranteId}`} className="font-semibold text-vino underline">{c.nombre}</Link></span>)}</p>
      )}

      <GuiaZona titulo="Ficha de proyecto" ancla="proyectos"
        que="Un proyecto es todo lo que no es carta QR: Signature, Experience, Auditoría, Dark Kitchen y QR físico. Aquí se sigue de la solicitud a la entrega."
        pasos={['Mira la fase actual (en vino) y el siguiente paso.', 'Cuando avance, elige la fase en «Pasar a», añade una nota si quieres y marca «Avisar al cliente» para que le llegue el correo con el texto de esa fase.', 'Tras cada llamada o correo, guarda un apunte y pon el siguiente paso con fecha: así sale en «Proyectos que tocan hoy» de Inicio.', 'Datos fiscales y contrato: rellénalos antes de facturar o enviar el contrato.']} />

      {q.ok && <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{AVISOS[q.ok] ?? 'Hecho.'}</p>}
      {q.e && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[q.e] ?? 'No se pudo hacer.'}</p>}

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Fase</p>
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Fases">
          {p.fases.filter((f) => f !== 'descartado' || p.fase === 'descartado').map((f, i) => (
            <li key={f} aria-current={f === p.fase ? 'step' : undefined}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${f === p.fase ? (f === 'descartado' ? 'bg-acero text-white' : 'bg-vino text-white') : i < indice ? 'bg-vino/10 text-vino' : 'bg-papel text-ceniza'}`}>
              {nombreFase(p.producto, f)}
            </li>
          ))}
        </ol>
        {p.siguiente_paso && (
          <p className="mt-4 text-sm"><span className="text-niebla">Siguiente paso:</span> <strong>{p.siguiente_paso}</strong>{p.siguiente_fecha ? <span className="text-niebla"> · {dia(p.siguiente_fecha)}</span> : null}</p>
        )}
        <form action={avanzarFaseAction} className="mt-4 space-y-3 border-t border-linea pt-4">
          <input type="hidden" name="id" value={p.id} />
          <label className="block text-sm">Pasar a
            <select name="fase" defaultValue={siguiente ?? p.fase} className={entrada}>
              {p.fases.map((f) => <option key={f} value={f}>{nombreFase(p.producto, f)}{f === p.fase ? ' (actual)' : ''}</option>)}
            </select>
          </label>
          <label className="block text-sm">Nota (queda en el historial)
            <textarea name="nota" rows={2} maxLength={1000} className={entrada} />
          </label>
          <div className="space-y-1.5 text-sm text-grafito">
            <label className="flex items-start gap-2"><input type="checkbox" name="avisar" className="mt-1 accent-vino" /> Avisar al cliente por correo con el texto de la fase</label>
            <label className="flex items-start gap-2"><input type="checkbox" name="nota_al_cliente" className="mt-1 accent-vino" /> Incluir la nota en ese correo</label>
          </div>
          {siguiente && textoFaseCliente(p.producto, siguiente) && <p className="text-xs text-ceniza">Texto al cliente para «{nombreFase(p.producto, siguiente)}»: {textoFaseCliente(p.producto, siguiente)}</p>}
          <button className={boton}>Guardar fase</button>
        </form>
      </section>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Apunte y siguiente paso</p>
        <form action={anotarAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <label className="text-sm">Tipo
            <select name="tipo" className={entrada}><option value="nota">Nota</option><option value="llamada">Llamada</option><option value="correo">Correo</option></select>
          </label>
          <label className="text-sm">Fecha del siguiente paso<input type="date" name="fecha" defaultValue={p.siguiente_fecha ?? ''} className={entrada} /></label>
          <label className="text-sm sm:col-span-2">Qué ha pasado<textarea name="texto" rows={2} maxLength={1000} className={entrada} /></label>
          <label className="text-sm sm:col-span-2">Siguiente paso<input name="siguiente" maxLength={200} defaultValue={p.siguiente_paso ?? ''} className={entrada} /></label>
          <button className={`${boton} sm:col-span-2 sm:justify-self-start`}>Guardar apunte</button>
        </form>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={tarjeta}>
          <p className="text-sm font-semibold">Datos del cliente</p>
          <form action={guardarDatosAction} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={p.id} />
            <label className="block text-sm">Nombre<input name="nombre" maxLength={120} defaultValue={p.nombre ?? ''} className={entrada} /></label>
            <label className="block text-sm">Correo<input name="email" type="email" maxLength={254} defaultValue={p.email} className={entrada} /></label>
            <label className="block text-sm">Teléfono<input name="telefono" type="tel" maxLength={30} defaultValue={p.telefono ?? ''} className={entrada} /></label>
            <label className="block text-sm">Negocio<input name="negocio" maxLength={120} defaultValue={p.negocio ?? ''} className={entrada} /></label>
            <p className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ceniza">Datos fiscales</p>
            <label className="block text-sm">Razón social<input name="razon_social" maxLength={160} defaultValue={fiscales.razon_social ?? ''} className={entrada} /></label>
            <label className="block text-sm">NIF / CIF<input name="nif" maxLength={20} defaultValue={fiscales.nif ?? ''} className={entrada} /></label>
            <label className="block text-sm">Dirección fiscal<input name="direccion" maxLength={250} defaultValue={fiscales.direccion ?? ''} className={entrada} /></label>
            <label className="block text-sm">Contrato
              <select name="contrato_estado" defaultValue={p.contrato_estado ?? ''} className={entrada}>
                <option value="">Sin contrato</option><option value="pendiente">Pendiente</option><option value="enviado">Enviado</option>
                <option value="firmado">Firmado</option><option value="rechazado">Rechazado</option><option value="manual">Manual (fuera del sistema)</option>
              </select>
            </label>
            <button className={boton}>Guardar datos</button>
          </form>
        </section>

        <div className="space-y-5">
          <section className={tarjeta}>
            <p className="text-sm font-semibold">Pago y documentos</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-niebla">Importe</dt><dd className="font-semibold tabular-nums">{p.importe_centimos ? `${(p.importe_centimos / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-niebla">Contrato</dt><dd>{p.contrato_estado ?? '—'}{p.contrato_firmado_en ? ` · ${fechaHora(p.contrato_firmado_en)}` : ''}</dd></div>
              {p.comercial && <div className="flex justify-between gap-3"><dt className="text-niebla">Comercial</dt><dd>{p.comercial}</dd></div>}
            </dl>
            <ul className="mt-3 space-y-1.5 text-sm">
              {enlaces.filter(([, h]) => h).map(([t, h]) => <li key={t}><a href={h!} target="_blank" rel="noreferrer" className="text-vino underline">{t}</a></li>)}
            </ul>
          </section>
          {(extra.length > 0 || intake.length > 0) && (
            <section className={tarjeta}>
              <p className="text-sm font-semibold">Lo que nos contó</p>
              <dl className="mt-3 space-y-2 text-sm">
                {[...extra, ...intake].map(([k, v], i) => <div key={k + i}><dt className="text-xs text-niebla">{nombreClave(k)}</dt><dd className="whitespace-pre-wrap break-words">{legible(v)}</dd></div>)}
              </dl>
            </section>
          )}
        </div>
      </div>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Historial</p>
        <ol className="mt-3 space-y-3">
          {p.eventos.map((e, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-24 shrink-0 text-xs text-ceniza">{fechaHora(e.creado_en)}</span>
              <span className="min-w-0 flex-1 break-words">
                <strong>{TIPO[e.tipo] ?? e.tipo}</strong>{e.fase && nombreFase(p.producto, e.fase) !== (TIPO[e.tipo] ?? e.tipo) ? ` → ${nombreFase(p.producto, e.fase)}` : ''}{e.texto ? <span className="text-grafito">: {e.texto}</span> : null}
                {e.autor && <span className="text-xs text-ceniza"> · {e.autor}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
