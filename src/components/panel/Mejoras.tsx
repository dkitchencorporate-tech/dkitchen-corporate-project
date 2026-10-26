'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useEffect, useState, useTransition } from 'react';
import type { EstadoServicios, OfertaFecha, Servicio } from '@/lib/servicios';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { QR_MENU, puntosPlanQr } from '@/lib/pricing-config';
import { comprarServicioAction, solicitarOfertaFechaAction } from '@/app/panel/actions';
import SaltoSignature from './SaltoSignature';

const WHATSAPP_DK = '#solicitud-signature';

const euros = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);

const MODULOS: { id: Servicio; titulo: string; resuelve: string; como: string; incluye: string[] }[] = [
  { id: 'plano_mesas', titulo: 'Plano de mesas', resuelve: 'Ves tu local de un vistazo: qué mesa llama, cuál pide la cuenta y de quién es cada mesa.',
    como: 'Dibujas tu local una vez (paredes, barra, puertas, terraza) y colocas tus mesas. Creas zonas y se las asignas a cada camarero.',
    incluye: ['Editor de sala en pantalla completa', 'Zonas por camarero con un toque', 'Mesas que llaman, resaltadas en el plano'] },
  { id: 'app_sala', titulo: 'App de sala', resuelve: 'Adiós a las comandas en papel y a las mesas olvidadas: cada camarero lleva sus mesas en el móvil.',
    como: 'Cada camarero recibe un enlace personal (sin contraseñas). Ve sus mesas y llamadas, y anota lo que pide cada mesa en segundos.',
    incluye: ['Avisos de llamada con sonido y vibración', 'Registro de comandas por mesa', 'Informe por camarero: comandas, productos, llamadas y tiempo de respuesta', 'Mesa sin dueño: la toma quien la atiende'] },
  { id: 'conexion_tpv', titulo: 'Conexión con tu TPV', resuelve: 'Lo que anota el camarero llega a tu TPV (lo conectamos y lo adaptamos a tu configuración), hasta las comandas al mes de tu plan. Sin teclear dos veces ni errores.',
    como: 'DKitchen configura la conexión con tu TPV. Tu TPV sigue siendo quien cobra y factura.',
    incluye: ['Compatible con la mayoría de TPV en España', 'Tu facturación no cambia (Verifactu, gestoría)', 'Instalación y pruebas hechas por DKitchen'] },
];

/**
 * Mejoras (R5, 28/10/2026, karc0): la ÚNICA zona del panel donde se compra algo. Arriba, las ofertas
 * por fecha que Central tiene encendidas hoy (0105); después, los extras de pago único (bono de 50 fotos,
 * idioma extra, puesta a punto) y lo que ya trae el plan. El resto del panel enlaza aquí.
 */
