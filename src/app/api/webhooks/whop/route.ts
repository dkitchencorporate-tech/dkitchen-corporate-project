import { comoAprovisionamiento } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  aprovisionarClienteQr,
  esClienteExistente,
  registrarPagoRecuperado,
  registrarPagoFallido,
} from '@/lib/payments/aprovisionar';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';
import { crearPedidoNivelB } from '@/lib/pedidos-nivel-b';
import { crearMarcaRutaB } from '@/lib/marcas';
import { dispararTuberiaPostPago } from '@/lib/tuberia-nivel-b';
import { BASE_OPERATIVA } from '@/lib/pricing-config';

export const runtime = 'nodejs';

const CINCO_MINUTOS_MS = 5 * 60 * 1000;

/**
 * Verificación de firma de Whop (docs.whop.com/developer/guides/webhooks,
 * comprobado el 2026-09-21): HMAC-SHA256 sobre `{webhook-id}.{webhook-
 * timestamp}.{cuerpo sin procesar}`, con el secreto `ws_...` usado tal cual
 * (nunca decodificado de base64). La cabecera trae el resultado como
 * `v1,<firma en base64>`.
 */
function firmaValida(idWebhook: string, timestamp: string, cuerpo: string, cabeceraFirma: string): boolean {
  const secreto = process.env.WHOP_WEBHOOK_SECRET;
  if (!secreto) return false;

  const firmaEsperada = createHmac('sha256', secreto)
    .update(`${idWebhook}.${timestamp}.${cuerpo}`)
    .digest('base64');

  // La cabecera puede traer varias firmas separadas por espacio (rotación de
  // secreto): basta con que una coincida.
  const bufEsperado = Buffer.from(firmaEsperada);
  const candidatos = cabeceraFirma.split(' ').map((parte) => parte.split(',')[1]).filter(Boolean);

  return candidatos.some((candidato) => {
    const bufRecibido = Buffer.from(candidato);
    return bufEsperado.length === bufRecibido.length && timingSafeEqual(bufEsperado, bufRecibido);
  });
}

interface EventoWhop {
  id: string;
  type: string;
  data: {
    id: string;
    status?: string;
    member?: { id: string };
    metadata?: Record<string, string>;
  };
}

/**
 * Cierra el círculo del checkout de QR Menú cuando el proveedor activo es
 * Whop (`PAYMENT_PROVIDER=whop`). Mismo contrato común que
 * `/api/webhooks/stripe` — ver `aprovisionarClienteQr`.
 *
 * PENDIENTE DE PROBAR EN VIVO: escrito contra la documentación pública de
 * Whop, sin ejecutar todavía un pago real (falta WHOP_API_KEY /
 * WHOP_COMPANY_ID / WHOP_WEBHOOK_SECRET en este proyecto).
 */
