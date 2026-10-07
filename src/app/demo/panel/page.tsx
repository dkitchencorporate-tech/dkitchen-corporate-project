import type { Metadata } from 'next';
import PanelShell from '@/components/panel/PanelShell';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import type { EstadoServicios } from '@/lib/servicios';

/**
 * Demo pública del panel del cliente (29/09/2026): el panel real con datos de
 * ejemplo. Sirve para enseñarlo en ventas y para revisarlo sin sesión. No toca
 * la base de datos: cualquier intento de guardar lo rechaza el servidor porque
 * no hay sesión.
 */
export const metadata: Metadata = { title: 'Demo del panel · DKitchen', robots: { index: false, follow: false } };

const hoy = new Date();
const dia = (n: number) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const restaurante: MiRestaurante = {
  id: 'demo', slug: 'demo', nombre: 'Casa Brasa', logoUrl: null, plan: 'ampliado', activo: true, colorMarca: '#E8592A', estadoAcceso: 'activo',
  descripcion: 'Cocina de mercado y brasa', telefono: '+34 600 000 000', direccion: 'Calle Mayor 1, Madrid', horario: 'Martes a domingo, 13:00–16:00 y 20:00–23:30',
  instagram: 'casabrasa', urlResenas: null, plantilla: 'editorial', nivelDiseno: 'esencial', idiomas: ['en'], whatsapp: '+34600000000',
  creadoEn: new Date(hoy.getTime() - 40 * 864e5).toISOString(), estiloFondo: 'papel', estiloLetra: 'serif',
};

const secciones = [{ id: 's1', nombre: 'Para compartir', orden: 1 }, { id: 's2', nombre: 'Principales', orden: 2 }, { id: 's3', nombre: 'Postres', orden: 3 }];
const platos = [
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
    { servicio: 'setup_experto', nombre: 'Carta de Autor', tipo: 'unico', precioCentimos: 19900, precioAnclaCentimos: 28000, requiereAmpliado: false },
    { servicio: 'idiomas', nombre: 'Idiomas', tipo: 'unico', precioCentimos: 2900, precioAnclaCentimos: null, requiereAmpliado: false },
    { servicio: 'plano_mesas', nombre: 'Plano de mesas', tipo: 'mensual', precioCentimos: 2400, precioAnclaCentimos: null, requiereAmpliado: true },
    { servicio: 'app_sala', nombre: 'App de sala', tipo: 'mensual', precioCentimos: 4900, precioAnclaCentimos: null, requiereAmpliado: true },
    { servicio: 'conexion_tpv', nombre: 'Conexión TPV', tipo: 'mensual', precioCentimos: 5900, precioAnclaCentimos: null, requiereAmpliado: true },
    { servicio: 'pack_sala', nombre: 'Pack Sala', tipo: 'mensual', precioCentimos: 11900, precioAnclaCentimos: 13200, requiereAmpliado: true },
  ],
  contratados: [{ servicio: 'idiomas', estado: 'activo', origen: 'pago', contratadoEn: new Date(hoy.getTime() - 20 * 864e5).toISOString(), checklist: {} }],
  plazasExperto: 12, oferta: { oferta: 'setup_experto', motivo: 'demo' }, credito: null,
  signature: { mostrar: true, motivo: 'escaneos', escaneos: 812, reservas: 46, llamadas: 210 },
};

const reservas = [
  ['Alex M.', 1, '21:30', 4, 'pendiente'], ['Marta R.', 0, '14:00', 2, 'confirmada'], ['Jorge P.', 0, '21:00', 6, 'pendiente'], ['Sara L.', 2, '13:30', 3, 'confirmada'],
].map(([nombre, d, hora, personas, estado], i) => ({
  id: `r${i}`, nombre: nombre as string, telefono: '600000000', email: null, fecha: dia(d as number), hora: hora as string, personas: personas as number,
  notas: null, estado: estado as 'pendiente' | 'confirmada', creadaEn: hoy.toISOString(), avisadoEn: null,
}));

export default function DemoPanel() {
  return (
    <>
      <div className="relative z-[60] bg-vino px-4 py-2 text-center text-xs font-semibold text-white">Demostración del panel con datos de ejemplo · los cambios no se guardan</div>
      <div>
        <PanelShell
          identidad={{ id: 'demo', nombre: 'Alex', email: 'alex@casabrasa.es' }}
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
          sala={{ mesas: [], elementos: [], informe: [], camareros: [], tpv: null, llamadas: [] }}
          traducciones={[]}
          cobro={null}
        />
      </div>
    </>
  );
}
