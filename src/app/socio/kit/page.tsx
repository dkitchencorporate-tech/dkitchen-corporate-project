import QRCode from 'qrcode';
import { exigirSocio } from '@/lib/guard-admin';
import { fichaSocio } from '@/lib/socio';
import { estadoFundador } from '@/lib/fundador';
import { QR_MENU, FUNDADOR } from '@/lib/pricing-config';

export const dynamic = 'force-dynamic';

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';

const OBJECIONES: [string, string][] = [
  ['«Ya tengo la carta en PDF.»', 'El PDF no se actualiza solo ni se ve bien en el móvil. Aquí cambias un precio o quitas un plato agotado en 10 segundos desde tu móvil y tus clientes lo ven al momento. Además entran reservas y avisos al camarero.'],
  ['«No tengo tiempo para montarlo.»', 'Por eso vengo yo: te dejo la carta montada con tus platos, fotos y precios. Tú solo la revisas. El panel te guía paso a paso y tienes ayuda dentro.'],
  ['«Es caro.»', `Carta cuesta ${eur(QR_MENU.planes.basico.mensual)} al mes, menos que reimprimir una carta. Y sin permanencia: si no te sirve, lo cancelas desde tu panel.`],
  ['«Mis clientes no usan el QR.»', 'Desde la pandemia lo usa casi todo el mundo. Y no sustituye al camarero: el cliente mira la carta, alergias e idiomas, y llama al camarero con un toque.'],
  ['«¿Y si me quiero ir?»', 'Sin permanencia. Lo cancelas cuando quieras desde tu panel y sigue activo hasta el final de lo que hayas pagado.'],
  ['«¿Quién ve mis datos y mis pagos?»', 'Tus pagos los gestiona Stripe y solo los ves tú. Yo puedo ayudarte con la carta si me das permiso, y me lo puedes retirar desde tu panel cuando quieras.'],
];

/** Kit de venta del socio (0052, punto 5d): guion, objeciones, demo y precios oficiales. */
export default async function KitVenta() {
  const jwt = await exigirSocio();
  const [ficha, fundador] = await Promise.all([fichaSocio(jwt), estadoFundador()]);
  const codigo = ficha?.codigo ?? '';
  const enlace = `${SITIO}/qr?v=${codigo}`;
  const qr = await QRCode.toDataURL(enlace, { width: 360, margin: 1 });
  const p = QR_MENU.planes;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Kit de venta</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Cómo vender DKitchen en calle</h1>
        <p className="mt-1 text-sm text-niebla">Precios siempre los de esta página (sin IVA, el 21 % va aparte). No prometas descuentos ni condiciones que no estén aquí.</p>
      </div>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Guion de cierre en frío (5 minutos)</p>
        <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-sm">
          <li><strong>Entrada (20 s).</strong> «Hola, soy {ficha?.nombre.split(' ')[0] ?? 'de DKitchen'}, de DKitchen. Ayudamos a bares y restaurantes de la zona a tener la carta en el móvil con reservas y aviso al camarero. ¿Tienes dos minutos cuando baje el servicio?»</li>
          <li><strong>Pregunta (1 min).</strong> «¿Cómo cambias hoy un precio o un plato agotado? ¿Te llegan reservas por teléfono a deshoras? ¿Tienes clientes extranjeros?»</li>
          <li><strong>Demo en su móvil (2 min).</strong> Que escanee tu QR de demo o abre la carta de ejemplo (abajo). Enséñale alérgenos, idiomas y el botón de llamar al camarero; después el panel: cambiar un precio y verlo al momento.</li>
          <li><strong>Plan (1 min).</strong> Recomienda según el local: barra o local pequeño → Carta; con mesas y camareros → Local (primer mes a {eur(QR_MENU.primerMes)}); con mucho volumen o equipo grande → Sala (todos traen TPV, comandero y español + inglés; cambia la cantidad).{fundador?.abierto ? ` Si es Sala, ofrece Fundador mientras queden plazas (${fundador.quedan}).` : ''}</li>
          <li><strong>Cierre (30 s).</strong> «Lo damos de alta ahora en dos minutos y esta semana te dejo la carta montada.» Alta desde tu enlace o tu QR: el código {codigo} se rellena solo. Si lo hace él más tarde, que escriba tu código en «Código de tu asesor».</li>
        </ol>
      </section>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Precios oficiales</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['basico', 'ampliado', 'sala'] as const).map((id) => (
            <div key={id} className="rounded-2xl bg-papel p-4">
              <p className="font-semibold">{p[id].nombre}</p>
              <p className="mt-1 text-2xl font-semibold">{eur(p[id].mensual)}<span className="text-sm font-normal text-niebla">/mes + IVA</span></p>
              {p[id].primerMesSimbolico && <p className="text-xs font-semibold text-vino">Primer mes: {eur(QR_MENU.primerMes)} + IVA</p>}
              <p className="mt-2 text-xs text-niebla">{p[id].resumen}</p>
              <p className="mt-2 text-xs text-niebla">Hasta {p[id].topes.productos} platos · {p[id].topes.mesas} mesas · {p[id].topes.reservasMes} reservas/mes</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-niebla">
          Sin permanencia. {fundador?.abierto
            ? `Fundador (abierto, quedan ${fundador.quedan} de ${fundador.plazas}): plan Sala al 40 % de por vida, ${eur(FUNDADOR.trimestre)} + IVA cada trimestre (${eur(FUNDADOR.mensual)}/mes), mientras siga activo en Sala y sin impagos.`
            : 'La oferta Fundador está cerrada ahora: no la ofrezcas hasta que DKitchen la abra.'}
        </p>
      </section>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Objeciones frecuentes</p>
        <dl className="mt-3 space-y-3 text-sm">
          {OBJECIONES.map(([o, r]) => (
            <div key={o} className="rounded-2xl bg-papel p-4"><dt className="font-semibold">{o}</dt><dd className="mt-1 text-niebla">{r}</dd></div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={tarjeta}>
          <p className="text-sm font-semibold">Demo en el móvil</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="/demo/carta" target="_blank" rel="noopener" className="font-medium underline underline-offset-2">Carta de ejemplo</a> <span className="text-niebla">— lo que ve su cliente en la mesa.</span></li>
            <li><a href="/demo/panel" target="_blank" rel="noopener" className="font-medium underline underline-offset-2">Panel de ejemplo</a> <span className="text-niebla">— lo que usa el dueño (no guarda cambios).</span></li>
            <li><a href={enlace} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">Página de planes con tu código</a></li>
          </ul>
        </section>
        <section className={`${tarjeta} flex flex-col items-center text-center`}>
          <p className="text-sm font-semibold">Tu QR para el flyer</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR con tu código ${codigo}`} width={170} height={170} className="mt-2" />
          <a href={qr} download={`dkitchen-qr-${codigo}.png`} className="mt-3 rounded-full bg-tinta px-4 py-2 text-xs font-semibold text-white">Descargar</a>
        </section>
      </div>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Después de la venta: puesta a punto</p>
        <p className="mt-2 text-sm text-niebla">En «Mis clientes», pulsa «Puesta a punto» y trabajas en su panel: logo, horario y dirección, platos con precio y foto, diseño, banners y plano. No verás sus pagos ni su plan. Cada cambio queda registrado a tu nombre y el dueño puede retirarte el permiso.</p>
      </section>
    </div>
  );
}
