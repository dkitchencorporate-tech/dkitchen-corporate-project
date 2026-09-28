import { MetadataRoute } from 'next';
import { ARTICULOS } from '@/lib/blog';

/**
 * Sitemap de las páginas de marketing.
 *
 * Deliberadamente no incluye `/m/{slug}` (las cartas de restaurantes reales):
 * eso exige leer Neon en tiempo de build/petición para listar los slugs
 * activos, que es trabajo de la Fase SEO (tarea #7), no de esta reestructura.
 * Tampoco incluye `/dashboard`, `/admin-dkitchen`, `/manuals` (privadas o
 * semipúblicas) ni `/onboarding` (un flujo, no una página de captación).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dkitchencorporate.es'; // Ajustar con el dominio final en el cutover

  const paginas: Array<{ ruta: string; prioridad: number; frecuencia: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { ruta: '/', prioridad: 1, frecuencia: 'weekly' },
    { ruta: '/qr', prioridad: 0.9, frecuencia: 'weekly' },
    { ruta: '/experience', prioridad: 0.8, frecuencia: 'weekly' },
    { ruta: '/auditoria', prioridad: 0.7, frecuencia: 'weekly' },
    { ruta: '/base-operativa', prioridad: 0.9, frecuencia: 'weekly' },
    { ruta: '/dark-kitchen', prioridad: 0.8, frecuencia: 'weekly' },
    { ruta: '/marcas', prioridad: 0.7, frecuencia: 'weekly' },
    { ruta: '/casos-de-exito', prioridad: 0.8, frecuencia: 'weekly' },
    { ruta: '/faq', prioridad: 0.6, frecuencia: 'monthly' },
    { ruta: '/blog', prioridad: 0.7, frecuencia: 'weekly' },
    ...ARTICULOS.map((a) => ({ ruta: `/blog/${a.slug}`, prioridad: 0.7, frecuencia: 'monthly' as const })),
    { ruta: '/demo/carta', prioridad: 0.5, frecuencia: 'monthly' },
    { ruta: '/privacy', prioridad: 0.2, frecuencia: 'yearly' },
    { ruta: '/terms', prioridad: 0.2, frecuencia: 'yearly' },
  ];

  return paginas.map(({ ruta, prioridad, frecuencia }) => ({
    url: `${baseUrl}${ruta}`,
    lastModified: new Date(),
    changeFrequency: frecuencia,
    priority: prioridad,
  }));
}
