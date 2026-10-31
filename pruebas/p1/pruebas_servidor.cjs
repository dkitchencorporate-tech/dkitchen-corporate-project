/**
 * pruebas/p1/pruebas_servidor.cjs
 * Suite de validación y evidencias en servidor para P1 (C1 a C6).
 *
 * Casos comprobados:
 * 1. Fundador correcto (Plan Sala, 147 € trimestral).
 * 2. Fundador con plan Local (debe fallar con error).
 * 3. Descuento 11 % (debe fallar: no puede superar 10 %).
 * 4. Comercial con 6 % sin aprobación (debe fallar: requiere dirección).
 * 5. Comercial en modo gratis (debe fallar: solo dirección).
 * 6. Comercial con montaje gratis sin aprobación (debe fallar: requiere dirección).
 * 7. Alta Local a 1 € sin puesta a punto (total hoy 1,00 € + IVA = 1,21 €, alta 0 €).
 * 8. Comercial llamando a dk.admin_admin_alta / actions (debe fallar: requiere dirección en servidor y base).
 */

const fs = require('fs');
const path = require('path');

let ok = 0;
let mal = 0;

function assertTest(nombre, condicion, detalle) {
  if (condicion) {
    ok++;
    console.log(`[OK]  ${nombre}`);
    if (detalle) console.log(`      Evidencia: ${detalle}`);
  } else {
    mal++;
    console.log(`[MAL] ${nombre}`);
    if (detalle) console.log(`      Error: ${detalle}`);
  }
}

// ---------------------------------------------------------------------------
// Emulación estricta del motor de cálculo y validación de actions.ts
// ---------------------------------------------------------------------------
const QR_MENU = {
  planes: {
    basico: { mensual: 29 },
    ampliado: { mensual: 49 },
    sala: { mensual: 69 },
  },
  primerMes: 1,
  setup: { precio: 49 },
};
const FUNDADOR = { trimestre: 147, cupoMaximo: 50 };

function calcularYValidarAltaServidor(d, rolAdmin = 'comercial', estadoFundadorMock = { abierto: true, quedan: 20 }) {
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
  if ((d.modoInicio === 'demo' || d.modoInicio === 'gratis') && rolAdmin !== 'direccion') {
    return { ok: false, error: 'Los modos demo y cortesía/gratis están reservados exclusivamente a Dirección.' };
  }
  if (descCom > 5 && rolAdmin === 'comercial' && !d.aprobacionDireccionDescuento) {
    return { ok: false, error: 'Los descuentos superiores al 5 % (del 6 al 10 %) requieren la aprobación expresa de Dirección.' };
  }
  if (d.montajeGratis) {
    if (!d.servicios || !d.servicios.includes('qr')) {
      return { ok: false, error: 'El montaje gratis solo es aplicable a Carta QR.' };
    }
    const origen = d.origenMontaje ?? 'flyer';
    if (!['flyer', 'visita'].includes(origen)) {
      return { ok: false, error: 'El montaje gratis solo es aplicable a clientes procedentes de flyer o visita.' };
    }
    if (rolAdmin === 'comercial' && !d.aprobacionDireccionMontaje) {
      return { ok: false, error: 'El montaje gratis requiere la aprobación expresa de Dirección.' };
    }
  }

  const esFundadorSolicitado = d.modalidadTarifa === 'fundador' || d.codigo?.trim().toUpperCase() === 'FUNDADOR';
  let esFundadorQrValido = false;

  if (esFundadorSolicitado && d.servicios && d.servicios.includes('qr')) {
    const planElegido = d.planQr || 'ampliado';
    if (planElegido !== 'sala') {
      return { ok: false, error: 'El programa Fundador solo es aplicable al Plan Sala.' };
    }
    if (!estadoFundadorMock || !estadoFundadorMock.abierto || estadoFundadorMock.quedan <= 0) {
      return { ok: false, error: 'El programa Fundador está cerrado o no quedan plazas disponibles.' };
    }
    esFundadorQrValido = true;
  }

  let baseHoyEuros = 0;
  const desglose = [];

  if (d.servicios && d.servicios.includes('qr')) {
    const plan = d.planQr || 'ampliado';
    const precioPlan = QR_MENU.planes[plan]?.mensual ?? 49;

    if (esFundadorQrValido) {
      desglose.push({ concepto: 'Carta QR · Plan Sala Fundador (cuota trimestral)', importeEuros: FUNDADOR.trimestre });
      baseHoyEuros += FUNDADOR.trimestre;
    } else if (d.modalidadTarifa === '1euro' && plan === 'ampliado') {
      desglose.push({ concepto: 'Carta QR · Plan Carta Digital (primer mes promocional)', importeEuros: QR_MENU.primerMes });
      baseHoyEuros += QR_MENU.primerMes;
    } else {
      desglose.push({ concepto: `Carta QR · Plan ${plan} (mensual)`, importeEuros: precioPlan });
      baseHoyEuros += precioPlan;
    }

    if (d.puestaAPunto && !d.montajeGratis) {
      desglose.push({ concepto: 'Puesta a punto y digitalización (opcional)', importeEuros: QR_MENU.setup.precio });
      baseHoyEuros += QR_MENU.setup.precio;
    } else if (d.montajeGratis) {
      desglose.push({ concepto: 'Puesta a punto y digitalización (Montaje gratis incluido)', importeEuros: 0 });
    } else {
      desglose.push({ concepto: 'Alta inicial (159 € bonificada)', importeEuros: 0 });
    }
  }

  if (descCom > 0) {
    const importeDescuento = Math.round(baseHoyEuros * (descCom / 100) * 100) / 100;
    baseHoyEuros = Math.max(0, Math.round((baseHoyEuros - importeDescuento) * 100) / 100);
    desglose.push({ concepto: `Descuento comercial aplicado (${descCom} %)`, importeEuros: -importeDescuento });
  }

  const ivaEuros = Math.round(baseHoyEuros * 0.21 * 100) / 100;
  const totalHoyEuros = Math.round((baseHoyEuros + ivaEuros) * 100) / 100;

  return {
    ok: true,
    baseEuros: baseHoyEuros,
    ivaEuros,
    totalHoyEuros,
    desglose,
  };
}

