import BarraDemo from '@/components/BarraDemo';
import type { Metadata } from 'next';
import PanelShell from '@/components/panel/PanelShell';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import type { SeccionPropia, PlatoPropio } from '@/lib/menu-propietario';
import type { MesaPlano, Camarero } from '@/lib/sala';
import { SERVICIOS_QR } from '@/lib/pricing-config';
import type { EstadoServicios } from '@/lib/servicios';
import { comoVisitante } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Demo pública del panel del cliente (29/09/2026 + 0117):
 * - Sin parámetros: enseña Casa Brasa.
 * - Con `?local=[slug]`: carga la demo de Autor creada para ese prospecto (con sus platos y fotos reales)
 *   y contabiliza la visita en `prospectos.demo_vistas`.
 */
export const metadata: Metadata = { title: 'Demo del panel · DKitchen', robots: { index: false, follow: false } };

const hoy = new Date();
const dia = (n: number) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const restauranteBase: MiRestaurante = {
  id: 'demo', slug: 'demo', nombre: 'Casa Brasa', logoUrl: null, plan: 'ampliado', activo: true, colorMarca: '#E8592A', estadoAcceso: 'activo',
  descripcion: 'Cocina de mercado y brasa', telefono: '+34 600 000 000', direccion: 'Calle Mayor 1, Madrid', horario: 'Martes a domingo, 13:00–16:00 y 20:00–23:30',
  instagram: 'casabrasa', urlResenas: null, plantilla: 'editorial', nivelDiseno: 'esencial', idiomas: ['en'], whatsapp: '+34600000000',
  creadoEn: new Date(hoy.getTime() - 40 * 864e5).toISOString(), estiloFondo: 'papel', estiloLetra: 'serif', firma: { lema: 'Cocina de mercado desde 1987', adorno: 'rombo' },
};

const seccionesBase: SeccionPropia[] = [
  { id: 's1', nombre: 'Para compartir', orden: 1 },
  { id: 's2', nombre: 'Principales', orden: 2 },
  { id: 's3', nombre: 'Postres', orden: 3 },
];

const platosBase: PlatoPropio[] = [
  ['s1', 'Croquetas de jamón', 'Cremosas, seis unidades', '9.50', '/images/demo/s5.png', ['GL', 'LE', 'HU']],
  ['s1', 'Tartar de atún', 'Con aguacate y sésamo', '16.00', '/images/demo/s1.png', ['PE', 'SE']],
  ['s1', 'Patatas bravas', 'Brava ahumada y alioli', '6.50', null, ['HU']],
  ['s2', 'Presa ibérica a la brasa', 'Patata asada y pimientos', '19.50', '/images/demo/s18.png', []],
  ['s2', 'Bacalao negro', 'Glaseado de miso', '24.00', '/images/demo/s17.png', ['PE', 'SO']],
  ['s3', 'Tarta de queso', 'Horneada, centro cremoso', '6.50', '/images/demo/s22.png', ['LE', 'HU', 'GL']],
].map(([seccionId, nombre, descripcion, precio, fotoUrl, alergenos], i) => ({
  id: `p${i}`, seccionId: seccionId as string, nombre: nombre as string, descripcion: descripcion as string, precio: precio as string,
  fotoUrl: fotoUrl as string | null, alergenos: alergenos as string[], disponible: true, orden: i,
}));

const escaneos30d = Array.from({ length: 30 }, (_, i) => ({ fecha: dia(i - 29), total: Math.round(28 + 22 * Math.sin(i / 3) + i * 1.4 + (i % 7 === 5 ? 30 : 0)) }));

const servicios: EstadoServicios = {
  catalogo: [
    { servicio: 'setup_esencial', nombre: 'Puesta a punto', tipo: 'unico', precioCentimos: 4900, precioAnclaCentimos: null, requiereAmpliado: false },
    { servicio: 'bono_ia', nombre: 'Bono de 50 fotografías editoriales', tipo: 'unico', precioCentimos: SERVICIOS_QR.bonoIa * 100, precioAnclaCentimos: null, requiereAmpliado: false },
    { servicio: 'idioma_extra', nombre: 'Idioma extra', tipo: 'unico', precioCentimos: SERVICIOS_QR.idiomaExtra * 100, precioAnclaCentimos: null, requiereAmpliado: false },
  ],
  ofertasFecha: [{ id: '00000000-0000-0000-0000-000000000105', tema: 'navidad', titulo: 'Pack Navidad', descripcion: 'Menús de Navidad, Nochebuena y Nochevieja en tu carta, listos para coger reservas de grupos.',
    incluye: ['Portada y banner de Navidad en tu carta', 'Tus menús de Navidad y Nochevieja montados', '10 fotografías editoriales de temporada', 'Cartel con tu QR para reservar'],
    precio_centimos: 2900, precio_ancla_centimos: null, hasta: `${hoy.getFullYear() + (hoy.getMonth() === 0 ? 0 : 1)}-01-06`, solicitada: null }],
  contratados: [
    { servicio: 'idiomas', estado: 'activo', origen: 'pago', contratadoEn: new Date(hoy.getTime() - 20 * 864e5).toISOString(), checklist: {} },
    { servicio: 'pack_sala', estado: 'activo', origen: 'pago', contratadoEn: new Date(hoy.getTime() - 20 * 864e5).toISOString(), checklist: {} },
  ],
  plazasExperto: 12, oferta: null, credito: null,
  signature: { mostrar: true, motivo: 'escaneos', escaneos: 812, reservas: 46, llamadas: 210 },
};

