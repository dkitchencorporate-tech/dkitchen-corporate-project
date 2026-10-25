/**
 * Generador de QR con marca del restaurante.
 *
 * Es el valor añadido real que se puede sacar de la referencia usada al
 * diseñar el motor (javiggil.com/56fc9cb32b97) sin heredar su parte frágil.
 * Esa guía monta el aspecto personalizado con IA generativa sobre ControlNet
 * —"la IA no acierta a la primera", exige varias generaciones y un ajuste
 * fino, y necesita "una API de pago de verdad" para servir GPU en
 * producción—. Nada de eso es proporcionado para el estado actual del
 * proyecto: cero clientes reales, aprovisionamiento de QR todavía manual.
 *
 * Lo que SÍ es proporcionado, fiable y gratuito: un QR estándar con
 * corrección de errores alta (nivel H, tolera hasta 30% de daño), coloreado
 * con la marca del restaurante y con su logo superpuesto en el centro. Es
 * exactamente la otra vía que la propia guía describe como la fiable —"esto
 * te ahorra el código base"—, sin el componente de IA.
 *
 * VERIFICACIÓN: no se da por bueno un QR generado. Se rasteriza y se
 * decodifica de vuelta con un lector de QR real (jsQR); si el texto
 * decodificado no coincide exactamente con la URL codificada, el script
 * falla y no escribe el archivo. Un QR que "se ve bien" pero no escanea no
 * sirve de nada, y no hay forma de saberlo con la vista.
 *
 * Uso:
 *   node db/generar-qr.mjs <entorno-del-propietario> <codigo> <dominio> [carpeta-salida]
 *
 * Ejemplo:
 *   node db/generar-qr.mjs secretos/neon.env demo2026 https://dkitchencorporate.es ./qr-salida
 *
 * El dominio se pasa explícito a propósito: un QR impreso con el dominio de
 * previsualización de Vercel hay que volver a generarlo antes de imprimir de
 * verdad (ver SEGURIDAD_Y_PERSISTENCIA_NEON.md, Sección 8.8).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import QRCode from 'qrcode';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const [rutaEntorno, codigoArg, dominio, carpetaSalida = './qr-salida'] = process.argv.slice(2);
if (!rutaEntorno || !codigoArg || !dominio) {
  console.error('Uso: node db/generar-qr.mjs <entorno> <codigo> <dominio> [carpeta-salida]');
  process.exit(1);
}
if (!/^https:\/\//.test(dominio)) {
  console.error('El dominio debe empezar por https:// — un QR impreso no puede depender de una redirección http→https.');
  process.exit(1);
}

const codigo = codigoArg.toLowerCase();
if (!/^[a-z0-9]{8,16}$/.test(codigo)) {
  console.error('El código no tiene el formato válido (8-16 caracteres alfanuméricos en minúsculas).');
  process.exit(1);
}

function leerClave(nombre) {
  const linea = readFileSync(rutaEntorno, 'utf8').split('\n').find((l) => l.startsWith(nombre + '='));
  if (!linea) throw new Error(`No se encontró ${nombre} en el archivo de entorno`);
  return linea.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
}

// Colores por defecto si el restaurante no ha fijado los suyos: el mismo
// contraste alto que usa la propia carta (src/app/m/[slug]/page.tsx), no un
// negro plano que no diga nada de la marca.
const COLOR_OSCURO_DEFECTO = '#1a1a1a';
const COLOR_CLARO_DEFECTO = '#ffffff';

const pool = new Pool({ connectionString: leerClave('NEON_DB_DIRECT') });

try {
  const { rows } = await pool.query(
    `SELECT r.slug, r.nombre, r.logo_url, r.color_marca
       FROM codigos_qr c JOIN restaurantes r ON r.id = c.restaurante_id
      WHERE c.codigo = $1 AND c.activo AND r.activo`,
    [codigo]
  );
  const restaurante = rows[0];
  if (!restaurante) {
    console.error(`El código "${codigo}" no existe, está desactivado, o el restaurante está desactivado.`);
    process.exit(1);
  }

  const url = `${dominio.replace(/\/+$/, '')}/r/${codigo}`;
  const colorOscuro = restaurante.color_marca || COLOR_OSCURO_DEFECTO;

  console.log(`Generando QR para "${restaurante.nombre}" (${restaurante.slug})`);
  console.log(`  Codifica: ${url}`);
  console.log(`  Color:    ${colorOscuro}`);

  // Nivel H: tolera hasta 30% de daño en la imagen. Es el margen que hace
  // falta para poder superponer un logo sin dejar el código ilegible.
  const svgBase = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: colorOscuro, light: COLOR_CLARO_DEFECTO },
  });

  let svgFinal = svgBase;
  let logoIncrustado = false;

  if (restaurante.logo_url) {
    try {
      const respuestaLogo = await fetch(restaurante.logo_url);
      if (!respuestaLogo.ok) throw new Error(`HTTP ${respuestaLogo.status}`);
      const logoBuffer = Buffer.from(await respuestaLogo.arrayBuffer());

      // El logo se recorta a cuadrado y se reduce a un tamaño que la
      // corrección de errores del nivel H puede absorber sin perder el
      // código: ~18% del ancho total, con un fondo blanco alrededor para
      // que no se funda con lo que haya debajo del logo en el propio dibujo.
      const tamanoLogoPx = 60; // sobre un viewBox de 100x100 unidades típico de `qrcode`
      const logoRedimensionado = await sharp(logoBuffer)
        .resize(tamanoLogoPx, tamanoLogoPx, { fit: 'cover' })
        .png()
        .toBuffer();
      const logoBase64 = logoRedimensionado.toString('base64');

      const centro = 50; // el viewBox de `qrcode` para SVG es 0..N; se ajusta abajo
      const match = svgBase.match(/viewBox="0 0 (\d+) (\d+)"/);
      const dimension = match ? Number(match[1]) : 100;
      const centroReal = dimension / 2;
      const mitadLogo = dimension * 0.09; // ~18% de ancho total, mitad para centrar

      const fondoYLogo = `
  <rect x="${centroReal - mitadLogo - 2}" y="${centroReal - mitadLogo - 2}"
        width="${mitadLogo * 2 + 4}" height="${mitadLogo * 2 + 4}"
        fill="${COLOR_CLARO_DEFECTO}" rx="4" />
  <image x="${centroReal - mitadLogo}" y="${centroReal - mitadLogo}"
         width="${mitadLogo * 2}" height="${mitadLogo * 2}"
         href="data:image/png;base64,${logoBase64}" preserveAspectRatio="xMidYMid slice" />`;

      svgFinal = svgBase.replace('</svg>', `${fondoYLogo}\n</svg>`);
      logoIncrustado = true;
    } catch (error) {
      console.warn(`  Aviso: no se pudo incrustar el logo (${error.message}). Se genera sin logo.`);
    }
  }

  // ---- Verificación: no se confía en que "se vea bien" ---------------------
  const png = await sharp(Buffer.from(svgFinal), { density: 384 }).png().toBuffer();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decodificado = jsQR(new Uint8ClampedArray(data), info.width, info.height);

  if (!decodificado) {
    console.error('✗ El QR generado NO se pudo decodificar. No se escribe ningún archivo.');
    console.error('  Prueba a reducir el tamaño del logo o a comprobar el logo_url del restaurante.');
    process.exit(1);
  }
  if (decodificado.data !== url) {
    console.error(`✗ El QR decodifica a algo distinto de lo esperado: "${decodificado.data}"`);
    process.exit(1);
  }

  mkdirSync(carpetaSalida, { recursive: true });
  const base = `${carpetaSalida}/${restaurante.slug}-${codigo}`;
  writeFileSync(`${base}.svg`, svgFinal);
  writeFileSync(`${base}.png`, await sharp(Buffer.from(svgFinal), { density: 1200 }).png().toBuffer());

  console.log(`✓ Verificado: decodifica exactamente a la URL esperada.`);
  console.log(`✓ Escrito: ${base}.svg (vectorial, para imprenta) y ${base}.png (1200dpi equivalente)`);
  console.log(`  Logo incrustado: ${logoIncrustado ? 'sí' : 'no (el restaurante no tiene logo_url, o falló la descarga)'}`);
} finally {
  await pool.end();
}
