import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { QR_MENU } from '@/lib/pricing-config';

export const dynamic = 'force-dynamic';

/**
 * Manual de Central (bloque 1b, 0061; sustituye a /manuals). Escrito para que
 * un subadministrador o una secretaria lleve el día a día sin tocar código:
 * qué es cada zona, qué se hace en ella y paso a paso. Cada pantalla tiene
 * además su guía corta («Cómo funciona») que enlaza aquí.
 */
type Zona = { id: string; titulo: string; ruta?: string; que: string; pasos: string[]; ojo?: string[] };

const ZONAS: Zona[] = [
  {
    id: 'empezar', titulo: 'Antes de empezar',
    que: 'Central es la oficina de DKitchen: desde aquí se ve y se gestiona TODO lo de cada cliente sin tocar código. Si algo no funciona, se avisa con el botón «Avisar de un fallo» (abajo a la derecha en cada pantalla).',
    pasos: [
      'Entra con tu correo, tu contraseña y el código de tu app de autenticación (2FA). La sesión dura 12 horas.',
      'La barra (izquierda en ordenador, abajo en el móvil) tiene las zonas principales: Inicio, Clientes, Proyectos, Prospección y Soporte. El resto está en «Más».',
      'Cada pantalla tiene arriba «Cómo funciona»: ábrelo si dudas.',
      'Todo lo que haces queda en el historial del cliente como «por DKitchen».',
    ],
    ojo: ['Nunca compartas tu acceso. Si alguien más va a trabajar en Central, necesita su propia cuenta de administrador.'],
  },
  {
    id: 'inicio', titulo: 'Inicio', ruta: '/admin-dkitchen/inicio',
    que: 'El estado del negocio de un vistazo y la lista de lo que necesita a una persona hoy.',
    pasos: [
      'Mira «Necesita a una persona»: pagos fallidos, pruebas que vencen, bajas programadas, locales atascados en el montaje, tickets sin responder y oportunidades. Pulsa «Abrir» en cada uno.',
      '«Ingreso mensual real» suma solo las cuotas que de verdad se cobran (sin pruebas, demos internas ni archivados).',
      '«Proyectos que tocan hoy» lleva a los proyectos con el siguiente paso para hoy o atrasado.',
      '«Sin actividad»: locales sin escaneos en 14 días. Llámales: casi siempre es que no han puesto el QR en las mesas.',
    ],
  },
  {
    id: 'clientes', titulo: 'Clientes (carta QR)', ruta: '/admin-dkitchen/qr',
    que: 'Todos los locales con carta QR, separados por pestañas según su situación.',
    pasos: [
      'Activos: al día. En prueba: prueba con fecha de fin. En riesgo: cobro fallido, solo lectura o baja programada. Bajas: suspendidos. Archivados: fuera de la lista sin borrar nada. Demo: tus cuentas internas.',
      'Pulsa el nombre de un local para abrir su ficha.',
      '«Nuevo cliente» crea una cuenta a mano en 3 pasos: datos, qué recibe (enlace de pago, prueba con fecha, demo interna o solo la cuenta) y revisar. Al cliente le llega un correo para crear su contraseña.',
    ],
    ojo: ['Cada correo es un cliente. Para tus demos usa tu+demo1@gmail.com, tu+demo2@gmail.com…'],
  },
  {
    id: 'ficha', titulo: 'Ficha del cliente', ruta: '/admin-dkitchen/qr',
    que: 'Todo lo de un local en una pantalla: cobro, acciones, baja y archivo, servicios, diseño de la carta e historial.',
    pasos: [
      'Entrar en su panel (modo soporte): abre su panel tal y como lo ve el cliente. Puedes cambiar carta, secciones, platos, datos del local, plano, QR, traducciones, promociones y combos. Arriba verás una franja vino «Modo soporte»; para salir, «Salir y volver a su ficha».',
      'Cobrar: «Enlace de pago a medida» prepara un pago con el plan o servicios y el precio que acordéis (1 €, Fundador o a medida). Marca «enviar por correo» para que le llegue. Al pagarlo se activa solo.',
      'Prueba con todo incluido: 7, 15, 30 días o hasta una fecha. Al acabar sin pagar, su panel pasa a solo lectura y la carta sigue visible.',
      'Cambiar de plan, reenviar el enlace de acceso (si no puede entrar) y cargar una carta de ejemplo (si aún no tiene platos).',
      'Servicios: marca la entrega de una puesta a punto o cancela un módulo. Para activar un módulo que no tiene, prepárale un enlace de pago.',
      'Diseño de la carta: plantilla, nivel y color (lo decide DKitchen; el cliente gestiona el contenido).',
      'Historial: cada cambio, quién lo hizo (cliente, DKitchen o automático) y cuándo.',
    ],
    ojo: ['El modo soporte no toca dinero: plan, pagos, reservas y equipo se gestionan desde la ficha o los lleva el dueño.', 'Ya no existen los regalos sin fecha: o paga, o prueba con fecha, o es una demo interna.'],
  },
  {
    id: 'baja', titulo: 'Bajas, archivo y cuentas demo', ruta: '/admin-dkitchen/qr',
    que: 'En la ficha, sección «Baja, archivo y demo».',
    pasos: [
      'Dar de baja: elige el motivo, marca si quieres avisarle por correo, confirma y pulsa «Dar de baja». Se cancela su cuota en Stripe al FINAL del periodo que ya pagó (sin reembolso). Hasta ese día todo sigue igual.',
      'El día de la baja (automático): su carta deja de verse, su panel se cierra y pasa a la pestaña «Bajas». Se borra todo a los 60 días; 7 días antes le avisamos por correo.',
      'Si no tiene cuota en Stripe (prueba o cuenta sin pago), la baja es inmediata.',
      'Anular la baja: mientras no haya llegado el día, «Anular la baja» vuelve a activar su renovación. Después del día, solo «Reactivar cuenta» (y si tiene que pagar, prepárale antes un enlace).',
      'Si el cliente pide la baja desde su panel, aparece aquí con «la pidió el cliente» y se ejecuta igual el día que termina lo pagado.',
      'Archivar: saca un local de la lista principal sin tocar nada (duplicados, pruebas que no siguieron, bajas antiguas). Se puede sacar del archivo.',
      'Demo interna: tus cuentas para enseñar o grabar. Todo incluido sin fecha y fuera de ingresos, del parte y de las alertas.',
    ],
    ojo: ['Dar de baja no se puede deshacer después del día de la baja sin que el cliente vuelva a pagar.'],
  },
  {
    id: 'proyectos', titulo: 'Proyectos', ruta: '/admin-dkitchen/proyectos',
    que: 'Todo lo que no es carta QR: Signature, Experience, Auditoría, Dark Kitchen y QR físico. Nacen de un pago, de una solicitud de la web o a mano.',
    pasos: [
      'Filtra por producto, fase o «toca hoy».',
      'En la ficha: «Pasar a» cambia la fase; marca «Avisar al cliente» para que reciba el correo con el texto de esa fase.',
      'Tras cada llamada o correo guarda un apunte y el siguiente paso con fecha: así aparece en Inicio el día que toca.',
      'Rellena los datos fiscales y el estado del contrato antes de facturar o enviar el contrato.',
      'Si también es cliente de carta QR, verás el enlace a su ficha arriba.',
    ],
  },
  {
    id: 'prospeccion', titulo: 'Prospección', ruta: '/admin-dkitchen/prospeccion',
    que: 'Los locales a los que queremos venderles (la lista de prospectos) y en qué punto está cada uno.',
    pasos: ['Abre un prospecto para ver sus datos y lo que se ha hecho con él.', 'Apunta cada contacto (visita, llamada, WhatsApp) y el siguiente paso.', 'Cuando diga que sí, créale la cuenta en Clientes → Nuevo cliente o prepárale un enlace de pago.'],
  },
  {
    id: 'soporte', titulo: 'Soporte y QR físico', ruta: '/admin-dkitchen/soporte',
    que: 'Las consultas de los clientes (tickets) y los pedidos de QR impresos.',
    pasos: [
      'Cada ticket trae un diagnóstico y una respuesta propuesta. Léela y CAMBIA los huecos entre corchetes ([Respuesta], [pasos]) por la respuesta real: si los dejas, no se envía.',
      'Si hace falta, usa los botones de arreglo (reenviar acceso, regenerar enlace del equipo, reintentar el TPV).',
      'Escribe la respuesta, marca «Cerrar el ticket» si está resuelto y pulsa «Responder». Le llega por correo y en su panel.',
      'Pedidos de QR físico: cambia el estado según avanza (presupuestado, pagado, en producción, enviado).',
    ],
  },
  {
    id: 'oportunidades', titulo: 'Oportunidades', ruta: '/admin-dkitchen/oportunidades',
    que: 'Locales con mucho movimiento que piden una llamada para Signature.',
    pasos: ['Llama, y si hay interés pulsa «Crear proyecto Signature».', 'Escribe cómo fue y «Marcar atendido». Sin atender en 48 h sale como urgente en el parte.'],
  },
  {
    id: 'socios', titulo: 'Socios', ruta: '/admin-dkitchen/socios',
    que: 'Vendedores externos con su código. Venden con dkitchencorporate.es/qr?v=CÓDIGO y ponen a punto la carta de sus clientes desde /socio.',
    pasos: ['Alta: nombre, correo y código. Le llega el correo de contraseña y configura su 2FA.', '«Ver ficha» muestra sus locales.', '«Desactivar» le quita el acceso al momento.', 'Si un alta entró sin código, corrige la atribución abajo.'],
  },
  {
    id: 'fundador', titulo: 'Fundador', ruta: '/admin-dkitchen/fundador',
    que: 'El programa de los primeros locales con el plan Sala al 40 % de por vida (cuota trimestral).',
    pasos: ['Verás cuántas plazas quedan y quién las tiene.', 'Si un fundador deja de pagar, pierde el precio (queda registrado).'],
  },
  {
    id: 'partes', titulo: 'Partes diarios', ruta: '/admin-dkitchen/partes',
    que: 'Cada mañana a las 08:30 llega por correo el parte: altas, pasos a pago, bajas, tickets y lo que necesita a una persona. Aquí está el histórico.',
    pasos: ['Abre el del día y pulsa cada aviso para ir a donde se resuelve.'],
  },
  {
    id: 'embudo', titulo: 'Embudo', ruta: '/admin-dkitchen/embudo',
    que: 'Cuánta gente entra en /qr, /fundador y las páginas /pagar, cuánta abre el formulario, va a pagar y paga.',
    pasos: ['Elige 7, 30 o 90 días.', 'Compara antes y después de un anuncio, un flyer o un cambio en la web.'],
  },
  {
    id: 'avisos', titulo: 'Avisos de fallo', ruta: '/admin-dkitchen/avisos',
    que: 'Lo enviado con «Avisar de un fallo». Llega por correo y se revisa al empezar cada sesión de trabajo.',
    pasos: ['Desde la pantalla donde falla, pulsa «Avisar de un fallo» y cuenta qué intentabas hacer y qué pasó.', 'Aquí ves si está nuevo, en curso o resuelto.'],
  },
];

