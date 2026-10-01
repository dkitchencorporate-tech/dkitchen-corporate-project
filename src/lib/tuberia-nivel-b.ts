import 'server-only';
import { enviarCorreoCliente, enviarCorreoInterno, escaparHtml } from '@/lib/email';

/**
 * Tubería común de post-pago del Nivel B (Parte 8, Sección 8): contrato vía
 * Signaturit, factura compatible Verifactu, documento de "qué sigue" por
 * email, ticket interno en cola de ejecución.
 *
 * SIN INTEGRAR TODAVÍA — HONESTO A PROPÓSITO: no hay credenciales de
 * Signaturit en este proyecto, y una factura Verifactu-compliant de verdad
 * exige un software de facturación certificado (registro ante la AEAT,
 * encadenado de hashes, QR fiscal) — una decisión de proveedor que le toca
 * a Alex, no algo que se pueda improvisar aquí sin inventar una integración
 * que parezca real sin serlo. Esta función hace lo que sí puede hacer con
 * lo que existe hoy: registra el pedido (ya hecho por quien la llama),
 * avisa al cliente que el contrato y la factura llegan en breve (sin
 * afirmar que ya se enviaron), y le da a Alex, en un solo correo, todos los
 * datos que necesita para generarlos y enviarlos él mismo hoy mismo — el
 * mismo patrón ya usado para el aviso de la Auditoría pagada.
 *
 * Cuando existan las credenciales reales, esta función es el único sitio
 * que hay que tocar: sustituir el bloque de "aviso a Alex" por las llamadas
 * reales a la API de Signaturit y al proveedor de facturación elegido, y
 * llamar a marcarContratoEnviado/marcarFacturaEmitida (ya existen,
 * db/migrations/0014) cuando cada una responda con éxito.
 */

const NOMBRES_PRODUCTO: Record<string, string> = {
  'nucleo-operativo': 'Núcleo Operativo',
  'dark-kitchen-ruta-b': 'Dark Kitchen — Marca en Caja',
  experience: 'Experience',
  auditoria: 'Auditoría de canales + Escandallo',
};

export interface DatosPedidoParaTuberia {
  id: string;
  producto: string;
  token: string;
  email: string;
  nombreContacto: string;
  restauranteNombre?: string;
  importeCentimos: number;
  origen: string;
}

function formatEuros(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export async function dispararTuberiaPostPago(pedido: DatosPedidoParaTuberia): Promise<void> {
  const nombreProducto = NOMBRES_PRODUCTO[pedido.producto] ?? pedido.producto;
  const enlaceIntake = `${pedido.origen}/nucleo-operativo/completar/${pedido.token}`;

  try {
    await enviarCorreoCliente(
      pedido.email,
      `Tu ${nombreProducto} — qué sigue ahora`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6E0C2B;">¡Gracias, ${escaparHtml(pedido.nombreContacto)}!</h2>
        <p>Tu pago de ${nombreProducto} (${formatEuros(pedido.importeCentimos)}) quedó confirmado. Esto es lo que
        sigue, en orden:</p>
        <ol style="line-height: 1.8;">
          <li><strong>Cuéntanos tu negocio</strong> — rellena el formulario de activación, es lo que necesitamos
            para montar tu sistema:
            <a href="${enlaceIntake}">${enlaceIntake}</a></li>
          <li><strong>Contrato</strong> — te llega por separado para firma electrónica en los próximos días.</li>
          <li><strong>Factura</strong> — la recibes junto con el contrato.</li>
          <li><strong>Puesta en marcha</strong> — empezamos en cuanto tengamos tu formulario y el contrato firmado.</li>
        </ol>
        <p>Cualquier duda, respondes a este correo o nos escribes por WhatsApp.</p>
      </div>`
    );
  } catch (error) {
    console.error(`No se pudo enviar el correo de "qué sigue" a ${pedido.email} (pedido ${pedido.id}):`, error);
  }

  try {
    await enviarCorreoInterno(
      `NIVEL B PAGADO: ${nombreProducto} — ${pedido.nombreContacto} (${formatEuros(pedido.importeCentimos)})`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6E0C2B;">Nuevo pedido de Nivel B — pendiente de contrato y factura</h2>
        <p>Esto no está automatizado todavía (falta Signaturit y decidir el proveedor de facturación Verifactu)
        — genera y envía estos dos documentos tú mismo con estos datos:</p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 12px;">
          <p><strong>Producto:</strong> ${escaparHtml(nombreProducto)}</p>
          <p><strong>Importe:</strong> ${formatEuros(pedido.importeCentimos)}</p>
          <p><strong>Cliente:</strong> ${escaparHtml(pedido.nombreContacto)}</p>
          <p><strong>Correo:</strong> <a href="mailto:${escaparHtml(pedido.email)}">${escaparHtml(pedido.email)}</a></p>
          ${pedido.restauranteNombre ? `<p><strong>Negocio:</strong> ${escaparHtml(pedido.restauranteNombre)}</p>` : ''}
          <p><strong>Id de pedido:</strong> ${escaparHtml(pedido.id)}</p>
          <p style="color:#b91c1c;"><strong>Falta NIF/CIF para la factura</strong> — el formulario de intake
          todavía no lo pide; pídeselo aparte hasta que se añada ese campo.</p>
        </div>
        <p style="margin-top: 16px;">Formulario de activación del cliente: <a href="${enlaceIntake}">${enlaceIntake}</a></p>
      </div>`
    );
  } catch (error) {
    console.error(`No se pudo enviar el aviso interno de Nivel B pagado (pedido ${pedido.id}):`, error);
  }
}
