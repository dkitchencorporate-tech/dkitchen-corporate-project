'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Inicio from './Inicio';
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

const GRUPOS: { titulo: string; items: { id: Pestana; nombre: string }[] }[] = [
  { titulo: 'Tu carta', items: [
    { id: 'inicio', nombre: 'Inicio' }, { id: 'carta', nombre: 'Mi carta' }, { id: 'diseno', nombre: 'Diseño' }, { id: 'idiomas', nombre: 'Idiomas' },
    { id: 'promociones', nombre: 'Banners' }, { id: 'qr', nombre: 'Mi QR' },
  ] },
  { titulo: 'Servicio', items: [
    { id: 'reservas', nombre: 'Reservas' }, { id: 'camarero', nombre: 'Llamadas de mesa' }, { id: 'sala', nombre: 'Sala' },
  ] },
  { titulo: 'Tu negocio', items: [
    { id: 'escaneos', nombre: 'Escaneos' }, { id: 'modulos', nombre: 'Módulos' }, { id: 'local', nombre: 'Mi local' },
    { id: 'plan', nombre: 'Mi plan' }, { id: 'soporte', nombre: 'Soporte' },
  ] },
];
const PESTANAS = GRUPOS.flatMap((g) => g.items);

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
  const setPestana = (p: Pestana) => { setPestanaBase(p); setMenu(false); window.scrollTo({ top: 0 }); };

  // Enlaces directos a una sección (p. ej. desde los correos: /panel?pestana=reservas)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('pestana');
    const pedida = q === 'mejoras' ? 'modulos' : q;
    if (pedida && PESTANAS.some((x) => x.id === pedida)) setPestana(pedida as Pestana);
  }, []);

  const salir = async () => { await authClient.signOut(); window.location.href = '/panel/iniciar-sesion'; };
  const titulo = PESTANAS.find((p) => p.id === pestana)?.nombre ?? '';
  const Navegacion = ({ oscuro = false }: { oscuro?: boolean }) => (
    <nav aria-label="Secciones del panel" className="space-y-7">
      {GRUPOS.map((g) => {
        const items = g.items.filter((p) => visible(p.id));
        if (items.length === 0) return null;
        return (
          <div key={g.titulo}>
            <p className={`px-3 text-[11px] font-medium uppercase tracking-[0.18em] ${oscuro ? 'text-white/35' : 'text-[#9A9EA6]'}`}>{g.titulo}</p>
            <ul className="mt-2 space-y-0.5">
              {items.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setPestana(p.id)} aria-current={pestana === p.id ? 'page' : undefined}
                    className={`relative w-full rounded-xl px-3 py-2 text-left text-[15px] transition-colors ${pestana === p.id ? (oscuro ? 'font-semibold text-white' : 'font-semibold text-[#1B1D22]') : (oscuro ? 'text-white/60 hover:text-white' : 'text-[#6B7079] hover:text-[#1B1D22]')}`}>
                    {pestana === p.id && <motion.span layoutId="pestana-activa" className={`absolute inset-0 rounded-xl ${oscuro ? 'bg-white/10' : 'bg-[#EDEDEA]'}`} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <span className="relative">{p.nombre}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#1B1D22] lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Lateral (escritorio) */}
      <aside className="hidden bg-[#17191E] text-white lg:flex lg:h-screen lg:sticky lg:top-0 lg:flex-col">
        <div className="px-6 pb-6 pt-7">
          <p className="text-[15px] font-semibold tracking-tight">{restaurante.nombre}</p>
          <p className="mt-0.5 text-xs text-white/40">Carta QR · plan {restaurante.plan === 'ampliado' ? 'Ampliado' : 'Básico'}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3"><Navegacion oscuro /></div>
        <div className="space-y-2 border-t border-white/10 px-6 py-5 text-sm">
          <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="block font-semibold text-[#E8592A] hover:underline">Ver mi carta</a>
          <p className="truncate text-xs text-white/40">{identidad.email}</p>
          <button onClick={salir} className="text-xs text-white/55 hover:text-white">Cerrar sesión</button>
          <p className="pt-2 text-[10px] uppercase tracking-[0.2em] text-white/25">DKitchen</p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barra superior (móvil y tablet) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#E6E6E2] bg-[#F7F7F5]/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{restaurante.nombre}</p>
            <p className="text-xs text-[#6B7079]">{titulo}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="rounded-lg border border-[#E6E6E2] px-3 py-2 text-sm">Ver carta</a>
            
          </div>
        </header>

        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
            <button aria-label="Cerrar menú" onClick={() => setMenu(false)} className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4">
                <p className="font-semibold">{restaurante.nombre}</p>
                <button onClick={() => setMenu(false)} className="text-sm text-[#6B7079]">Cerrar</button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-4"><Navegacion /></div>
              <div className="border-t border-[#E6E6E2] px-5 py-4 text-sm">
                <p className="truncate text-xs text-[#9A9EA6]">{identidad.email}</p>
                <button onClick={salir} className="mt-2 text-[#6B7079]">Cerrar sesión</button>
              </div>
            </div>
          </div>
        )}

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:py-10">
        <AnimatePresence mode="wait">
        <motion.div key={pestana} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        {pestana === 'inicio' && <Inicio restaurante={restaurante} escaneosMes={escaneosMes} escaneos30d={escaneos30d} reservas={reservas} platos={carta.platos} servicios={servicios} ir={(p) => setPestana(p)} />}
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

      {/* Navegación flotante (móvil y tablet) */}
      <nav aria-label="Navegación principal" className="fixed inset-x-3 bottom-3 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto flex max-w-md items-center justify-between rounded-full border border-[#E6E6E2] bg-[#17191E]/95 p-1.5 shadow-[0_12px_32px_rgba(23,25,30,.28)] backdrop-blur-xl">
          {([
            ['inicio', 'Inicio'], ['carta', 'Carta'],
            restaurante.plan === 'ampliado' ? ['reservas', 'Reservas'] : ['qr', 'Mi QR'],
            ['plan', 'Plan'],
          ] as [Pestana, string][]).map(([id, n]) => (
            <li key={id} className="flex-1">
              <button onClick={() => setPestana(id)} aria-current={pestana === id ? 'page' : undefined}
                className={`relative w-full rounded-full py-2.5 text-[13px] font-medium ${pestana === id ? 'text-[#17191E]' : 'text-white/70'}`}>
                {pestana === id && <motion.span layoutId="nav-movil" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">{n}</span>
              </button>
            </li>
          ))}
          <li className="flex-1">
            <button onClick={() => setMenu(true)} className="w-full rounded-full py-2.5 text-[13px] font-medium text-white/70">Más</button>
          </li>
        </ul>
      </nav>
      </div>
    </div>
  );
}
