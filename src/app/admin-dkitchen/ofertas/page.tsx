import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { SERVICIOS_QR, EXPERIENCE, AUDITORIA_CANALES } from '@/lib/pricing-config';
import OfertaAsistente, { type ProductoOferta } from '@/components/admin/OfertaAsistente';
import { guardarOfertaFechaAction, estadoSolicitudOfertaAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Ofertas (decisión 6 de karc0, 01/11): asistente de 3 pasos con vista previa; precios del catálogo.
 * Las ofertas salen en el panel de los clientes (Negocio → Mejoras) solo entre sus fechas (0105).
 * Una acción principal: «+ Nueva oferta». Las solicitudes avanzan con un botón.
 */
type Solicitud = { id: string; restaurante_id: string; local: string; precio_centimos: number; estado: string; creado_en: string };
type Oferta = { id: string; tema: string; titulo: string; descripcion: string; incluye: string[]; precio_centimos: number; precio_ancla_centimos: number | null;
  desde: string; hasta: string; activa: boolean; solicitudes: Solicitud[] };

const TEMAS: Record<string, string> = { halloween: '🎃 Halloween', navidad: '🎄 Navidad', san_valentin: '💘 San Valentín', carnaval: '🎭 Carnaval', otra: '⭐ Otra fecha' };
const SIGUIENTE: Record<string, [string, string]> = { recibida: ['en_curso', 'Empezar'], en_curso: ['entregada', 'Marcar entregada'] };
const euros = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
const dia = (d: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d));

/** Catálogo que se puede poner en oferta: precios de pricing-config, nunca escritos a mano. */
const PRODUCTOS: ProductoOferta[] = [
  { clave: 'puesta', nombre: 'Puesta a punto', frase: 'Te dejamos la carta cargada, el TPV conectado y el equipo formado.', precio: SERVICIOS_QR.puestaAPunto, incluye: ['Carta cargada por nosotros', 'Fotos de platos con IA', 'TPV conectado', 'Formación del equipo'] },
  { clave: 'autor', nombre: 'Carta de autor', frase: 'Tu carta con diseño propio: composición, colores y firma de tu local.', precio: SERVICIOS_QR.cartaDeAutor, incluye: ['Diseño propio de la carta', 'Colores y tipografía de tu marca', 'Firma y portada'] },
  { clave: 'bono', nombre: `Bono de ${SERVICIOS_QR.imagenesBonoIa} fotos con IA`, frase: 'Que todos tus platos tengan foto apetecible.', precio: SERVICIOS_QR.bonoIa, incluye: [`${SERVICIOS_QR.imagenesBonoIa} fotos de platos`, 'Sin caducidad'] },
  { clave: 'idioma', nombre: 'Idioma extra', frase: 'Tu carta en un idioma más para tus clientes de fuera.', precio: SERVICIOS_QR.idiomaExtra, incluye: ['Traducción de toda la carta', 'Se cambia sola al idioma del móvil'] },
  { clave: 'experience', nombre: 'Experience · evento llave en mano', frase: 'Un evento con entradas anticipadas para llenar tu día flojo.', precio: EXPERIENCE.tarifas.primeraParaClienteQr.precio, incluye: ['Concepto y menú del evento', 'Web de entradas', 'Cartelería y redes', 'Control de puerta'] },
  { clave: 'auditoria', nombre: 'Auditoría de canales', frase: 'Revisamos dónde vendes y te decimos qué mejorar primero.', precio: AUDITORIA_CANALES.precioOferta, incluye: ['Informe de canales', 'Reunión 1 a 1', 'Mejoras ordenadas por impacto'] },
];

