import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { clavePuerta, euros, leerLanding, urlAltaCobro } from '@/lib/entradas';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';
import { cambiarEstadoAction, conectarCobroAction, guardarEventoAction, nuevaClavePuertaAction } from './actions';
import GuiaZona from '@/components/admin/GuiaZona';
import AsistenteEvento, { type EventoAsistente, type FormatoAsistente } from '@/components/admin/AsistenteEvento';
import { listarProyectos } from '@/lib/proyectos';

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

/** Datos del evento para el asistente (edición): las listas de la landing vuelven a su forma de texto. */
function paraAsistente(e: Evento): EventoAsistente {
  const l = leerLanding(e.landing);
  const area = (filas: string[]) => filas.join('\n');
  return {
    id: e.id, slug: e.slug, local_nombre: e.local_nombre, titulo: e.titulo, fecha: aLocal(e.fecha), precio: String(e.precio_centimos / 100),
    aforo: e.aforo, max_por_compra: e.max_por_compra, lugar: e.lugar ?? '', imagen_url: e.imagen_url ?? '', formato: e.formato ?? '',
    muestra: !!e.muestra, descripcion: e.descripcion ?? '',
    l: {
      subtitulo: l.subtitulo, historia: l.historia.join('\n\n'), menu: area(l.menu.map((m) => `${m.pase} | ${m.plato} | ${m.bebida}`)),
      programa: area(l.programa.map((p) => `${p.hora} | ${p.que}`)), incluye: area(l.incluye), anf_nombre: l.anfitrion?.nombre ?? '',
      anf_rol: l.anfitrion?.rol ?? '', anf_texto: l.anfitrion?.texto ?? '', direccion: l.direccion, mapa: l.mapa ?? '',
      faq: area(l.faq.map((x) => `${x.p} | ${x.r}`)), avisos: l.avisos,
    },
  };
}
const FORMATOS: FormatoAsistente[] = FORMATOS_EXPERIENCE.map((f) => ({
  slug: f.slug, nombre: f.nombre, etiqueta: f.etiqueta, frase: f.frase, dias: f.dias, aforo: f.aforo, entrada: f.entrada, faq: f.faq, claves: f.claves,
}));
const ESTADO: Record<string, [string, string]> = {
  borrador: ['Borrador', 'bg-papel text-grafito'], venta: ['En venta', 'bg-emerald-100 text-emerald-800'], cerrado: ['Venta cerrada', 'bg-zinc-100 text-zinc-600'],
};
const chip = (e: string) => ESTADO[e] ?? [e, 'bg-papel text-grafito'];

export default async function Entradas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const eventos = await comoCliente(jwt, async (c) => (await c.query<Evento>('SELECT * FROM dk.admin_eventos()')).rows).catch(() => null);
  const sel = eventos?.find((x) => x.id === q.ev);
  const entradas = sel ? await comoCliente(jwt, async (c) => (await c.query<Entrada>('SELECT * FROM dk.admin_entradas($1)', [sel.id])).rows).catch(() => []) : [];
  const aviso = q.ok ? MENSAJES[q.ok] : q.e ? MENSAJES[q.e] ?? MENSAJES.datos : null;
  const clientes = await listarProyectos(jwt, { producto: 'experience' }).then((l) => [...new Set(l.map((p) => p.negocio).filter(Boolean) as string[])]).catch(() => []);
  const nuevo = q.nuevo === '1' || eventos?.length === 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
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
          <details className="mt-6 rounded-[22px] border border-linea p-4"><summary className="cursor-pointer text-sm font-semibold">✎ Editar evento (asistente)</summary><div className="mt-4"><AsistenteEvento accion={guardarEventoAction} formatos={FORMATOS} clientes={clientes} e={paraAsistente(sel)} /></div></details>
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
          {nuevo ? (
            <section className="rounded-[26px] border border-oro/40 bg-[linear-gradient(160deg,#FFFDF8,#F6EEDD)] p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold">Nuevo evento</h2>
                {!!eventos?.length && <Link href="/admin-dkitchen/entradas" className="text-sm font-semibold text-vino">Cancelar</Link>}
              </div>
              <AsistenteEvento accion={guardarEventoAction} formatos={FORMATOS} clientes={clientes} />
            </section>
          ) : (
            <Link href="/admin-dkitchen/entradas?nuevo=1" className="flex items-center justify-between gap-3 rounded-[26px] bg-noche p-5 text-white transition hover:shadow-lg sm:p-6">
              <span><span className="block font-display text-2xl font-semibold">Crear un evento</span><span className="text-sm text-white/65">Elige el formato y el asistente te guía en 5 pasos.</span></span>
              <span className="rounded-full bg-oro px-5 py-2.5 text-sm font-bold text-noche">+ Nuevo</span>
            </Link>
          )}
          {eventos === null && <p className="text-sm text-vino">No se pudieron cargar los eventos.</p>}
          {!!eventos?.length && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {eventos.map((x) => {
                const d = new Date(x.fecha);
                const pct = x.aforo ? Math.min(100, Math.round((Number(x.vendidas) / x.aforo) * 100)) : 0;
                const [nEstado, cEstado] = chip(x.estado);
                return (
                  <li key={x.id}>
                    <Link href={`/admin-dkitchen/entradas?ev=${x.id}`} className="group block overflow-hidden rounded-[22px] border border-linea bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(20,16,12,.45)]">
                      <div className="relative aspect-[16/9] bg-noche">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {x.imagen_url && <img src={x.imagen_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105" />}
                        <span className="absolute left-3 top-3 flex flex-col items-center rounded-2xl bg-white/95 px-3 py-1.5 text-center leading-none text-noche shadow">
                          <span className="font-display text-xl font-semibold">{d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric' })}</span>
                          <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', month: 'short' })}</span>
                        </span>
                        <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${cEstado}`}>{x.muestra ? 'Muestra' : nEstado}</span>
                      </div>
                      <div className="p-4">
                        <p className="truncate font-display text-lg font-semibold group-hover:text-vino">{x.titulo}</p>
                        <p className="truncate text-xs text-niebla">{x.local_nombre} · {d.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })} · {euros(x.precio_centimos)}</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-papel"><div className="h-full rounded-full bg-oro" style={{ width: `${pct}%` }} /></div>
                        <p className="mt-1.5 flex justify-between text-[11px] text-grafito"><span>{x.vendidas}/{x.aforo} vendidas</span><span className="font-semibold">{euros(Number(x.ingresos_centimos))}</span></p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
