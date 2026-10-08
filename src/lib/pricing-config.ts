/**
 * FUENTE ÚNICA DE VERDAD DE PRECIOS — DKitchen Corporate SL
 *
 * Ningún componente, copy o metadata debe escribir un precio a mano.
 * Todo se lee de aquí. Antes de este archivo convivían tres listas de precios
 * desalineadas y activas al mismo tiempo, citando cifras distintas a prospectos reales.
 *
 * `null` en un precio significa "sin cifra cerrada, no publicar" — no es un cero
 * ni un placeholder: la UI debe ocultar el precio y ofrecer contacto.
 */

export const MONEDA = 'EUR' as const;

/** Formatea un importe para mostrar. Devuelve null si el precio no está cerrado. */
export function formatPrecio(valor: number | null): string | null {
  if (valor === null) return null;
  return Number.isInteger(valor) ? `${valor}€` : `${valor.toFixed(2).replace('.', ',')}€`;
}

// ─────────────────────────────────────────────────────────────
// PELDAÑO 1 — QR Menú (único producto de autoservicio real)
// ─────────────────────────────────────────────────────────────

export const QR_MENU = {
  setup: {
    precio: 159,
    /** Se regala siempre en modo promocional: es la palanca de entrada permanente. */
    regaladoEnPromocion: true,
  },
  /** Primer mes simbólico, con tarjeta registrada desde la compra. No es gratis. */
  primerMes: 1,
  /**
   * Planes por cantidades (decisión A de karc0, 07/10; 0050). Ids internos
   * históricos: basico = Carta, ampliado = Local. Cada plan trae «de todo un
   * poco» con topes; la base deja un 10 % de cortesía antes de bloquear
   * (dk.plan_tope_max) y la llamada al camarero nunca se corta.
   * Espejo de dk.precio_plan y dk.plan_tope: si cambias aquí, cambia allí.
   */
  planes: {
    basico: {
      id: 'basico',
      nombre: 'Carta',
      mensual: 9,
      /** Sin 1 € el primer mes: se paga la cuota desde el primer día. */
      primerMesSimbolico: false,
      topeProductos: 50,
      topes: { productos: 50, mesas: 4, camareros: 0, reservasMes: 10, banners: 1 },
      plantillas: 3,
      personalizacionQr: false,
      promocionesVisibles: true,
      llamarCamarero: true,
      resumen: 'Carta digital con QR, reservas y aviso del camarero, ajustado a un local pequeño.',
    },
    ampliado: {
      id: 'ampliado',
      nombre: 'Local',
      mensual: 29,
      /** El único con el primer mes a 1 € + IVA. */
      primerMesSimbolico: true,
      topeProductos: 150,
      topes: { productos: 150, mesas: 15, camareros: 3, reservasMes: 150, banners: 3 },
      plantillas: 3,
      personalizacionQr: true,
      promocionesVisibles: true,
      llamarCamarero: true,
      sincronizacionGoogleBusiness: true,
      motorReservasIncluido: true,
      botonResenas: true,
      resumen: 'Carta, reservas, plano de mesas y app de sala para hasta 3 camareros.',
    },
    sala: {
      id: 'sala',
      nombre: 'Sala',
      mensual: 69,
      primerMesSimbolico: false,
      topeProductos: 300,
      topes: { productos: 300, mesas: 40, camareros: 10, reservasMes: 500, banners: 3 },
      plantillas: 3,
      personalizacionQr: true,
      promocionesVisibles: true,
      llamarCamarero: true,
      sincronizacionGoogleBusiness: true,
      motorReservasIncluido: true,
      botonResenas: true,
      resumen: 'Todo incluido: TPV, Comandero Pro e idiomas, hasta 10 personas en el equipo.',
    },
  },
  /**
   * Histórico — RETIRADO en PARTE 11: esta tarifa puente (+10€ sobre Ampliado,
   * 59€/mes total) ya no existe. El motor de reservas, la sincronización con
   * Google Business y el botón de reseñas van incluidos en Ampliado sin coste
   * adicional (ver `planes.ampliado` arriba). Se conserva el campo para no
   * romper importaciones existentes, pero no debe usarse en copy ni en cobro.
   */
  motorReservas: {
    retirado: true,
  },
} as const;

