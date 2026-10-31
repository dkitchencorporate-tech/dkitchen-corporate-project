/**
 * pruebas/p1/alta.test.ts
 *
 * Pruebas unitarias y de integración sobre el CÓDIGO REAL de alta única en Central.
 * Importa directamente `validarYCalcularAlta` desde '@/lib/alta-unica'
 * y lee los precios directamente desde '@/lib/pricing-config'.
 *
 * Ejecución: npx tsx pruebas/p1/alta.test.ts
 */

import { validarYCalcularAlta, type DatosAlta4Pasos } from '@/lib/alta-unica';
import {
  QR_MENU,
  FUNDADOR,
  BASE_OPERATIVA,
  SERVICIOS_QR,
} from '@/lib/pricing-config';
import fs from 'fs';
import path from 'path';

let ok = 0;
let mal = 0;

function assertTest(nombre: string, condicion: boolean, detalle?: string) {
  if (condicion) {
    ok++;
    console.log(`[OK]  ${nombre}`);
    if (detalle) console.log(`      Evidencia: ${detalle}`);
  } else {
    mal++;
    console.log(`[MAL] ${nombre}`);
    if (detalle) console.log(`      ERROR: ${detalle}`);
  }
}

console.log('======================================================================');
console.log('DKITCHEN CORPORATE · PRUEBAS SOBRE CÓDIGO REAL (alta-unica.ts)');
console.log('Fecha:', new Date().toISOString());
console.log('======================================================================\n');

// 1. Fundador correcto (Plan Sala, cuota trimestral según FUNDADOR.trimestre)
{
  const datos: DatosAlta4Pasos = {
    local: 'Restaurante El Laurel',
    contacto: 'María Gómez',
    email: 'laurel@restaurante.es',
    servicios: ['qr'],
    planQr: 'sala',
    modalidadTarifa: 'fundador',
    modoInicio: 'pago',
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'comercial',
    estadoFundador: { abierto: true, quedan: 15 },
  });

  const esperadoBase = FUNDADOR.trimestre; // 147 €
  const esperadoIva = Math.round(esperadoBase * 0.21 * 100) / 100; // 30.87 €
  const esperadoTotal = Math.round((esperadoBase + esperadoIva) * 100) / 100; // 177.87 €

  const valido =
    r.ok &&
    r.baseEuros === esperadoBase &&
    r.ivaEuros === esperadoIva &&
    r.totalHoyEuros === esperadoTotal &&
    r.desglose?.some((d) => d.concepto.includes('Fundador') && d.importeEuros === esperadoBase);

  assertTest(
    '1. Fundador correcto (Plan Sala, 147 € trimestral desde pricing-config)',
    Boolean(valido),
    `Base: ${r.baseEuros} €, IVA: ${r.ivaEuros} €, Total hoy: ${r.totalHoyEuros} €`
  );
}

// 2. Fundador con plan Local (debe fallar con error: solo Plan Sala)
{
  const datos: DatosAlta4Pasos = {
    local: 'Bar Central',
    contacto: 'Carlos Ruiz',
    email: 'carlos@barcentral.es',
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'fundador',
    modoInicio: 'pago',
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'comercial',
    estadoFundador: { abierto: true, quedan: 15 },
  });

  const valido = !r.ok && r.error === 'El programa Fundador solo es aplicable al Plan Sala.';
  assertTest(
    '2. Fundador con plan distinto de Sala (debe fallar con error)',
    Boolean(valido),
    `Error devuelto: "${r.error}"`
  );
}

// 3. Descuento comercial 11 % (debe fallar: no puede superar 10 %)
{
  const datos: DatosAlta4Pasos = {
    local: 'Mesón Ibérico',
    contacto: 'Ana Morales',
    email: 'ana@mesoniberico.es',
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'pago',
    descuentoComercialPct: 11,
    motivoDescuento: 'Cliente recomendado',
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'comercial',
  });

  const valido = !r.ok && r.error === 'El descuento manual del comercial no puede superar el 10 %.';
  assertTest(
    '3. Descuento comercial 11 % (debe fallar: tope absoluto 10 %)',
    Boolean(valido),
    `Error devuelto: "${r.error}"`
  );
}

// 4. Comercial con 8 % rechazado (R2: aunque envíe aprobacionDireccionDescuento = true a mano)
{
  const datos: DatosAlta4Pasos = {
    local: 'Café Del Sol',
    contacto: 'Roberto Peña',
    email: 'roberto@cafedelsol.es',
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'pago',
    descuentoComercialPct: 8,
    motivoDescuento: 'Apertura de local',
    aprobacionDireccionDescuento: true, // Enviado a mano por comercial
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'comercial',
  });

  const valido =
    !r.ok &&
    r.error === 'Los descuentos superiores al 5 % (del 6 al 10 %) están reservados a Dirección. Pídeselo a dirección.';

  assertTest(
    '4. Comercial con 8 % rechazado en servidor aunque envíe OK a mano (R2)',
    Boolean(valido),
    `Error devuelto: "${r.error}"`
  );
}

// 5. Comercial en modo gratis (debe fallar: reservado a Dirección)
{
  const datos: DatosAlta4Pasos = {
    local: 'Pizzería Roma',
    contacto: 'Marco Rossi',
    email: 'marco@pizzeriaroma.es',
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'gratis',
    diasPrueba: 15,
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'comercial',
  });

  const valido =
    !r.ok &&
    r.error === 'Los modos demo y cortesía/gratis están reservados exclusivamente a Dirección.';

  assertTest(
    '5. Comercial en modo gratis (debe fallar: reservado a Dirección)',
    Boolean(valido),
    `Error devuelto: "${r.error}"`
  );
}

