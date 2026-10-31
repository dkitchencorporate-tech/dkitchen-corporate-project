import type { ReactNode } from 'react';
import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { estadoFundador } from '@/lib/fundador';
import {
  QR_MENU, PLANES_QR, IDIOMAS_PLAN, puntosPlanQr, FUNDADOR, SERVICIOS_QR, QR_FISICOS,
  BASE_OPERATIVA, EXPERIENCE, AUDITORIA_CANALES, REGLAS_COMERCIALES, type PlanQr,
} from '@/lib/pricing-config';

export const dynamic = 'force-dynamic';

/**
 * Central → Vender → Precios y funciones (31/10/2026, karc0).
 * Mini presentación para comerciales y referencia única para Claude y Antigravity.
 * NADA va escrito a mano: todo sale de pricing-config.ts (precios y topes) y de la base
 * (estado de Fundador, extras en venta con su precio vigente y ofertas activas), así que
 * cualquier cambio de precio u oferta aparece aquí sin tocar esta página.
 */

type Extra = { servicio: string; nombre: string; tipo: string; precio: number | null; precio_ancla_centimos: number | null };
type Oferta = { id: string; titulo: string; descripcion: string; incluye: string[] | null; precio_centimos: number; precio_ancla_centimos: number | null; desde: string; hasta: string; activa: boolean };

const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
const cent = (c: number | null) => (c === null ? '—' : eur(c / 100));
const num = (n: number) => n.toLocaleString('es-ES');
const fecha = (f: string | null) => (f ? new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }) : '—');

const DESTACADO: PlanQr = 'ampliado';
const Si = () => <span className="font-semibold text-exito">✔</span>;
const No = () => <span className="text-niebla">—</span>;

