'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Inicio from './Inicio';
import { Icono } from './Iconos';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import type { SeccionPropia, PlatoPropio } from '@/lib/menu-propietario';
import type { EscaneosPorDia } from '@/lib/escaneos-cliente';
import type { SolicitudQrFisico } from '@/lib/solicitudes-qr-fisico';
import type { Ticket } from '@/lib/tickets';
import MiCarta from './MiCarta';
import MiQr from './MiQr';
import MisEscaneos from './MisEscaneos';
import MiPlan from './MiPlan';
import Soporte from './Soporte';
import MiLocal from './MiLocal';
import Camarero from './Camarero';
import Promociones from './Promociones';
import Reservas from './Reservas';
import Mejoras from './Mejoras';
import Sala from './Sala';
import Idiomas from './Idiomas';
import type { EstadoServicios } from '@/lib/servicios';
import type { MesaPlano, ElementoPlano, FilaInforme, Camarero as CamareroSala } from '@/lib/sala';
import type { Promocion } from '@/lib/promociones';
import type { Reserva } from '@/lib/reservas';
import { authClient } from '@/lib/auth-client';

type Pestana = 'inicio' | 'carta' | 'local' | 'promociones' | 'reservas' | 'sala' | 'idiomas' | 'diseno' | 'modulos' | 'camarero' | 'qr' | 'escaneos' | 'plan' | 'soporte';

/**
 * Navegación por espacios (29/09/2026): un raíl de iconos con 5 espacios y,
 * dentro de cada uno, sus vistas en píldora. Misma estructura en escritorio
 * (raíl lateral) y móvil (barra flotante inferior).
 */
const ESPACIOS: { id: string; nombre: string; icono: string; items: { id: Pestana; nombre: string }[] }[] = [
  { id: 'inicio', nombre: 'Inicio', icono: 'inicio', items: [{ id: 'inicio', nombre: 'Inicio' }] },
  { id: 'carta', nombre: 'Carta', icono: 'carta', items: [
    { id: 'carta', nombre: 'Platos' }, { id: 'diseno', nombre: 'Diseño' }, { id: 'idiomas', nombre: 'Idiomas' },
    { id: 'promociones', nombre: 'Banners' }, { id: 'qr', nombre: 'Mi QR' },
  ] },
  { id: 'servicio', nombre: 'Servicio', icono: 'servicio', items: [
    { id: 'reservas', nombre: 'Reservas' }, { id: 'camarero', nombre: 'Llamadas' }, { id: 'sala', nombre: 'Sala' },
  ] },
  { id: 'negocio', nombre: 'Negocio', icono: 'negocio', items: [
    { id: 'escaneos', nombre: 'Escaneos' }, { id: 'local', nombre: 'Mi local' }, { id: 'plan', nombre: 'Mi plan' }, { id: 'modulos', nombre: 'Mejoras' },
  ] },
  { id: 'ayuda', nombre: 'Ayuda', icono: 'ayuda', items: [{ id: 'soporte', nombre: 'Soporte' }] },
];
const PESTANAS = ESPACIOS.flatMap((e) => e.items);

