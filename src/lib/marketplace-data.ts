export interface MarketplaceService {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  features: string[];
  priceEst: string;
  roiEst: string;
  iconType: "whatsapp" | "ads" | "content" | "audit";
}

export const marketplaceServices: MarketplaceService[] = [
  {
    id: "ads-management",
    title: "Gestión Avanzada de Meta/Google Ads",
    category: "Tráfico y Captación",
    shortDescription: "Llenamos tus mesas los días flojos. Creamos, gestionamos y optimizamos campañas publicitarias hiper-locales.",
    features: [
      "Creación de creatividades (Imágenes/Textos)",
      "Segmentación hiper-local (1-5km)",
      "Retargeting a visitantes de tu web",
      "Reporte mensual de ROAS (Retorno de inversión)"
    ],
    priceEst: "Desde 299€/mes + Inversión",
    roiEst: "Atraer entre 50 y 200 nuevos clientes mensuales.",
    iconType: "ads"
  },
  {
    id: "content-creation",
    title: "Community Manager & Creador UGC",
    category: "Branding",
    shortDescription: "Grabación de vídeos cortos formato TikTok/Reels en tu local, editados con ganchos virales para disparar tu alcance orgánico.",
    features: [
      "1 Sesión de grabación mensual (2-3 horas)",
      "Edición de 8-12 vídeos cortos (Reels/TikTok)",
      "Planificación y publicación estratégica",
      "Interacción con tu comunidad"
    ],
    priceEst: "Desde 350€/mes",
    roiEst: "Aumento drástico del alcance local y posicionamiento de marca.",
    iconType: "content"
  },
  {
    id: "business-audit",
    title: "Auditoría de Escandallos y Rentabilidad",
    category: "Consultoría",
    shortDescription: "Analizamos el coste real de tus platos para maximizar el beneficio. Detectamos fugas de capital y optimizamos tu carta.",
    features: [
      "Análisis de precios de proveedores",
      "Creación de fichas técnicas de platos",
      "Reestructuración de menú (Ingeniería de Menú)",
      "Estrategias de reducción de mermas"
    ],
    priceEst: "Pago único (Consultar)",
    roiEst: "Aumento del margen de beneficio neto del 5% al 15%.",
    iconType: "audit"
  }
];