export async function POST(request: Request) {
  const idWebhook = request.headers.get('webhook-id');
  const timestamp = request.headers.get('webhook-timestamp');
  const cabeceraFirma = request.headers.get('webhook-signature');

  if (!process.env.WHOP_WEBHOOK_SECRET) {
    console.error('Falta WHOP_WEBHOOK_SECRET.');
    return NextResponse.json({ error: 'No configurado' }, { status: 500 });
  }
  if (!idWebhook || !timestamp || !cabeceraFirma) {
    return NextResponse.json({ error: 'Faltan cabeceras de firma de Whop' }, { status: 400 });
  }

  // Una marca de tiempo fuera de ventana es una señal de repetición/ataque,
  // no un evento legítimo tardío.
  const edadMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(edadMs) || edadMs > CINCO_MINUTOS_MS) {
    return NextResponse.json({ error: 'Marca de tiempo fuera de rango' }, { status: 400 });
  }

  const cuerpo = await request.text();

  if (!firmaValida(idWebhook, timestamp, cuerpo, cabeceraFirma)) {
    console.error('Firma de webhook de Whop inválida.');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  let evento: EventoWhop;
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  // Order-bump de Auditoría+Escandallo (Parte 8, Sección 3.1-b): pago único,
  // sin cuenta ni restaurante que aprovisionar — nada que ver con el
  // calendario de gracia/impago de abajo, que es exclusivo de la
  // suscripción de QR Menú. Se resuelve aparte y no sigue el resto del flujo.
  if (evento.data.metadata?.producto === 'auditoria') {
    if (evento.type === 'payment.succeeded') {
      const meta = evento.data.metadata;
      try {
        await enviarCorreoInterno(
          `AUDITORÍA PAGADA (47€): ${meta.nombreContacto || meta.email}`,
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #D9531E;">Order-bump de Auditoría cobrado</h2>
            <p>Alguien acaba de pagar la Auditoría+Escandallo (47€) justo después de activar su QR Menú.
            Agenda la reunión 1 a 1 con estos datos:</p>
            <p><strong>Nombre:</strong> ${escaparHtml(meta.nombreContacto)}</p>
            <p><strong>Correo:</strong> ${escaparHtml(meta.email)}</p>
            ${meta.restauranteNombre ? `<p><strong>Restaurante:</strong> ${escaparHtml(meta.restauranteNombre)}</p>` : ''}
            <p><strong>Id de pago (Whop):</strong> ${escaparHtml(evento.data.id)}</p>
          </div>`
        );
      } catch (error) {
        // El pago ya entró — un fallo de correo no debe parecer un fallo del
        // webhook ante Whop (evitaría reintentos que reenvíen el mismo aviso).
        console.error('No se pudo enviar el aviso de Auditoría pagada:', error);
      }
    }
    return NextResponse.json({ recibido: true });
  }

  // Núcleo Operativo — Nivel B (Parte 8, Sección 8): pago único, sin cuenta
  // de Neon Auth que crear (a diferencia de QR) — la tubería común crea el
  // registro en pedidos_nivel_b y dispara el correo de "qué sigue" al
  // cliente + el aviso interno con lo que falta automatizar (contrato,
  // factura). Nada que ver con el calendario de gracia/impago de abajo.
  if (evento.data.metadata?.producto === 'nucleo-operativo') {
    if (evento.type === 'payment.succeeded') {
      const meta = evento.data.metadata;
      try {
        const pedido = await crearPedidoNivelB({
          producto: 'nucleo-operativo',
          referenciaPago: evento.data.id,
          email: meta.email,
          nombreContacto: meta.nombreContacto,
          restauranteNombre: meta.restauranteNombre || undefined,
          importeCentimos: BASE_OPERATIVA.pagoUnico * 100,
        });
        if (!pedido.yaExistia) {
          await dispararTuberiaPostPago({
            id: pedido.id,
            producto: 'nucleo-operativo',
            token: pedido.token,
            email: meta.email,
            nombreContacto: meta.nombreContacto,
            restauranteNombre: meta.restauranteNombre || undefined,
            importeCentimos: BASE_OPERATIVA.pagoUnico * 100,
            origen: new URL(request.url).origin,
          });
        }
      } catch (error) {
        console.error(`No se pudo procesar el pago de Núcleo Operativo (evento ${evento.data.id}):`, error);
        return NextResponse.json({ error: 'Fallo procesando el pedido' }, { status: 500 });
      }
    }
    return NextResponse.json({ recibido: true });
  }

  // Dark Kitchen Ruta B (Parte 8, Sección 5): cliente que YA opera una
  // cocina, añadiendo una marca virtual. El precio ya se cobró al orden
  // correcto (Sección "Backend de checkout Dark Kitchen Ruta B" de whop.ts),
  // pero `dk.crear_marca_ruta_b` (0016) recalcula orden y precio por su
  // cuenta al guardar — es la fuente de verdad, no este webhook.
  //
  // SIMPLIFICACIÓN DEJADA POR ESCRITO: esto NO dispara la tubería común de
  // contrato/factura (dispararTuberiaPostPago) — esa tubería está pensada
  // para pedidos_nivel_b (clientes nuevos sin cuenta), y una marca de un
  // cliente ya existente no encaja en ese modelo todavía. Por ahora solo se
  // crea la fila en `marcas` y se avisa a Alex por correo para la
  // "confirmación humana rápida antes de producción" que pide la Parte 8,
  // Sección 5, punto 3 — ese aviso es el disparador manual, no automático.
  if (evento.data.metadata?.producto === 'dark-kitchen-ruta-b') {
    if (evento.type === 'payment.succeeded') {
      const meta = evento.data.metadata;
      try {
        const marca = await crearMarcaRutaB(meta.restauranteId, meta.nombreMarca, evento.data.id);
        await enviarCorreoInterno(
          `DARK KITCHEN — nueva marca pagada: "${escaparHtml(marca.nombre)}"`,
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #D9531E;">Nueva marca de Dark Kitchen (Ruta B) pagada</h2>
            <p>Confirma que la cocina puede operar esto antes de disparar producción
            (Parte 8, Sección 5, punto 3) — no es automático a propósito.</p>
            <p><strong>Marca:</strong> ${escaparHtml(marca.nombre)} (orden ${marca.orden}, ${marca.precioDesarrolloCentimos / 100}€)</p>
            <p><strong>Restaurante (id):</strong> ${escaparHtml(meta.restauranteId)}</p>
            <p><strong>Contacto:</strong> ${escaparHtml(meta.nombreContacto)} — ${escaparHtml(meta.email)}</p>
            <p><strong>Id de pago (Whop):</strong> ${escaparHtml(evento.data.id)}</p>
          </div>`
        );
      } catch (error) {
        console.error(`No se pudo procesar la marca de Dark Kitchen (evento ${evento.data.id}):`, error);
        return NextResponse.json({ error: 'Fallo creando la marca' }, { status: 500 });
      }
    }
    return NextResponse.json({ recibido: true });
  }

  // Cuota de mantenimiento de Núcleo Operativo (0017): nada que aprovisionar
  // de nuevo, el restaurante ya opera desde la activación — solo se
  // confirma que el cobro recurrente entró. Un fallo aquí queda para una
  // futura Sección de gracia/impago propia de este producto (no construida
  // todavía, es un ciclo de Whop distinto al de QR Menú).
  // Servicios del QR (0027): Setup, idiomas, Módulos de Sala. El precio lo
  // fijó el servidor al crear el checkout; aquí solo se da de alta, idempotente.
  if (evento.data.metadata?.producto === 'servicio-qr') {
    if (evento.type === 'payment.succeeded') {
      const meta = evento.data.metadata;
      try {
        const resultado = await comoAprovisionamiento(async (c) => {
          const { rows } = await c.query<{ r: string }>('SELECT dk.registrar_pago_servicio($1, $2, $3) AS r', [
            meta.restauranteId,
            meta.servicio,
            evento.data.id,
          ]);
          return rows[0]?.r;
        });
        if (resultado === 'ok') {
          await enviarCorreoInterno(
            `NUEVO SERVICIO: ${meta.servicio} · ${meta.restauranteNombre}`,
            `<p><strong>${escaparHtml(meta.restauranteNombre)}</strong> (${escaparHtml(meta.email)}) ha contratado <strong>${escaparHtml(meta.servicio)}</strong>.</p>
             <p>Revisa la entrega en la Central: ficha del cliente → Servicios.</p>
             <p>Id de pago (Whop): ${escaparHtml(evento.data.id)}</p>`
          ).catch((error) => console.error('Servicio registrado, pero falló el correo interno:', error));
        }
      } catch (error) {
        console.error(`No se pudo registrar el servicio (evento ${evento.data.id}):`, error);
        return NextResponse.json({ error: 'Fallo registrando servicio' }, { status: 500 });
      }
    }
    return NextResponse.json({ recibido: true });
  }

  // Enlace de pago preparado por DKitchen en Central (0030). Solo el cobro
  // correcto; los fallos siguen al calendario de gracia común de más abajo.
  if (evento.data.metadata?.producto === 'enlace-admin' && evento.type === 'payment.succeeded') {
    const meta = evento.data.metadata;
    try {
      const r = await comoAprovisionamiento(async (c) => {
        const { rows } = await c.query<{ r: string }>('SELECT dk.aplicar_enlace_pago($1, $2, $3) AS r', [
          meta.enlaceId, evento.data.id, evento.data.member?.id ?? null,
        ]);
        return rows[0]?.r;
      });
      if (r === 'renovacion' && evento.data.member?.id) await registrarPagoRecuperado(evento.data.member.id);
      if (r === 'ok') {
        await enviarCorreoInterno(
          `PAGO DE ENLACE: ${meta.restauranteNombre}`,
          `<p><strong>${escaparHtml(meta.restauranteNombre)}</strong> (${escaparHtml(meta.email)}) ha pagado el enlace preparado en Central. Ya está aplicado.</p>
           <p>Id de pago (Whop): ${escaparHtml(evento.data.id)}</p>`
        ).catch((error) => console.error('Enlace aplicado, pero falló el correo interno:', error));
      }
    } catch (error) {
      console.error(`No se pudo aplicar el enlace de pago (evento ${evento.data.id}):`, error);
      return NextResponse.json({ error: 'Fallo aplicando enlace' }, { status: 500 });
    }
    return NextResponse.json({ recibido: true });
  }

  // Upgrade QR Básico → Ampliado (0019). Va antes de la comprobación de
  // cliente existente: el miembro de Whop ya existe y se trataría como renovación.
  if (evento.data.metadata?.producto === 'qr-upgrade') {
    if (evento.type === 'payment.succeeded') {
      const meta = evento.data.metadata;
      try {
        const aplicado = await comoAprovisionamiento(async (c) => {
          const { rows } = await c.query<{ ok: boolean }>('SELECT dk.aplicar_upgrade_ampliado($1, $2) AS ok', [
            meta.restauranteId,
            evento.data.member?.id ?? evento.data.id,
          ]);
          return rows[0]?.ok === true;
        });
        // El aviso es secundario: si el correo falla no se devuelve 500, o Whop
        // reintentaría un upgrade ya aplicado.
        await enviarCorreoInterno(
          `UPGRADE A AMPLIADO: ${meta.restauranteNombre}`,
          `<p><strong>${escaparHtml(meta.restauranteNombre)}</strong> (${escaparHtml(meta.email)}) ha pagado el plan Ampliado.</p>
           <p>Plan cambiado en la base: <strong>${aplicado ? 'sí' : 'no (ya era Ampliado o no existe)'}</strong>.</p>
           <p><strong>ACCIÓN:</strong> cancela en Whop su suscripción Básica (9 €/mes) para que no se le cobren las dos.</p>
           <p>Id de pago (Whop): ${escaparHtml(evento.data.id)}</p>`
        ).catch((error) => console.error('Upgrade aplicado, pero falló el correo interno:', error));
      } catch (error) {
        console.error(`No se pudo aplicar el upgrade a Ampliado (evento ${evento.data.id}):`, error);
        return NextResponse.json({ error: 'Fallo aplicando upgrade' }, { status: 500 });
      }
    }
    return NextResponse.json({ recibido: true });
  }

  if (evento.data.metadata?.producto === 'nucleo-operativo-mantenimiento') {
    if (evento.type === 'payment.succeeded') {
      console.log(`Mantenimiento de Núcleo Operativo cobrado: pedido ${evento.data.metadata?.pedidoId}.`);
    }
    return NextResponse.json({ recibido: true });
  }

  // Gracia/impago propia (migración 0012): Whop cancela nativamente a los 5
  // días, pero el calendario ya aprobado con el cliente es de 30 — un cobro
  // fallido solo abre el ciclo de gracia en nuestra propia base de datos,
  // nunca cancela nada por sí mismo.
  if (evento.type === 'payment.failed') {
    const miembroIdFallido = evento.data.member?.id;
    if (miembroIdFallido) {
      await registrarPagoFallido(miembroIdFallido);
    }
    return NextResponse.json({ recibido: true });
  }

  if (evento.type !== 'payment.succeeded') {
    return NextResponse.json({ recibido: true });
  }

  const miembroId = evento.data.member?.id;
  if (!miembroId) {
    console.error(`Webhook de Whop: pago ${evento.data.id} sin member.id, no se procesa.`);
    return NextResponse.json({ recibido: true });
  }

  // Cobro del mes 4 de un cliente que ya existe, no un alta nueva: solo
  // cierra un ciclo de gracia si lo había, nunca vuelve a crear la cuenta de
  // Neon Auth ni el restaurante (aprovisionarClienteQr es para el alta).
  if (await esClienteExistente(miembroId)) {
    await registrarPagoRecuperado(miembroId);
    return NextResponse.json({ recibido: true, renovacion: true });
  }

  const meta = evento.data.metadata ?? {};
  const plan = meta.plan;
  const restauranteNombre = meta.restauranteNombre;
  const slugBase = meta.slugBase;
  const nombreContacto = meta.nombreContacto;
  const email = meta.email;

  if (plan !== 'basico' && plan !== 'ampliado') {
    console.error(`Webhook de Whop: pago ${evento.data.id} sin plan válido en metadata.`);
    return NextResponse.json({ recibido: true });
  }
  if (!restauranteNombre || !slugBase || !nombreContacto || !email || !miembroId) {
    console.error(`Webhook de Whop: pago ${evento.data.id} incompleto, no se aprovisiona.`, {
      restauranteNombre: !!restauranteNombre,
      slugBase: !!slugBase,
      nombreContacto: !!nombreContacto,
      email: !!email,
      miembroId: !!miembroId,
    });
    return NextResponse.json({ recibido: true });
  }

  const resultado = await aprovisionarClienteQr({
    idEvento: evento.id,
    email,
    nombreContacto,
    plan,
    restauranteNombre,
    slugBase,
    referenciaCliente: miembroId,
    // Whop no distingue cliente de suscripción como Stripe: el id de
    // membresía cumple ambos roles en este esquema.
    referenciaSuscripcion: miembroId,
  });

  if (!resultado.ok) {
    if (resultado.motivo === 'db_fallo') {
      return NextResponse.json({ error: 'Fallo aprovisionando' }, { status: 500 });
    }
    return NextResponse.json({ recibido: true, aprovisionado: false });
  }

  return NextResponse.json({ recibido: true, aprovisionado: true });
}