// 6. Comercial con montaje gratis rechazado (R2: aunque envíe aprobacionDireccionMontaje = true a mano)
{
  const datos: DatosAlta4Pasos = {
    local: 'Taberna Los Frailes',
    contacto: 'Luis Fraile',
    email: 'luis@losfrailes.es',
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'pago',
    montajeGratis: true,
    origenMontaje: 'flyer',
    aprobacionDireccionMontaje: true, // Enviado a mano por comercial
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'comercial',
  });

  const valido =
    !r.ok &&
    r.error === 'El montaje gratis está reservado a Dirección. Pídeselo a dirección.';

  assertTest(
    '6. Comercial con montaje gratis rechazado en servidor aunque envíe OK a mano (R2)',
    Boolean(valido),
    `Error devuelto: "${r.error}"`
  );
}

// 7. Alta Local a 1 € sin puesta a punto (total hoy 1,00 € + IVA = 1,21 €, alta incluida 0 €)
{
  const datos: DatosAlta4Pasos = {
    local: 'Hamburguesería Buns',
    contacto: 'Elena Torres',
    email: 'elena@buns.es',
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: '1euro',
    modoInicio: 'pago',
    puestaAPunto: false,
    montajeGratis: false,
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'comercial',
  });

  const primerMesPromo = QR_MENU.primerMes; // 1 €
  const esperadoIva = Math.round(primerMesPromo * 0.21 * 100) / 100; // 0.21 €
  const esperadoTotal = Math.round((primerMesPromo + esperadoIva) * 100) / 100; // 1.21 €

  const altaIncluida = r.desglose?.some(
    (d) => d.concepto.includes('Alta inicial') && d.importeEuros === 0
  );

  const valido =
    r.ok &&
    r.baseEuros === primerMesPromo &&
    r.ivaEuros === esperadoIva &&
    r.totalHoyEuros === esperadoTotal &&
    altaIncluida;

  assertTest(
    '7. Alta Local a 1 € sin puesta a punto (total hoy 1,00 € + IVA = 1,21 €, alta 0 €)',
    Boolean(valido),
    `Base: ${r.baseEuros} €, IVA: ${r.ivaEuros} €, Total hoy: ${r.totalHoyEuros} €, Desglose: ${JSON.stringify(r.desglose)}`
  );
}

// 8. Dirección aplicando descuento 8 % y montaje gratis (válido para Dirección con cupo disponible)
{
  const datos: DatosAlta4Pasos = {
    local: 'Restaurante Gran Gourmet',
    contacto: 'Javier Castillo',
    email: 'javier@grangourmet.es',
    servicios: ['qr'],
    planQr: 'ampliado',
    modalidadTarifa: 'mensual',
    modoInicio: 'pago',
    descuentoComercialPct: 8,
    motivoDescuento: 'Acuerdo estratégico de grupo',
    montajeGratis: true,
    origenMontaje: 'visita',
  };

  const r = validarYCalcularAlta(datos, {
    rolAdmin: 'direccion',
    cupoMontajesGratis: { usados: 5, cupo: 20 },
  });

  const planMensual = QR_MENU.planes.ampliado.mensual; // 29 €
  const ahorroEsperado = Math.round((planMensual * 8) / 100); // 2 €
  const baseEsperada = planMensual - ahorroEsperado; // 27 €
  const ivaEsperado = Math.round(baseEsperada * 0.21 * 100) / 100; // 5.67 €
  const totalEsperado = Math.round((baseEsperada + ivaEsperado) * 100) / 100; // 32.67 €

  const valido =
    r.ok &&
    r.baseEuros === baseEsperada &&
    r.ivaEuros === ivaEsperado &&
    r.totalHoyEuros === totalEsperado &&
    r.desglose?.some((d) => d.concepto.includes('Montaje gratis incluido') && d.importeEuros === 0);

  assertTest(
    '8. Dirección aplicando descuento 8 % y montaje gratis (autorizado)',
    Boolean(valido),
    `Base: ${r.baseEuros} €, IVA: ${r.ivaEuros} €, Total hoy: ${r.totalHoyEuros} €`
  );
}

// 9. Comprobación estricta de seguridad en la migración SQL 0110 y guardián de Actions
{
  const rutaSql = path.join(process.cwd(), 'db/migrations/0110_comercial_clientes.sql');
  const sql = fs.readFileSync(rutaSql, 'utf8');

  const dropCorrecto = sql.includes('DROP FUNCTION IF EXISTS dk.admin_admin_alta(text, text);');
  const exigirDireccionDb = sql.includes('PERFORM dk.exigir_direccion();');
  const rolDefectoComercial = sql.includes("p_rol_admin text DEFAULT 'comercial'");

  const rutaActions = path.join(process.cwd(), 'src/app/admin-dkitchen/administradores/actions.ts');
  const act = fs.readFileSync(rutaActions, 'utf8');
  const exigirDireccionAction = act.includes('await exigirRolDireccion(jwt);');

  const valido =
    dropCorrecto && exigirDireccionDb && rolDefectoComercial && exigirDireccionAction;

  assertTest(
    '9. Seguridad en DB y Action (DROP 2-args, exigir_direccion() y rol dirección)',
    Boolean(valido),
    `DROP 2-args: ${dropCorrecto}, dk.exigir_direccion(): ${exigirDireccionDb}, Rol por defecto: ${rolDefectoComercial}, Guardián Action: ${exigirDireccionAction}`
  );
}

console.log('\n----------------------------------------------------------------------');
console.log(`RESULTADO FINAL: ${ok} OK · ${mal} MAL`);
console.log('----------------------------------------------------------------------');

if (mal > 0) process.exit(1);
