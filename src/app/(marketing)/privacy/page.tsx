import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad · DKitchen',
  description: 'Qué datos tratamos en DKitchen, para qué, con qué proveedores, cuánto tiempo y cómo ejercer tus derechos.',
  alternates: { canonical: 'https://dkitchencorporate.es/privacy' },
};

/**
 * Política de privacidad (29/09/2026): refleja los tratamientos reales del
 * proyecto (Neon, Vercel, Whop, correo de Arsys, formularios, medición
 * anónima del embudo, reservas de comensales como encargado del tratamiento).
 */
const SECCIONES: [string, React.ReactNode][] = [
  ['Responsable', <>DKitchen Corporate SL, con domicilio en Alcobendas (Madrid). Puedes escribirnos sobre privacidad a <strong>dkitchen@dkitchencorporate.es</strong>. Los datos identificativos completos del titular (NIF/CIF y domicilio fiscal) se facilitan <strong>a petición expresa</strong> para asuntos legales, fiscales o de consumo: escríbenos a esa misma dirección indicando el motivo y te responderemos a la mayor brevedad.</>],
  ['Qué datos tratamos', <>
    <strong>Si eres cliente (hostelero):</strong> tu nombre, correo, teléfono, los datos de tu negocio y el contenido que subes (carta, fotos, horarios). Los datos de pago los trata directamente la pasarela; nosotros no vemos ni guardamos tu tarjeta.<br />
    <strong>Si nos escribes desde la web:</strong> los datos del formulario (nombre, negocio, correo, teléfono y mensaje).<br />
    <strong>Si visitas la web o escaneas una carta:</strong> datos técnicos anónimos, como el tipo de navegador, el país aproximado y las páginas vistas. No guardamos tu IP en claro.
  </>],
  ['Para qué los usamos', <>Para prestarte el servicio que contratas, cobrarlo y facturarlo, darte soporte, responder a tus solicitudes y mejorar la web. La base legal es la ejecución del contrato, el cumplimiento de obligaciones legales (facturación) y tu consentimiento cuando nos escribes o aceptas cookies opcionales.</>],
  ['Reservas y datos de tus comensales', <>Cuando un comensal reserva en la carta de un restaurante, <strong>el responsable de esos datos es el restaurante</strong>. DKitchen actúa solo como encargado del tratamiento: los guardamos y se los mostramos al restaurante para gestionar la reserva, sin usarlos para nada más.</>],
  ['Proveedores que nos ayudan', <>
    Vercel (alojamiento de la web y de las imágenes), Neon (base de datos, servidores en Fráncfort, Alemania), Whop (pagos) y Arsys (correo electrónico, España). Algunos de estos proveedores tienen sede en Estados Unidos; en ese caso la transferencia se ampara en las garantías del RGPD (Marco de Privacidad de Datos UE-EE. UU. o cláusulas contractuales tipo).
  </>],
  ['Cuánto tiempo los guardamos', <>Mientras seas cliente. Tras la baja, conservamos tu carta y tus datos 60 días por si vuelves o nos pides una copia, y después los eliminamos. Los datos de facturación se guardan el tiempo que exige la ley. Los datos de los formularios se guardan el tiempo necesario para responderte.</>],
  ['Medición anónima', <>En nuestras páginas de contratación medimos de forma anónima cuántas personas entran, empiezan a rellenar, van a pagar o se van. Solo usamos un identificador aleatorio de la sesión del navegador; nunca tu nombre, correo ni IP.</>],
  ['Cookies', <>Usamos cookies técnicas necesarias para que la web y tu panel funcionen. Las cookies opcionales solo se activan si las aceptas en el aviso de cookies, y puedes cambiar tu elección cuando quieras.</>],
  ['Tus derechos', <>Puedes pedirnos acceder a tus datos, corregirlos, borrarlos, oponerte a su uso, limitarlo o llevártelos a otro proveedor, escribiendo a dkitchen@dkitchencorporate.es. Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</>],
];

export default function Privacidad() {
  return (
    <div className="bg-[#F7F5F2] px-6 pb-24 pt-36 text-[#17191E] md:pt-44">
      <article className="mx-auto max-w-3xl">
        <p className="etiqueta-dk text-[#6E0C2B]">Política de privacidad</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-6xl">Tus datos, claros y en tu mano.</h1>
        <p className="mt-4 text-sm text-[#6B7079]">Última actualización: 29 de septiembre de 2026</p>
        <ol className="mt-12 divide-y divide-[#E4E1DC] border-y border-[#E4E1DC]">
          {SECCIONES.map(([t, texto], i) => (
            <li key={t} className="grid gap-3 py-7 md:grid-cols-[56px_1fr]">
              <span className="acento-serif text-3xl leading-none">{i + 1}</span>
              <div>
                <h2 className="text-lg font-semibold">{t}</h2>
                <p className="mt-2 leading-relaxed text-[#3F434B]">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
