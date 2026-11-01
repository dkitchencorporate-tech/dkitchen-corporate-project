import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { misServicios, type MiServicio } from '@/lib/mis-servicios';
import { FASES, textoFaseCliente } from '@/lib/proyectos';
import { WHATSAPP_DEMO } from '@/lib/whatsapp';
import SubirArchivos from '@/components/servicios/SubirArchivos';
import { datosAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mis servicios · DKitchen', robots: { index: false, follow: false } };

/**
 * «Mis servicios» del dueño (0111, 01/11; tareas cec438e0 + cb29c504): cada servicio con seguimiento
 * (Signature, Experience, Auditoría) en una tarjeta con su fase, lo que viene ahora y lo que necesitamos de él.
 * Una acción principal por tarjeta: mandarnos sus datos (o, en Experience, entrar en su zona del evento).
 */
const NOMBRE = { signature: 'Signature · tu app propia', experience: 'Experience · tu evento', auditoria: 'Auditoría de canales' } as const;
const OK: Record<string, string> = { datos: '¡Recibido! Ya tenemos tus datos; te escribimos con el siguiente paso.' };
const ERR: Record<string, string> = { datos: 'No encontramos ese servicio.', vacio: 'Rellena al menos un campo.', base: 'No se pudo guardar. Inténtalo de nuevo.' };
const campo = 'mt-1.5 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-base outline-none focus:border-vino';
const CANALES = ['Google', 'Glovo', 'Uber Eats', 'Just Eat', 'TheFork', 'Web propia', 'Instagram', 'Teléfono'];

function Fases({ s }: { s: MiServicio }) {
  const lista = FASES[s.producto].filter(([k]) => k !== 'descartado');
  const i = Math.max(0, lista.findIndex(([k]) => k === s.fase));
  return (
    <ol className="flex gap-1.5" aria-label="Progreso">
      {lista.map(([k, n], j) => (
        <li key={k} title={n} className={`h-2 flex-1 rounded-full ${j <= i ? 'bg-vino' : 'bg-linea'}`} />
      ))}
    </ol>
  );
}

function Formulario({ s }: { s: MiServicio }) {
  const v = (k: string) => (typeof s.datos[k] === 'string' ? (s.datos[k] as string) : '');
  const enviado = typeof s.datos.enviado_en === 'string';
  if (s.producto === 'signature') {
    return (
      <form action={datosAction} className="space-y-3">
        <input type="hidden" name="id" value={s.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Nombre de la marca<input name="marca" defaultValue={v('marca') || s.negocio || ''} className={campo} /></label>
          <label className="text-sm font-semibold">Dominio que quieres<input name="dominio" defaultValue={v('dominio')} placeholder="tumarca.es" className={campo} /></label>
          <label className="text-sm font-semibold">Color principal<input name="color_1" type="color" defaultValue={v('color_1') || '#6E0C2B'} className="mt-1.5 h-12 w-full cursor-pointer rounded-2xl border border-linea bg-white px-2" /></label>
          <label className="text-sm font-semibold">Color secundario<input name="color_2" type="color" defaultValue={v('color_2') || '#D9B25C'} className="mt-1.5 h-12 w-full cursor-pointer rounded-2xl border border-linea bg-white px-2" /></label>
        </div>
        <label className="block text-sm font-semibold">Frase o eslogan<input name="eslogan" defaultValue={v('eslogan')} className={campo} /></label>
        <label className="block text-sm font-semibold">Tu carta (pega el enlace o escríbela)<textarea name="carta" rows={4} defaultValue={v('carta')} className={campo} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Instagram / redes<input name="redes" defaultValue={v('redes')} placeholder="@tulocal" className={campo} /></label>
          <label className="text-sm font-semibold">Horario<input name="horario" defaultValue={v('horario')} placeholder="L-D 13-16 y 20-24" className={campo} /></label>
        </div>
        <label className="block text-sm font-semibold">Algo más que debamos saber<textarea name="notas" rows={2} defaultValue={v('notas')} className={campo} /></label>
        <button className="min-h-[48px] w-full rounded-full bg-vino px-6 text-sm font-bold text-white sm:w-auto">{enviado ? 'Actualizar mis datos' : 'Enviar mis datos'}</button>
      </form>
    );
  }
  const marcados = v('canales').split(',').map((x) => x.trim());
  return (
    <form action={datosAction} className="space-y-3">
      <input type="hidden" name="id" value={s.id} />
      <p className="text-sm font-semibold">¿Dónde vendes hoy?</p>
      <div className="flex flex-wrap gap-2">
        {CANALES.map((c) => (
          <label key={c} className="cursor-pointer">
            <input type="checkbox" name="canal" value={c} defaultChecked={marcados.includes(c)} className="peer sr-only" />
            <span className="inline-flex min-h-[44px] items-center rounded-full border border-linea bg-white px-4 text-sm font-semibold peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-white">{c}</span>
          </label>
        ))}
      </div>
      <label className="block text-sm font-semibold">Enlaces a tus fichas (uno por línea)<textarea name="enlaces" rows={3} defaultValue={v('enlaces')} className={campo} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Pedidos al mes (aprox.)<input name="ventas_mes" defaultValue={v('ventas_mes')} inputMode="numeric" className={campo} /></label>
        <label className="text-sm font-semibold">Qué quieres mejorar<input name="objetivo" defaultValue={v('objetivo')} className={campo} /></label>
        <label className="text-sm font-semibold">Reunión: 1.ª preferencia<input name="reunion_1" type="datetime-local" defaultValue={v('reunion_1')} className={campo} /></label>
        <label className="text-sm font-semibold">Reunión: 2.ª preferencia<input name="reunion_2" type="datetime-local" defaultValue={v('reunion_2')} className={campo} /></label>
      </div>
      <button className="min-h-[48px] w-full rounded-full bg-vino px-6 text-sm font-bold text-white sm:w-auto">{enviado ? 'Actualizar' : 'Enviar'}</button>
    </form>
  );
}

export default async function MisServicios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  const q = await searchParams;
  const servicios = await misServicios(jwt).catch(() => null);
  const aviso = q.ok ? OK[q.ok] : q.e ? ERR[q.e] ?? ERR.base : null;

  return (
    <main className="min-h-screen bg-crema px-4 py-8 text-tinta sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vino">DKitchen</p>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Mis servicios</h1>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/panel/documentos" className="text-sm font-semibold text-vino">Mis documentos</Link>
            <Link href="/panel" className="text-sm font-semibold text-vino">Ir a mi panel →</Link>
          </div>
        </header>
        {aviso && <p role="status" className={`rounded-2xl px-4 py-3 text-sm ${q.ok ? 'bg-exito/10 text-exito' : 'bg-vino/10 text-vino'}`}>{aviso}</p>}
        {servicios === null && <p className="rounded-2xl bg-white p-5 text-sm">No hemos podido cargar tus servicios. Recarga en unos segundos.</p>}
        {servicios?.length === 0 && (
          <div className="rounded-[26px] bg-white p-6 text-center">
            <p className="font-display text-xl font-bold">Aún no tienes servicios en marcha</p>
            <p className="mt-1 text-sm text-niebla">Si acabas de pagar, aparecerán aquí en unos minutos.</p>
          </div>
        )}
        {servicios?.map((s) => {
          const archivos = Array.isArray(s.datos.archivos) ? (s.datos.archivos as string[]) : [];
          const enviado = typeof s.datos.enviado_en === 'string';
          return (
            <section key={s.id} id={`s-${s.id}`} className="overflow-hidden rounded-[26px] border border-linea bg-white shadow-[0_30px_80px_-50px_rgba(62,5,21,.45)]">
              <div className="space-y-3 bg-noche p-5 text-white sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-oro">{NOMBRE[s.producto]}</p>
                <h2 className="font-display text-2xl font-bold">{s.negocio ?? 'Tu proyecto'}</h2>
                <Fases s={s} />
                <p className="text-sm text-white/80">{textoFaseCliente(s.producto, s.fase) || 'Estamos con ello.'}</p>
                {s.siguienteFecha && <p className="text-xs text-oro">Próxima fecha: {new Date(s.siguienteFecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                {s.producto === 'experience' ? (
                  <Link href="/mi-experience" className="flex min-h-[48px] items-center justify-center rounded-full bg-vino text-sm font-bold text-white">Configurar mi evento →</Link>
                ) : (
                  <>
                    <div>
                      <h3 className="font-display text-lg font-bold">{enviado ? 'Tus datos (puedes cambiarlos)' : 'Lo que necesitamos de ti'}</h3>
                      <p className="text-sm text-niebla">{s.producto === 'signature' ? 'Con esto diseñamos tu app: marca, colores, carta y fotos.' : 'Con esto preparamos tu informe y fijamos la reunión.'}</p>
                    </div>
                    <Formulario s={s} />
                    {s.producto === 'signature' && (
                      <div className="space-y-2 border-t border-linea pt-4">
                        <SubirArchivos id={s.id} quedan={12 - archivos.length} />
                        {!!archivos.length && (
                          <ul className="flex flex-wrap gap-2">
                            {archivos.map((u) => (
                              <li key={u}>
                                {/\.pdf$/i.test(u) ? <a href={u} target="_blank" className="grid h-16 w-16 place-items-center rounded-xl bg-papel text-xs font-bold">PDF</a>
                                  // eslint-disable-next-line @next/next/no-img-element
                                  : <img src={u} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          );
        })}
        <p className="text-center text-sm text-niebla">¿Dudas? <a href={WHATSAPP_DEMO} className="font-semibold text-vino">Escríbenos por WhatsApp</a> o responde a cualquiera de nuestros correos.</p>
      </div>
    </main>
  );
}
