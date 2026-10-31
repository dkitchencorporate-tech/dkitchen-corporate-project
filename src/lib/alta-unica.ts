/**
 * src/lib/alta-unica.ts
 *
 * Motor puro de cálculo y validación de altas en Central (P1: Carta QR, Signature, Experience, Auditoría).
 * Fuente única de cálculo de presupuestos e importes para la Server Action y los tests automatizados.
 * Lee todos los precios y tarifas exclusivamente de '@/lib/pricing-config'.
 * Cero dependencias de base de datos ni de Stripe.
 */

import {
  QR_MENU,
  FUNDADOR,
  BASE_OPERATIVA,
  EXPERIENCE,
  AUDITORIA_CANALES,
  SERVICIOS_QR,
  esPlanQr,
  nombrePlan,
} from '@/lib/pricing-config';

export const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export type DatosAlta4Pasos = {
  local: string;
  ciudad?: string;
  direccion?: string;
  cif?: string;
  contacto: string;
  telefono?: string;
  email: string;
  servicios: string[]; // 'qr' | 'signature' | 'experience' | 'auditoria'
  planQr?: string; // 'basico' | 'ampliado' | 'sala'
  modoInicio: 'pago' | 'gratis' | 'demo';
  modalidadTarifa: '1euro' | 'mensual' | 'fundador' | 'unico' | 'cuotas';
  diasPrueba?: number;
  codigo?: string;
  descuentoComercialPct?: number; // 0 | 5 | 10
  motivoDescuento?: string;
  aprobacionDireccionDescuento?: boolean; // Se ignora si el rol es comercial (R2)
  aprobacionDireccionMontaje?: boolean; // Se ignora si el rol es comercial (R2)
  origenMontaje?: 'flyer' | 'visita';
  puestaAPunto?: boolean;
  montajeGratis?: boolean;
  enviarCorreo?: boolean;
};

export type LineaDesglose = { concepto: string; importeEuros: number };

export type ContextoValidacionAlta = {
  rolAdmin: 'direccion' | 'comercial' | string;
  estadoFundador?: { abierto: boolean; quedan: number };
  cupoMontajesGratis?: { usados: number; cupo: number };
};

export type ResultadoCalculoAlta = {
  ok: boolean;
  error?: string;
  baseEuros?: number;
  ivaEuros?: number;
  totalHoyEuros?: number;
  desglose?: LineaDesglose[];
  recurrenteEuros?: number;
  intervaloMeses?: number;
  mesesGratisSignature?: number;
  cuponSignature?: string;
  faseSignature?: string;
  esFundadorQrValido?: boolean;
};

/**
 * Valida y calcula el desglose económico de un alta única sin efectos secundarios.
 */
