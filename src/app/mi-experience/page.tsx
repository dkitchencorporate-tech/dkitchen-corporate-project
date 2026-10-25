import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { misExperiences, misCompradores, huecosOcupados, huecosLibres, miCorreo, type MiExperience, type Comprador } from '@/lib/mi-experience';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';
import { FASES } from '@/lib/proyectos';
import { WHATSAPP_DEMO } from '@/lib/whatsapp';
import { SalirExperience, RefrescoVentas, SubirFotosExperience } from '@/components/experience/MiExperienceCliente';
import { briefingAction, llamadaAction, quitarFotoAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu evento · DKitchen Experience', robots: { index: false, follow: false } };

const fecha = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const OK: Record<string, string> = { briefing: 'Briefing guardado. Ahora elige el día de tu llamada de arranque.', llamada: 'Llamada agendada. Te hemos enviado la confirmación por correo.', foto: 'Foto quitada.' };
const ERR: Record<string, string> = {
  datos: 'Datos no válidos.', base: 'No se pudo guardar. Inténtalo de nuevo.', briefing: 'Indica al menos el formato y la fecha deseada.',
  ocupado: 'Ese hueco se acaba de ocupar. Elige otro.', hueco: 'Ese hueco ya no está disponible. Elige otro.',
};
const dia = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' });
const euros = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
const campo = 'mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-tinta';

/**
 * Zona del cliente de Experience (0088, 18/10/2026, karc0: «al comprar un evento se
 * crea el usuario y su admin de Experience, con instrucciones desde donde
 * configurar todo y agendar la llamada»). Pasos: 1 briefing · 2 llamada de
 * arranque · 3 preparación (concepto, web de entradas, campaña) · 4 el evento.
 */
export default async function MiExperiencePagina({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  const sp = await searchParams;
  const [lista, ocupados, correo] = await Promise.all([misExperiences(jwt).catch(() => null), huecosOcupados(jwt).catch(() => new Set<string>()), miCorreo(jwt).catch(() => null)]);
  const p = lista?.[0] ?? null;
  const compradores = p?.evento ? await misCompradores(jwt, p.id).catch(() => [] as Comprador[]) : [];

  return (
    <main className="min-h-screen bg-crema px-4 pb-24 pt-10 text-carbon sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="relative overflow-hidden rounded-[28px] bg-noche p-7 text-white sm:p-9">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-vino/40 blur-3xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">DKitchen Experience</p>
          <h1 className="font-display relative mt-2 text-3xl font-semibold md:text-4xl">Tu evento{p?.negocio ? ` · ${p.negocio}` : ''}</h1>
          <p className="relative mt-2 max-w-xl text-sm text-white/70">Desde aquí lo dejas todo listo: cuéntanos tu evento, elige el día de la llamada de arranque y sigue cómo avanza hasta la noche del evento.</p>
          <div className="relative mt-5 flex flex-wrap gap-2 text-sm">
            <a href={WHATSAPP_DEMO} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-4 py-2 font-semibold">Escribirnos por WhatsApp</a>
            <Link href="/experience" className="rounded-full bg-white/10 px-4 py-2 text-white/80">Ver los formatos</Link>
            <Link href="/panel" className="rounded-full bg-white/10 px-4 py-2 text-white/80">Mi carta QR</Link>
            <SalirExperience />
          </div>
        </header>

        {sp.ok && <p className="rounded-2xl bg-exito/10 p-3 text-sm text-exito">{OK[sp.ok] ?? 'Guardado.'}</p>}
        {sp.e && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{ERR[sp.e] ?? 'No se pudo guardar.'}</p>}

        {!p ? (
          <section className="rounded-[24px] border border-linea bg-white p-7 text-center">
            <h2 className="font-display text-2xl font-semibold">Aún no vemos ningún evento a tu nombre</h2>
            <p className="mt-2 text-sm text-niebla">Si acabas de pagar, espera un minuto y recarga. Tu evento aparece con el mismo correo con el que pagaste{correo ? ` (has entrado como ${correo})` : ''}.</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/experience" className="rounded-full bg-vino px-6 py-3 text-sm font-semibold text-white">Ver los eventos</Link>
              <a href={WHATSAPP_DEMO} target="_blank" rel="noopener noreferrer" className="rounded-full border border-tinta px-6 py-3 text-sm font-semibold">Hablar con nosotros</a>
            </div>
          </section>
        ) : <Evento p={p} correo={correo} ocupados={ocupados} compradores={compradores} />}
      </div>
    </main>
  );
}

const ORDEN_FASES = FASES.experience.map(([f]) => f);
const enFase = (p: MiExperience, fase: string) => p.fase !== 'descartado' && ORDEN_FASES.indexOf(p.fase) >= ORDEN_FASES.indexOf(fase);
const fechaDe = (p: MiExperience, prueba: (e: MiExperience['cronologia'][number]) => boolean) => p.cronologia.find(prueba)?.en ?? null;

function Evento({ p, correo, ocupados, compradores }: { p: MiExperience; correo: string | null; ocupados: Set<string>; compradores: Comprador[] }) {
  const b = p.briefing ?? {};
  const formatoInicial = b.formato || p.datos['Formato'] || '';
  const pasos = [
    { t: 'Cuéntanos tu evento', d: 'El briefing: formato, fecha, aforo, menú por pases, fotos y cómo cobras. 5 minutos.', hecho: !!p.briefingEn },
    { t: 'Llamada de arranque', d: 'La eliges tú. En ella cerramos el concepto y lo personalizamos contigo.', hecho: !!p.llamadaEn },
    { t: 'Preparamos tu evento', d: 'Concepto en 3 días, web de entradas conectada a tu cobro, piezas y campaña.', hecho: enFase(p, 'evento_montado') },
    { t: 'La noche del evento', d: 'Escaneas las entradas en la puerta y cobras la taquilla sin comisión de DKitchen.', hecho: enFase(p, 'celebrado') },
  ];
  const actual = pasos.findIndex((x) => !x.hecho);
  const dias = huecosLibres(ocupados);

  return (
    <>
      <section className="rounded-[24px] border border-linea bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Tus pasos</p>
        <ol className="mt-4 space-y-3">
          {pasos.map((x, i) => (
            <li key={x.t} className={`flex gap-4 rounded-2xl p-4 ${i === actual ? 'bg-vino/[0.06] ring-1 ring-vino/30' : ''}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${x.hecho ? 'bg-exito text-white' : i === actual ? 'bg-vino text-white' : 'bg-papel text-niebla'}`}>{x.hecho ? '✓' : i + 1}</span>
              <span><span className="block font-semibold">{x.t}{i === actual && <span className="ml-2 rounded-full bg-vino px-2 py-0.5 text-[11px] font-semibold uppercase text-white">Ahora</span>}</span><span className="block text-sm text-niebla">{x.d}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <Contratado p={p} formato={formatoInicial} />

      <section id="briefing" className="scroll-mt-6 rounded-[24px] border border-linea bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Paso 1</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Cuéntanos tu evento</h2>
        {p.briefingEn && <p className="mt-1 text-sm text-exito">Recibido el {fecha.format(new Date(p.briefingEn))}. Puedes cambiarlo hasta la llamada.</p>}
        <form action={briefingAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <Grupo n={1} t="El evento" primero />
          <label className="block text-sm font-semibold">Formato
            <select name="formato" required defaultValue={formatoInicial} className={campo}>
              <option value="">Elige uno</option>
              {FORMATOS_EXPERIENCE.map((f) => <option key={f.slug} value={f.nombre}>{f.nombre}</option>)}
              <option value="Aún no lo sé">Aún no lo sé</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Fecha deseada<input name="fecha" type="date" required defaultValue={b.fecha ?? ''} className={campo} /></label>
          <label className="block text-sm font-semibold">Aforo (personas)<input name="aforo" type="number" min={1} defaultValue={b.aforo ?? ''} className={campo} /></label>
          <label className="block text-sm font-semibold">Precio de la entrada (€)<input name="precio" type="number" min={0} defaultValue={b.precio ?? ''} className={campo} /></label>
          <Grupo n={2} t="La cocina y el menú por pases" d="Uno por casilla, en el orden en que salen. Deja vacíos los que no uses." />
          <label className="block text-sm font-semibold sm:col-span-2">Gastronomía<input name="cocina" maxLength={60} defaultValue={b.cocina ?? ''} placeholder="Mediterránea, japonesa, de brasa…" className={campo} /></label>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <label key={n} className="block text-sm font-semibold">Pase {n}<input name={`pase${n}`} maxLength={200} defaultValue={b[`pase${n}`] ?? ''} placeholder={n === 1 ? 'Aperitivo de bienvenida' : ''} className={campo} /></label>
          ))}
          <Grupo n={3} t="Cobro y permisos" />
          <label className="block text-sm font-semibold">Cómo cobras
            <select name="pasarela" defaultValue={b.pasarela ?? ''} className={campo}>
              <option value="">Aún no lo sé</option><option>Ya tengo una</option><option>La de mi banco</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Licencias (alcohol, música, aforo)<input name="licencias" maxLength={300} defaultValue={b.licencias ?? ''} placeholder="Qué tienes y qué no" className={campo} /></label>
          <Grupo n={4} t="La idea y lo demás" />
          <label className="block text-sm font-semibold sm:col-span-2">Menú o idea general<textarea name="menu" rows={3} maxLength={1500} defaultValue={b.menu ?? ''} placeholder="Bebidas, maridaje, ambiente o lo que tengas en mente" className={campo} /></label>
          <label className="block text-sm font-semibold sm:col-span-2">Notas<textarea name="notas" rows={2} maxLength={1000} defaultValue={b.notas ?? ''} className={campo} /></label>
          <button className="rounded-full bg-vino px-6 py-3.5 text-[15px] font-semibold text-white sm:col-span-2">{p.briefingEn ? 'Guardar cambios' : 'Guardar y pasar a la llamada'}</button>
        </form>
      </section>

      <section id="fotos" className="scroll-mt-6 rounded-[24px] border border-linea bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Paso 1 · fotos</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Fotos de tu local y tus platos</h2>
        <p className="mt-1 text-sm text-niebla">Con ellas montamos la web de entradas y las piezas de la campaña. Hasta 8; las comprimimos al subirlas.</p>
        {p.fotos.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.fotos.map((url) => (
              <li key={url} className="relative overflow-hidden rounded-2xl bg-papel">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Foto del evento" className="aspect-square w-full object-cover" loading="lazy" />
                <form action={quitarFotoAction} className="absolute right-2 top-2">
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="url" value={url} />
                  <button className="rounded-full bg-noche/80 px-2.5 py-1 text-xs font-semibold text-white" aria-label="Quitar esta foto">Quitar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4"><SubirFotosExperience id={p.id} quedan={8 - p.fotos.length} /></div>
      </section>

      <section id="llamada" className="scroll-mt-6 rounded-[24px] border border-linea bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Paso 2</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Elige tu llamada de arranque</h2>
        {p.llamadaEn
          ? <p className="mt-3 rounded-2xl bg-exito/10 px-4 py-3 text-sm text-exito">Agendada para el <strong>{fecha.format(new Date(p.llamadaEn))}</strong> (hora de Madrid). Si necesitas cambiarla, escríbenos por WhatsApp.</p>
          : !p.briefingEn
            ? <p className="mt-3 text-sm text-niebla">Primero cuéntanos tu evento (paso 1): así llegamos a la llamada con una propuesta.</p>
            : (
              <form action={llamadaAction} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="correo" value={correo ?? ''} />
                <p className="text-sm text-niebla">20–30 minutos, por teléfono o videollamada. Hora de Madrid.</p>
                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                  {dias.map((d) => (
                    <fieldset key={d.dia}>
                      <legend className="text-sm font-semibold first-letter:uppercase">{d.dia}</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {d.horas.map((h) => (
                          <label key={h.iso} className="cursor-pointer">
                            <input type="radio" name="cuando" value={h.iso} required className="peer sr-only" />
                            <span className="block rounded-full border border-acero px-3.5 py-2 text-sm tabular-nums peer-checked:border-vino peer-checked:bg-vino peer-checked:text-white">{h.hora}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <button className="w-full rounded-full bg-vino px-6 py-3.5 text-[15px] font-semibold text-white">Agendar mi llamada</button>
              </form>
            )}
      </section>

      <Ventas p={p} formato={formatoInicial} compradores={compradores} />
    </>
  );
}

function Grupo({ n, t, d, primero }: { n: number; t: string; d?: string; primero?: boolean }) {
  return (
    <div className={`sm:col-span-2 ${primero ? '' : 'border-t border-linea pt-4'}`}>
      <p className="text-sm font-semibold"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-papel text-xs tabular-nums text-vino">{n}</span>{t}</p>
      {d && <p className="mt-1 text-xs text-niebla">{d}</p>}
    </div>
  );
}

/** Lo que contrató y la cronología desde la solicitud hasta la noche del evento (0103). */
function Contratado({ p, formato }: { p: MiExperience; formato: string }) {
  const pagado = p.origen === 'pago' || enFase(p, 'contrato_pago');
  const fechaEvento = p.evento?.fecha ?? (p.briefing?.fecha ? `${p.briefing.fecha}T20:00:00` : null);
  const hitos: { t: string; en: string | null; hecho: boolean; futuro?: boolean }[] = [
    { t: 'Solicitud recibida', en: p.creadoEn, hecho: true },
    { t: 'Contrato y pago', en: fechaDe(p, (e) => e.tipo === 'pago' || e.tipo === 'contrato' || e.fase === 'contrato_pago'), hecho: pagado },
    { t: 'Briefing', en: p.briefingEn, hecho: !!p.briefingEn },
    { t: 'Llamada de arranque', en: p.llamadaEn, hecho: !!p.llamadaEn && new Date(p.llamadaEn) < new Date(), futuro: !!p.llamadaEn },
    { t: 'Concepto', en: fechaDe(p, (e) => e.fase === 'concepto'), hecho: enFase(p, 'concepto') },
    { t: 'Evento montado', en: fechaDe(p, (e) => e.fase === 'evento_montado'), hecho: enFase(p, 'evento_montado') },
    { t: 'Venta abierta', en: fechaDe(p, (e) => e.fase === 'venta_abierta'), hecho: enFase(p, 'venta_abierta') },
    { t: 'La noche del evento', en: fechaEvento, hecho: enFase(p, 'celebrado'), futuro: !!fechaEvento },
  ];
  return (
    <section className="rounded-[24px] border border-linea bg-white p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Lo que has contratado</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Dato t="Formato" v={formato || 'Por cerrar en la llamada'} />
        <Dato t="Importe" v={p.importe ? `${euros(p.importe)} + IVA` : 'Según presupuesto'} />
        <Dato t="Estado" v={pagado ? 'Pago confirmado' : 'Solicitud recibida'} d={pagado ? 'La factura te llega por correo.' : 'Te escribimos para cerrar fecha, contrato y pago.'} />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-vino">Cronología</p>
      <ol className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {hitos.map((h) => (
          <li key={h.t} className="flex items-center gap-3 text-sm">
            <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${h.hecho ? 'bg-exito' : h.futuro ? 'bg-oro' : 'bg-linea'}`} />
            <span className={h.hecho || h.futuro ? 'font-semibold' : 'text-niebla'}>{h.t}</span>
            <span className="ml-auto tabular-nums text-niebla">{h.en ? dia.format(new Date(h.en)) : h.hecho ? 'Hecho' : '—'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Dato({ t, v, d }: { t: string; v: string; d?: string }) {
  return (
    <div className="rounded-2xl bg-papel p-4">
      <p className="text-xs text-niebla">{t}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{v}</p>
      {d && <p className="mt-1 text-xs text-niebla">{d}</p>}
    </div>
  );
}

const ESTADO_VENTA = { borrador: 'Aún no está a la venta', venta: 'A la venta', cerrado: 'Venta cerrada' } as const;

/** Pasos 3 y 4: web de entradas, ventas en directo, puerta y compradores (0103). */
function Ventas({ p, formato, compradores }: { p: MiExperience; formato: string; compradores: Comprador[] }) {
  const e = p.evento;
  if (!e) {
    return (
      <section className="rounded-[24px] border border-linea bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Pasos 3 y 4</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Tu web de entradas y tus ventas</h2>
        <p className="mt-2 text-sm text-niebla">Cuando cerremos el concepto en la llamada, aquí verás el enlace de tu web de entradas, las ventas en directo y los compradores. Mientras tanto, mira cómo lo verán tus clientes:</p>
        <Link href={`/e/muestra-${FORMATOS_EXPERIENCE.find((f) => f.nombre === formato)?.slug ?? FORMATOS_EXPERIENCE[0].slug}`} className="mt-4 inline-block rounded-full border border-tinta px-5 py-2.5 text-sm font-semibold">Ver un evento de ejemplo →</Link>
      </section>
    );
  }
  const lleno = e.aforo ? Math.min(100, Math.round((e.vendidas / e.aforo) * 100)) : 0;
  return (
    <section id="ventas" className="scroll-mt-6 rounded-[24px] border border-linea bg-white p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Pasos 3 y 4 · tus ventas</p>
        {e.estado === 'venta' && <RefrescoVentas />}
      </div>
      <h2 className="font-display mt-1 text-2xl font-semibold">{e.titulo}</h2>
      <p className="mt-1 text-sm text-niebla first-letter:uppercase">{fecha.format(new Date(e.fecha))} · {ESTADO_VENTA[e.estado]}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato t="Vendidas" v={`${e.vendidas} de ${e.aforo}`} d={`${lleno} % del aforo`} />
        <Dato t="Hoy" v={String(e.hoy)} />
        <Dato t="Ingresos" v={euros(e.ingresos)} d={`${euros(e.precio)} la entrada`} />
        <Dato t="En la puerta" v={`${e.usadas} escaneadas`} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-papel" aria-hidden><div className="h-full rounded-full bg-vino" style={{ width: `${lleno}%` }} /></div>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href={`/e/${e.slug}`} className="rounded-full bg-vino px-5 py-2.5 font-semibold text-white">Ver mi web de entradas →</Link>
        <Link href={`/e/${e.slug}/puerta`} className="rounded-full border border-tinta px-5 py-2.5 font-semibold">Escanear en la puerta</Link>
      </div>
      <p className="mt-2 text-xs text-niebla">{e.tieneClave ? 'La clave de la puerta ya está creada: te la damos por WhatsApp, nunca por correo.' : 'Antes del evento te damos la clave para escanear las entradas en la puerta.'}</p>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-vino">Compradores ({compradores.length})</p>
      {compradores.length === 0 ? (
        <p className="mt-2 text-sm text-niebla">Todavía no hay compras. En cuanto entre la primera, aparece aquí.</p>
      ) : (
        <div className="mt-3 max-h-[420px] overflow-auto rounded-2xl border border-linea">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="sticky top-0 bg-papel text-xs text-niebla">
              <tr><th className="px-3 py-2 font-semibold">Nombre</th><th className="px-3 py-2 font-semibold">Correo</th><th className="px-3 py-2 text-right font-semibold">Entradas</th><th className="px-3 py-2 text-right font-semibold">Usadas</th><th className="px-3 py-2 text-right font-semibold">Fecha</th></tr>
            </thead>
            <tbody>
              {compradores.map((c, i) => (
                <tr key={i} className="border-t border-linea">
                  <td className="px-3 py-2 font-semibold">{c.nombre || '—'}</td>
                  <td className="px-3 py-2 text-niebla">{c.email || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.entradas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.usadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-niebla">{dia.format(new Date(c.compradoEn))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