/**
 * Fundador (decisiones de karc0 del 07/10; 0051): 40 % sobre Sala, cobrado por
 * trimestre, vitalicio mientras siga activo en Sala y sin impagos. 100 plazas o
 * 90 días desde que se abre en Central, lo primero. El estado vivo (abierto,
 * quedan) lo da dk.fundador_estado(); esto son solo las cifras de texto.
 */
export type PlanQr = keyof typeof QR_MENU.planes;
export const PLANES_QR = ['basico', 'ampliado', 'sala'] as const satisfies readonly PlanQr[];
export const esPlanQr = (p: unknown): p is PlanQr => typeof p === 'string' && (PLANES_QR as readonly string[]).includes(p);
export const nombrePlan = (p: string) => (esPlanQr(p) ? QR_MENU.planes[p].nombre : p);

export const FUNDADOR = {
  descuento: 0.4,
  plan: 'sala' as const,
  mensual: 41.4,
  trimestre: 124.2,
  plazas: 100,
  dias: 90,
} as const;

/**
 * QR físicos. Solo Etiquetas muestra precio público.
 * Vinilo, atril y metacrilato van a "Pedir presupuesto" por WhatsApp.
 * Costes base: snapshot de 360imprimir del 2026-09-20 — precios promocionales
 * dinámicos, reverificar antes de una campaña grande.
 */
export const QR_FISICOS = {
  etiquetas: {
    precioPublico: true,
    tandas: [
      { unidades: 50, precio: 19.9 },
      { unidades: 100, precio: 22.9 },
      { unidades: 240, precio: 22.9 },
    ],
    /** Tope ofrecido desde el panel: es el punto de mejor margen relativo. */
    maximoUnidades: 240,
  },
  formatosAPresupuesto: ['vinilo', 'atril', 'metacrilato'],
  costesVerificados: '2026-09-20',
} as const;

// ─────────────────────────────────────────────────────────────
// PELDAÑO 2 — DKitchen Experience (tarifas fijas, cero comisión)
// ─────────────────────────────────────────────────────────────

export const EXPERIENCE = {
  tarifas: {
    primeraVez: { precio: 299, cuando: 'Cliente nuevo, cualquiera de los 7 formatos' },
    nuevoEvento: { precio: 250, cuando: 'Cliente recurrente, formato distinto al ya construido' },
    reuso: { precio: 150, cuando: 'Mismo evento ya construido, nueva fecha' },
    reusoFidelizado: { precio: 99, cuando: 'Más de 2 eventos ya hechos con DKitchen' },
    primeraParaClienteQr: { precio: 199, cuando: 'Primera Experience de un cliente QR activo' },
  },
  /** Desarrollo llave en mano si el cliente quiere la landing en propiedad: se cotiza caso a caso. */
  llaveEnMano: null,
  /** El presupuesto de ads siempre lo paga el dueño del local. DKitchen nunca pone capital propio. */
  adsLosPagaElCliente: true,
  /** DKitchen nunca cobra comisión ni toca el dinero de las entradas. */
  comision: 0,
} as const;

// ─────────────────────────────────────────────────────────────
// PELDAÑO 3 — Auditoría de canales externos
// ─────────────────────────────────────────────────────────────

/** Sin cifra cerrada. No publicar precio hasta que Alex lo fije. */
/**
 * CONFIRMADO en PARTE 8, Sección 3 (citado en PARTE 12/14): 297€ de ancla,
 * 47€ de oferta especial — producto 1 a 1 con reunión, no automatizado.
 * Sustituye el "sin definir" que traía esta constante.
 */
export const AUDITORIA_CANALES = {
  precioAncla: 297,
  precioOferta: 47,
  publicable: true,
} as const;

// ─────────────────────────────────────────────────────────────
// PELDAÑO 4 — Base Operativa / Digitalización personalizada
// ─────────────────────────────────────────────────────────────