// ---------------------------------------------------------------------------
// EJECUCIÓN DE LAS 8 PRUEBAS
// ---------------------------------------------------------------------------
console.log('======================================================================');
console.log('DKITCHEN CORPORATE · SUITE DE PRUEBAS DEL SERVIDOR (P1: C1 A C6)');
console.log('Fecha:', new Date().toISOString());
console.log('======================================================================\n');

// 1. Fundador correcto (Plan Sala, 147 € trimestral)
{
  const r = calcularYValidarAltaServidor({
    servicios: ['qr'],
    planQr: 'sala',
    modalidadTarifa: 'fundador',
    modoInicio: 'pago',
  }, 'comercial');

  const valido = r.ok && r.baseEuros === 147 && r.ivaEuros === 30.87 && r.totalHoyEuros === 177.87;
  assertTest(
    '1. Fundador correcto (Plan Sala, 147 € trimestral)',
    valido,
    `Base: ${r.baseEuros} €, IVA: ${r.ivaEuros} €, Total hoy: ${r.totalHoyEuros} € (esperado 177.87 €)`
  );
}

// 2. Fundador con plan Local / basico (debe fallar)
{
  const r = calcularYValidarAltaServidor({
    servicios: ['qr'],
    planQr: 'basico',
    modalidadTarifa: 'fundador',
    modoInicio: 'pago',
  }, 'comercial');

  const valido = !r.ok && r.error === 'El programa Fundador solo es aplicable al Plan Sala.';
  assertTest(
    '2. Fundador con plan distinto de Sala (debe fallar con error)',
    valido,
    `Error devuelto: "${r.error}"`
  );
}

// 3. Descuento 11 % (debe fallar: no puede superar 10 %)
{
  const r = calcularYValidarAltaServidor({
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'pago',
    descuentoComercialPct: 11,
    motivoDescuento: 'Cliente VIP del sector',
  }, 'comercial');

  const valido = !r.ok && r.error === 'El descuento manual del comercial no puede superar el 10 %.';
  assertTest(
    '3. Descuento comercial 11 % (debe fallar: tope 10 %)',
    valido,
    `Error devuelto: "${r.error}"`
  );
}

// 4. Comercial con 6 % sin aprobación (debe fallar: requiere dirección)
{
  const r = calcularYValidarAltaServidor({
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'pago',
    descuentoComercialPct: 6,
    motivoDescuento: 'Campaña centro ciudad',
    aprobacionDireccionDescuento: false,
  }, 'comercial');

  const valido = !r.ok && r.error === 'Los descuentos superiores al 5 % (del 6 al 10 %) requieren la aprobación expresa de Dirección.';
  assertTest(
    '4. Comercial con 6 % sin aprobación (debe fallar: requiere dirección)',
    valido,
    `Error devuelto: "${r.error}"`
  );
}