export function validarYCalcularAlta(
  d: DatosAlta4Pasos,
  ctx: ContextoValidacionAlta
): ResultadoCalculoAlta {
  const email = String(d.email ?? '').trim().toLowerCase();
  const contacto = String(d.contacto ?? '').trim().slice(0, 80);
  const local = String(d.local ?? '').trim().slice(0, 80);

  if (!CORREO_REGEX.test(email) || email.length > 254) {
    return { ok: false, error: 'El correo electrónico no es válido.' };
  }
  if (contacto.length < 2 || local.length < 2) {
    return { ok: false, error: 'Pon el nombre del contacto y del local.' };
  }
  if (!d.servicios || d.servicios.length === 0) {
    return { ok: false, error: 'Debes seleccionar al menos un servicio.' };
  }

  const rolAdmin = ctx.rolAdmin ?? 'comercial';

  // Regla B2.7: Modos demo y cortesía/gratis SOLO para dirección
  if ((d.modoInicio === 'demo' || d.modoInicio === 'gratis') && rolAdmin !== 'direccion') {
    return { ok: false, error: 'Los modos demo y cortesía/gratis están reservados exclusivamente a Dirección.' };
  }

  // Regla B2.1 & R2: Descuento comercial máximo 10%
  const descCom = Number(d.descuentoComercialPct) || 0;
  if (descCom > 10) {
    return { ok: false, error: 'El descuento manual del comercial no puede superar el 10 %.' };
  }
  if (descCom < 0) {
    return { ok: false, error: 'El descuento no puede ser negativo.' };
  }
  if (descCom > 0 && (!d.motivoDescuento || d.motivoDescuento.trim().length < 4)) {
    return { ok: false, error: 'Indica el motivo del descuento del comercial (mínimo 4 caracteres).' };
  }

  // Regla R2: el servidor rechaza para el rol comercial cualquier descuento > 5 %,
  // aunque se envíe aprobacionDireccionDescuento = true a mano. Solo Dirección puede aplicarlo.
  if (descCom > 5 && rolAdmin === 'comercial') {
    return {
      ok: false,
      error: 'Los descuentos superiores al 5 % (del 6 al 10 %) están reservados a Dirección. Pídeselo a dirección.',
    };
  }

  // Regla R2: Montaje gratis: el servidor rechaza para el rol comercial el montaje gratis,
  // aunque se envíe aprobacionDireccionMontaje = true a mano. Solo Dirección puede aplicarlo.
  if (d.montajeGratis) {
    if (!d.servicios.includes('qr')) {
      return { ok: false, error: 'El montaje gratis solo es aplicable a Carta QR.' };
    }
    if (rolAdmin === 'comercial') {
      return {
        ok: false,
        error: 'El montaje gratis está reservado a Dirección. Pídeselo a dirección.',
      };
    }
    const origen = d.origenMontaje ?? 'flyer';
    if (!['flyer', 'visita'].includes(origen)) {
      return { ok: false, error: 'El montaje gratis solo es aplicable a clientes procedentes de flyer o visita.' };
    }
    const usados = ctx.cupoMontajesGratis?.usados ?? 0;
    const cupo = ctx.cupoMontajesGratis?.cupo ?? 20;
    if (usados >= cupo) {
      return { ok: false, error: `El cupo de ${cupo} montajes gratis ya está completo (${usados} de ${cupo} usados).` };
    }
  }

  // Validación estricta del programa Fundador (plazas, fecha y plan Sala)
  const esFundadorSolicitado = d.modalidadTarifa === 'fundador' || d.codigo?.trim().toUpperCase() === 'FUNDADOR';
  let esFundadorQrValido = false;

  if (esFundadorSolicitado && d.servicios.includes('qr')) {
    const planElegido = esPlanQr(d.planQr) ? d.planQr : 'ampliado';
    if (planElegido !== 'sala') {
      return { ok: false, error: 'El programa Fundador solo es aplicable al Plan Sala.' };
    }
    const ef = ctx.estadoFundador;
    if (!ef || !ef.abierto || ef.quedan <= 0) {
      return { ok: false, error: 'El programa Fundador está cerrado o no quedan plazas disponibles.' };
    }
    esFundadorQrValido = true;
  }

  let baseHoyEuros = 0;
  let recurrenteEuros = 0;
  let intervaloMeses = 1;
  const desglose: LineaDesglose[] = [];

  // A. Carta QR
  if (d.servicios.includes('qr')) {
    const plan = esPlanQr(d.planQr) ? d.planQr : 'ampliado';
    const precioPlan = QR_MENU.planes[plan].mensual;

    if (esFundadorQrValido) {
      // Fundador cobrado 147 € por trimestre, con recurrencia trimestral
      desglose.push({ concepto: 'Carta QR · Plan Sala Fundador (cuota trimestral)', importeEuros: FUNDADOR.trimestre });
      baseHoyEuros += FUNDADOR.trimestre;
      recurrenteEuros = FUNDADOR.trimestre;
      intervaloMeses = 3;
    } else if (d.modalidadTarifa === '1euro' && plan === 'ampliado') {
      desglose.push({ concepto: `Carta QR · Plan ${nombrePlan(plan)} (primer mes promocional)`, importeEuros: QR_MENU.primerMes });
      baseHoyEuros += QR_MENU.primerMes;
      recurrenteEuros = precioPlan;
      intervaloMeses = 1;
    } else {
      desglose.push({ concepto: `Carta QR · Plan ${nombrePlan(plan)} (mensual)`, importeEuros: precioPlan });
      baseHoyEuros += precioPlan;
      recurrenteEuros = precioPlan;
      intervaloMeses = 1;
    }

    // Puesta a punto (C2):
    // El alta va incluida siempre (0 €).
    // La puesta a punto es un extra opcional (49 €), desmarcada por defecto.
    if (d.puestaAPunto && !d.montajeGratis) {
      desglose.push({ concepto: 'Puesta a punto y digitalización (opcional)', importeEuros: SERVICIOS_QR.puestaAPunto });
      baseHoyEuros += SERVICIOS_QR.puestaAPunto;
    } else if (d.montajeGratis) {
      desglose.push({ concepto: 'Puesta a punto y digitalización (Montaje gratis incluido)', importeEuros: 0 });
    } else {
      desglose.push({ concepto: 'Alta inicial (159 € bonificada)', importeEuros: 0 });
    }
  }

  let mesesGratisSignature: number | undefined;
  let cuponSignature: string | undefined;
  let faseSignature: string | undefined;

  // B. Signature (C3: lógica alineada con cobros.ts)
  if (d.servicios.includes('signature')) {
    if (esFundadorSolicitado) {
      const ef = ctx.estadoFundador;
      if (!ef || !ef.abierto || ef.quedan <= 0) {
        return { ok: false, error: 'El programa Fundador está cerrado o no quedan plazas disponibles para Signature.' };
      }
      const fs = FUNDADOR.signature;
      desglose.push({ concepto: 'Signature · Entrada Fundador (pago único)', importeEuros: fs.entrada });
      baseHoyEuros += fs.entrada;
      if (!d.servicios.includes('qr')) {
        recurrenteEuros = BASE_OPERATIVA.mantenimiento.mensual; // 99 €
        intervaloMeses = 1;
        mesesGratisSignature = BASE_OPERATIVA.mantenimiento.mesesGratis; // 2 meses incluidos, empieza en mes 3
        cuponSignature = `dk_fundador_signature_${BASE_OPERATIVA.mantenimiento.mensual - fs.mensual}x${fs.meses}`;
      }
    } else if (d.modalidadTarifa === 'cuotas') {
      const { cuotas, importeCuota } = BASE_OPERATIVA.fraccionado;
      desglose.push({ concepto: `Signature · 1.ª cuota de entrada (${cuotas} × ${importeCuota} €)`, importeEuros: importeCuota });
      baseHoyEuros += importeCuota;
      if (!d.servicios.includes('qr')) {
        recurrenteEuros = importeCuota;
        intervaloMeses = 1;
        faseSignature = 'cuotas';
      }
    } else {
      const entradaNormal = BASE_OPERATIVA.pagoUnico;
      desglose.push({ concepto: 'Signature · Entrada (pago único)', importeEuros: entradaNormal });
      baseHoyEuros += entradaNormal;
      if (!d.servicios.includes('qr')) {
        recurrenteEuros = BASE_OPERATIVA.mantenimiento.mensual; // 99 €
        intervaloMeses = 1;
        mesesGratisSignature = BASE_OPERATIVA.mantenimiento.mesesGratis; // 2 meses incluidos, empieza en mes 3
      }
    }
  }

  // C. Experience
  if (d.servicios.includes('experience')) {
    const precioExp = d.servicios.includes('qr')
      ? EXPERIENCE.tarifas.primeraParaClienteQr.precio
      : EXPERIENCE.tarifas.primeraVez.precio;
    desglose.push({ concepto: 'Experience · 1.er evento gastronómico llave en mano', importeEuros: precioExp });
    baseHoyEuros += precioExp;
  }

  // D. Auditoría
  if (d.servicios.includes('auditoria')) {
    desglose.push({ concepto: 'Auditoría de canales externos', importeEuros: AUDITORIA_CANALES.precioOferta });
    baseHoyEuros += AUDITORIA_CANALES.precioOferta;
  }

  // Aplicación del descuento comercial
  if (descCom > 0) {
    const ahorro = Math.round((baseHoyEuros * descCom) / 100);
    desglose.push({ concepto: `Descuento comercial (-${descCom} %)`, importeEuros: -ahorro });
    baseHoyEuros = Math.max(0, baseHoyEuros - ahorro);
  }

  const ivaEuros = Math.round(baseHoyEuros * 0.21 * 100) / 100;
  const totalHoyEuros = Math.round((baseHoyEuros + ivaEuros) * 100) / 100;

  return {
    ok: true,
    baseEuros: baseHoyEuros,
    ivaEuros,
    totalHoyEuros,
    desglose,
    recurrenteEuros,
    intervaloMeses,
    mesesGratisSignature,
    cuponSignature,
    faseSignature,
    esFundadorQrValido,
  };
}