export default function PanelShell({
  identidad,
  restaurante,
  codigoQr,
  carta,
  escaneosMes,
  escaneos30d,
  solicitudesQr,
  tickets,
  promociones,
  reservas,
  servicios,
  sala,
  traducciones,
}: {
  identidad: { id: string; nombre: string; email: string };
  restaurante: MiRestaurante;
  codigoQr: string | null;
  carta: { secciones: SeccionPropia[]; platos: PlatoPropio[] };
  escaneosMes: number;
  escaneos30d: EscaneosPorDia[];
  solicitudesQr: SolicitudQrFisico[];
  tickets: Ticket[];
  promociones: Promocion[];
  reservas: Reserva[];
  servicios: EstadoServicios;
  sala: { mesas: (MesaPlano & { id: string })[]; elementos: ElementoPlano[]; informe: FilaInforme[]; camareros: CamareroSala[]; tpv: { proveedor: string; activa: boolean; ultimoEnvio: string | null; ultimoError: string | null } | null; llamadas: string[] };
  traducciones: { entidad: 'plato' | 'seccion'; entidadId: string; idioma: string; campo: 'nombre' | 'descripcion'; texto: string }[];
}) {
  const tieneServ = (id: string) => servicios.contratados.some((c) => c.servicio === id || (c.servicio === 'pack_sala' && ['plano_mesas', 'app_sala', 'conexion_tpv'].includes(id)));
  const modulos = { plano: tieneServ('plano_mesas'), app: tieneServ('app_sala'), tpv: tieneServ('conexion_tpv') };
  const visible = (id: Pestana) =>
    id === 'sala' ? modulos.plano || modulos.app || modulos.tpv
    : id === 'idiomas' ? tieneServ('idiomas')
    : (id !== 'camarero' && id !== 'reservas') || restaurante.plan === 'ampliado';
  const [pestana, setPestanaBase] = useState<Pestana>('inicio');
  const [menu, setMenu] = useState(false);
  // Cada sección entra en el historial del navegador: el botón «atrás» del móvil vuelve a la sección anterior en vez de sacar al usuario del panel.
  const setPestana = (p: Pestana, historial: 'push' | 'replace' | 'no' = 'push') => {
    setPestanaBase(p); setMenu(false); window.scrollTo({ top: 0 });
    if (historial === 'no') return;
    const url = p === 'inicio' ? window.location.pathname : `${window.location.pathname}?pestana=${p}`;
    if (historial === 'replace' || window.history.state?.pestana === p) window.history.replaceState({ ...window.history.state, pestana: p }, '', url);
    else window.history.pushState({ ...window.history.state, pestana: p }, '', url);
  };
  useEffect(() => {
    const alVolver = (e: PopStateEvent) => setPestana((e.state?.pestana as Pestana) ?? 'inicio', 'no');
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  // Enlaces directos a una sección (p. ej. desde los correos: /panel?pestana=reservas)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('pestana');
    const pedida = q === 'mejoras' ? 'modulos' : q;
    if (pedida && PESTANAS.some((x) => x.id === pedida)) setPestana(pedida as Pestana, 'replace');
    else window.history.replaceState({ ...window.history.state, pestana: 'inicio' }, '');
  }, []);

  const salir = async () => { await authClient.signOut(); window.location.href = '/panel/iniciar-sesion'; };
  const espacios = ESPACIOS.map((e) => ({ ...e, items: e.items.filter((p) => visible(p.id)) })).filter((e) => e.items.length > 0);
  const espacio = espacios.find((e) => e.items.some((p) => p.id === pestana)) ?? espacios[0];
  const titulo = PESTANAS.find((p) => p.id === pestana)?.nombre ?? '';
  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#1B1D22] lg:grid lg:grid-cols-[88px_1fr]">
      {/* Raíl de espacios (escritorio) */}
      <aside className="hidden bg-[#0A080C] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] font-display text-lg font-semibold text-[#D9B25C]" title={restaurante.nombre}>{restaurante.nombre.slice(0, 1).toUpperCase()}</div>
        <nav aria-label="Espacios del panel" className="mt-8 flex flex-1 flex-col gap-1.5">
          {espacios.map((e) => {
            const activo = espacio?.id === e.id;
            return (
              <button key={e.id} onClick={() => setPestana(e.items[0].id)} aria-current={activo ? 'page' : undefined}
                className={`group relative flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10.5px] font-medium transition-colors ${activo ? 'text-white' : 'text-white/45 hover:text-white'}`}>
                {activo && <motion.span layoutId="rail-activo" className="absolute inset-0 rounded-2xl bg-white/[0.08] ring-1 ring-[#D9B25C]/30" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className={`relative ${activo ? 'text-[#D9B25C]' : ''}`}><Icono n={e.icono} /></span>
                <span className="relative">{e.nombre}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-1.5">
          <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" title="Ver mi carta" className="flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10.5px] text-white/45 hover:text-white"><Icono n="externo" />Mi carta</a>
          <button onClick={salir} title={`Cerrar sesión (${identidad.email})`} className="flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10.5px] text-white/45 hover:text-white"><Icono n="salir" />Salir</button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Cabecera */}
        <header className="sticky top-0 z-30 border-b border-[#E6E2DC] bg-[#F7F5F2]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{restaurante.nombre}</p>
              <p className="text-xs text-[#6B7079]">{espacio?.nombre}{espacio && espacio.items.length > 1 ? ` · ${titulo}` : ''} · plan {restaurante.plan === 'ampliado' ? 'Ampliado' : 'Básico'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="hidden rounded-full border border-[#E0DBD4] bg-white px-4 py-2 text-sm font-medium sm:inline-flex lg:hidden">Ver carta</a>
              <button onClick={() => setMenu(true)} aria-label="Cuenta" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17191E] text-sm font-semibold text-[#D9B25C] lg:hidden">{identidad.nombre.slice(0, 1).toUpperCase()}</button>
            </div>
          </div>
          {espacio && espacio.items.length > 1 && (
            <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6 lg:px-10">
              <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={espacio.nombre}>
                {espacio.items.map((p) => (
                  <button key={p.id} role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
                    className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${pestana === p.id ? 'text-white' : 'text-[#6B7079] hover:text-[#1B1D22]'}`}>
                    {pestana === p.id && <motion.span layoutId="pildora-activa" className="absolute inset-0 rounded-full bg-[#17191E]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <span className="relative">{p.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Cuenta">
            <button aria-label="Cerrar" onClick={() => setMenu(false)} className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-x-3 bottom-3 rounded-[28px] bg-white p-5 shadow-2xl" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
              <p className="font-semibold">{identidad.nombre}</p>
              <p className="truncate text-sm text-[#6B7079]">{identidad.email}</p>
              <div className="mt-4 grid gap-2">
                <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="rounded-2xl bg-[#F3F1EE] px-4 py-3.5 text-sm font-medium">Ver mi carta como la ven mis clientes</a>
                <button onClick={() => setPestana('soporte')} className="rounded-2xl bg-[#F3F1EE] px-4 py-3.5 text-left text-sm font-medium">Soporte</button>
                <button onClick={salir} className="rounded-2xl px-4 py-3.5 text-left text-sm font-medium text-[#6E0C2B]">Cerrar sesión</button>
              </div>
            </div>
          </div>
        )}

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:py-10">
        <AnimatePresence mode="wait">
        <motion.div key={pestana} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        {pestana === 'inicio' && <Inicio restaurante={restaurante} qrPedido={solicitudesQr.length > 0} escaneosMes={escaneosMes} escaneos30d={escaneos30d} reservas={reservas} platos={carta.platos} servicios={servicios} ir={(p) => setPestana(p)} />}
        {pestana === 'carta' && <MiCarta carta={carta} />}
        {pestana === 'local' && <MiLocal restaurante={restaurante} />}
        {pestana === 'promociones' && <Promociones promociones={promociones} secciones={carta.secciones} plan={restaurante.plan} />}
        {(pestana === 'diseno' || pestana === 'modulos') && <Mejoras key={pestana} restaurante={restaurante} servicios={servicios} vista={pestana} />}
        {pestana === 'sala' && <Sala mesas={sala.mesas} elementos={sala.elementos} camareros={sala.camareros} tpv={sala.tpv} modulos={modulos} informe={sala.informe} />}
        {pestana === 'idiomas' && <Idiomas activos={restaurante.idiomas ?? []} secciones={carta.secciones} platos={carta.platos} traducciones={traducciones} />}
        {pestana === 'reservas' && <Reservas reservas={reservas} whatsapp={restaurante.whatsapp} />}
        {pestana === 'camarero' && <Camarero slug={restaurante.slug} codigoQr={codigoQr} />}
        {pestana === 'qr' && (
          <MiQr codigoQr={codigoQr} restauranteNombre={restaurante.nombre} solicitudes={solicitudesQr} />
        )}
        {pestana === 'escaneos' && <MisEscaneos escaneosMes={escaneosMes} escaneos30d={escaneos30d} />}
        {pestana === 'plan' && <MiPlan restaurante={restaurante} servicios={servicios} />}
        {pestana === 'soporte' && <Soporte tickets={tickets} />}
        </motion.div>
        </AnimatePresence>
      </main>

      {/* Barra de espacios flotante (móvil y tablet) */}
      <nav aria-label="Espacios del panel" className="fixed inset-x-3 bottom-3 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto flex max-w-md items-stretch justify-between rounded-[26px] bg-[#0A080C]/95 p-1.5 shadow-[0_16px_40px_rgba(10,8,12,.35)] backdrop-blur-xl">
          {espacios.map((e) => {
            const activo = espacio?.id === e.id;
            return (
              <li key={e.id} className="flex-1">
                <button onClick={() => setPestana(e.items[0].id)} aria-current={activo ? 'page' : undefined}
                  className={`relative flex w-full flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10.5px] font-medium ${activo ? 'text-white' : 'text-white/50'}`}>
                  {activo && <motion.span layoutId="barra-activa" className="absolute inset-0 rounded-[20px] bg-white/[0.1]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={`relative ${activo ? 'text-[#D9B25C]' : ''}`}><Icono n={e.icono} /></span>
                  <span className="relative">{e.nombre}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      </div>
    </div>
  );
}