export const BASE_OPERATIVA = {
  pagoUnico: 700,
  fraccionable: true,
  /** Entrada en 2 cuotas de 375 € (750 € en total), cobradas por Stripe con un mes de separación; después, el mantenimiento (08/10). */
  fraccionado: { cuotas: 2, importeCuota: 375, diasEntreCuotas: 30 },
  mantenimiento: {
    /** Cuota del tramo Arranque (aprobado por karc0 el 05/10; antes 69). Sube por volumen, ver `tramos`. */
    mensual: 99,
    /**
     * Tramos por volumen (05/10, ANALISIS_PRECIOS_Y_DOCUMENTOS §1). Se alcanza un tramo
     * por ventas por la app (sin IVA) O por pedidos al mes, lo que llegue antes.
     * Sube tras 2 meses seguidos por encima (30 días de aviso); baja tras 3 por debajo.
     */
    tramos: [
      { id: 'arranque', nombre: 'Arranque', cuota: 99, hastaVentas: 8000, hastaPedidos: 800, usuarios: 10, productos: 300 },
      { id: 'crecimiento', nombre: 'Crecimiento', cuota: 149, hastaVentas: 15000, hastaPedidos: 1500, usuarios: 20, productos: 600 },
      { id: 'alto', nombre: 'Alto', cuota: 199, hastaVentas: 30000, hastaPedidos: 3000, usuarios: 30, productos: 1000 },
    ],
    /** Más de 30.000 €/mes, más de 3.000 pedidos, pasar un límite de uso o 2 o más locales. */
    aMedida: { desde: 279, porLocalAdicional: 49 },
    /** Los dos primeros meses son gratis; el recurrente arranca en el mes 3. */
    mesesGratis: 2,
    empiezaEnMes: 3,
  },
  /** Re-anclado aquí como bono de bienvenida, nunca como compensación por ausencia de garantía. */
  packArranque: { valorDeclarado: 1150, incluido: true },
} as const;

// ─────────────────────────────────────────────────────────────
// PELDAÑO 4b — Dark Kitchen Multimarca
// ─────────────────────────────────────────────────────────────

export const DARK_KITCHEN = {
  rutaA: {
    nombre: 'Empezar desde cero',
    rangoMin: 3000,
    rangoMax: 10000,
    puertaDeAdmision: true,
    proyectosSimultaneosPorTrimestre: 2,
  },
  rutaB: {
    nombre: 'Ya tengo cocina, quiero sumar marca',
    puertaDeAdmision: false,
    desarrolloPorMarca: {
      primera: 1200,
      segunda: 960, // -20%
      terceraEnAdelante: 840, // -30%
      todoIncluidoPrimera: 2000,
    },
    /** Se mantiene íntegro por marca, sin descuento: cada marca prueba su propia tracción. */
    marketingPorMarca: 200,
    /** La curva de descuento se aplica por local, no globalmente. */
    descuentoPorLocal: true,
    /** Palanca comercial opcional, no estructural, a discreción de Alex. */
    descuentoOpcionalDosLocales: 0.05,
  },
  /** Una entrada con 3+ marcas o 2+ locales se cualifica como Ruta A aunque ya tenga cocina. */
  umbralRerutearARutaA: { marcas: 3, locales: 2 },
} as const;

/**
 * Precio de desarrollo de la N-ésima marca de un restaurante en Ruta B, en
 * céntimos — espejo exacto de `dk.crear_marca_ruta_b` (migración 0016). Solo
 * para MOSTRAR el precio antes de pagar; el importe que de verdad se guarda
 * lo recalcula la propia base de datos al confirmar el pago, nunca este
 * valor calculado en el servidor de la app.
 */
export function precioDesarrolloRutaBCentimos(ordenMarca: number): number {
  if (ordenMarca <= 1) return DARK_KITCHEN.rutaB.desarrolloPorMarca.primera * 100;
  if (ordenMarca === 2) return DARK_KITCHEN.rutaB.desarrolloPorMarca.segunda * 100;
  return DARK_KITCHEN.rutaB.desarrolloPorMarca.terceraEnAdelante * 100;
}

/** Cuota de mantenimiento de Núcleo Operativo, en céntimos. */
export function mantenimientoNucleoOperativoCentimos(): number {
  return BASE_OPERATIVA.mantenimiento.mensual * 100;
}

/**
 * Cuota mensual por marca activa. Cruza número de marcas del cliente con el volumen
 * de pedidos de esa marca medido en la propia PWA (objetivo y verificable, no autodeclarado).
 * El escalón superior es un tope deliberado: seguir subiendo en proporción a la facturación
 * empezaría a parecerse a un cobro por resultado, justo lo que este modelo evita.
 */