export default function Mejoras({ restaurante, servicios, demo = false }: { restaurante: MiRestaurante; servicios: EstadoServicios; demo?: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const plan = QR_MENU.planes[(restaurante.plan in QR_MENU.planes ? restaurante.plan : 'basico') as 'basico' | 'ampliado' | 'sala'];
  const precio = (s: Servicio) => servicios.catalogo.find((c) => c.servicio === s);
  const tiene = (s: Servicio) => servicios.contratados.some((c) => c.servicio === s || (c.servicio === 'pack_sala' && ['plano_mesas', 'app_sala', 'conexion_tpv'].includes(s)));
  const nModulos = MODULOS.length;
  // Enlaces a un extra concreto (p. ej. #bono-ia desde «Crear con IA»): la pestaña se pinta después de cargar.
  useEffect(() => { const h = window.location.hash.slice(1); if (h) document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);

  function comprar(s: Servicio) {
    setError(null);
    if (demo) { setError('En la demo no se puede contratar.'); return; }
    iniciar(async () => {
      try { const { url } = await comprarServicioAction(s); window.location.href = url; }
      catch (e) { setError(mensajeError(e, 'No se pudo enviar la solicitud.')); }
    });
  }

  const Boton = ({ s, texto }: { s: Servicio; texto?: string }) =>
    s !== 'idioma_extra' && s !== 'bono_ia' && tiene(s) ? (
      <span className="block rounded-xl bg-green-500/15 py-3 text-center text-sm font-bold text-green-700">✓ Activo en tu cuenta</span>
    ) : (
      <button disabled={pendiente} onClick={() => comprar(s)} className="w-full rounded-full bg-vino py-3 text-sm font-bold text-white hover:bg-vino-hondo disabled:opacity-50">
        {pendiente ? 'Enviando…' : texto ?? 'Activar'}
      </button>
    );

  const puesta = !tiene('setup_esencial') && !tiene('setup_experto') ? precio('setup_esencial') : undefined;
  const bono = precio('bono_ia');
  const idioma = precio('idioma_extra');
  const credito = servicios.credito;
  const diasCredito = credito ? Math.max(0, Math.ceil((new Date(credito.venceEn).getTime() - Date.now()) / 86400000)) : 0;
  const ofertas = servicios.ofertasFecha ?? [];

  return (
    <div className="space-y-12">
      <header>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Mejoras para tu local</h2>
        <p className="mt-1 text-sm text-niebla">Todo lo que puedes añadir, en un solo sitio. Cada mejora te dice su precio antes de pedirla; tu plan ya trae la sala completa por cantidades.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      </header>

      {ofertas.length > 0 && <OfertasTemporada ofertas={ofertas} demo={demo} />}

      {/* EXTRAS DE PAGO ÚNICO: el bono de fotos, los idiomas y la puesta a punto solo se venden aquí */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-vino">Extras de pago único</p>
          <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight">Lo pagas una vez. Sin cuota.</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {bono && (
            <article id="bono-ia" className="flex scroll-mt-24 flex-col rounded-2xl border border-vino/40 bg-vino/[0.06] p-5">
              <p className="text-2xl" aria-hidden="true">✨</p>
              <h4 className="mt-2 text-lg font-bold">Bono de 50 fotos con IA</h4>
              <p className="mt-1 flex-1 text-sm text-grafito">Fotos de tus platos y banners, creadas o mejoradas con IA. Tienes 3 gratis siempre; el bono suma 50 que <strong>nunca caducan</strong> y son tuyas. Se usan desde «✨ Crear con IA» al poner una foto.</p>
              <div className="mt-4"><Boton s="bono_ia" texto={`Pedir el bono · ${euros(bono.precioCentimos)} + IVA`} /></div>
            </article>
          )}
          {idioma && (
            <article className="flex flex-col rounded-2xl border border-linea bg-white p-5">
              <p className="text-2xl" aria-hidden="true">🌍</p>
              <h4 className="mt-2 text-lg font-bold">Un idioma más en tu carta</h4>
              <p className="mt-1 flex-1 text-sm text-grafito">¿Recibes turistas? Tu plan ya trae sus idiomas; cada uno más lo <strong>traducimos nosotros</strong> (platos, descripciones y secciones) y tus clientes lo eligen en la carta.</p>
              <div className="mt-4"><Boton s="idioma_extra" texto={`Añadir un idioma · ${euros(idioma.precioCentimos)} + IVA`} /></div>
            </article>
          )}
          {puesta && (
            <article className="flex flex-col rounded-2xl border border-linea bg-white p-5">
              <p className="text-2xl" aria-hidden="true">🧑‍🍳</p>
              <h4 className="mt-2 text-lg font-bold">Puesta a punto</h4>
              <p className="mt-1 flex-1 text-sm text-grafito">Un experto de DKitchen te deja la carta perfecta contigo, sin cambiar el diseño: categorías, textos, alérgenos, fotos, horarios y tu ficha de Google.</p>
              <div className="mt-4"><Boton s="setup_esencial" texto={`Pedir la puesta a punto · ${euros(puesta.precioCentimos)} + IVA`} /></div>
            </article>
          )}
        </div>
      </section>

      <SaltoSignature />

      {/* SALA: incluida en todos los planes por cantidades (0068) */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-vino">Incluido en tu plan {plan.nombre}</p>
          <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight">Organiza el servicio en sala sin cambiar tu TPV</h3>
          <p className="mt-1 text-sm text-niebla">Plano, app de sala, conexión con tu TPV y comandero vienen en todos los planes. Lo que cambia es la cantidad: {puntosPlanQr(plan.id).slice(0, 5).join(' · ')}.</p>
        </div>
        <div className="space-y-4">
          {MODULOS.map((m) => (
            <article key={m.id} className="grid gap-4 rounded-2xl border border-linea bg-white p-5 md:grid-cols-[1fr_14rem]">
              <div>
                <h4 className="text-lg font-bold">{m.titulo}</h4>
                <p className="mt-1 text-sm text-grafito">{m.resuelve}</p>
                <p className="mt-2 text-sm text-niebla"><strong className="text-grafito">Cómo funciona:</strong> {m.como}</p>
                <ul className="mt-3 grid gap-1 text-sm text-grafito sm:grid-cols-2">{m.incluye.map((i) => <li key={i}>✓ {i}</li>)}</ul>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <span className="block rounded-xl bg-green-500/15 py-3 text-center text-sm font-bold text-green-700">✓ Incluido en tu plan</span>
              </div>
            </article>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-vino/50 bg-vino/10 p-5">
          <div>
            <p className="font-bold">¿Se te queda pequeño?</p>
            <p className="text-sm text-niebla">{restaurante.plan === 'sala' ? 'Si superas los topes de Sala o tienes varios locales, te preparamos un plan personalizado.' : 'Sube de plan y tendrás más platos, mesas, camareros y comandas al TPV.'}</p>
          </div>
          <div className="w-full sm:w-56">
            {restaurante.plan === 'sala'
              ? <a href={WHATSAPP_DK} className="block rounded-xl border border-linea-fuerte py-3 text-center text-sm font-bold">Pedir plan personalizado</a>
              : <a href="/panel?pestana=plan" className="block rounded-xl border border-linea-fuerte py-3 text-center text-sm font-bold">Ver planes</a>}
          </div>
        </div>
      </section>

      {/* QR ≠ DKitchen Signature (Núcleo Operativo) */}
      <MapaNucleo credito={credito ? { euros: euros(credito.centimos), dias: diasCredito } : null} nModulos={nModulos} precioTodo={euros(QR_MENU.planes.sala.mensual * 100)} />
    </div>
  );
}

/** Acento y sello de cada fecha (Gran Reserva: fondo noche, color propio por tema). */
const TEMAS: Record<OfertaFecha['tema'], { sello: string; acento: string }> = {
  halloween: { sello: '🎃', acento: '#E8792B' },
  navidad: { sello: '🎄', acento: '#D4AF37' },
  san_valentin: { sello: '💘', acento: '#E0607E' },
  carnaval: { sello: '🎭', acento: '#B48CE8' },
  otra: { sello: '⭐', acento: '#F2C14E' },
};
const fechaCorta = (d: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(d));

function OfertasTemporada({ ofertas, demo }: { ofertas: OfertaFecha[]; demo: boolean }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [pedidas, setPedidas] = useState<Record<string, true>>({});
  const [error, setError] = useState<string | null>(null);

  async function pedir(o: OfertaFecha) {
    setError(null);
    if (demo) { setError('En la demo no se puede pedir. En tu panel real, nos llega tu solicitud al momento.'); return; }
    setEnviando(o.id);
    const r = await solicitarOfertaFechaAction(o.id).catch(() => ({ ok: false as const, error: 'No se pudo enviar. Inténtalo en unos segundos.' }));
    if (r.ok && r.url) { window.location.href = r.url; return; }
    setEnviando(null);
    if (r.ok) setPedidas((p) => ({ ...p, [o.id]: true }));
    else setError(r.error);
  }

  return (
    <section className="space-y-4" aria-labelledby="ofertas-temporada">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-vino">Oferta de temporada</p>
        <h3 id="ofertas-temporada" className="font-display mt-1 text-2xl font-semibold tracking-tight">Prepara tu local para las fechas que más venden</h3>
        <p className="mt-1 text-sm text-niebla">Lo montamos nosotros en tu carta. Solo durante estos días.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      </div>
      <div className={`grid gap-4 ${ofertas.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {ofertas.map((o) => {
          const t = TEMAS[o.tema] ?? TEMAS.otra;
          const pedida = pedidas[o.id] || (o.solicitada !== null && o.solicitada !== 'descartada');
          return (
            <article key={o.id} className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-crema shadow-[0_20px_50px_rgba(10,8,12,.28)] md:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${t.acento}55, transparent 70%)` }} aria-hidden="true" />
              <span className="pointer-events-none absolute -bottom-6 right-4 select-none text-[120px] leading-none opacity-[0.12]" aria-hidden="true">{t.sello}</span>
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: t.acento }}>Hasta el {fechaCorta(o.hasta)}</p>
                <h4 className="font-display mt-2 text-3xl font-semibold tracking-tight">{o.titulo}</h4>
                <p className="mt-2 max-w-md text-sm text-crema/75">{o.descripcion}</p>
                {o.incluye.length > 0 && (
                  <ul className="mt-5 space-y-2 text-sm">
                    {o.incluye.map((i) => <li key={i} className="flex gap-2.5"><span style={{ color: t.acento }} aria-hidden="true">✦</span><span>{i}</span></li>)}
                  </ul>
                )}
                <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
                  <p>
                    {o.precio_ancla_centimos && <span className="mr-2 text-sm text-crema/50 line-through">{euros(o.precio_ancla_centimos)}</span>}
                    <span className="font-display text-4xl font-semibold">{euros(o.precio_centimos)}</span>
                    <span className="ml-1 text-sm text-crema/60">+ IVA · pago único</span>
                  </p>
                  {pedida ? (
                    <p className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold" role="status">✓ Solicitud recibida: te escribimos para prepararla</p>
                  ) : (
                    <button disabled={enviando !== null} onClick={() => pedir(o)} className="rounded-full px-6 py-3 text-sm font-bold text-noche transition hover:brightness-110 disabled:opacity-50" style={{ background: t.acento }}>
                      {enviando === o.id ? 'Enviando…' : 'Lo quiero'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MapaNucleo({ credito, nModulos, precioTodo }: { credito: { euros: string; dias: number } | null; nModulos: number; precioTodo: string }) {
  const filas: [string, string, string][] = [
    ['Qué es', 'Tu carta digital y herramientas de sala', 'Tu propio sistema operativo del restaurante'],
    ['El cliente final', 'Mira la carta (no pide)', 'Pide y paga: en mesa, para recoger y a domicilio'],
    ['Pedidos y cocina', '—', 'Comandas y tickets automáticos a cocina y barra'],
    ['Cobros y ventas', 'Los gestiona tu TPV', 'TPV propio, historial de ventas y cierres'],
    ['Marca', 'Plantillas de DKitchen', 'App/web con tu marca, diseño de autor'],
    ['Propiedad', 'Servicio mensual: si lo dejas, se apaga', 'En propiedad: el sistema es tuyo'],
    ['Precio', `Plan Sala, todo incluido = ${precioTodo}/mes`, 'Entrada + desde 99 €/mes (según volumen)'],
  ];
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-vino">El siguiente nivel</p>
        <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight">QR Menú y DKitchen Signature no son lo mismo</h3>
        <p className="mt-1 text-sm text-niebla">
          El QR es una herramienta para tu carta y tu sala. DKitchen Signature es el sistema que gestiona todo tu restaurante, y el código de tu app es tuyo.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-linea">
        <div className="grid grid-cols-2 bg-papel text-xs font-semibold uppercase tracking-wider">
          <p className="p-3 text-niebla">QR Menú · lo que tienes</p>
          <p className="border-l border-linea p-3 text-vino">DKitchen Signature</p>
        </div>
        {filas.map(([k, a, b]) => (
          <div key={k} className="border-t border-linea">
            <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ceniza">{k}</p>
            <div className="grid grid-cols-2 text-sm">
              <p className="p-3 pt-1 text-grafito">{a}</p>
              <p className="border-l border-linea p-3 pt-1 font-medium">{b}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-gradient-to-r from-vino/25 to-transparent p-5">
        <p className="font-bold">Con el plan más completo del QR pagarías {precioTodo}/mes y la app nunca sería tuya. Con DKitchen Signature empiezas desde 99 €/mes y el código de tu app es tuyo.</p>
        {credito && nModulos > 0 ? (
          <p className="mt-2 text-sm">
            🎁 Te descontamos lo que ya llevas pagado: <strong>{credito.euros}</strong> de la entrada de Signature (hasta la mitad).
            <strong className="text-vino"> Te quedan {credito.dias} días</strong> para aprovecharlo.
          </p>
        ) : (
          <p className="mt-2 text-sm text-niebla">Si das el salto, parte de lo que hayas pagado se descuenta de la entrada de Signature.</p>
        )}
        <a href="/panel?pestana=soporte&asunto=Quiero%20conocer%20DKitchen%20Signature" className="mt-4 inline-block rounded-full bg-tinta px-5 py-2.5 text-sm font-bold text-white">
          Quiero conocer DKitchen Signature
        </a>
      </div>
    </section>
  );
}
