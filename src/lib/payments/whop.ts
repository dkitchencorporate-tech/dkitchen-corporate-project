import 'server-only';
import {
  QR_MENU,
  AUDITORIA_CANALES,
  BASE_OPERATIVA,
  precioDesarrolloRutaBCentimos,
  mantenimientoNucleoOperativoCentimos,
} from '@/lib/pricing-config';
import type {
  DatosCheckoutQr,
  DatosCheckoutAuditoria,
  DatosCheckoutNucleoOperativo,
  DatosCheckoutDarkKitchenRutaB,
  DatosCheckoutMantenimientoNucleoOperativo,
} from './tipos';

/**
 * Implementación contra la API real de Whop (docs.whop.com, verificado el
 * 2026-09-21 — no se ha adivinado ningún endpoint ni forma de payload).
 * Único proveedor de pago del proyecto — decisión de Alex, no hay Stripe ni
 * selector de proveedor.
 *
 * Whop soporta un precio de primer cobro distinto del recurrente de forma
 * nativa (`initial_price` vs `renewal_price` en el mismo plan) — no hace
 * falta ningún cupón para el "primer mes a 1€".
 *
 * Pendiente de probar en vivo: código completo contra la documentación
 * pública, pero sin ejecutar todavía un pago real — eso exige
 * WHOP_API_KEY / WHOP_COMPANY_ID / WHOP_WEBHOOK_SECRET, que aún no existen en
 * este proyecto.
 */

const BASE = 'https://api.whop.com/api/v1';

function requerirEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre}.`);
  return valor;
}

interface RespuestaCheckoutConfiguration {
  id: string;
  purchase_url: string;
}

export async function crearCheckoutQr(datos: DatosCheckoutQr): Promise<{ url: string }> {
  const apiKey = requerirEnv('WHOP_API_KEY');
  const companyId = requerirEnv('WHOP_COMPANY_ID');

  const planConfig = QR_MENU.planes[datos.plan];

  const cuerpo = {
    mode: 'payment',
    plan: {
      company_id: companyId,
      currency: 'eur',
      plan_type: 'renewal',
      initial_price: QR_MENU.primerMes,
      renewal_price: planConfig.mensual,
      billing_period: 30,
      product: {
        title: `QR Menú — Plan ${planConfig.nombre}`,
        // Determinista por plan: reutiliza el mismo producto en vez de crear
        // uno nuevo en cada checkout.
        external_identifier: `dk-qr-menu-${datos.plan}`,
      },
    },
    // Todo lo que el webhook necesita para aprovisionar viaja aquí — el
    // payload de payment.succeeded documentado no trae email ni nombre.
    // `producto` distingue este pago del order-bump de Auditoría (Parte 8,
    // Sección 3.1-b) en el mismo webhook.
    metadata: {
      producto: 'qr-menu',
      plan: datos.plan,
      restauranteNombre: datos.restauranteNombre,
      slugBase: datos.slugBase,
      email: datos.email,
      nombreContacto: datos.nombreContacto,
    },
    // Lleva el correo y el nombre a la pantalla de confirmación para que el
    // order-bump de Auditoría (Sección 3.1-b) no le pida al cliente que los
    // teclee otra vez — es nuestra propia URL, no algo que Whop nos imponga.
    redirect_url: `${datos.origen}/qr/bienvenida?email=${encodeURIComponent(datos.email)}&nombre=${encodeURIComponent(datos.nombreContacto)}&restaurante=${encodeURIComponent(datos.restauranteNombre)}`,
  };

  const respuesta = await fetch(`${BASE}/checkout_configurations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(`Whop respondió ${respuesta.status}: ${json?.message ?? 'sin detalle'}`);
  }

  const datosRespuesta = json as RespuestaCheckoutConfiguration;
  if (!datosRespuesta.purchase_url) {
    throw new Error('Whop no devolvió purchase_url en la configuración de checkout.');
  }

  return { url: datosRespuesta.purchase_url };
}