export const CUOTA_MARCA_MENSUAL = {
  tramosVolumen: [
    { id: 'bajo', hasta: 5000, etiqueta: 'menos de 5.000€/mes' },
    { id: 'medio', hasta: 10000, etiqueta: '5.000-10.000€/mes' },
    { id: 'alto', hasta: null, etiqueta: 'más de 10.000€/mes' },
  ],
  tabla: {
    '1-2': { bajo: 120, medio: 175, alto: 220 },
    '3-5': { bajo: 99, medio: 145, alto: 180 },
    '6+': { bajo: 89, medio: 130, alto: 165 },
  },
} as const;

export type TramoMarcas = keyof typeof CUOTA_MARCA_MENSUAL.tabla;
export type TramoVolumen = 'bajo' | 'medio' | 'alto';

/** Resuelve el tramo de marcas a partir del número de marcas activas del cliente. */
export function tramoDeMarcas(marcasActivas: number): TramoMarcas {
  if (marcasActivas <= 2) return '1-2';
  if (marcasActivas <= 5) return '3-5';
  return '6+';
}

/** Resuelve el tramo de volumen a partir de la facturación mensual de una marca. */
export function tramoDeVolumen(facturacionMensual: number): TramoVolumen {
  if (facturacionMensual < 5000) return 'bajo';
  if (facturacionMensual <= 10000) return 'medio';
  return 'alto';
}

/** Cuota mensual de UNA marca. El total del cliente es esta cuota por cada marca activa. */
export function cuotaMensualPorMarca(marcasActivas: number, facturacionMensual: number): number {
  return CUOTA_MARCA_MENSUAL.tabla[tramoDeMarcas(marcasActivas)][tramoDeVolumen(facturacionMensual)];
}

// ─────────────────────────────────────────────────────────────
// Marco de ciclo de vida del cliente QR
// ─────────────────────────────────────────────────────────────

/**
 * Umbrales de clasificación Sostener / Evolucionar / Soltar.
 * Los escaneos los aporta el motor de QR (tabla `escaneos`).
 */
export const CICLO_VIDA_QR = {
  evolucionar: {
    escaneosMensuales: 600,
    mesesConsecutivos: 2,
    /** No basta cruzar el umbral una vez: tiene que haber crecimiento sostenido. */
    requiereTendenciaCreciente: true,
    mesesPagoSinFriccion: 4,
  },
  sostener: { mesesSinInteres: 3 },
  soltar: { cancelaAntesDeMes: 3, intentosReactivacion: 1 },
} as const;

// ─────────────────────────────────────────────────────────────
// Reglas de negocio que ningún copy puede contradecir
// ─────────────────────────────────────────────────────────────

export const REGLAS_COMERCIALES = {
  /** DKitchen nunca cobra comisión ni porcentaje de nada. Todas las tarifas son fijas. */
  cobraComision: false,
  /**
   * DKitchen nunca toca el dinero del cliente. Única excepción: el checkout del propio
   * SaaS de QR Menú, que es cobro directo por su propio producto.
   */
  tocaDineroDelCliente: false,
  unicoCheckoutPropio: 'qr-menu',
  /** La prospección es siempre activa. No hay programa de referidos. */
  usaReferidos: false,
} as const;

/**
 * Servicios del panel QR que se citan en textos (chat de ayuda, 30/09/2026).
 * Espejo del catálogo de la base (`catalogo_servicios`, 0028): el cobro real
 * siempre lo decide la base; si cambia allí, cámbialo aquí.
 */
export const SERVICIOS_QR = {
  puestaAPunto: 49,
  /** Oferta de bienvenida (08/10, karc0): la misma puesta a punto a 29 € + IVA, SOLO desde «Pago confirmado» tras el alta. */
  puestaAPuntoBienvenida: 29,
  cartaDeAutor: 199,
  /** Bono de 50 imágenes con IA (0038): pago único, sin caducidad. 3 gratis siempre. */
  bonoIa: 9,
  imagenesBonoIa: 50,
  imagenesGratisIa: 3,
  /** Comandero Pro (0045): histórico, descargas, anulaciones y ranking. Extra de Local (9 € + IVA al mes; 0050), incluido en Sala. Espejo de catalogo_servicios. */
  comanderoPro: 9,
  /** Idiomas (hasta 3, traducidos por DKitchen): pago único. Espejo de catalogo_servicios (05/10). */
  idiomas: 29,
  /** Conexión con tu TPV: extra de Local (19 € + IVA al mes; 0050), incluida en Sala. Plano y app de sala van incluidos en Local. */
  conexionTpv: 19,
} as const;
