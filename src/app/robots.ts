import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // Las cartas de los clientes sí se indexan —traen búsquedas locales con
        // el nombre del restaurante—, pero los redirectores de QR no. Un
        // rastreador que los recorra ensucia el recuento de escaneos, que es la
        // cifra de la que depende la relación comercial con cada cliente.
        '/r/',
        // Pantalla de error: no aporta nada a un buscador.
        '/carta-no-disponible',
        // Superficie interna. El `noindex` de cada página es la defensa real;
        // esto solo evita el rastreo.
        '/admin-dkitchen/',
        '/dashboard',
        '/manuals/',
        '/api/',
        // Paneles privados de clientes y camareros.
        '/panel/',
        '/sala/',
        // CRM: propuestas privadas por enlace y la zona del socio.
        '/propuesta/',
        '/socio',
      ],
    },
    sitemap: 'https://dkitchencorporate.es/sitemap.xml',
  };
}
