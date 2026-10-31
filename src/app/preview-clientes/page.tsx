import React from 'react';
import ClientesCentralView from '@/components/admin/ClientesCentralView';
import type { ClienteQr } from '@/lib/admin-clientes';

export const metadata = {
  title: 'Vista Previa · Clientes Central Gran Reserva',
  robots: { index: false, follow: false },
};

const CLIENTES_DEMO: ClienteQr[] = [
  {
    restauranteId: 'demo-1',
    nombre: 'Taberna La Parra',
    slug: 'la-parra',
    plan: 'ampliado',
    estadoAcceso: 'activo',
    activo: true,
    creadoEn: '2026-09-15T10:00:00Z',
    email: 'contacto@tabernalaparra.es',
    contacto: 'Marta',
    codigoQr: 'LP01',
    platos: 48,
    escaneosMes: 412,
    escaneosTotal: 1250,
    ticketsAbiertos: 0,
    solicitudesQrPendientes: 0,
    escaneos14d: 190,
    pruebaHasta: null,
    demoInterna: false,
    archivadoEn: null,
    bajaProgramadaEn: null,
    bajaDesde: null,
    pagoFallidoDesde: null,
    cuota: 29,
    tutorialPaso: 5,
    tutorialCompletado: true,
    comercial: 'Marta',
    ciudad: 'Baza',
    direccion: 'Plaza Mayor 4, Baza',
    tieneSignature: false,
    tieneExperience: true,
    siguientePaso: 'Evento 21/11 · abrir venta',
  },
  {
    restauranteId: 'demo-2',
    nombre: 'Néstor Pizzas',
    slug: 'nestor-pizzas',
    plan: 'signature',
    estadoAcceso: 'activo',
    activo: true,
    creadoEn: '2026-08-20T12:00:00Z',
    email: 'nestor@nestorpizzas.com',
    contacto: 'Néstor',
    codigoQr: null,
    platos: 0,
    escaneosMes: 0,
    escaneosTotal: 0,
    ticketsAbiertos: 0,
    solicitudesQrPendientes: 0,
    escaneos14d: 0,
    pruebaHasta: null,
    demoInterna: false,
    archivadoEn: null,
    bajaProgramadaEn: null,
    bajaDesde: null,
    pagoFallidoDesde: null,
    cuota: 49,
    tutorialPaso: 0,
    tutorialCompletado: false,
    comercial: 'karc0',
    ciudad: 'Granada',
    direccion: 'Calle Recogidas 18, Granada',
    tieneSignature: true,
    tieneExperience: false,
    siguientePaso: 'Mantenimiento · entrega v1.2',
    soloProyecto: true,
  },
  {
    restauranteId: 'demo-3',
    nombre: 'Umami Bar',
    slug: 'umami-bar',
    plan: 'basico',
    estadoAcceso: 'gracia',
    activo: true,
    creadoEn: '2026-10-01T09:00:00Z',
    email: 'gerencia@umamibar.es',
    contacto: 'Luis',
    codigoQr: 'UB02',
    platos: 24,
    escaneosMes: 180,
    escaneosTotal: 340,
    ticketsAbiertos: 1,
    solicitudesQrPendientes: 0,
    escaneos14d: 95,
    pruebaHasta: null,
    demoInterna: false,
    archivadoEn: null,
    bajaProgramadaEn: null,
    bajaDesde: null,
    pagoFallidoDesde: '2026-10-28T08:00:00Z',
    cuota: 9,
    tutorialPaso: 4,
    tutorialCompletado: true,
    comercial: 'Luis',
    ciudad: 'Almería',
    direccion: 'Paseo Marítimo 12, Almería',
    tieneSignature: false,
    tieneExperience: false,
    siguientePaso: 'Llamar hoy · actualizar tarjeta Stripe',
  },
  {
    restauranteId: 'demo-4',
    nombre: 'Restaurante El Coto',
    slug: 'el-coto',
    plan: 'sala',
    estadoAcceso: 'activo',
    activo: true,
    creadoEn: '2026-07-10T14:30:00Z',
    email: 'reservas@elcotojaen.es',
    contacto: 'Antonio',
    codigoQr: 'EC01',
    platos: 95,
    escaneosMes: 840,
    escaneosTotal: 3100,
    ticketsAbiertos: 0,
    solicitudesQrPendientes: 0,
    escaneos14d: 420,
    pruebaHasta: null,
    demoInterna: false,
    archivadoEn: null,
    bajaProgramadaEn: null,
    bajaDesde: null,
    pagoFallidoDesde: null,
    cuota: 79,
    tutorialPaso: 5,
    tutorialCompletado: true,
    comercial: 'Marta',
    ciudad: 'Jaén',
    direccion: 'Avenida de Madrid 55, Jaén',
    tieneSignature: true,
    tieneExperience: true,
    siguientePaso: 'Revisión mensual de comandas TPV',
  },
  {
    restauranteId: 'demo-5',
    nombre: 'Bodega San Juan',
    slug: 'bodega-sanjuan',
    plan: 'ampliado',
    estadoAcceso: 'activo',
    activo: true,
    creadoEn: '2026-10-25T11:00:00Z',
    email: 'info@bodegasanjuan.com',
    contacto: 'Carmen',
    codigoQr: 'BS01',
    platos: 32,
    escaneosMes: 65,
    escaneosTotal: 65,
    ticketsAbiertos: 0,
    solicitudesQrPendientes: 1,
    escaneos14d: 65,
    pruebaHasta: '2026-11-08',
    demoInterna: false,
    archivadoEn: null,
    bajaProgramadaEn: null,
    bajaDesde: null,
    pagoFallidoDesde: null,
    cuota: 0,
    tutorialPaso: 3,
    tutorialCompletado: false,
    comercial: 'karc0',
    ciudad: 'Sevilla',
    direccion: 'Calle Betis 22, Sevilla',
    tieneSignature: false,
    tieneExperience: false,
    siguientePaso: 'Enviar QR físico adhesivo y llamar',
  },
];

