'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import { AvisoPrueba, DesgloseCobro } from './Cobro';
import type { ResumenCobro } from '@/lib/prueba';
import Soporte from './Soporte';
import AsesorSocio from './AsesorSocio';
import Estudio from './Estudio';
import GuiaSeccion from './GuiaSeccion';
import type { ExtraPlato, DatosLegal } from '@/lib/estudio';
import MiLocal from './MiLocal';
import Camarero from './Camarero';
import Pedidos from './Pedidos';
import Equipo from './Equipo';
import AlarmaLlamadas from './AlarmaLlamadas';
import AvisoReservas from './AvisoReservas';
import TutorialMontaje from './TutorialMontaje';
import type { TutorialEstado } from '@/lib/tutorial-tipos';
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
import ChatAyuda, { abrirAyuda } from '@/components/ayuda/ChatAyuda';
import { TEMAS_PANEL } from '@/lib/ayuda';
import { nombrePlan } from '@/lib/pricing-config';
import { crearTicketAyudaAction, comprarServicioAction, preguntarAyudaIaAction } from '@/app/panel/actions';

type Pestana = 'inicio' | 'pedidos' | 'carta' | 'estudio' | 'local' | 'promociones' | 'reservas' | 'equipo' | 'sala' | 'idiomas' | 'diseno' | 'modulos' | 'camarero' | 'qr' | 'escaneos' | 'plan' | 'soporte';

/**
 * Navegación por espacios (29/09/2026): un raíl de iconos con 5 espacios y,
 * dentro de cada uno, sus vistas en píldora. Misma estructura en escritorio
 * (raíl lateral) y móvil (barra flotante inferior).
 */
type Espacio = { id: string; nombre: string; icono: string; items: { id: Pestana; nombre: string }[] };
const ESPACIOS: Espacio[] = [
  { id: 'inicio', nombre: 'Inicio', icono: 'inicio', items: [{ id: 'inicio', nombre: 'Inicio' }] },
  { id: 'carta', nombre: 'Carta', icono: 'carta', items: [
    { id: 'carta', nombre: 'Platos' }, { id: 'estudio', nombre: 'Estudio' }, { id: 'diseno', nombre: 'Diseño' }, { id: 'idiomas', nombre: 'Idiomas' },
    { id: 'promociones', nombre: 'Banners' }, { id: 'qr', nombre: 'Mi QR' },
  ] },
  { id: 'servicio', nombre: 'Servicio', icono: 'servicio', items: [
    { id: 'pedidos', nombre: 'Pedidos' }, { id: 'reservas', nombre: 'Reservas' }, { id: 'camarero', nombre: 'Llamadas' }, { id: 'equipo', nombre: 'Equipo' }, { id: 'sala', nombre: 'Sala' },
  ] },
  { id: 'negocio', nombre: 'Negocio', icono: 'negocio', items: [
    { id: 'escaneos', nombre: 'Escaneos' }, { id: 'local', nombre: 'Mi local' }, { id: 'plan', nombre: 'Mi plan' }, { id: 'modulos', nombre: 'Mejoras' },
  ] },
  { id: 'ayuda', nombre: 'Ayuda', icono: 'ayuda', items: [{ id: 'soporte', nombre: 'Soporte' }] },
];
const PESTANAS = ESPACIOS.flatMap((e) => e.items);
const espacioDe = (id: string) => ESPACIOS.find((e) => e.id === id)!;
/**
 * B5 (07/10/2026): dos modos. DÍA A DÍA (montaje completado): Servicio primero.
 * MONTAJE (primera vez): espacios numerados en el orden en que se monta un local.
 */