/**
 * Núcleo Operativo — Nivel B (Parte 8, Sección 1): pago único al precio fijo
 * publicado (700€), sin negociar nada antes. El pago fraccionado (2 cuotas
 * de 375€) queda para cuando se construya esa pieza — Alex fijó el orden de
 * la Fase 5 y el fraccionado automático va después de este bloque.
 *
 * Mismo plan_type `one_time` ya verificado en vivo para el order-bump de
 * Auditoría (2026-09-22) — misma forma de payload, solo cambian el precio y
 * el identificador de producto.
 */
export async function crearCheckoutNucleoOperativo(datos: DatosCheckoutNucleoOperativo): Promise<{ url: string }> {
  const apiKey = requerirEnv('WHOP_API_KEY');
  const companyId = requerirEnv('WHOP_COMPANY_ID');

  const cuerpo = {
    mode: 'payment',
    plan: {
      company_id: companyId,
      currency: 'eur',
      plan_type: 'one_time',
      initial_price: BASE_OPERATIVA.pagoUnico,
      product: {
        title: 'Núcleo Operativo — Activación',
        external_identifier: 'dk-nucleo-operativo',
      },
    },
    metadata: {
      producto: 'nucleo-operativo',
      email: datos.email,
      nombreContacto: datos.nombreContacto,
      restauranteNombre: datos.restauranteNombre,
    },
    redirect_url: `${datos.origen}/base-operativa/bienvenida`,
  };

  const respuesta = await fetch(`${BASE}/checkout_configurations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(`Whop respondió ${respuesta.status}: ${json?.message ?? 'sin detalle'}`);
  }

  const datosRespuesta = json as RespuestaCheckoutConfiguration;
  if (!datosRespuesta.purchase_url) {
    throw new Error('Whop no devolvió purchase_url en la configuración de checkout.');
  }

  return { url: datosRespuesta.purchase_url };
}

/**
 * Dark Kitchen Ruta B (Parte 8, Sección 5): pago único de desarrollo de una
 * marca nueva. El precio mostrado aquí (`precioDesarrolloRutaBCentimos`) es
 * el mismo cálculo que hace `dk.crear_marca_ruta_b` (0016) al confirmar el
 * pago — si alguna vez divergen (p. ej. dos altas casi simultáneas del mismo
 * restaurante), la fila que se guarda en `marcas` es siempre la que la base
 * de datos recalculó, nunca el importe cobrado aquí.
 *
 * La marca en sí NO se crea aquí — la crea el webhook tras
 * `payment.succeeded`, igual que el resto de flujos de este archivo.
 */
export async function crearCheckoutDarkKitchenRutaB(
  datos: DatosCheckoutDarkKitchenRutaB
): Promise<{ url: string }> {
  const apiKey = requerirEnv('WHOP_API_KEY');
  const companyId = requerirEnv('WHOP_COMPANY_ID');

  const precioCentimos = precioDesarrolloRutaBCentimos(datos.ordenMarca);

  const cuerpo = {
    mode: 'payment',
    plan: {
      company_id: companyId,
      currency: 'eur',
      plan_type: 'one_time',
      initial_price: precioCentimos / 100,
      product: {
        title: `Dark Kitchen — Marca "${datos.nombreMarca}"`,
        external_identifier: `dk-dark-kitchen-ruta-b-${datos.restauranteId}-${datos.ordenMarca}`,
      },
    },
    metadata: {
      producto: 'dark-kitchen-ruta-b',
      restauranteId: datos.restauranteId,
      nombreMarca: datos.nombreMarca,
      email: datos.email,
      nombreContacto: datos.nombreContacto,
      restauranteNombre: datos.restauranteNombre,
    },
    redirect_url: `${datos.origen}/dark-kitchen/bienvenida?marca=${encodeURIComponent(datos.nombreMarca)}`,
  };

  const respuesta = await fetch(`${BASE}/checkout_configurations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(`Whop respondió ${respuesta.status}: ${json?.message ?? 'sin detalle'}`);
  }

  const datosRespuesta = json as RespuestaCheckoutConfiguration;
  if (!datosRespuesta.purchase_url) {
    throw new Error('Whop no devolvió purchase_url en la configuración de checkout.');
  }

  return { url: datosRespuesta.purchase_url };
}