export default function PreviewClientesPage() {
  const yo = { id: 'karc0-id', nombre: 'karc0', email: 'dkitchen@dkitchencorporate.es' };

  return (
    <div className="min-h-screen bg-crema text-carbon selection:bg-orange-500/30">
      <header className="border-b border-linea bg-noche px-6 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] font-display text-base font-bold text-oro">
              D
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-white">Central · Vista Previa de Clientes</p>
              <p className="text-[11px] text-white/50">Diseño de autor Gran Reserva · Paleta aprobada 30/10/2026</p>
            </div>
          </div>
          <span className="rounded-full bg-oro/20 px-3 py-1 text-xs font-semibold text-oro">
            Boceto Aprobado P1.1
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Día a día · Clientes</p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Clientes</h1>
            <p className="mt-1 text-sm text-niebla">
              Lista única con Carta QR, Signature y Experience · buscador, filtros y «Mis clientes».
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vino px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-hondo">
            + Nuevo cliente
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-linea bg-noche p-5 text-white">
            <p className="text-xs text-white/55">Ingreso mensual real</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-oro">166 €</p>
            <p className="mt-0.5 text-[11px] text-white/45">4 clientes que pagan · sin IVA</p>
          </div>
          <div className="rounded-2xl border border-linea bg-white p-5">
            <p className="text-xs text-niebla">Activos</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">3</p>
            <p className="mt-0.5 text-[11px] text-ceniza">1 en prueba</p>
          </div>
          <div className="rounded-2xl border border-linea bg-white p-5">
            <p className="text-xs text-niebla">En riesgo</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-amber-700">1</p>
            <p className="mt-0.5 text-[11px] text-ceniza">impago, solo lectura o baja</p>
          </div>
          <div className="rounded-2xl border border-linea bg-white p-5">
            <p className="text-xs text-niebla">Tickets / QR físicos</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-carbon">2</p>
            <p className="mt-0.5 text-[11px] text-ceniza">pendientes de atender</p>
          </div>
        </div>

        {/* Componente Central Clientes interactivo */}
        <ClientesCentralView clientesIniciales={CLIENTES_DEMO} usuarioActual={yo} />
      </main>
    </div>
  );
}