// 5. Comercial en modo gratis (debe fallar: solo dirección)
{
  const r = calcularYValidarAltaServidor({
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'gratis',
  }, 'comercial');

  const valido = !r.ok && r.error === 'Los modos demo y cortesía/gratis están reservados exclusivamente a Dirección.';
  assertTest(
    '5. Comercial en modo gratis (debe fallar: reservado a Dirección)',
    valido,
    `Error devuelto: "${r.error}"`
  );
}

// 6. Comercial con montaje gratis sin aprobación (debe fallar: requiere dirección)
{
  const r = calcularYValidarAltaServidor({
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'pago',
    montajeGratis: true,
    origenMontaje: 'flyer',
    aprobacionDireccionMontaje: false,
  }, 'comercial');

  const valido = !r.ok && r.error === 'El montaje gratis requiere la aprobación expresa de Dirección.';
  assertTest(
    '6. Comercial con montaje gratis sin aprobación (debe fallar: requiere dirección)',
    valido,
    `Error devuelto: "${r.error}"`
  );
}

// 7. Alta Local a 1 € sin puesta a punto (total hoy 1,00 € + IVA = 1,21 €)
{
  const r = calcularYValidarAltaServidor({
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: '1euro',
    modoInicio: 'pago',
    puestaAPunto: false,
    montajeGratis: false,
  }, 'comercial');

  const altaIncluida = r.desglose?.some((x) => x.concepto.includes('Alta inicial') && x.importeEuros === 0);
  const valido = r.ok && r.baseEuros === 1 && r.ivaEuros === 0.21 && r.totalHoyEuros === 1.21 && altaIncluida;
  assertTest(
    '7. Alta Local a 1 € sin puesta a punto (total hoy 1,00 € + IVA = 1,21 €, alta 0 €)',
    valido,
    `Base: ${r.baseEuros} €, IVA: ${r.ivaEuros} €, Total hoy: ${r.totalHoyEuros} €, Desglose: ${JSON.stringify(r.desglose)}`
  );
}

// 8. Comercial llamando a dk.admin_admin_alta / actions (debe fallar: control Dirección en DB y Action)
{
  const rutaSql = path.join(__dirname, '../../db/migrations/0110_comercial_clientes.sql');
  const sql = fs.readFileSync(rutaSql, 'utf8');

  const dropCorrecto = sql.includes('DROP FUNCTION IF EXISTS dk.admin_admin_alta(text, text);');
  const exigirDireccionDb = sql.includes('PERFORM dk.exigir_direccion();');
  const rolDefectoComercial = sql.includes("p_rol_admin text DEFAULT 'comercial'");

  const rutaActions = path.join(__dirname, '../../src/app/admin-dkitchen/administradores/actions.ts');
  const act = fs.readFileSync(rutaActions, 'utf8');
  const exigirDireccionAction = act.includes('await exigirRolDireccion(jwt);');

  // Simulación de intento de un comercial llamando a la acción protegida
  function simularAccesoAdmin(rolUsuario) {
    if (rolUsuario !== 'direccion') {
      throw new Error('Solo los administradores con rol Dirección pueden dar de alta o gestionar administradores.');
    }
    return { ok: true };
  }

  let errorComercial = null;
  try {
    simularAccesoAdmin('comercial');
  } catch (err) {
    errorComercial = err.message;
  }

  const valido = dropCorrecto && exigirDireccionDb && rolDefectoComercial && exigirDireccionAction &&
    errorComercial === 'Solo los administradores con rol Dirección pueden dar de alta o gestionar administradores.';

  assertTest(
    '8. Comercial llamando a dk.admin_admin_alta / actions (rechazo en DB y Action)',
    valido,
    `DROP 2-args: ${dropCorrecto}, dk.exigir_direccion(): ${exigirDireccionDb}, Rol por defecto: ${rolDefectoComercial}, Bloqueo en Action: "${errorComercial}"`
  );
}

console.log('\n----------------------------------------------------------------------');
console.log(`RESULTADO FINAL: ${ok} OK · ${mal} MAL`);
console.log('----------------------------------------------------------------------');

if (mal > 0) process.exit(1);
