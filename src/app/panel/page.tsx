import { redirect } from 'next/navigation';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { obtenerMiRestaurante, obtenerCodigoQr } from '@/lib/mi-restaurante';
import { listarMiCarta } from '@/lib/menu-propietario';
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
import { SesionNoValida } from '@/lib/db';
import { estadoAdmin } from '@/lib/guard-admin';

export const dynamic = 'force-dynamic';

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
      // El super admin no tiene restaurante: su sitio es la central (con 2FA).
      if ((await estadoAdmin(jwt)) !== 'no_admin') redirect('/acceso-seguro');
      return (
        <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <h1 className="text-xl font-bold text-[#1B1D22] mb-2">Todavía no tienes un restaurante activo</h1>
            <p className="text-[#6B7079] text-sm">
              Si acabas de pagar, espera unos minutos a que se aprovisione tu cuenta. Si el problema
              continúa, escríbenos por WhatsApp.
            </p>
          </div>
        </div>
      );
    }

    const [codigoQr, carta, escaneosMes, escaneos30d, solicitudesQr, tickets, promociones, reservas] = await Promise.all([
      obtenerCodigoQr(jwt, restaurante.id),
      listarMiCarta(jwt, restaurante.id),
      escaneosDelMes(jwt, restaurante.id),
      escaneosUltimos30Dias(jwt, restaurante.id),
      listarMisSolicitudesQrFisico(jwt, restaurante.id),
      listarMisTickets(jwt, restaurante.id),
      listarPromociones(jwt, restaurante.id),
      restaurante.plan === 'ampliado' ? listarMisReservas(jwt, restaurante.id) : Promise.resolve([]),
    ]);
    const servicios = await estadoServicios(jwt, restaurante.id);
    const c = servicios.contratados;
    const hayPlano = tiene(c, 'plano_mesas'), hayApp = tiene(c, 'app_sala'), hayTpv = tiene(c, 'conexion_tpv');
    const [plano, camareros, tpv, llamadas, traducciones, informe] = await Promise.all([
      hayPlano || hayApp ? cargarPlano(jwt, restaurante.id) : Promise.resolve({ mesas: [], elementos: [] }),
      hayApp || hayPlano ? listarCamareros(jwt, restaurante.id) : Promise.resolve([]),
      hayTpv ? estadoConexionTpv(jwt) : Promise.resolve(null),
      hayPlano && restaurante.plan === 'ampliado' ? llamadasPendientes(jwt, restaurante.id).then((l) => l.map((x) => x.mesa)) : Promise.resolve([] as string[]),
      tiene(c, 'idiomas') ? listarTraducciones(jwt, restaurante.id) : Promise.resolve([]),
      hayApp ? informeCamareros(jwt, 30) : Promise.resolve([]),
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
      />
    );
  } catch (error) {
    // redirect() funciona lanzando una excepción: hay que dejarla pasar.
    if ((error as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw error;
    if (error instanceof SesionNoValida) redirect('/panel/iniciar-sesion');
    console.error('Panel: fallo al cargar los datos', error);
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-bold text-[#1B1D22] mb-2">No hemos podido cargar tu panel</h1>
          <p className="text-[#6B7079] text-sm">Recarga la página en unos segundos. Si persiste, escríbenos por WhatsApp.</p>
        </div>
      </div>
    );
  }
}