/**
 * Cuota de mantenimiento recurrente de Núcleo Operativo (Parte 8, Sección 6).
 * Disparada únicamente por el cron de la Sección 0017 al cumplirse 60 días
 * desde la activación — nunca por el cliente ni por la app en el momento del
 * pago inicial. `plan_type: 'renewal'` sin `initial_price` distinto: aquí no
 * hay "primer mes simbólico", el cobro es 69€ desde el primer ciclo porque
 * los meses gratis ya pasaron antes de que este checkout exista.
 */
export async function crearCheckoutMantenimientoNucleoOperativo(
  datos: DatosCheckoutMantenimientoNucleoOperativo
): Promise<{ url: string }> {
  const apiKey = requerirEnv('WHOP_API_KEY');
  const companyId = requerirEnv('WHOP_COMPANY_ID');

  const precioCentimos = mantenimientoNucleoOperativoCentimos();

  const cuerpo = {
    mode: 'payment',
    plan: {
      company_id: companyId,
      currency: 'eur',
      plan_type: 'renewal',
      initial_price: precioCentimos / 100,
      renewal_price: precioCentimos / 100,
      billing_period: 30,
      product: {
        title: 'Núcleo Operativo — Mantenimiento mensual',
        external_identifier: 'dk-nucleo-operativo-mantenimiento',
      },
    },
    metadata: {
      producto: 'nucleo-operativo-mantenimiento',
      pedidoId: datos.pedidoId,
      email: datos.email,
      nombreContacto: datos.nombreContacto,
    },
    redirect_url: `${datos.origen}/base-operativa/mantenimiento-activado`,
  };

  const respuesta = await fetch(`${BASE}/checkout_configurations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(`Whop respondió ${respuesta.status}: ${json?.message ?? 'sin detalle'}`);
  }

  const datosRespuesta = json as RespuestaCheckoutConfiguration;
  if (!datosRespuesta.purchase_url) {
    throw new Error('Whop no devolvió purchase_url en la configuración de checkout.');
  }

  return { url: datosRespuesta.purchase_url };
}

/**
 * Order-bump de Auditoría+Escandallo (Parte 8, Sección 3.1-b): pago único de
 * 47€, sin renovación — a diferencia de `crearCheckoutQr`, `plan_type` es
 * `one_time` y no lleva `renewal_price` ni `billing_period`.
 *
 * PENDIENTE DE VERIFICAR EN VIVO: la forma exacta de un plan `one_time` no
 * se ha probado todavía contra la API real de Whop en este proyecto (el
 * checkout de QR sí, Sección "Backend de checkout QR Menú" del historial) —
 * antes del primer pago real, conviene repetir la misma prueba controlada
 * que se hizo para QR (crear una configuración real, sin que nadie llegue a
 * pagar, y comparar la respuesta con lo que aquí se asume).
 */
export async function crearCheckoutAuditoria(datos: DatosCheckoutAuditoria): Promise<{ url: string }> {
  const apiKey = requerirEnv('WHOP_API_KEY');
  const companyId = requerirEnv('WHOP_COMPANY_ID');

  const cuerpo = {
    mode: 'payment',
    plan: {
      company_id: companyId,
      currency: 'eur',
      plan_type: 'one_time',
      initial_price: AUDITORIA_CANALES.precioOferta,
      product: {
        title: 'Auditoría de canales + Escandallo',
        external_identifier: 'dk-auditoria-canales',
      },
    },
    metadata: {
      producto: 'auditoria',
      email: datos.email,
      nombreContacto: datos.nombreContacto,
      restauranteNombre: datos.restauranteNombre ?? '',
    },
    redirect_url: `${datos.origen}/qr/bienvenida?auditoria=ok`,
  };

  const respuesta = await fetch(`${BASE}/checkout_configurations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(`Whop respondió ${respuesta.status}: ${json?.message ?? 'sin detalle'}`);
  }

  const datosRespuesta = json as RespuestaCheckoutConfiguration;
  if (!datosRespuesta.purchase_url) {
    throw new Error('Whop no devolvió purchase_url en la configuración de checkout.');
  }

  return { url: datosRespuesta.purchase_url };
}