export default async function Ofertas({ searchParams }: { searchParams: Promise<{ nueva?: string; editar?: string; ok?: string }> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const { hoy, ofertas } = await comoCliente(jwt, async (c) => (await c.query<{ j: { hoy: string; ofertas: Oferta[] } }>('SELECT dk.admin_ofertas_fecha() AS j')).rows[0].j);
  const solicitudes = ofertas.flatMap((o) => o.solicitudes.map((s) => ({ ...s, oferta: o.titulo })));
  const pendientes = solicitudes.filter((s) => s.estado === 'recibida' || s.estado === 'en_curso');
  const editar = ofertas.find((o) => o.id === q.editar);
  const abierto = q.nueva === '1' || !!editar;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 text-tinta sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Ventas</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Ofertas</h1>
        </div>
        {!abierto && <Link href="/admin-dkitchen/ofertas?nueva=1" className="dk-btn inline-flex min-h-[44px] items-center rounded-full bg-vino px-5 text-sm font-bold text-white" data-testid="nueva-oferta">+ Nueva oferta</Link>}
      </div>
      {q.ok && <p role="status" className="rounded-2xl bg-exito/10 px-4 py-3 text-sm text-exito">Oferta guardada. Saldrá en los paneles entre sus fechas.</p>}

      {abierto && (
        <section className="rounded-[26px] border border-oro/40 bg-[linear-gradient(160deg,#FFFDF8,#F6EEDD)] p-5 sm:p-7">
          <OfertaAsistente productos={PRODUCTOS} accion={guardarOfertaFechaAction} cerrar="/admin-dkitchen/ofertas"
            inicial={editar ? { id: editar.id, tema: editar.tema, titulo: editar.titulo, descripcion: editar.descripcion, incluye: editar.incluye, precio: editar.precio_centimos, ancla: editar.precio_ancla_centimos, desde: editar.desde, hasta: editar.hasta, activa: editar.activa } : undefined} />
        </section>
      )}

      {pendientes.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold">Las han pedido <span className="ml-1 rounded-full bg-vino px-2 py-0.5 text-sm text-white">{pendientes.length}</span></h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {pendientes.map((s) => (
              <div key={s.id} className="dk-carta flex items-center justify-between gap-3 rounded-[20px] border border-linea bg-white p-4">
                <div className="min-w-0"><Link href={`/admin-dkitchen/qr/${s.restaurante_id}`} className="block truncate font-semibold hover:text-vino">{s.local}</Link><p className="truncate text-xs text-niebla">{s.oferta} · {euros(s.precio_centimos)} + IVA</p></div>
                {SIGUIENTE[s.estado] && (
                  <form action={estadoSolicitudOfertaAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="estado" value={SIGUIENTE[s.estado][0]} />
                    <button className="dk-btn min-h-[40px] shrink-0 rounded-full bg-tinta px-4 text-xs font-bold text-white hover:bg-vino">{SIGUIENTE[s.estado][1]} →</button></form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ofertas.map((o, i) => {
          const visible = o.activa && hoy >= o.desde && hoy <= o.hasta;
          const estado = !o.activa ? 'Apagada' : hoy < o.desde ? `Sale el ${dia(o.desde)}` : hoy > o.hasta ? 'Terminada' : 'Se ve hoy';
          return (
            <Link key={o.id} href={`/admin-dkitchen/ofertas?editar=${o.id}`} style={{ ['--i' as string]: i }} className={`dk-carta group overflow-hidden rounded-[24px] border bg-white transition hover:shadow-[0_24px_60px_-36px_rgba(62,5,21,.5)] ${visible ? 'border-exito/50' : 'border-linea'}`}>
              <div className="flex items-center justify-between bg-noche px-4 py-3 text-white"><span className="text-sm">{TEMAS[o.tema] ?? o.tema}</span><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${visible ? 'bg-exito text-white' : 'bg-white/15'}`}>{estado}</span></div>
              <div className="p-4">
                <p className="font-display text-lg font-bold group-hover:text-vino">{o.titulo}</p>
                <p className="mt-1 font-display text-2xl font-bold">{euros(o.precio_centimos)} {o.precio_ancla_centimos ? <s className="text-sm font-normal text-ceniza">{euros(o.precio_ancla_centimos)}</s> : null}</p>
                <p className="mt-1 text-xs text-niebla">{dia(o.desde)} → {dia(o.hasta)} · {o.solicitudes.length} pedida{o.solicitudes.length === 1 ? '' : 's'}</p>
              </div>
            </Link>
          );
        })}
        {!ofertas.length && <p className="text-sm text-niebla">Aún no hay ofertas. Crea la primera con «+ Nueva oferta».</p>}
      </section>
    </div>
  );
}
