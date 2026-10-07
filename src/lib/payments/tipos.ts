/**
 * Datos para crear un checkout de QR Menú. Stripe es el único proveedor de
 * pago de este proyecto — decisión explícita de Alex (2026-09-21), Stripe
 * queda fuera por completo, no como opción de repuesto.
 */
export interface DatosCheckoutQr {
  plan: import('@/lib/pricing-config').PlanQr;
  restauranteNombre: string;
  slugBase: string;
  email: string;
  nombreContacto: string;
  /** Origen de la petición (para construir redirect_url). */
  origen: string;
  /** Código del socio que vende (0052), ya validado en la base. */
  vendedor?: { codigo: string; origen: 'manual' | 'enlace' } | null;
}

/**
 * Order-bump de Auditoría+Escandallo en la pantalla de confirmación de QR
 * (Parte 8, Sección 3.1-b): pago único de 47€, sin cuenta que aprovisionar —
 * el webhook solo tiene que avisar para que se agende la reunión 1 a 1.
 */
export interface DatosCheckoutAuditoria {
  email: string;
  nombreContacto: string;
  restauranteNombre?: string;
  /** Origen de la petición (para construir redirect_url). */
  origen: string;
}

/**
 * Núcleo Operativo — Nivel B (Parte 8, Sección 1): pago único de 700€ al
 * precio fijo publicado, sin negociar nada antes. Dispara la tubería común
 * de post-pago (Sección 8): pedido en `pedidos_nivel_b`, intake, contrato,
 * factura, ticket de ejecución.
 */
export interface DatosCheckoutNucleoOperativo {
  email: string;
  nombreContacto: string;
  restauranteNombre: string;
  /** Origen de la petición (para construir redirect_url). */
  origen: string;
}

/**
 * Dark Kitchen Ruta B (Parte 8, Sección 5): pago único de desarrollo de una
 * marca nueva sobre una cocina que ya opera. `ordenMarca` es solo para
 * MOSTRAR el precio correcto antes de pagar (viene de
 * `contarMarcasActivas` + 1) — `dk.crear_marca_ruta_b` (0016) lo vuelve a
 * calcular por su cuenta al confirmar el pago, nunca confía en este valor.
 */
export interface DatosCheckoutDarkKitchenRutaB {
  restauranteId: string;
  nombreMarca: string;
  ordenMarca: number;
  email: string;
  nombreContacto: string;
  restauranteNombre: string;
  /** Origen de la petición (para construir redirect_url). */
  origen: string;
}

/**
 * Cuota de mantenimiento recurrente de Núcleo Operativo (Parte 8, Sección 6):
 * disparada por el cron `/api/cron/mantenimiento-nucleo-operativo` (0017)
 * al cumplirse 60 días desde la activación, nunca por el cliente ni por la
 * app directamente.
 */
export interface DatosCheckoutMantenimientoNucleoOperativo {
  pedidoId: string;
  email: string;
  nombreContacto: string;
  /** Origen de la petición (para construir redirect_url). */
  origen: string;
}
