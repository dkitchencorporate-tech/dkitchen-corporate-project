/**
 * Configuración del despliegue.
 *
 * Las cabeceras de seguridad viven aquí porque son lo primero que toca un
 * navegador, antes de ejecutar una sola línea del sitio. Sin ellas, buena parte
 * del blindaje de la base de datos se puede rodear desde el lado del cliente:
 * daría igual lo bien cerradas que estén las políticas por fila si un tercero
 * puede incrustar el panel en un iframe y hacer clic por encima del usuario, o
 * inyectar un script que use su propia sesión.
 */

// Qué puede cargar y ejecutar la página. Es la cabecera que más protege y la
// que más fácilmente rompe un sitio, así que cada permiso va justificado.
const CSP = [
  "default-src 'self'",

  // Next.js inyecta scripts en línea para la hidratación y usa eval en
  // desarrollo. 'unsafe-inline' aquí es una concesión real: se retira cuando se
  // pase a nonces por petición, que exige mover las páginas a renderizado
  // dinámico. Queda anotado como deuda consciente, no como olvido.
  process.env.NODE_ENV === 'development'
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.js.stripe.com https://www.googletagmanager.com",

  // Tailwind y los estilos en línea de los componentes.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",

  // Las fotos de los platos y las imágenes de Unsplash que usa la portada.
  // Fotos y logos que suben los clientes desde su panel (Vercel Blob, 0019).
  // Stripe y Link: iconos de tarjetas y monederos del checkout (/pago, 08/10/2026).
  // Google Analytics 4 (08/10/2026): solo se carga si el visitante acepta las cookies de medición.
  "img-src 'self' data: blob: https://images.unsplash.com https://*.public.blob.vercel-storage.com https://*.stripe.com https://*.link.com https://*.google-analytics.com https://*.googletagmanager.com",

  // La aplicación no llama a ningún tercero salvo Stripe (el Payment Element
  // de /pago habla con su API y con Link; docs.stripe.com/security/guide, CSP).
  // La base de datos se consulta desde el servidor, nunca desde el navegador:
  // si algún día aparece aquí un dominio de Neon, algo se ha cableado mal.
  // Excepción: Google Analytics 4, solo tras aceptar cookies (08/10/2026).
  "connect-src 'self' https://api.stripe.com https://link.com https://*.link.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",

  // Nadie nos incrusta. Nosotros solo incrustamos páginas propias (las cartas
  // demo de /demo/carta dentro de /qr, 29/09/2026); nunca a terceros.
  "frame-ancestors 'none'",
  // Excepción: los iframes del Payment Element de Stripe, 3D Secure (hooks) y Link.
  "frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://link.com https://*.link.com",
  "object-src 'none'",

  // Un formulario de esta web no puede enviar sus datos a otro sitio.
  "form-action 'self'",

  // Aunque alguien consiga inyectar una etiqueta <base>, no podrá reescribir
  // las rutas relativas de la página hacia un servidor suyo.
  "base-uri 'self'",

  'upgrade-insecure-requests',
].join('; ');

// Única excepción: /demo/carta (una demo pública, sin datos ni sesión) se
// puede incrustar DESDE NUESTRO PROPIO DOMINIO para enseñarla dentro de la web.
const CSP_DEMO_INCRUSTABLE = CSP.replace("frame-ancestors 'none'", "frame-ancestors 'self'");

const cabecerasDeSeguridad = [
  { key: 'Content-Security-Policy', value: CSP },

  // Un año de HTTPS obligatorio. Sin esto, la primera visita de alguien que
  // teclea el dominio sin https viaja en claro y admite interceptación.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },

  // Redundante con frame-ancestors, pero lo entienden navegadores que no
  // aplican la CSP completa.
  { key: 'X-Frame-Options', value: 'DENY' },

  // Impide que un archivo subido se sirva como si fuera un script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Al salir hacia otro dominio no se revela qué página se estaba viendo. En un
  // panel de cliente, la propia ruta ya es información.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Nada de cámara, micrófono ni ubicación. Una carta digital no los necesita,
  // y negarlos de antemano cierra la puerta a que un script inyectado los pida.
  {
    key: 'Permissions-Policy',
    // payment: solo nosotros y el iframe de Stripe (Apple Pay / Google Pay en /pago).
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com" "https://*.js.stripe.com"), usb=(), interest-cohort=()',
  },

  // No se comparte memoria entre orígenes ni se deja que otro documento
  // conserve una referencia a nuestras ventanas.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },

  // No anunciar la tecnología que hay debajo.
  { key: 'X-Powered-By', value: '' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  typescript: {
    // No se ignoran los errores de tipos en el build: un error de tipos en la
    // capa de datos es exactamente la clase de fallo que no debe desplegarse.
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },

  // Antes vivía bajo `experimental.serverComponentsExternalPackages`: Next 15
  // lo estabilizó como `serverExternalPackages` de nivel superior. El motivo
  // de que exista sigue siendo el mismo de siempre: el driver de Neon abre
  // sockets y no sobrevive al empaquetado; `ws` carga `bufferutil` y
  // `utf-8-validate` de forma opcional (try/catch) y un bundler que resuelve
  // ese try/catch a un objeto vacío en vez de dejarlo fallar produce
  // «bufferUtil.mask is not a function» en producción. Declararlos aquí
  // devuelve el control a Node en vez de al bundler.
  //
  // Migración a Next 16 (2026-09-22): el workaround anterior usaba una
  // función `webpack()` a medida para forzar estos externals — Next 16 usa
  // Turbopack por defecto y no admite mezclar un config de webpack sin su
  // propio bloque `turbopack`. Se retira esa función: `serverExternalPackages`
  // por sí solo ya cubre el mismo problema, y es la opción que SÍ respeta
  // tanto Turbopack como webpack, sin acoplarse a ninguno de los dos.
  serverExternalPackages: ['@neondatabase/serverless', 'ws', 'bufferutil', 'utf-8-validate'],

  // SEO bloque 2 (05/10): Signature vive en /signature. Solo la ruta exacta:
  // /base-operativa/bienvenida sigue siendo la vuelta tras pagar Signature.
  async redirects() {
    return [
      { source: '/base-operativa', destination: '/signature', permanent: true },
      // La demo del panel enlaza a la carta del restaurante "demo", que vive en /demo/carta.
      { source: '/m/demo', destination: '/demo/carta', permanent: false },
      // Cáscaras de plantilla retiradas el 08/10 (Central real: inicio, qr, prospección).
      { source: '/admin-dkitchen/overview', destination: '/admin-dkitchen/inicio', permanent: true },
      { source: '/admin-dkitchen/events-master', destination: '/admin-dkitchen/inicio', permanent: true },
      { source: '/admin-dkitchen/clients', destination: '/admin-dkitchen/qr', permanent: true },
      { source: '/admin-dkitchen/pipeline', destination: '/admin-dkitchen/prospeccion', permanent: true },
      { source: '/onboarding', destination: '/admin-dkitchen/inicio', permanent: true },
      // Bloque 1b (0061): los manuales antiguos se sustituyen por el Manual de Central.
      { source: '/manuals', destination: '/admin-dkitchen/manual', permanent: true },
      { source: '/manuals/:ruta*', destination: '/admin-dkitchen/manual', permanent: true },
    ];
  },

  async headers() {
    return [
      { source: '/:path*', headers: cabecerasDeSeguridad },
      // Va después: en Next gana la última regla que coincide con la misma cabecera.
      { source: '/demo/carta', headers: [{ key: 'Content-Security-Policy', value: CSP_DEMO_INCRUSTABLE }, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }] },
    ];
  },
};

module.exports = nextConfig;
