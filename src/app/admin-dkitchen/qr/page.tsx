import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { identidadActual } from '@/lib/sesion';
import { listarClientesQr, pestanaDe, type ClienteQr } from '@/lib/admin-clientes';
import { administradores } from '@/lib/buzon';
import NuevoCliente from '@/components/admin/NuevoCliente';
import GuiaZona from '@/components/admin/GuiaZona';
import ClientesCentralView from '@/components/admin/ClientesCentralView';

export const dynamic = 'force-dynamic';

const euros = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';

export default async function ClientesQr({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; s?: string; q?: string; com?: string; mis?: string }>;
}) {
  const jwt = await exigirAdmin();
  const [todos, yo, equipo, sp] = await Promise.all([
    listarClientesQr(jwt),
    identidadActual().catch(() => null),
    administradores(jwt).catch(() => []),
    searchParams,
  ]);

  const miembroActual = equipo.find((m) => m.id === yo?.id);
  const esComercial = (miembroActual as any)?.rolAdmin === 'comercial';

  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const de = (id: string) => todos.filter((c) => pestanaDe(c, hoy) === id);

  const ingreso = todos.reduce((s, c) => s + c.cuota, 0);
  const pagan = todos.filter((c) => c.cuota > 0).length;
  const pendientes = todos.reduce((s, c) => s + c.ticketsAbiertos + c.solicitudesQrPendientes, 0);

  // Si es comercial, no ve ingresos totales (karc0: decisión 31/10)
  const kpis: [string, string, string][] = esComercial
    ? [
        ['Mis clientes', String(todos.length), 'en seguimiento'],
        ['Activos', String(de('activos').length), `${de('prueba').length} en prueba`],
        ['En riesgo', String(de('riesgo').length), 'atención prioritaria'],
        ['Tickets / QR físicos', String(pendientes), 'pendientes de atender'],
      ]
    : [
        ['Ingreso mensual real', euros(ingreso), `${pagan} cliente${pagan === 1 ? '' : 's'} que paga${pagan === 1 ? '' : 'n'} · sin IVA`],
        ['Activos', String(de('activos').length), `${de('prueba').length} en prueba`],
        ['En riesgo', String(de('riesgo').length), 'impago, solo lectura o baja programada'],
        ['Tickets / QR físicos', String(pendientes), 'pendientes de atender'],
      ];

  const miembrosEquipo = equipo.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    email: m.email,
    rolAdmin: (m as any).rolAdmin,
  }));

  return (
    <div className="space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Clientes</h1>
          <p className="text-sm text-niebla">
            {esComercial
              ? 'Tus clientes y cartera asignada · datos reales al momento.'
              : 'Lista única con Carta QR, Signature y Experience · datos reales al momento.'}
          </p>
        </div>
        <NuevoCliente esComercial={esComercial} />
      </div>

      <GuiaZona
        titulo="Clientes"
        ancla="clientes"
        que={
          esComercial
            ? 'Tu cartera de clientes: Carta QR, Signature y Experience. Registra seguimientos, revisa el estado del local y gestiona el siguiente paso comercial.'
            : 'Lista única de todos los clientes de DKitchen (Carta QR, Signature y Experience). Desde aquí buscas por local, ciudad o comercial, filtras por servicio o situación, o ves únicamente «Mis clientes».'
        }
        pasos={[
          'Filtros rápidos: Todos, Carta QR, Signature, Experience, En prueba, En riesgo o «Mis clientes» para ver solo los tuyos.',
          'Buscador: encuentra locales al instante por nombre, ciudad, comercial o siguiente paso.',
          'Pulsa el nombre del local para entrar en su ficha completa.',
          '«+ Nuevo cliente» abre el alta de cuenta con enlace de pago o prueba.',
        ]}
        ojo={['Las cuentas demo y archivadas no cuentan en ingresos, ni en el parte diario, ni en las alertas de Inicio.']}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([t, v, d], i) => (
          <div key={t} className={`rounded-2xl border border-linea p-5 ${i === 0 ? 'bg-noche text-white' : 'bg-white'}`}>
            <p className={`text-xs ${i === 0 ? 'text-white/55' : 'text-niebla'}`}>{t}</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${i === 0 ? 'text-oro' : ''}`}>{v}</p>
            <p className={`mt-0.5 text-[11px] ${i === 0 ? 'text-white/45' : 'text-ceniza'}`}>{d}</p>
          </div>
        ))}
      </div>

      {/* Componente unificado interactivo de Clientes */}
      <ClientesCentralView
        clientesIniciales={todos}
        usuarioActual={yo}
        miembrosEquipo={miembrosEquipo}
        esComercial={esComercial}
        filtroInicial={{
          pestana: sp.p,
          servicio: sp.s,
          comercial: sp.com,
          mis: sp.mis,
          busqueda: sp.q,
        }}
      />

      <p className="text-xs text-ceniza">
        <Link href="/admin-dkitchen/soporte" className="text-vino underline">
          Soporte y QR físico →
        </Link>
      </p>
    </div>
  );
}