const mesasDemo: (MesaPlano & { id: string })[] = [
  { id: 'm1', numero: '1', zona: 'Sala', forma: 'cuadrada', plazas: 4, x: 18, y: 22, ancho: 12, alto: 12, camareroId: 'c1' },
  { id: 'm2', numero: '2', zona: 'Sala', forma: 'cuadrada', plazas: 4, x: 42, y: 22, ancho: 12, alto: 12, camareroId: 'c1' },
  { id: 'm3', numero: '3', zona: 'Sala', forma: 'rectangular', plazas: 6, x: 68, y: 22, ancho: 16, alto: 12, camareroId: 'c2' },
  { id: 'm4', numero: '4', zona: 'Terraza', forma: 'redonda', plazas: 4, x: 30, y: 58, ancho: 12, alto: 12, camareroId: 'c2' },
];

const camarerosDemo: Camarero[] = [
  { id: 'c1', nombre: 'Lucía', activo: true, ultimoAcceso: hoy.toISOString() },
  { id: 'c2', nombre: 'Marcos', activo: true, ultimoAcceso: hoy.toISOString() },
];

const reservas = [
  ['Alex M.', 1, '21:30', 4, 'pendiente'], ['Marta R.', 0, '14:00', 2, 'confirmada'], ['Jorge P.', 0, '21:00', 6, 'pendiente'], ['Sara L.', 2, '13:30', 3, 'confirmada'],
].map(([nombre, d, hora, personas, estado], i) => ({
  id: `r${i}`, nombre: nombre as string, telefono: '600000000', email: null, fecha: dia(d as number), hora: hora as string, personas: personas as number,
  notas: null, estado: estado as 'pendiente' | 'confirmada', creadaEn: hoy.toISOString(), avisadoEn: null,
}));

type DatosDemoSql = {
  id?: string;
  slug?: string;
  nombre?: string;
  colorMarca?: string | null;
  plantilla?: string;
  estiloFondo?: string;
  estiloLetra?: string;
  descripcion?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  horario?: string | null;
  instagram?: string | null;
  restaurante?: MiRestaurante;
  secciones: SeccionPropia[];
  platos: PlatoPropio[];
};

export default async function DemoPanel({ searchParams }: { searchParams?: Promise<{ local?: string }> }) {
  const sp = searchParams ? await searchParams : {};
  const slug = typeof sp.local === 'string' && /^[a-z0-9-]{2,80}$/.test(sp.local) ? sp.local : null;

  const datosLocal = slug
    ? await comoVisitante(async (c) => (await c.query<{ d: DatosDemoSql | null }>('SELECT dk.demo_panel_datos($1) AS d', [slug])).rows[0]?.d ?? null).catch(() => null)
    : null;

  const restaurante: MiRestaurante = datosLocal?.restaurante
    ? datosLocal.restaurante
    : datosLocal && datosLocal.slug
      ? {
          ...restauranteBase,
          id: datosLocal.id ?? restauranteBase.id,
          slug: datosLocal.slug,
          nombre: datosLocal.nombre ?? restauranteBase.nombre,
          colorMarca: datosLocal.colorMarca ?? restauranteBase.colorMarca,
          plantilla: datosLocal.plantilla ?? restauranteBase.plantilla,
          estiloFondo: datosLocal.estiloFondo ?? restauranteBase.estiloFondo,
          estiloLetra: datosLocal.estiloLetra ?? restauranteBase.estiloLetra,
          descripcion: datosLocal.descripcion ?? restauranteBase.descripcion,
          telefono: datosLocal.telefono ?? restauranteBase.telefono,
          direccion: datosLocal.direccion ?? restauranteBase.direccion,
          horario: datosLocal.horario ?? restauranteBase.horario,
          instagram: datosLocal.instagram ?? null,
          plan: 'sala',
          nivelDiseno: 'autor',
        }
      : restauranteBase;
  const secciones = datosLocal?.secciones?.length ? datosLocal.secciones : seccionesBase;
  const platos = datosLocal?.platos?.length ? datosLocal.platos : platosBase;

  return (
    <>
      <BarraDemo
        texto={`Panel en vivo de ${restaurante.nombre} · Prueba cómo entran las comandas y cómo editas tu carta`}
        localSlug={datosLocal ? restaurante.slug : undefined}
        simulador
      />
      <div>
        <PanelShell
          identidad={{ id: 'demo', nombre: restaurante.nombre, email: `hola@${restaurante.slug}.es` }}
          restaurante={restaurante}
          codigoQr="demo2026"
          carta={{ secciones, platos }}
          escaneosMes={escaneos30d.reduce((a, b) => a + b.total, 0)}
          escaneos30d={escaneos30d}
          solicitudesQr={[]}
          tickets={[]}
          promociones={[]}
          reservas={reservas}
          servicios={servicios}
          sala={{ mesas: mesasDemo, elementos: [], informe: [], camareros: camarerosDemo, tpv: null, llamadas: ['4'] }}
          traducciones={[]}
          cobro={null}
        />
      </div>
    </>
  );
}
