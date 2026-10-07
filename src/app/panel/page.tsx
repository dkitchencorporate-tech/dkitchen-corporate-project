import { redirect } from 'next/navigation';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { obtenerMiRestaurante, obtenerCodigoQr } from '@/lib/mi-restaurante';
import { listarMiCarta } from '@/lib/menu-propietario';
import { listarExtras, obtenerLegal } from '@/lib/estudio';
import { escaneosDelMes, escaneosUltimos30Dias } from '@/lib/escaneos-cliente';
import { listarMisSolicitudesQrFisico } from '@/lib/solicitudes-qr-fisico';
import { listarMisTickets } from '@/lib/tickets';
import { listarPromociones } from '@/lib/promociones';
import { listarMisReservas } from '@/lib/reservas';
import { estadoServicios, tiene } from '@/lib/servicios';
import { cargarPlano, listarCamareros, estadoConexionTpv, informeCamareros } from '@/lib/sala';
import { listarTraducciones } from '@/lib/idiomas';
import { llamadasPendientes } from '@/lib/llamadas-camarero';
import PanelShell from '@/components/panel/PanelShell';
import { tutorialEstado } from '@/lib/tutorial';
import { resumenCobro } from '@/lib/prueba';
import { SesionNoValida } from '@/lib/db';
import { estadoInterno } from '@/lib/guard-admin';
import { miSocio } from '@/lib/socio';

export const dynamic = 'force-dynamic';
// La creación de imágenes con IA puede tardar hasta un minuto.
export const maxDuration = 60;

export default async function Panel() {
  let jwt: string | null = null;
  let identidad: { id: string; nombre: string; email: string } | null = null;
  try {
    jwt = await obtenerJwtDeSesion();
    identidad = await identidadActual();
  } catch (error) {
    console.error('Panel: fallo al resolver la sesión', error);
    redirect('/panel/iniciar-sesion');
  }

  if (!jwt || !identidad) {
    redirect('/panel/iniciar-sesion');
  }

  try {
    const restaurante = await obtenerMiRestaurante(jwt);

    if (!restaurante) {
      // El super admin y el socio no tienen restaurante: su sitio es Central o /socio (con 2FA).
      const interno = await estadoInterno(jwt);
      if (interno.tipo === 'socio' && interno.estado === 'ok') redirect('/socio');
      if (interno.tipo) redirect('/acceso-seguro');
      return (
        <div className="min-h-screen bg-crema flex items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <h1 className="text-xl font-bold text-carbon mb-2">Todavía no tienes un restaurante activo</h1>
            <p className="text-niebla text-sm">
              Si acabas de pagar, espera unos minutos a que se aprovisione tu cuenta. Si el problema
              continúa, escríbenos por WhatsApp.
            </p>
          </div>
        </div>
      );
    }

    // Puesta a punto del socio (0052): lo que es solo del dueño (cobro, reservas, operativa)
    // la base se lo niega; el panel se carga igual con esos bloques vacíos.
    const puesta = restaurante.puestaAPunto === true;
    const suave = <T,>(p: Promise<T>, vacio: T): Promise<T> => (puesta ? p.catch(() => vacio) : p);
    const [codigoQr, carta, escaneosMes, escaneos30d, solicitudesQr, tickets, promociones, reservas, socio] = await Promise.all([
      obtenerCodigoQr(jwt, restaurante.id),
      listarMiCarta(jwt, restaurante.id),
      suave(escaneosDelMes(jwt, restaurante.id), 0),
      suave(escaneosUltimos30Dias(jwt, restaurante.id), []),
      suave(listarMisSolicitudesQrFisico(jwt, restaurante.id), []),
      suave(listarMisTickets(jwt, restaurante.id), []),
      suave(listarPromociones(jwt, restaurante.id), []),
      puesta ? Promise.resolve([]) : listarMisReservas(jwt, restaurante.id),
      puesta ? Promise.resolve(null) : miSocio(jwt).catch(() => null),
    ]);
    const [servicios, cobro, extras, legal, tutorial] = await Promise.all([estadoServicios(jwt, restaurante.id), puesta ? Promise.resolve(null) : resumenCobro(jwt, restaurante.id).catch(() => null),
      suave(listarExtras(jwt, restaurante.id), []), obtenerLegal(jwt, restaurante.id), puesta ? Promise.resolve(null) : tutorialEstado(jwt, restaurante.id).catch(() => null)]);
    const c = servicios.contratados;
    const hayPlano = tiene(c, 'plano_mesas'), hayApp = tiene(c, 'app_sala'), hayTpv = tiene(c, 'conexion_tpv');
    const [plano, camareros, tpv, llamadas, traducciones, informe] = await Promise.all([
      hayPlano || hayApp ? cargarPlano(jwt, restaurante.id) : Promise.resolve({ mesas: [], elementos: [] }),
      (hayApp || hayPlano) && !puesta ? listarCamareros(jwt, restaurante.id) : Promise.resolve([]),
      hayTpv && !puesta ? estadoConexionTpv(jwt) : Promise.resolve(null),
      hayPlano && !puesta ? llamadasPendientes(jwt, restaurante.id).then((l) => l.map((x) => x.mesa)) : Promise.resolve([] as string[]),
      tiene(c, 'idiomas') ? listarTraducciones(jwt, restaurante.id) : Promise.resolve([]),
      hayApp && !puesta ? informeCamareros(jwt, 30) : Promise.resolve([]),
    ]);

    return (
      <PanelShell
        identidad={identidad}
        restaurante={restaurante}
        codigoQr={codigoQr}
        carta={carta}
        escaneosMes={escaneosMes}
        escaneos30d={escaneos30d}
        solicitudesQr={solicitudesQr}
        tickets={tickets}
        promociones={promociones}
        reservas={reservas}
        servicios={servicios}
        sala={{ mesas: plano.mesas, elementos: plano.elementos, camareros, tpv, llamadas, informe }}
        traducciones={traducciones}
        cobro={cobro}
        estudio={{ extras, legal }}
        tutorial={tutorial}
        socio={socio}
      />
    );
  } catch (error) {
    // redirect() funciona lanzando una excepción: hay que dejarla pasar.
    if ((error as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw error;
    if (error instanceof SesionNoValida) redirect('/panel/iniciar-sesion');
    console.error('Panel: fallo al cargar los datos', error);
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-bold text-carbon mb-2">No hemos podido cargar tu panel</h1>
          <p className="text-niebla text-sm">Recarga la página en unos segundos. Si persiste, escríbenos por WhatsApp.</p>
        </div>
      </div>
    );
  }
}