const ESPACIOS_DIA: Espacio[] = ['inicio', 'servicio', 'carta', 'negocio', 'ayuda'].map(espacioDe);
const ESPACIOS_MONTAJE: Espacio[] = [
  espacioDe('inicio'),
  { id: 'm-local', nombre: '1 Local', icono: 'local', items: [{ id: 'local', nombre: 'Mi local' }] },
  { id: 'm-carta', nombre: '2 Carta', icono: 'carta', items: [
    { id: 'carta', nombre: 'Platos' }, { id: 'estudio', nombre: 'Estudio' }, { id: 'diseno', nombre: 'Diseño' }, { id: 'idiomas', nombre: 'Idiomas' },
    { id: 'promociones', nombre: 'Banners' }, { id: 'qr', nombre: 'Mi QR' },
  ] },
  { id: 'm-sala', nombre: '3 Sala', icono: 'servicio', items: [
    { id: 'sala', nombre: 'Sala' }, { id: 'equipo', nombre: 'Equipo' }, { id: 'pedidos', nombre: 'Pedidos' }, { id: 'reservas', nombre: 'Reservas' }, { id: 'camarero', nombre: 'Llamadas' },
  ] },
  { id: 'negocio', nombre: 'Negocio', icono: 'negocio', items: [{ id: 'escaneos', nombre: 'Escaneos' }, { id: 'plan', nombre: 'Mi plan' }, { id: 'modulos', nombre: 'Mejoras' }] },
  espacioDe('ayuda'),
];

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
  cobro,
  estudio = { extras: [], legal: { titular: null, nif: null, email: null, domicilio: null, activo: false } },
  tutorial = null,
  socio = null,
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
  cobro: ResumenCobro | null;
  estudio?: { extras: ExtraPlato[]; legal: DatosLegal };
  tutorial?: TutorialEstado | null;
  /** Asesor del local (0052): el dueño lo ve en Soporte y puede retirarle el permiso. */
  socio?: { nombre: string; puede_editar: boolean } | null;
}) {
  const tieneServ = (id: string) => servicios.contratados.some((c) => c.servicio === id || (c.servicio === 'pack_sala' && ['plano_mesas', 'app_sala', 'conexion_tpv'].includes(id)));
  const modulos = { plano: tieneServ('plano_mesas'), app: tieneServ('app_sala'), tpv: tieneServ('conexion_tpv') };
  // Puesta a punto del socio (0052): solo la carta y el local; nada de dinero ni operativa del dueño.
  const delegado = restaurante.puestaAPunto === true;
  const visible = (id: Pestana) =>
    delegado && ['pedidos', 'reservas', 'camarero', 'equipo', 'escaneos', 'plan', 'modulos'].includes(id) ? false
    : id === 'sala' ? modulos.plano || modulos.app || modulos.tpv
    : id === 'pedidos' || id === 'equipo' ? modulos.app
    : id === 'idiomas' ? true
    : true;
  const [pestana, setPestanaBase] = useState<Pestana>('inicio');
  const [menu, setMenu] = useState(false);
  // B4: la lista de reservas se refresca en vivo (AvisoReservas) y «→» abre una en concreto
  const [reservasVivas, setReservasVivas] = useState(reservas);
  const [reservaAbrir, setReservaAbrir] = useState<string | null>(null);
  // B5: montaje guiado. Mientras está activo, solo se abre la sección del paso (y llamadas/reservas, que siguen sonando).
  const [tut, setTut] = useState<TutorialEstado | null>(tutorial);
  // Demo: /demo/panel?montaje=1 enseña el montaje guiado con un estado simulado
  useEffect(() => {
    if (identidad.id === 'demo' && new URLSearchParams(window.location.search).get('montaje') === '1')
      setTut({ logo: false, local: false, platos: true, foto_ia: false, qr: false, pide_mesa: true, mesa: false, pide_camarero: true, camarero: false, paso: 0, completado: false });
  }, [identidad.id]);
  const bloqueo = useRef<string[] | null>(null);
  const [avisoBloqueo, setAvisoBloqueo] = useState(0);
  // Cada sección entra en el historial del navegador: el botón «atrás» del móvil vuelve a la sección anterior en vez de sacar al usuario del panel.
  const setPestana = (p: Pestana, historial: 'push' | 'replace' | 'no' = 'push') => {
    if (bloqueo.current && !bloqueo.current.includes(p) && p !== 'camarero' && p !== 'reservas') { setAvisoBloqueo(Date.now()); return; }
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

  const salir = async () => {
    if (restaurante.soporte) { window.location.href = `/admin-dkitchen/salir-soporte?id=${restaurante.id}`; return; }
    if (restaurante.puestaAPunto) { window.location.href = '/socio/salir'; return; }
    await authClient.signOut(); window.location.href = '/panel/iniciar-sesion';
  };
  const demo = identidad.id === 'demo';
  const montaje = Boolean(tut && !tut.completado && (demo || restaurante.estadoAcceso === 'activo'));
  const espacios = (montaje ? ESPACIOS_MONTAJE : ESPACIOS_DIA).map((e) => ({ ...e, items: e.items.filter((p) => visible(p.id)) })).filter((e) => e.items.length > 0);
  const setPestanaRef = useRef(setPestana);
  setPestanaRef.current = setPestana;
  const irATutorial = useCallback((p: string) => setPestanaRef.current(p as Pestana), []);
  const alBloquear = useCallback((l: string[] | null) => { bloqueo.current = l; }, []);
  const espacio = espacios.find((e) => e.items.some((p) => p.id === pestana)) ?? espacios[0];
  const titulo = PESTANAS.find((p) => p.id === pestana)?.nombre ?? '';
  const puesta = servicios.contratados.some((c) => c.servicio === 'setup_esencial' || c.servicio === 'setup_experto') ? null : servicios.catalogo.find((c) => c.servicio === 'setup_esencial') ?? null;
  const euros = (c: number) => `${(c / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`;
  return (
    <div className="min-h-screen bg-crema text-carbon lg:grid lg:grid-cols-[88px_1fr]">
      {/* Raíl de espacios (escritorio) */}
      <aside className="hidden bg-noche text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] font-display text-lg font-semibold text-oro" title={restaurante.nombre}>{restaurante.nombre.slice(0, 1).toUpperCase()}</div>
        <nav aria-label="Espacios del panel" className="mt-8 flex flex-1 flex-col gap-1.5">
          {espacios.map((e) => {
            const activo = espacio?.id === e.id;
            return (
              <button key={e.id} onClick={() => setPestana(e.items[0].id)} aria-current={activo ? 'page' : undefined}
                className={`group relative flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10.5px] font-medium transition-colors ${activo ? 'text-white' : 'text-white/45 hover:text-white'}`}>
                {activo && <motion.span layoutId="rail-activo" className="absolute inset-0 rounded-2xl bg-white/[0.08] ring-1 ring-oro/30" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className={`relative ${activo ? 'text-oro' : ''}`}><Icono n={e.icono} /></span>
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
        {/* Alarma de llamadas de mesa en todo el panel (B1, 07/10): suena en bucle hasta que se atienden */}
        {!demo && !delegado && <AlarmaLlamadas enLlamadas={pestana === 'camarero'} irALlamadas={() => setPestana('camarero')} />}
        {montaje && tut && <TutorialMontaje demo={demo} inicial={tut} pestana={pestana} irA={irATutorial} onBloqueo={alBloquear} avisoBloqueo={avisoBloqueo} onCompletado={(t) => { bloqueo.current = null; setTut(t); setPestana('inicio'); }} />}
        {restaurante.soporte && (
          <div className="bg-vino px-4 py-2.5 text-center text-[13px] text-white sm:px-6">
            <span className="font-semibold text-oro">Modo soporte</span> · estás en el panel de {restaurante.nombre} como DKitchen. Cada cambio queda en su historial; el cobro y el plan se gestionan en su ficha de Central.{' '}
            <a href={`/admin-dkitchen/salir-soporte?id=${restaurante.id}`} className="font-semibold underline underline-offset-2">Salir y volver a su ficha</a>
          </div>
        )}
        {delegado && !restaurante.soporte && (
          <div className="bg-tinta px-4 py-2.5 text-center text-[13px] text-white sm:px-6">
            <span className="font-semibold text-oro">Puesta a punto</span> · estás editando la carta de {restaurante.nombre} como su asesor. Cada cambio queda registrado a tu nombre.{' '}
            <a href="/socio/salir" className="font-semibold underline underline-offset-2">Volver a mis clientes</a>
          </div>
        )}
        {!delegado && <AvisoReservas demo={demo} arriba={montaje} reservas={reservasVivas} whatsapp={restaurante.whatsapp} onReservas={setReservasVivas} abrir={(id) => { setReservaAbrir(id); setPestana('reservas'); }} />}
        {/* Cabecera */}
        <header className="sticky top-0 z-30 border-b border-linea bg-crema/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{restaurante.nombre}</p>
              <p className="text-xs text-niebla">{espacio?.nombre}{espacio && espacio.items.length > 1 ? ` · ${titulo}` : ''} · plan {nombrePlan(restaurante.plan)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="hidden rounded-full border border-linea-fuerte bg-white px-4 py-2 text-sm font-medium sm:inline-flex lg:hidden">Ver carta</a>
              <button onClick={() => setMenu(true)} aria-label="Cuenta" className="flex h-9 w-9 items-center justify-center rounded-full bg-tinta text-sm font-semibold text-oro lg:hidden">{identidad.nombre.slice(0, 1).toUpperCase()}</button>
            </div>
          </div>
          {espacio && espacio.items.length > 1 && (
            <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6 lg:px-10">
              <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={espacio.nombre}>
                {espacio.items.map((p) => (
                  <button key={p.id} role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
                    className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${pestana === p.id ? 'text-white' : 'text-niebla hover:text-carbon'}`}>
                    {pestana === p.id && <motion.span layoutId="pildora-activa" className="absolute inset-0 rounded-full bg-tinta" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
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
              <p className="truncate text-sm text-niebla">{identidad.email}</p>
              <div className="mt-4 grid gap-2">
                <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="rounded-2xl bg-papel px-4 py-3.5 text-sm font-medium">Ver mi carta como la ven mis clientes</a>
                <button onClick={() => setPestana('soporte')} className="rounded-2xl bg-papel px-4 py-3.5 text-left text-sm font-medium">Soporte</button>
                <button onClick={salir} className="rounded-2xl px-4 py-3.5 text-left text-sm font-medium text-vino">Cerrar sesión</button>
              </div>
            </div>
          </div>
        )}

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:py-10">
        {pestana !== 'plan' && <AvisoPrueba cobro={cobro} />}
        <GuiaSeccion seccion={pestana} />
        <AnimatePresence mode="wait">
        <motion.div key={pestana} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        {pestana === 'inicio' && <Inicio restaurante={restaurante} qrPedido={solicitudesQr.length > 0} escaneosMes={escaneosMes} escaneos30d={escaneos30d} reservas={reservasVivas} platos={carta.platos} servicios={servicios} ir={(p) => setPestana(p)} />}
        {pestana === 'carta' && <MiCarta carta={carta} />}
        {pestana === 'estudio' && <Estudio secciones={carta.secciones} platos={carta.platos} extras={estudio.extras} legal={estudio.legal} restaurante={{ slug: restaurante.slug, nombre: restaurante.nombre, direccion: restaurante.direccion }} demo={identidad.id === 'demo'} irAPlatos={() => setPestana('carta')} />}
        {pestana === 'local' && <MiLocal restaurante={restaurante} />}
        {pestana === 'promociones' && <Promociones promociones={promociones} secciones={carta.secciones} plan={restaurante.plan} platos={carta.platos.map((p) => ({ id: p.id, nombre: p.nombre }))} />}
        {(pestana === 'diseno' || pestana === 'modulos') && <Mejoras key={pestana} restaurante={restaurante} servicios={servicios} vista={pestana} fotos={carta.platos.map((p) => p.fotoUrl).filter((u): u is string => !!u).slice(0, 3)} />}
        {pestana === 'sala' && <Sala mesas={sala.mesas} elementos={sala.elementos} camareros={sala.camareros} tpv={sala.tpv} modulos={modulos} />}
        {pestana === 'idiomas' && <Idiomas maximo={servicios.idiomasPermitidos ?? 1} activos={restaurante.idiomas ?? []} secciones={carta.secciones} platos={carta.platos} traducciones={traducciones} />}
        {pestana === 'reservas' && <Reservas reservas={reservasVivas} whatsapp={restaurante.whatsapp} abrirId={reservaAbrir} onAbierta={() => setReservaAbrir(null)} />}
        {pestana === 'pedidos' && <Pedidos demo={demo} />}
        {pestana === 'equipo' && <Equipo informe={sala.informe} demo={demo} />}
        {pestana === 'camarero' && <Camarero slug={restaurante.slug} codigoQr={codigoQr} />}
        {pestana === 'qr' && (
          <MiQr codigoQr={codigoQr} restauranteNombre={restaurante.nombre} solicitudes={solicitudesQr} />
        )}
        {pestana === 'escaneos' && <MisEscaneos escaneosMes={escaneosMes} escaneos30d={escaneos30d} />}
        {pestana === 'plan' && <div className="space-y-6"><DesgloseCobro cobro={cobro} /><MiPlan restaurante={restaurante} servicios={servicios} /></div>}
        {pestana === 'soporte' && <div className="space-y-6">{socio && !delegado && <AsesorSocio socio={socio} />}<Soporte tickets={tickets} /></div>}
        </motion.div>
        </AnimatePresence>
      </main>


      {/* Chat de ayuda (30/09/2026): dudas de la sección actual; si no se resuelve, ticket con contexto */}
      <ChatAyuda
        modo="panel"
        temas={TEMAS_PANEL}
        seccion={pestana}
        saludo={`Hola, ${identidad.nombre.split(' ')[0]}. ¿En qué te ayudo? Estas son las dudas más habituales en ${titulo || 'el panel'}; también puedes escribir la tuya abajo.`}
        posicion="bottom-[5.75rem] right-4 lg:bottom-6 lg:right-6"
        sinBurbujaMovil
        onIr={(p) => { if (PESTANAS.some((x) => x.id === p) && visible(p as Pestana)) setPestana(p as Pestana); else setPestana(p === 'idiomas' || p === 'sala' ? 'modulos' : 'plan'); }}
        puesta={puesta ? { precio: euros(puesta.precioCentimos), comprar: async () => {
          if (demo) { window.location.href = '/qr#planes'; return; }
          const { url } = await comprarServicioAction('setup_esencial'); window.location.href = url;
        } } : null}
        onPreguntarIa={demo ? undefined : (h) => preguntarAyudaIaAction(h, pestana)}
        nombresSeccion={Object.fromEntries(PESTANAS.map((x) => [x.id, x.nombre]))}
        onPersona={async (d) => {
          if (demo) return 'En la demo no se envían mensajes. En tu panel real, esto llega a una persona de DKitchen con todo el contexto.';
          const r = await crearTicketAyudaAction(d);
          if (!r.ok) throw new Error(r.error);
        }}
      />

      {/* Barra de espacios flotante (móvil y tablet) */}
      <nav aria-label="Espacios del panel" className="fixed inset-x-3 bottom-3 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto flex max-w-md items-stretch justify-between rounded-[26px] bg-noche/95 p-1.5 shadow-[0_16px_40px_rgba(10,8,12,.35)] backdrop-blur-xl">
          {espacios.map((e) => {
            const activo = espacio?.id === e.id;
            return (
              <li key={e.id} className="flex-1">
                <button onClick={() => (e.id === 'ayuda' ? abrirAyuda() : setPestana(e.items[0].id))} aria-current={activo ? 'page' : undefined}
                  className={`relative flex w-full flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10.5px] font-medium ${activo ? 'text-white' : 'text-white/50'}`}>
                  {activo && <motion.span layoutId="barra-activa" className="absolute inset-0 rounded-[20px] bg-white/[0.1]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={`relative ${activo ? 'text-oro' : ''}`}><Icono n={e.icono} /></span>
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