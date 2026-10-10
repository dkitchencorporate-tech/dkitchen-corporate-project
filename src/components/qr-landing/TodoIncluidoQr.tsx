import { TextoRevelado } from '@/components/dk/Movimiento';
import { QR_MENU, SERVICIOS_QR } from '@/lib/pricing-config';

/**
 * «Te lo dejamos funcionando» (09/10, karc0): la oferta como paquete completo, no
 * como opciones sueltas. Puesta a punto, TPV, impresoras, formación, fotos con IA,
 * reseñas, idiomas y soporte. Textos honestos (decisión de karc0 del 08/10): la
 * carta va al lado del TPV; la conexión solo con TPV que aceptan pedidos externos.
 * Precios desde pricing-config. Se usa en /qr y /precios.
 */
const { ampliado: L, sala: S } = QR_MENU.planes;
const PIEZAS: { t: string; d: string; precio: string }[] = [
  { t: 'Puesta a punto', d: 'Cargamos tu carta entera (secciones, platos, precios y alérgenos), configuramos horarios, datos y estilo y te dejamos el QR listo para imprimir.', precio: `${SERVICIOS_QR.puestaAPunto} € · ${SERVICIOS_QR.puestaAPuntoBienvenida} € si la pides al darte de alta` },
  { t: 'Conexión con tu TPV', d: `No cambias de sistema: la carta va al lado de tu TPV o POS. Si acepta pedidos externos, lo que anota el camarero llega solo, sin teclear dos veces.`, precio: 'Incluida en todos los planes, con comandas al mes según el plan' },
  { t: 'Tus impresoras de tickets', d: 'Las comandas salen por las impresoras térmicas que ya usa tu TPV. Lo revisamos y lo configuramos en remoto, sin visitas.', precio: 'Con la conexión TPV' },
  { t: 'Formación de tu equipo', d: 'Una videollamada para ti y tus camareros, y una guía paso a paso dentro del panel. En una tarde lo manejáis.', precio: 'Con la puesta a punto' },
  { t: 'Fotos de tus platos con IA', d: '¿No tienes fotos? Las creamos a partir del nombre y la descripción de cada plato. Empiezas con imágenes gratis.', precio: `Más: ${SERVICIOS_QR.imagenesBonoIa} por ${SERVICIOS_QR.bonoIa} €, sin caducidad` },
  { t: 'Botón de reseñas de Google', d: 'Tus clientes dejan su reseña desde la carta, cuando mejor lo han pasado. Más estrellas y más visitas en Google Maps.', precio: `Incluido en ${L.nombre} y ${S.nombre}` },
  { t: 'Carta en otros idiomas', d: 'Español e inglés incluidos en todos los planes. ¿Más? Traducimos cada idioma por ti, para que el turista pida sin señalar con el dedo.', precio: `${SERVICIOS_QR.idiomaExtra} € por idioma extra, una vez` },
  { t: 'Asistente 24/7 y una persona', d: 'El asistente con IA de tu panel responde a cualquier hora con los datos de tu local. Y una persona te atiende por WhatsApp.', precio: 'Incluido en todos los planes' },
];

export default function TodoIncluidoQr({ fondo = 'crema' }: { fondo?: 'crema' | 'blanco' }) {
  return (
    <section id="todo-incluido" className={`scroll-mt-24 ${fondo === 'crema' ? 'bg-crema' : 'bg-white'} py-24 md:py-32`}>
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="etiqueta-dk text-vino">Todo incluido</p>
          <TextoRevelado texto="Te lo dejamos funcionando. Todo." className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-tinta md:text-6xl" />
          <p className="mt-5 text-lg text-niebla">No es una carta y apáñate. Montamos la carta, la conectamos con lo que ya tienes y enseñamos a tu equipo. Tú sigues con tu bar.</p>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIEZAS.map((p, i) => (
            <li key={p.t} className="flex flex-col rounded-[24px] border border-linea bg-white p-6">
              <span className="font-display text-sm font-semibold text-oro">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 text-lg font-semibold text-tinta">{p.t}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-grafito">{p.d}</p>
              <p className="mt-4 rounded-full bg-papel px-3 py-1.5 text-xs font-semibold text-vino">{p.precio}</p>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-niebla">
          Precios sin IVA. La puesta a punto se ofrece al terminar el alta y también desde tu panel. Empiezas con el plan {L.nombre} por {QR_MENU.primerMes} € el primer mes y después {L.mensual} € al mes, sin permanencia.
        </p>
      </div>
    </section>
  );
}