function Seccion({ id, eyebrow, titulo, children, oscuro = false }: { id: string; eyebrow: string; titulo: string; children: ReactNode; oscuro?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-[30px] p-6 sm:p-9 ${oscuro ? 'relative overflow-hidden bg-noche text-white' : 'border border-linea bg-white'}`}>
      {oscuro && <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-vino/50 blur-3xl" />}
      <div className="relative">
        <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${oscuro ? 'text-oro' : 'text-vino'}`}>{eyebrow}</p>
        <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{titulo}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export default async function PreciosYFunciones() {
  const jwt = await exigirAdmin();
  const [fundador, extras, ofertas] = await Promise.all([
    estadoFundador(),
    comoCliente(jwt, async (c) => (await c.query<Extra>(
      'SELECT servicio, nombre, tipo, dk.precio_servicio(servicio) AS precio, precio_ancla_centimos FROM catalogo_servicios WHERE en_venta ORDER BY precio_centimos',
    )).rows).catch(() => null),
    comoCliente(jwt, async (c) => (await c.query<{ j: { hoy: string; ofertas: Oferta[] } }>('SELECT dk.admin_ofertas_fecha() AS j')).rows[0]?.j ?? null).catch(() => null),
  ]);
  const hoy = ofertas?.hoy ?? new Date().toISOString().slice(0, 10);
  const ofertasActivas = (ofertas?.ofertas ?? []).filter((o) => o.activa && o.hasta >= hoy);
  const local = QR_MENU.planes.ampliado;
  const sala = QR_MENU.planes.sala;
  const mant = BASE_OPERATIVA.mantenimiento;

  const filas: { t: string; v: (p: PlanQr) => ReactNode }[] = [
    { t: 'Primer mes', v: (p) => (QR_MENU.planes[p].primerMesSimbolico ? <b className="text-vino">{eur(QR_MENU.primerMes)}</b> : eur(QR_MENU.planes[p].mensual)) },
    { t: 'Idiomas de la carta', v: (p) => IDIOMAS_PLAN[p].replace('Carta ', '').replace('en ', '') },
    { t: 'Platos', v: (p) => num(QR_MENU.planes[p].topes.productos) },
    { t: 'Mesas', v: (p) => num(QR_MENU.planes[p].topes.mesas) },
    { t: 'Camareros (app de sala)', v: (p) => num(QR_MENU.planes[p].topes.camareros) },
    { t: 'Reservas al mes', v: (p) => num(QR_MENU.planes[p].topes.reservasMes) },
    { t: 'Comandas al TPV al mes', v: (p) => num(QR_MENU.planes[p].topes.comandasTpvMes) },
    { t: 'Historial del comandero', v: (p) => `${QR_MENU.planes[p].topes.historialDias} días` },
    { t: 'Banners de promoción', v: (p) => num(QR_MENU.planes[p].topes.banners) },
    { t: 'Llamar al camarero y pedir la cuenta', v: (p) => (QR_MENU.planes[p].llamarCamarero ? <Si /> : <No />) },
    { t: 'Pedido desde la mesa', v: (p) => (p !== 'basico' ? <Si /> : <No />) },
    { t: 'QR con su logo y colores', v: (p) => (QR_MENU.planes[p].personalizacionQr ? <Si /> : <No />) },
    { t: 'Google sincronizado y botón de reseñas', v: (p) => ('sincronizacionGoogleBusiness' in QR_MENU.planes[p] ? <Si /> : <No />) },
  ];

  const indice = [
    ['qr', 'Carta QR'], ['fundador', 'Fundador'], ['extras', 'Extras'], ['ofertas', 'Ofertas activas'],
    ['signature', 'Signature'], ['experience', 'Experience'], ['auditoria', 'Auditoría'], ['reglas', 'Qué decir y qué no'],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="relative overflow-hidden rounded-[30px] bg-noche p-6 text-white sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-vino/50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-64 w-64 rounded-full bg-oro/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-oro">Central · Vender</p>
          <h1 className="font-display mt-2 text-3xl font-semibold md:text-5xl">Precios y funciones</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">Todo lo que vendemos, cuánto cuesta y qué incluye. Se lee en directo de la configuración de precios y de la base de datos: si cambia un precio o se activa una oferta, sale aquí solo. Todos los precios son <b className="text-white">+ IVA</b>.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wider text-white/60">Entrada</p>
              <p className="font-display mt-1 text-3xl font-semibold text-oro">{eur(QR_MENU.primerMes)}</p>
              <p className="text-xs text-white/70">primer mes del plan {local.nombre}, después {eur(local.mensual)}/mes</p>
            </div>
            <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wider text-white/60">Alta</p>
              <p className="font-display mt-1 text-3xl font-semibold"><s className="text-white/40">{eur(QR_MENU.setup.precio)}</s> <span className="text-oro">0 €</span></p>
              <p className="text-xs text-white/70">«Alta de {eur(QR_MENU.setup.precio)} incluida» · sin permanencia</p>
            </div>
            <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wider text-white/60">Comisión por venta</p>
              <p className="font-display mt-1 text-3xl font-semibold text-oro">{REGLAS_COMERCIALES.cobraComision ? '¿?' : '0 %'}</p>
              <p className="text-xs text-white/70">nunca cobramos porcentaje: tarifas fijas</p>
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Secciones" className="flex gap-2 overflow-x-auto pb-1">
        {indice.map(([id, n]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-linea bg-white px-3.5 py-1.5 text-sm font-medium text-carbon hover:border-vino">{n}</a>)}
      </nav>

      <Seccion id="qr" eyebrow="Peldaño 1 · autoservicio" titulo="Carta QR: tres planes por cantidad">
        <div className="grid gap-4 md:grid-cols-3">
          {PLANES_QR.map((p) => {
            const pl = QR_MENU.planes[p];
            const d = p === DESTACADO;
            return (
              <article key={p} className={`flex flex-col rounded-[24px] p-5 ${d ? 'bg-noche text-white ring-2 ring-oro' : 'bg-papel ring-1 ring-linea'}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl font-semibold">{pl.nombre}</h3>
                  {d && <span className="rounded-full bg-oro px-2.5 py-0.5 text-xs font-bold text-noche">Recomendado</span>}
                </div>
                <p className="mt-2"><span className="font-display text-4xl font-semibold">{eur(pl.mensual)}</span><span className={d ? 'text-white/60' : 'text-niebla'}> /mes</span></p>
                <p className={`mt-1 text-sm ${d ? 'text-oro' : 'text-carbon'}`}>{pl.primerMesSimbolico ? `Primer mes: ${eur(QR_MENU.primerMes)}` : 'Sin mes a 1 €'}</p>
                <p className={`mt-3 text-sm ${d ? 'text-white/75' : 'text-carbon'}`}>{pl.resumen}</p>
                <ul className={`mt-4 space-y-1.5 text-sm ${d ? 'text-white/90' : 'text-carbon'}`}>
                  {puntosPlanQr(p).map((x) => <li key={x} className="flex gap-2"><span className={d ? 'text-oro' : 'text-vino'}>•</span>{x}</li>)}
                </ul>
              </article>
            );
          })}
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-linea">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-papel text-left"><tr><th className="p-3 font-semibold">Comparativa</th>{PLANES_QR.map((p) => <th key={p} className={`p-3 font-semibold ${p === DESTACADO ? 'text-vino' : ''}`}>{QR_MENU.planes[p].nombre} · {eur(QR_MENU.planes[p].mensual)}</th>)}</tr></thead>
            <tbody>{filas.map((f) => <tr key={f.t} className="border-t border-linea"><td className="p-3 text-carbon">{f.t}</td>{PLANES_QR.map((p) => <td key={p} className={`p-3 ${p === DESTACADO ? 'bg-vino/[0.04] font-medium' : ''}`}>{f.v(p)}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-niebla">Margen de cortesía del 10 % antes de bloquear; la llamada al camarero nunca se corta. Más de {num(sala.topeProductos)} platos o {num(sala.topes.comandasTpvMes)} comandas → plan a medida.</p>
      </Seccion>

      <Seccion id="fundador" eyebrow="Oferta de lanzamiento" titulo={`Fundador: Sala a ${eur(FUNDADOR.mensual)}/mes de por vida`} oscuro>
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2 text-sm text-white/80">
            <p><b className="text-white">Plan {sala.nombre}</b> (normal {eur(sala.mensual)}/mes) por <b className="text-oro">{eur(FUNDADOR.mensual)}/mes</b>, un {Math.round(FUNDADOR.descuento * 100)} % menos.</p>
            <p>Se cobra <b className="text-white">{eur(FUNDADOR.trimestre)} por trimestre</b>. Vitalicio mientras siga en {sala.nombre} y sin impagos.</p>
            <p><b className="text-white">Signature Fundador:</b> entrada de {eur(FUNDADOR.signature.entrada)} (pago único) y {eur(FUNDADOR.signature.mensual)}/mes durante {FUNDADOR.signature.meses} meses. Comparte las plazas y el plazo.</p>
            <p>Límite: {FUNDADOR.plazas} plazas o {FUNDADOR.dias} días desde que se abre, lo que llegue antes.</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/10">
            {fundador ? (
              <>
                <p className={`text-xs font-bold uppercase tracking-wider ${fundador.abierto ? 'text-exito' : 'text-red-300'}`}>{fundador.abierto ? 'Abierto ahora' : 'Cerrado'}</p>
                <p className="font-display mt-1 text-5xl font-semibold text-oro">{fundador.quedan}<span className="text-xl text-white/60"> / {fundador.plazas} plazas libres</span></p>
                <p className="mt-2 text-sm text-white/70">Abierto el {fecha(fundador.abiertoEn)} · cierra el <b className="text-white">{fecha(fundador.cierraEn)}</b></p>
                <Link href="/admin-dkitchen/fundador" className="mt-3 inline-block text-sm text-oro underline">Ver fundadores</Link>
              </>
            ) : <p className="text-sm text-white/70">No se pudo leer el estado en directo: trátalo como cerrado.</p>}
          </div>
        </div>
      </Seccion>

      <Seccion id="extras" eyebrow="Pago único · en venta ahora" titulo="Extras de la Carta QR">
        {extras && extras.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map((x) => (
              <div key={x.servicio} className="rounded-2xl bg-papel p-4 ring-1 ring-linea">
                <p className="font-medium">{x.nombre}</p>
                <p className="mt-1"><span className="font-display text-2xl font-semibold text-vino">{cent(x.precio)}</span>{x.precio_ancla_centimos ? <s className="ml-2 text-sm text-niebla">{cent(x.precio_ancla_centimos)}</s> : null}<span className="ml-1 text-xs text-niebla">{x.tipo === 'mensual' ? '/mes' : 'pago único'}</span></p>
                {x.servicio === 'setup_esencial' && <p className="mt-1 text-xs text-carbon">Bienvenida: {eur(SERVICIOS_QR.puestaAPuntoBienvenida)} solo desde «Pago confirmado» tras el alta.</p>}
                {x.servicio === 'bono_ia' && <p className="mt-1 text-xs text-carbon">{SERVICIOS_QR.imagenesBonoIa} imágenes; {SERVICIOS_QR.imagenesGratisIa} gratis siempre.</p>}
              </div>
            ))}
            <div className="rounded-2xl bg-papel p-4 ring-1 ring-linea">
              <p className="font-medium">Etiquetas QR físicas</p>
              <p className="mt-1 text-sm text-carbon">{QR_FISICOS.etiquetas.tandas.map((t) => `${t.unidades} uds. ${eur(t.precio)}`).join(' · ')}</p>
              <p className="mt-1 text-xs text-niebla">Vinilo, atril y metacrilato: presupuesto.</p>
            </div>
          </div>
        ) : <p className="text-sm text-niebla">No se pudo leer el catálogo en directo.</p>}
      </Seccion>

      <Seccion id="ofertas" eyebrow="En directo desde Central → Ofertas" titulo="Ofertas activas">
        {ofertasActivas.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {ofertasActivas.map((o) => (
              <div key={o.id} className="rounded-2xl bg-papel p-4 ring-1 ring-oro/60">
                <p className="font-display text-lg font-semibold">{o.titulo}</p>
                <p className="mt-1 text-sm text-carbon">{o.descripcion}</p>
                <p className="mt-2"><span className="font-display text-2xl font-semibold text-vino">{cent(o.precio_centimos)}</span>{o.precio_ancla_centimos ? <s className="ml-2 text-sm text-niebla">{cent(o.precio_ancla_centimos)}</s> : null}</p>
                <p className="mt-1 text-xs text-niebla">Del {fecha(o.desde)} al {fecha(o.hasta)}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-carbon">No hay ninguna oferta activa. <b>No se ofrece ningún otro descuento</b>: solo el descuento manual del comercial (máximo 10 %, con motivo).</p>}
        <Link href="/admin-dkitchen/ofertas" className="mt-3 inline-block text-sm text-vino underline">Gestionar ofertas</Link>
      </Seccion>

      <Seccion id="signature" eyebrow="Peldaño 4 · app propia" titulo="Signature: la app del restaurante">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-papel p-5 ring-1 ring-linea">
            <p className="text-xs uppercase tracking-wider text-niebla">Entrada</p>
            <p className="font-display mt-1 text-3xl font-semibold">{eur(BASE_OPERATIVA.pagoUnico)}</p>
            <p className="text-sm text-carbon">pago único · o {BASE_OPERATIVA.fraccionado.cuotas} cuotas de {eur(BASE_OPERATIVA.fraccionado.importeCuota)} ({eur(BASE_OPERATIVA.fraccionado.cuotas * BASE_OPERATIVA.fraccionado.importeCuota)})</p>
          </div>
          <div className="rounded-2xl bg-papel p-5 ring-1 ring-linea md:col-span-2">
            <p className="text-xs uppercase tracking-wider text-niebla">Mantenimiento · desde el mes {mant.empiezaEnMes} ({mant.mesesGratis} meses gratis)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {mant.tramos.map((t) => (
                <div key={t.id} className="rounded-xl bg-white p-3 ring-1 ring-linea">
                  <p className="font-medium">{t.nombre}</p>
                  <p className="font-display text-2xl font-semibold text-vino">{eur(t.cuota)}<span className="text-xs text-niebla">/mes</span></p>
                  <p className="text-xs text-carbon">hasta {num(t.hastaVentas)} €/mes o {num(t.hastaPedidos)} pedidos</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-niebla">A medida desde {eur(mant.aMedida.desde)}/mes + {eur(mant.aMedida.porLocalAdicional)} por local adicional. Pack de arranque incluido (valor {eur(BASE_OPERATIVA.packArranque.valorDeclarado)}).</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-carbon"><b>Exclusivo de Signature:</b> el carrito propio del comensal y el asistente con IA. Nada de eso se promete con la Carta QR.</p>
      </Seccion>

      <div className="grid gap-6 md:grid-cols-2">
        <Seccion id="experience" eyebrow="Peldaño 2 · eventos" titulo="Experience">
          <ul className="space-y-2 text-sm">
            {Object.entries(EXPERIENCE.tarifas).map(([k, t]) => <li key={k} className="flex items-baseline justify-between gap-3 border-b border-linea pb-2"><span className="text-carbon">{t.cuando}</span><b className="font-display text-lg text-vino">{eur(t.precio)}</b></li>)}
          </ul>
          <p className="mt-3 text-xs text-niebla">{EXPERIENCE.comision} % de comisión: las entradas las cobra el local con su propio Stripe. Los anuncios los paga el local.</p>
        </Seccion>
        <Seccion id="auditoria" eyebrow="Peldaño 3" titulo="Auditoría de canales">
          <p><span className="font-display text-5xl font-semibold text-vino">{eur(AUDITORIA_CANALES.precioOferta)}</span> <s className="text-niebla">{eur(AUDITORIA_CANALES.precioAncla)}</s></p>
          <p className="mt-2 text-sm text-carbon">Uno a uno, con reunión. Revisamos plataformas, comisiones y presencia en Google.</p>
        </Seccion>
      </div>

      <Seccion id="reglas" eyebrow="Para comerciales, Claude y Antigravity" titulo="Qué decir y qué no">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-exito/[0.06] p-5 ring-1 ring-exito/30">
            <p className="font-semibold text-exito">Se puede decir</p>
            <ul className="mt-2 space-y-1.5 text-sm text-carbon">
              <li>«Desde {eur(QR_MENU.primerMes)}» = plan {local.nombre} el primer mes, después {eur(local.mensual)}/mes.</li>
              <li>Con «desde {eur(QR_MENU.primerMes)}»: {IDIOMAS_PLAN.ampliado.toLowerCase()}, pedido desde la mesa, llamar al camarero, QR con logo, Google y reseñas.</li>
              <li>Sin permanencia. Puesta a punto regalada. 0 % de comisión.</li>
              <li>Demo de su carta hecha, gratis, antes de pagar nada.</li>
              <li>Puesta a punto (te cargamos la carta): {eur(SERVICIOS_QR.puestaAPunto)}, o {eur(SERVICIOS_QR.puestaAPuntoBienvenida)} justo después de pagar el euro.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-red-600/[0.05] p-5 ring-1 ring-red-600/25">
            <p className="font-semibold text-red-700">No se puede decir</p>
            <ul className="mt-2 space-y-1.5 text-sm text-carbon">
              <li>«3 idiomas» con «desde {eur(QR_MENU.primerMes)}» (eso es {sala.nombre}, o idioma extra a {eur(SERVICIOS_QR.idiomaExtra)}).</li>
              <li>Pedido desde la mesa en el plan {QR_MENU.planes.basico.nombre} ({eur(QR_MENU.planes.basico.mensual)}).</li>
              <li>Carrito propio o asistente con IA fuera de Signature.</li>
              <li>«Montaje gratis» en la web, en reels o en anuncios: solo para clientes de flyers y visitas (cupo de 20), y lo dice el comercial en persona.</li>
              <li>Descuentos u ofertas que no estén en esta página. Descuento del comercial: máximo 10 %, con motivo.</li>
              <li>{REGLAS_COMERCIALES.usaReferidos ? '' : 'Programas de referidos (no existen).'}</li>
            </ul>
          </div>
        </div>
      </Seccion>
    </div>
  );
}
