import 'server-only';
import { crearCuentaCliente, enviarEnlaceDeContrasena, ErrorNeonAuth } from '@/lib/neon-auth';
import { comoAprovisionamiento } from '@/lib/db';
import { enviarBienvenidaQr } from '@/lib/bienvenida';
import { enviarCorreoInterno, filasCorreo } from '@/lib/email';

/**
 * Aviso interno de cada alta QR (07/10/2026, H1/H4/H12 del mapa del cliente):
 * «NUEVA ALTA QR» si todo fue bien y «ALTA QR FALLIDA» si el cliente pagó y
 * no tiene carta, con los datos para resolverlo a mano. Nunca lanza: el
 * resultado del webhook no depende del correo.
 */
export async function avisarAltaQr(
  estado: 'ok' | 'fallo',
  datos: Partial<DatosPagoQr> & { idPago?: string },
  motivo?: string
): Promise<void> {
  const asunto = estado === 'ok'
    ? `NUEVA ALTA QR: ${datos.restauranteNombre ?? '¿?'} (${datos.plan ?? '¿?'})`
    : `ALTA QR FALLIDA, cliente cobrado sin carta: ${datos.restauranteNombre ?? datos.email ?? datos.idPago ?? '¿?'}`;
  const intro = estado === 'ok'
    ? '<p>Se acaba de dar de alta un cliente de la carta QR. Ya tiene panel y le llegó la bienvenida.</p>'
    : '<p><strong>Ha pagado y NO tiene restaurante.</strong> Revísalo hoy en Stripe y en Central. Si la cuenta ya existía, hay que vincularla a mano; si fue la base, Stripe reintenta solo, pero confirma que entró.</p>';
  await enviarCorreoInterno(asunto, intro + filasCorreo([
    ['Motivo', motivo],
    ['Restaurante', datos.restauranteNombre],
    ['Contacto', datos.nombreContacto],
    ['Correo', datos.email],
    ['Plan', datos.plan],
    ['Cliente de Stripe', datos.referenciaCliente],
    ['Cobro de Stripe', datos.idPago],
    ['Evento', datos.idEvento],
  ])).catch((e) => console.error('Aviso interno de alta QR no enviado:', e));
}

/**
 * Lógica de aprovisionamiento común a cualquier pasarela de pago (hoy Stripe,
 * o la que venga después). Cada webhook de proveedor solo tiene que:
 * verificar su propia firma, extraer estos mismos campos de su propio evento,
 * y llamar aquí. Nada de esto es específico de Stripe.
 */
export interface DatosPagoQr {
  /** Id único del evento en el proveedor — la clave de idempotencia real. */
  idEvento: string;
  email: string;
  nombreContacto: string;
  plan: import('@/lib/pricing-config').PlanQr;
  restauranteNombre: string;
  slugBase: string;
  /** Id del cliente en el proveedor (customer_id en Stripe). */
  referenciaCliente: string;
  /** Id de la suscripción/membresía en el proveedor. */
  referenciaSuscripcion: string;
}

export type ResultadoAprovisionamiento =
  | { ok: true; restauranteId: string; slug: string }
  | { ok: false; motivo: 'cuenta_neon_auth_fallo' }
  | { ok: false; motivo: 'db_fallo'; reintentable: true };

/**
 * true si ya existe un restaurante para este cliente del proveedor de pago —
 * distingue el alta (primer payment.succeeded) de una renovación mensual
 * (mismo cliente, cobro del mes 4), para no intentar crear una cuenta de
 * Neon Auth duplicada en cada cobro recurrente.
 */
export async function esClienteExistente(referenciaCliente: string): Promise<boolean> {
  return comoAprovisionamiento(async (c) => {
    const { rows } = await c.query<{ existe: boolean }>(
      `SELECT dk.es_cliente_existente($1) AS existe`,
      [referenciaCliente]
    );
    return rows[0]?.existe ?? false;
  });
}

/**
 * Un cobro recurrente que sí entra cierra cualquier ciclo de gracia/impago
 * abierto para ese cliente (0012) — se llama en vez de
 * `aprovisionarClienteQr` cuando `esClienteExistente` ya dio true.
 */
