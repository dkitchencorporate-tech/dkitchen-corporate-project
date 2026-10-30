/**
 * 30/10/2026 (karc0): DKitchen opera al 100 % en España con Stripe. Todo lo de
 * DKitchen Venezuela (dk-vzl) y las pasarelas o figuras descartadas (Kunfupay,
 * PayPal, LLC…) vive en Central → Lanzamiento → Planificación y no sale en
 * Mis tareas, Revisiones ni Decisiones.
 */
export const ES_PLANIFICACION = /kunfupay|venezuel|paypal|\bllc\b|usdc|binance/i;
export const esDePlanificacion = (...textos: (string | null | undefined)[]) => ES_PLANIFICACION.test(textos.filter(Boolean).join(' '));