export default async function ManualCentral() {
  await exigirAdmin();
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Manual</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Manual de Central</h1>
        <p className="mt-2 text-sm text-niebla">Cómo se lleva DKitchen día a día desde Central, zona por zona. Precio de entrada de la carta QR: {QR_MENU.primerMes} € el primer mes.</p>
      </header>
      <nav aria-label="Índice" className="flex flex-wrap gap-2">
        {ZONAS.map((z) => <a key={z.id} href={`#${z.id}`} className="rounded-full border border-linea bg-white px-3 py-1.5 text-xs font-semibold hover:border-tinta">{z.titulo}</a>)}
      </nav>
      {ZONAS.map((z) => (
        <section key={z.id} id={z.id} className="scroll-mt-6 rounded-[22px] border border-linea bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{z.titulo}</h2>
            {z.ruta && <Link href={z.ruta} className="text-xs text-vino underline">Ir a {z.titulo.toLowerCase()} →</Link>}
          </div>
          <p className="mt-2 text-sm text-niebla">{z.que}</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">{z.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
          {z.ojo && <ul className="mt-3 space-y-1 rounded-2xl bg-vino/[0.06] p-3 text-[13px] text-vino">{z.ojo.map((o) => <li key={o}>⚠ {o}</li>)}</ul>}
        </section>
      ))}
    </div>
  );
}