export async function registrarPagoRecuperado(referenciaCliente: string): Promise<void> {
  await comoAprovisionamiento((c) => c.query(`SELECT dk.registrar_pago_recuperado($1)`, [referenciaCliente]));
}

/** Un cobro recurrente fallido abre (o mantiene) el ciclo de gracia de 30 días (0012). */
export async function registrarPagoFallido(referenciaCliente: string): Promise<void> {
  await comoAprovisionamiento((c) => c.query(`SELECT dk.registrar_pago_fallido($1)`, [referenciaCliente]));
}

/**
 * Avanza a diario el calendario de gracia de todos los restaurantes con un
 * ciclo de impago abierto (0012) — la llama únicamente el cron de
 * `/api/cron/gracia-impago`, nunca el webhook de pago. Devuelve cuántos
 * restaurantes cambiaron de fase en esta pasada.
 */
export async function avanzarCalendarioGracia(): Promise<number> {
  return comoAprovisionamiento(async (c) => {
    const { rows } = await c.query<{ avanzar_calendario_gracia: number }>(`SELECT dk.avanzar_calendario_gracia()`);
    return rows[0]?.avanzar_calendario_gracia ?? 0;
  });
}

export async function aprovisionarClienteQr(datos: DatosPagoQr): Promise<ResultadoAprovisionamiento> {
  let identidadId: string;
  try {
    const cuenta = await crearCuentaCliente({ email: datos.email, nombre: datos.nombreContacto });
    identidadId = cuenta.id;
  } catch (error) {
    // Caso no cubierto por autoservicio: un cliente que ya tiene cuenta en
    // Neon Auth por otro peldaño intentando activar QR Menú con el mismo
    // correo. El login de cliente sigue aplazado (tarea #15), así que no hay
    // forma automática de recuperar su identidad real aquí sin arriesgar una
    // suplantación. Se registra con detalle para resolución manual.
    console.error(
      `No se pudo crear la cuenta de Neon Auth para ${datos.email} (evento ${datos.idEvento}):`,
      error instanceof ErrorNeonAuth ? `${error.codigo ?? ''} ${error.message}` : error
    );
    await avisarAltaQr('fallo', datos, `No se pudo crear la cuenta (¿el correo ya tenía cuenta o es un reintento tras un fallo de la base?): ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, motivo: 'cuenta_neon_auth_fallo' };
  }

  try {
    await enviarEnlaceDeContrasena(datos.email);
  } catch (error) {
    // No se aborta el aprovisionamiento por esto: el cliente puede pedir el
    // enlace de nuevo desde /panel/nueva-contrasena; quedarse sin restaurante
    // aprovisionado tras haber pagado sería el fallo peor.
    console.error(`No se pudo enviar el enlace de contraseña a ${datos.email}:`, error);
  }

  try {
    const { rows } = await comoAprovisionamiento((c) =>
      c.query<{ restaurante_id: string; slug: string }>(
        `SELECT * FROM dk.aprovisionar_cliente_qr($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          datos.idEvento,
          identidadId,
          datos.email,
          datos.nombreContacto,
          datos.plan,
          datos.restauranteNombre,
          datos.slugBase,
          datos.referenciaCliente,
          datos.referenciaSuscripcion,
        ]
      )
    );
    const fila = rows[0];
    if (!fila) throw new Error('dk.aprovisionar_cliente_qr no devolvió fila.');
    console.log(`Aprovisionado: restaurante ${fila.slug} (${fila.restaurante_id}) para ${datos.email}.`);
    await enviarBienvenidaQr(datos.email, datos.nombreContacto, datos.restauranteNombre, datos.plan).catch((e) => console.error('Bienvenida no enviada:', e));
    await avisarAltaQr('ok', datos, `Carta /m/${fila.slug}`);
    return { ok: true, restauranteId: fila.restaurante_id, slug: fila.slug };
  } catch (error) {
    console.error(`Fallo aprovisionando el restaurante para ${datos.email} (evento ${datos.idEvento}):`, error);
    await avisarAltaQr('fallo', datos, `La cuenta se creó, pero falló la base al crear el restaurante: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, motivo: 'db_fallo', reintentable: true };
  }
}
