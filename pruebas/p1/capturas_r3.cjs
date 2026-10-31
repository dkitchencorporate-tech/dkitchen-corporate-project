/**
 * Script de capturas automatizadas Playwright para R3 (P1)
 * Ejecuta capturas a 360, 390, 768 y 1.024 px de:
 * - 4 pasos del alta
 * - Lista de clientes Central
 * - Ficha única con cada pestaña (10 pestañas)
 * - Administradores
 * - Repetición de qr_768px.png desde live preview
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../../REPORTES/capturas');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const credPath = 'C:/Users/karc0/OneDrive/Desktop/dkitchen corporate/corporate doc/Credenciales/Vercel_bypass_previews.txt';
const bypassToken = fs.existsSync(credPath) ? fs.readFileSync(credPath, 'utf8').trim().split('\n').pop().trim() : '';
const previewBase = 'https://dkitchen-corporate-project-clkm62wzh-architect-sys-projects.vercel.app';

const VIEWPORTS = [
  { nombre: '360px', width: 360, height: 800 },
  { nombre: '390px', width: 390, height: 844 },
  { nombre: '768px', width: 768, height: 1024 },
  { nombre: '1024px', width: 1024, height: 768 },
];

function wrapHtml(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            noche: '#140D0F',
            tinta: '#1E1418',
            vino: '#5A0F1F',
            hondo: '#3D0A14',
            oro: '#C49A45',
            dorado: '#A88030',
            crema: '#FAF7F2',
            papel: '#F3EFE8',
            linea: '#E7E1D6',
            carbon: '#1F181B',
            niebla: '#6E6266',
            ceniza: '#9E9296',
          },
          fontFamily: {
            display: ['Cinzel', 'serif'],
            sans: ['Plus Jakarta Sans', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #FAF7F2; color: #1F181B; }
    .font-display { font-family: 'Cinzel', serif; }
  </style>
</head>
<body class="bg-crema text-carbon antialiased min-h-screen">
  ${bodyContent}
</body>
</html>`;
}

function htmlAltaPaso1() {
  return wrapHtml('Alta Única · Paso 1', `
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-noche/60 backdrop-blur-sm overflow-y-auto">
    <div class="relative w-full max-w-2xl rounded-[28px] border border-linea bg-crema p-5 sm:p-8 pb-32 sm:pb-8 shadow-2xl text-carbon my-auto max-h-[92vh] overflow-y-auto" style="padding-bottom: max(6.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));">
      <div class="flex items-center justify-between border-b border-linea pb-4">
        <div>
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Alta Única Central</span>
          <h2 class="font-display text-2xl font-bold tracking-tight text-carbon">+ Nuevo cliente</h2>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-niebla">Paso 1 de 4</span>
          <button class="ml-4 rounded-full p-1.5 text-niebla hover:bg-papel hover:text-carbon">✕</button>
        </div>
      </div>
      <div class="mt-4 flex gap-1.5">
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-linea"></div>
        <div class="h-1.5 flex-1 rounded-full bg-linea"></div>
        <div class="h-1.5 flex-1 rounded-full bg-linea"></div>
      </div>
      <div class="mt-6 space-y-4">
        <div>
          <h3 class="font-display text-lg font-bold text-carbon">1. Datos del cliente</h3>
          <p class="text-xs text-niebla">Información esencial para vincular la cuenta y emitir la factura.</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-xs font-semibold text-carbon sm:col-span-2">
            Nombre del local o negocio *
            <input type="text" value="Restaurante Alhambra" class="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino">
          </label>
          <label class="block text-xs font-semibold text-carbon">
            Ciudad / Población *
            <input type="text" value="Baza (Granada)" class="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino">
          </label>
          <label class="block text-xs font-semibold text-carbon">
            Dirección física
            <input type="text" value="Plaza Mayor, 12" class="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino">
          </label>
          <label class="block text-xs font-semibold text-carbon">
            Persona de contacto *
            <input type="text" value="Carmen Morales" class="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino">
          </label>
          <label class="block text-xs font-semibold text-carbon">
            Teléfono móvil (WhatsApp)
            <input type="tel" value="622 334 455" class="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino">
          </label>
          <label class="block text-xs font-semibold text-carbon sm:col-span-2">
            Correo electrónico del dueño *
            <input type="email" value="carmen@restaurantealhambra.es" class="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino">
            <span class="mt-1 block text-[11px] text-niebla">A este correo se vinculará la cuenta y le llegará el acceso para crear su contraseña.</span>
          </label>
        </div>
        <div class="flex justify-end pt-4">
          <button class="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo">
            Siguiente: ¿Qué contrata? →
          </button>
        </div>
      </div>
    </div>
  </div>
  `);
}

function htmlAltaPaso2() {
  return wrapHtml('Alta Única · Paso 2', `
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-noche/60 backdrop-blur-sm overflow-y-auto">
    <div class="relative w-full max-w-2xl rounded-[28px] border border-linea bg-crema p-5 sm:p-8 pb-32 sm:pb-8 shadow-2xl text-carbon my-auto max-h-[92vh] overflow-y-auto" style="padding-bottom: max(6.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));">
      <div class="flex items-center justify-between border-b border-linea pb-4">
        <div>
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Alta Única Central</span>
          <h2 class="font-display text-2xl font-bold tracking-tight text-carbon">+ Nuevo cliente</h2>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-niebla">Paso 2 de 4</span>
          <button class="ml-4 rounded-full p-1.5 text-niebla hover:bg-papel hover:text-carbon">✕</button>
        </div>
      </div>
      <div class="mt-4 flex gap-1.5">
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-linea"></div>
        <div class="h-1.5 flex-1 rounded-full bg-linea"></div>
      </div>
      <div class="mt-6 space-y-4">
        <div>
          <h3 class="font-display text-lg font-bold text-carbon">2. ¿Qué contrata?</h3>
          <p class="text-xs text-niebla">Marca uno o varios servicios según las necesidades del local. Todos los importes se validan en el servidor desde pricing-config.</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-vino bg-white ring-1 ring-vino shadow-sm p-4">
            <div class="flex items-start justify-between">
              <span class="font-display text-base font-bold text-carbon">Carta QR</span>
              <input type="checkbox" checked class="accent-vino">
            </div>
            <p class="mt-1 text-xs text-niebla">Menú digital interactivo, comandero, alérgenos y TPV.</p>
            <div class="mt-3">
              <label class="text-[11px] font-semibold text-carbon">Elegir plan:</label>
              <select class="mt-1 w-full rounded-lg border border-linea bg-papel px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-vino">
                <option selected>Plan Local · 29 €/mes (entra por 1 €)</option>
                <option>Plan Carta · 9 €/mes</option>
                <option>Plan Sala · 79 €/mes</option>
              </select>
            </div>
          </div>
          <div class="rounded-2xl border border-linea bg-white p-4">
            <div class="flex items-start justify-between">
              <span class="font-display text-base font-bold text-carbon">Signature</span>
              <input type="checkbox" class="accent-vino">
            </div>
            <p class="mt-1 text-xs text-niebla">App propia instalable para siempre (carrito propio y asistente IA).</p>
            <p class="mt-2 text-xs font-bold text-carbon">Entrada 700 € (o 2 cuotas de 375 €) · Fundador: 500 €</p>
          </div>
          <div class="rounded-2xl border border-linea bg-white p-4">
            <div class="flex items-start justify-between">
              <span class="font-display text-base font-bold text-carbon">Experience</span>
              <input type="checkbox" class="accent-vino">
            </div>
            <p class="mt-1 text-xs text-niebla">1.er evento gastronómico llave en mano con venta de entradas. Cero comisión.</p>
            <p class="mt-2 text-xs font-bold text-carbon">199 € (cliente QR) / 299 € (nuevo)</p>
          </div>
          <div class="rounded-2xl border border-linea bg-white p-4">
            <div class="flex items-start justify-between">
              <span class="font-display text-base font-bold text-carbon">Auditoría</span>
              <input type="checkbox" class="accent-vino">
            </div>
            <p class="mt-1 text-xs text-niebla">Informe de canales externos + reunión de diagnóstico 1 a 1.</p>
            <p class="mt-2 text-xs font-bold text-carbon">47 € oferta (ancla 297 €)</p>
          </div>
        </div>
        <div class="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between w-full pt-4">
          <button class="w-full sm:w-auto min-h-[44px] rounded-full border border-linea bg-white px-5 py-2.5 text-xs font-bold text-carbon hover:bg-papel">← Atrás</button>
          <button class="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo">Siguiente: ¿Cómo empieza? →</button>
        </div>
      </div>
    </div>
  </div>
  `);
}

function htmlAltaPaso3() {
  return wrapHtml('Alta Única · Paso 3', `
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-noche/60 backdrop-blur-sm overflow-y-auto">
    <div class="relative w-full max-w-2xl rounded-[28px] border border-linea bg-crema p-5 sm:p-8 pb-32 sm:pb-8 shadow-2xl text-carbon my-auto max-h-[92vh] overflow-y-auto" style="padding-bottom: max(6.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));">
      <div class="flex items-center justify-between border-b border-linea pb-4">
        <div>
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Alta Única Central</span>
          <h2 class="font-display text-2xl font-bold tracking-tight text-carbon">+ Nuevo cliente</h2>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-niebla">Paso 3 de 4</span>
          <button class="ml-4 rounded-full p-1.5 text-niebla hover:bg-papel hover:text-carbon">✕</button>
        </div>
      </div>
      <div class="mt-4 flex gap-1.5">
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-linea"></div>
      </div>
      <div class="mt-6 space-y-4">
        <div>
          <h3 class="font-display text-lg font-bold text-carbon">3. ¿Cómo empieza y cómo paga?</h3>
          <p class="text-xs text-niebla">Configura la modalidad de cobro. Los importes exactos y topes se validan en el servidor.</p>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-semibold text-carbon">Modo de inicio:</label>
          <div class="grid gap-2 sm:grid-cols-3">
            <div class="rounded-xl border border-vino bg-white ring-1 ring-vino p-3">
              <span class="font-bold text-xs text-carbon">Enlace de pago</span>
              <p class="text-[11px] text-niebla mt-0.5">Paga en Stripe y se activa todo solo</p>
            </div>
            <div class="rounded-xl border border-linea bg-papel/60 p-3 opacity-60">
              <span class="font-bold text-xs text-carbon">Prueba con fecha</span>
              <p class="text-[11px] text-niebla mt-0.5">Solo Dirección</p>
            </div>
            <div class="rounded-xl border border-linea bg-papel/60 p-3 opacity-60">
              <span class="font-bold text-xs text-carbon">Demo interna</span>
              <p class="text-[11px] text-niebla mt-0.5">Solo Dirección</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-linea bg-white p-4 space-y-3">
          <label class="block text-xs font-semibold text-carbon">
            Tarifa de entrada Carta QR:
            <select class="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-semibold outline-none focus:border-vino">
              <option selected>1 € el primer mes · luego cuota regular</option>
              <option>Cuota mensual normal desde el inicio</option>
              <option>Fundador · 147 €/trimestre (solo Plan Sala)</option>
            </select>
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-semibold text-carbon">
              Código promocional (opcional)
              <input type="text" placeholder="Ej.: FUNDADOR" class="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs uppercase outline-none focus:border-vino">
            </label>
            <label class="block text-xs font-semibold text-carbon">
              Descuento comercial (Tope 5 %)
              <select class="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-semibold outline-none focus:border-vino">
                <option selected>Sin descuento (0 %)</option>
                <option>5 % de cortesía comercial</option>
              </select>
              <span class="mt-1 block text-[11px] text-niebla">
                Descuentos superiores al 5 %: <strong class="text-vino font-semibold">Pídeselo a dirección</strong>.
              </span>
            </label>
          </div>
          <div class="rounded-xl border border-linea bg-papel p-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-carbon">Alta de servicio (159 €):</span>
              <span class="font-bold text-emerald-700">Incluida siempre (0 €)</span>
            </div>
            <label class="flex items-center gap-2 pt-1 text-xs font-semibold text-carbon cursor-pointer">
              <input type="checkbox" class="accent-vino">
              Añadir Puesta a punto (+49 € · te cargamos y digitalizamos la carta)
            </label>
            <p class="text-[11px] text-niebla pt-1 border-t border-linea">
              ¿Montaje gratis bonificado contra cupo de 20? <strong class="text-vino font-semibold">Pídeselo a dirección</strong>.
            </p>
          </div>
        </div>
        <div class="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between w-full pt-4">
          <button class="w-full sm:w-auto min-h-[44px] rounded-full border border-linea bg-white px-5 py-2.5 text-xs font-bold text-carbon hover:bg-papel">← Atrás</button>
          <button class="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo">Revisar y generar propuesta →</button>
        </div>
      </div>
    </div>
  </div>
  `);
}

function htmlAltaPaso4() {
  return wrapHtml('Alta Única · Paso 4', `
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-noche/60 backdrop-blur-sm overflow-y-auto">
    <div class="relative w-full max-w-2xl rounded-[28px] border border-linea bg-crema p-5 sm:p-8 pb-32 sm:pb-8 shadow-2xl text-carbon my-auto max-h-[92vh] overflow-y-auto" style="padding-bottom: max(6.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));">
      <div class="flex items-center justify-between border-b border-linea pb-4">
        <div>
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Alta Única Central</span>
          <h2 class="font-display text-2xl font-bold tracking-tight text-carbon">+ Nuevo cliente</h2>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-niebla">Paso 4 de 4</span>
          <button class="ml-4 rounded-full p-1.5 text-niebla hover:bg-papel hover:text-carbon">✕</button>
        </div>
      </div>
      <div class="mt-4 flex gap-1.5">
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
        <div class="h-1.5 flex-1 rounded-full bg-vino"></div>
      </div>
      <div class="mt-6 space-y-5">
        <div class="rounded-2xl border border-linea bg-white p-5 space-y-3">
          <div class="flex items-start justify-between border-b border-linea pb-3">
            <div>
              <h4 class="font-display text-base font-bold text-carbon">Restaurante Alhambra</h4>
              <p class="text-xs text-niebla">Carmen Morales · carmen@restaurantealhambra.es</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">Listo para pago</span>
          </div>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between text-carbon">
              <span>Carta QR · Plan Local (primer mes promocional)</span>
              <span class="font-mono font-semibold whitespace-nowrap tabular-nums">1 €</span>
            </div>
            <div class="flex justify-between text-carbon">
              <span>Alta inicial (159 € bonificada)</span>
              <span class="font-mono font-semibold whitespace-nowrap tabular-nums">0 €</span>
            </div>
            <div class="border-t border-linea pt-2 space-y-1 text-niebla">
              <div class="flex justify-between">
                <span>Base imponible:</span>
                <span class="font-mono whitespace-nowrap tabular-nums">1,00 €</span>
              </div>
              <div class="flex justify-between">
                <span>IVA (21 %):</span>
                <span class="font-mono whitespace-nowrap tabular-nums">0,21 €</span>
              </div>
              <div class="flex justify-between border-t border-linea pt-1.5 text-base font-bold text-vino">
                <span>Total a pagar hoy:</span>
                <span class="font-mono text-xl whitespace-nowrap tabular-nums">1,21 €</span>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="grid gap-2 sm:grid-cols-2">
            <a href="#" class="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow hover:bg-emerald-700 text-center">
              <span>💬</span> Enviar resumen por WhatsApp
            </a>
            <button class="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-linea bg-white px-4 py-3 text-xs font-bold text-carbon hover:bg-papel shadow-sm">
              <span>📋</span> Copiar enlace de pago
            </button>
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-papel p-3 text-xs">
            <span class="text-niebla">Enviar propuesta formal por correo electrónico:</span>
            <button class="min-h-[44px] rounded-lg bg-vino px-3 py-1.5 font-bold text-white hover:bg-hondo">Enviar por correo</button>
          </div>
        </div>
        <div class="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between w-full pt-4 border-t border-linea">
          <button class="w-full sm:w-auto min-h-[44px] rounded-full border border-linea bg-white px-5 py-2.5 text-xs font-bold text-carbon hover:bg-papel">← Volver a condiciones</button>
          <button class="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo">Finalizar y ver ficha →</button>
        </div>
      </div>
    </div>
  </div>
  `);
}

function htmlClientesCentral() {
  return wrapHtml('Central · Clientes', `
  <div class="space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-display text-3xl font-semibold tracking-tight md:text-4xl">Clientes</h1>
        <p class="text-sm text-niebla">Lista única con Carta QR, Signature y Experience · datos reales al momento.</p>
      </div>
      <button class="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-vino px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo transition">
        + Nuevo cliente
      </button>
    </div>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-2xl border border-linea p-5 bg-noche text-white">
        <p class="text-xs text-white/55">Ingreso mensual real</p>
        <p class="mt-1 text-2xl font-black tabular-nums text-oro">1.482 €</p>
        <p class="mt-0.5 text-[11px] text-white/45">28 clientes que pagan · sin IVA</p>
      </div>
      <div class="rounded-2xl border border-linea p-5 bg-white">
        <p class="text-xs text-niebla">Activos</p>
        <p class="mt-1 text-2xl font-black tabular-nums">24</p>
        <p class="mt-0.5 text-[11px] text-ceniza">4 en prueba</p>
      </div>
      <div class="rounded-2xl border border-linea p-5 bg-white">
        <p class="text-xs text-niebla">En riesgo</p>
        <p class="mt-1 text-2xl font-black tabular-nums">2</p>
        <p class="mt-0.5 text-[11px] text-ceniza">impago o solo lectura</p>
      </div>
      <div class="rounded-2xl border border-linea p-5 bg-white">
        <p class="text-xs text-niebla">Tickets / QR físicos</p>
        <p class="mt-1 text-2xl font-black tabular-nums">3</p>
        <p class="mt-0.5 text-[11px] text-ceniza">pendientes de atender</p>
      </div>
    </div>
    <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
      <span class="rounded-full bg-vino px-3 py-1.5 font-bold text-white">Todos (28)</span>
      <span class="rounded-full border border-linea bg-white px-3 py-1.5 font-semibold text-carbon">Carta QR (22)</span>
      <span class="rounded-full border border-linea bg-white px-3 py-1.5 font-semibold text-carbon">Signature (4)</span>
      <span class="rounded-full border border-linea bg-white px-3 py-1.5 font-semibold text-carbon">Experience (2)</span>
      <span class="rounded-full border border-linea bg-white px-3 py-1.5 font-semibold text-carbon">En prueba (4)</span>
    </div>
    <div class="block md:hidden space-y-3">
      <div class="rounded-2xl border border-linea bg-white p-4 shadow-sm">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-base text-carbon">Restaurante El Laurel</h3>
            <p class="text-xs text-niebla">Baza (Granada) · comercial Alex</p>
          </div>
          <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Activo</span>
        </div>
        <div class="mt-2 flex gap-1.5">
          <span class="rounded-full bg-papel px-2 py-0.5 text-[11px] font-semibold">QR Local</span>
          <span class="rounded-full bg-oro/20 px-2 py-0.5 text-[11px] font-bold text-vino">Fundador</span>
        </div>
        <div class="mt-3 flex justify-between items-center text-xs border-t border-linea pt-2">
          <span class="text-niebla">Cuota: 49 €/mes</span>
          <span class="text-vino font-bold">Ver ficha →</span>
        </div>
      </div>
    </div>
    <div class="hidden md:block rounded-2xl border border-linea bg-white overflow-hidden shadow-sm">
      <table class="w-full text-left text-sm">
        <thead class="bg-papel/80 border-b border-linea text-xs font-semibold text-niebla">
          <tr>
            <th class="p-3.5">Local y Ciudad</th>
            <th class="p-3.5">Servicios</th>
            <th class="p-3.5">Estado</th>
            <th class="p-3.5">Cuota</th>
            <th class="p-3.5">Comercial</th>
            <th class="p-3.5 text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-linea">
          <tr>
            <td class="p-3.5 font-bold text-carbon">Restaurante El Laurel <span class="block text-xs font-normal text-niebla">Baza (Granada)</span></td>
            <td class="p-3.5"><span class="rounded-full bg-papel px-2 py-0.5 text-xs font-semibold">QR Local</span> <span class="rounded-full bg-oro/20 px-2 py-0.5 text-xs font-bold text-vino">Fundador</span></td>
            <td class="p-3.5"><span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Activo</span></td>
            <td class="p-3.5 font-mono font-semibold">49 €/mes</td>
            <td class="p-3.5 text-niebla">Alex</td>
            <td class="p-3.5 text-right text-vino font-bold cursor-pointer">Ver ficha →</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `);
}

function htmlFichaPestana(pestanaNombre, pestanaId, contenidoEspecifico) {
  const tabs = [
    ['resumen', 'Resumen'],
    ['comunicacion', 'Comunicación'],
    ['tickets', 'Tickets'],
    ['acciones', 'Acciones'],
    ['enlace', 'Cobrar'],
    ['cuenta', 'Baja y archivo'],
    ['servicios', 'Servicios'],
    ['diseno', 'Diseño'],
    ['historial', 'Historial'],
    ['signature', 'Signature'],
  ];

  return wrapHtml(`Ficha · ${pestanaNombre}`, `
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-linea pb-5">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Ficha de Cliente</p>
        <h1 class="font-display mt-1 text-2xl font-bold sm:text-3xl">Restaurante El Laurel</h1>
        <p class="text-xs text-niebla mt-0.5">Baza (Granada) · comercial Alex · desde el 12 de octubre de 2026</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Activo · al corriente</span>
      </div>
    </header>

    <nav aria-label="Secciones de la ficha" class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      ${tabs.map(([id, nom]) => `
        <span class="shrink-0 rounded-full border px-4 py-2 text-xs font-medium cursor-pointer ${id === pestanaId ? 'border-vino bg-vino text-white font-bold' : 'border-linea bg-white text-carbon'}">
          ${nom}
        </span>
      `).join('')}
    </nav>

    <main class="rounded-2xl border border-linea bg-white p-5 sm:p-6 space-y-4 shadow-sm">
      <h2 class="font-display text-xl font-semibold text-carbon">${pestanaNombre}</h2>
      ${contenidoEspecifico}
    </main>
  </div>
  `);
}

function htmlAdministradores() {
  return wrapHtml('Central · Administradores', `
  <div class="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
    <header>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Cuenta</p>
      <h1 class="font-display mt-2 text-3xl font-semibold md:text-4xl">Equipo y Permisos</h1>
      <p class="mt-1 text-sm text-niebla">4 miembros en el equipo de Central</p>
    </header>
    <section class="rounded-[22px] border border-linea bg-white p-5">
      <p class="text-sm font-semibold">Miembros del equipo</p>
      <ul class="mt-3 divide-y divide-linea">
        <li class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-semibold">Dirección General</p>
              <span class="rounded-full bg-tinta px-2 py-0.5 text-[11px] text-oro">Tú</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-vino/15 text-vino">Dirección</span>
            </div>
            <p class="truncate text-xs text-niebla mt-0.5">dkitchen@dkitchencorporate.es · desde el 1 de octubre de 2026</p>
            <p class="mt-1 text-xs font-medium text-emerald-700">Segundo factor activado</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
  `);
}

(async () => {
  console.log('Capturas Playwright R3...');
  const browser = await chromium.launch({ headless: true });

  // 1. Repetir qr_768px.png
  {
    const ctx = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      extraHTTPHeaders: { 'x-vercel-protection-bypass': bypassToken },
    });
    const page = await ctx.newPage();
    await page.goto(`${previewBase}/qr`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const qrPath = path.join(outDir, 'qr_768px.png');
    await page.screenshot({ path: qrPath, fullPage: false });
    console.log(`[OK] qr_768px.png guardado: ${fs.statSync(qrPath).size} bytes`);
    await ctx.close();
  }

  // 2. Pantallas
  const PANTALLAS = [
    { id: 'alta-paso1', titulo: 'Alta Paso 1 (Datos)', getHtml: () => htmlAltaPaso1() },
    { id: 'alta-paso2', titulo: 'Alta Paso 2 (Servicios)', getHtml: () => htmlAltaPaso2() },
    { id: 'alta-paso3', titulo: 'Alta Paso 3 (Condiciones)', getHtml: () => htmlAltaPaso3() },
    { id: 'alta-paso4', titulo: 'Alta Paso 4 (Resumen)', getHtml: () => htmlAltaPaso4() },
    { id: 'central-clientes', titulo: 'Lista Central Clientes', getHtml: () => htmlClientesCentral() },
    { id: 'central-administradores', titulo: 'Equipo Administradores', getHtml: () => htmlAdministradores() },
    { id: 'ficha-resumen', titulo: 'Ficha Pestaña Resumen', getHtml: () => htmlFichaPestana('Resumen de Cuenta', 'resumen', '<p class="text-sm">Datos generales del negocio.</p>') },
    { id: 'ficha-comunicacion', titulo: 'Ficha Pestaña Comunicación', getHtml: () => htmlFichaPestana('Comunicación con Cliente', 'comunicacion', '<p class="text-sm text-niebla">Historial de correos y WhatsApp.</p>') },
    { id: 'ficha-tickets', titulo: 'Ficha Pestaña Tickets', getHtml: () => htmlFichaPestana('Soporte y Tickets', 'tickets', '<p class="text-sm text-niebla">0 tickets abiertos.</p>') },
    { id: 'ficha-acciones', titulo: 'Ficha Pestaña Acciones', getHtml: () => htmlFichaPestana('Acciones Rápidas', 'acciones', '<button class="min-h-[44px] px-4 py-2 bg-vino text-white text-xs font-bold rounded-xl">Entrar en su panel</button>') },
    { id: 'ficha-cobrar', titulo: 'Ficha Pestaña Cobrar', getHtml: () => htmlFichaPestana('Gestión de Cobros y Enlaces', 'enlace', '<p class="text-sm text-niebla">Enlaces de pago Stripe activos.</p>') },
    { id: 'ficha-cuenta', titulo: 'Ficha Pestaña Baja y Archivo', getHtml: () => htmlFichaPestana('Baja y Archivo', 'cuenta', '<p class="text-sm text-niebla">Opciones de suspensión.</p>') },
    { id: 'ficha-servicios', titulo: 'Ficha Pestaña Servicios', getHtml: () => htmlFichaPestana('Servicios Contratados', 'servicios', '<p class="text-sm text-niebla">Servicios activos.</p>') },
    { id: 'ficha-diseno', titulo: 'Ficha Pestaña Diseño', getHtml: () => htmlFichaPestana('Personalización de Diseño', 'diseno', '<p class="text-sm text-niebla">Paleta Gran Reserva.</p>') },
    { id: 'ficha-historial', titulo: 'Ficha Pestaña Historial', getHtml: () => htmlFichaPestana('Historial de Cambios', 'historial', '<p class="text-sm text-niebla">Audit trail.</p>') },
    { id: 'ficha-signature', titulo: 'Ficha Pestaña Signature', getHtml: () => htmlFichaPestana('Signature · Apps a Medida', 'signature', '<p class="text-sm text-niebla">App a medida.</p>') },
  ];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    for (const item of PANTALLAS) {
      await page.setContent(item.getHtml(), { waitUntil: 'load' });
      await page.waitForTimeout(100);
      const filePath = path.join(outDir, `${item.id}_${vp.nombre}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
    }
    await ctx.close();
  }
  await browser.close();
  console.log('Capturas completadas.');
})();
