import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { listarClientesQr, solicitudesQrAdmin, pestanaDe, type ClienteQr, type SolicitudQrAdmin } from '@/lib/admin-clientes';
import { estadoSolicitudAction } from '@/app/admin-dkitchen/qr/actions';
import { nombrePlan } from '@/lib/pricing-config';
import { esComercialActual } from '@/lib/rol-central';
import Tablero, { type Columna, type Tarjeta } from '@/components/admin/tablero/Tablero';
import NuevoCliente from '@/components/admin/NuevoCliente';

export const dynamic = 'force-dynamic';

/**
 * Servicios → Carta QR (decisiones 3, 7 y 8 de karc0, 01/11).
 * Tablero de cartas Alta → Montaje → Revisión → Activa: la fase la marcan los datos reales del local
 * (pago, platos subidos, primeros escaneos), así que no se mueve a mano: el botón lleva a lo que falta.
 * Debajo, el tablero de QR físicos Pedido → Impreso → Enviado, con cambio de fase por botón.
 */
const COLUMNAS: Columna[] = [
  { clave: 'alta', nombre: 'Alta', fases: ['alta'] },
  { clave: 'montaje', nombre: 'Montaje', fases: ['montaje'] },
  { clave: 'revision', nombre: 'Revisión', fases: ['revision'] },
  { clave: 'activa', nombre: 'Activa', fases: ['activa'] },
];
const COLUMNAS_FISICO: Columna[] = [
  { clave: 'pedido', nombre: 'Pedido', fases: ['solicitado', 'presupuestado', 'pagado'] },
  { clave: 'impreso', nombre: 'Impreso', fases: ['en_produccion'] },
  { clave: 'enviado', nombre: 'Enviado', fases: ['enviado'] },
];
const SIGUIENTE_FISICO: Record<string, [string, string]> = { solicitado: ['en_produccion', 'Marcar impreso'], presupuestado: ['en_produccion', 'Marcar impreso'], pagado: ['en_produccion', 'Marcar impreso'], en_produccion: ['enviado', 'Marcar enviado'] };

function faseCarta(c: ClienteQr): string {
  if (!c.activo && c.estadoAcceso !== 'activo') return 'alta';
  if (c.platos === 0) return 'montaje';
  if (c.escaneos14d === 0 && !c.tutorialCompletado) return 'revision';
  return 'activa';
}
const QUE_FALTA: Record<string, string> = { alta: 'Esperando el pago', montaje: 'Subir la carta', revision: 'Revisar y probar el QR', activa: 'En marcha' };

export default async function ServiciosQrPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const jwt = await exigirAdmin();
  const [todos, pedidos, sp, esComercial] = await Promise.all([
    listarClientesQr(jwt),
    solicitudesQrAdmin(jwt).catch(() => [] as SolicitudQrAdmin[]),
    searchParams,
    esComercialActual(jwt),
  ]);
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const reales = todos.filter((c) => !c.soloProyecto && !['archivados', 'demo', 'bajas'].includes(pestanaDe(c, hoy)));
  const plan = sp.plan && ['basico', 'ampliado', 'sala'].includes(sp.plan) ? sp.plan : null;
  const vista = plan ? reales.filter((c) => c.plan === plan) : reales;

  const tarjetas: Tarjeta[] = vista.map((c) => {
    const fase = faseCarta(c);
    return {
      id: c.restauranteId, titulo: c.nombre, sub: `${nombrePlan(c.plan)} · ${QUE_FALTA[fase]}`, fase,
      fecha: c.creadoEn.slice(0, 10), href: `/admin-dkitchen/qr/${c.restauranteId}`, moverCon: 'ninguno',
      importe: fase === 'activa' ? `${c.escaneosMes} escaneos` : `${c.platos} platos`,
      etiqueta: c.nombre.startsWith('PRUEBA') ? 'prueba' : pestanaDe(c, hoy) === 'prueba' ? 'en prueba' : pestanaDe(c, hoy) === 'riesgo' ? 'riesgo' : null,
      extra: fase !== 'activa' ? (
        <Link href={`/admin-dkitchen/qr/${c.restauranteId}${fase === 'montaje' ? '?pestana=carta' : ''}`} className="dk-btn mt-2.5 flex min-h-[40px] items-center justify-center rounded-full bg-tinta text-xs font-bold text-white hover:bg-vino">
          {fase === 'alta' ? 'Ver su enlace de pago →' : fase === 'montaje' ? 'Montar su carta →' : 'Revisar su carta →'}
        </Link>
      ) : undefined,
    };
  });

  const tarjetasFisico: Tarjeta[] = pedidos.filter((p) => p.estado !== 'cancelado').map((p) => {
    const sig = SIGUIENTE_FISICO[p.estado];
    return {
      id: p.id, titulo: p.restaurante, sub: `${p.cantidad} × ${p.tipo}${p.direccionEnvio ? ` · ${p.direccionEnvio}` : ''}`, fase: p.estado,
      fecha: p.creadoEn.slice(0, 10), href: `/admin-dkitchen/qr/${p.restauranteId}`, moverCon: 'ninguno',
      extra: sig ? (
        <form action={estadoSolicitudAction} className="mt-2.5">
          <input type="hidden" name="solicitudId" value={p.id} /><input type="hidden" name="estado" value={sig[0]} />
          <button className="dk-btn min-h-[40px] w-full rounded-full bg-tinta text-xs font-bold text-white hover:bg-vino">{sig[1]} →</button>
        </form>
      ) : undefined,
    };
  });

  const n = (f: string) => tarjetas.filter((t) => t.fase === f).length;
  return (
    <div className="space-y-5 px-4 py-6 text-tinta sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Servicios</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Carta QR</h1>
        </div>
        <NuevoCliente servicio="qr" etiqueta="+ Nuevo Carta QR" esComercial={esComercial} />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[[String(n('activa')), 'cartas activas'], [String(n('montaje') + n('revision')), 'por montar o revisar'], [String(reales.reduce((s, c) => s + c.escaneosMes, 0)), 'escaneos este mes']].map(([v, t]) => (
          <div key={t} className="rounded-[20px] bg-white p-3.5 shadow-[0_10px_30px_-24px_rgba(62,5,21,.5)]"><b className="cv-cifra block font-display text-2xl">{v}</b><span className="text-xs text-niebla">{t}</span></div>
        ))}
      </div>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Plan">
        {[['', 'Todos'], ['basico', nombrePlan('basico')], ['ampliado', nombrePlan('ampliado')], ['sala', nombrePlan('sala')]].map(([k, t]) => (
          <Link key={k} href={k ? `/admin-dkitchen/servicios/qr?plan=${k}` : '/admin-dkitchen/servicios/qr'} className={`rounded-full px-4 py-2 font-semibold ${(plan ?? '') === k ? 'bg-tinta text-white' : 'border border-linea bg-white'}`}>{t}</Link>
        ))}
      </nav>

      <Tablero columnas={COLUMNAS} tarjetas={tarjetas} volver="/admin-dkitchen/servicios/qr" />

      <section className="space-y-3 pt-4">
        <h2 className="font-display text-2xl font-bold">QR físicos</h2>
        <Tablero columnas={COLUMNAS_FISICO} tarjetas={tarjetasFisico} volver="/admin-dkitchen/servicios/qr" />
      </section>
    </div>
  );
}