/**
 * Upgrade QR Básico → Ampliado (27/09/2026). Suscripción nueva a 25 €/mes sin
 * el 1 € de bienvenida; el webhook (producto 'qr-upgrade') cambia el plan en
 * la base y avisa por correo interno para cancelar la suscripción Básica en
 * Whop y que no se cobren las dos.
 */
export async function crearCheckoutUpgradeAmpliado(datos: {
  restauranteId: string;
  restauranteNombre: string;
  email: string;
  nombreContacto: string;
  origen: string;
}): Promise<{ url: string }> {
  const apiKey = requerirEnv('WHOP_API_KEY');
  const companyId = requerirEnv('WHOP_COMPANY_ID');
  const planConfig = QR_MENU.planes.ampliado;

  const respuesta = await fetch(`${BASE}/checkout_configurations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'payment',
      plan: {
        company_id: companyId,
        currency: 'eur',
        plan_type: 'renewal',
        initial_price: planConfig.mensual,
        renewal_price: planConfig.mensual,
        billing_period: 30,
        product: { title: `QR Menú — Plan ${planConfig.nombre}`, external_identifier: 'dk-qr-menu-ampliado' },
      },
      metadata: {
        producto: 'qr-upgrade',
        restauranteId: datos.restauranteId,
        restauranteNombre: datos.restauranteNombre,
        email: datos.email,
        nombreContacto: datos.nombreContacto,
      },
      redirect_url: `${datos.origen}/panel?upgrade=ok`,
    }),
  });
  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(`Whop respondió ${respuesta.status}: ${json?.message ?? 'sin detalle'}`);
  const url = (json as RespuestaCheckoutConfiguration | null)?.purchase_url;
  if (!url) throw new Error('Whop no devolvió purchase_url en la configuración de checkout.');
  return { url };
}

/**
 * Servicios del QR (0027): Setup, idiomas y Módulos de Sala. El importe llega
 * ya decidido por la base (dk.precio_servicio: el Experto pasa de 199 € a
 * 280 € cuando se agotan las 20 plazas). Pago único o mensual según catálogo.
 * El webhook (producto 'servicio-qr') da de alta el servicio con
 * dk.registrar_pago_servicio, idempotente por id de pago.
 */
export async function crearCheckoutServicio(datos: {
  servicio: string;
  nombre: string;
  tipo: 'unico' | 'mensual';
  precioCentimos: number;
  restauranteId: string;
  restauranteNombre: string;
  email: string;
  origen: string;
}): Promise<{ url: string }> {
  const apiKey = requerirEnv('WHOP_API_KEY');
  const companyId = requerirEnv('WHOP_COMPANY_ID');
  const precio = Math.round(datos.precioCentimos) / 100;

  const plan =
    datos.tipo === 'mensual'
      ? { plan_type: 'renewal', initial_price: precio, renewal_price: precio, billing_period: 30 }
      : { plan_type: 'one_time', initial_price: precio };

  const respuesta = await fetch(`${BASE}/checkout_configurations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'payment',
      plan: {
        company_id: companyId,
        currency: 'eur',
        ...plan,
        product: { title: `QR Menú — ${datos.nombre}`, external_identifier: `dk-qr-${datos.servicio}-${Math.round(datos.precioCentimos)}` },
      },
      metadata: {
        producto: 'servicio-qr',
        servicio: datos.servicio,
        restauranteId: datos.restauranteId,
        restauranteNombre: datos.restauranteNombre,
        email: datos.email,
      },
      redirect_url: `${datos.origen}/panel?pestana=modulos&pago=ok`,
    }),
  });
  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(`Whop respondió ${respuesta.status}: ${json?.message ?? 'sin detalle'}`);
  const url = (json as RespuestaCheckoutConfiguration | null)?.purchase_url;
  if (!url) throw new Error('Whop no devolvió purchase_url en la configuración de checkout.');
  return { url };
}
