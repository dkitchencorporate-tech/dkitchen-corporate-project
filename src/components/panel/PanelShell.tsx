'use client';

import { useEffect, useState } from 'react';
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
import OfertaFranja from './OfertaFranja';
import type { EstadoServicios } from '@/lib/servicios';
import type { MesaPlano, ElementoPlano, FilaInforme, Camarero as CamareroSala } from '@/lib/sala';
import type { Promocion } from '@/lib/promociones';
import type { Reserva } from '@/lib/reservas';
import { authClient } from '@/lib/auth-client';

type Pestana = 'carta' | 'local' | 'promociones' | 'reservas' | 'sala' | 'idiomas' | 'diseno' | 'modulos' | 'camarero' | 'qr' | 'escaneos' | 'plan' | 'soporte';

const GRUPOS: { titulo: string; items: { id: Pestana; nombre: string }[] }[] = [
  { titulo: 'Tu carta', items: [
    { id: 'carta', nombre: 'Mi carta' }, { id: 'diseno', nombre: 'Diseño' }, { id: 'idiomas', nombre: 'Idiomas' },
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
  const [pestana, setPestanaBase] = useState<Pestana>('carta');
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
  const Navegacion = () => (
    <nav aria-label="Secciones del panel" className="space-y-7">
      {GRUPOS.map((g) => {
        const items = g.items.filter((p) => visible(p.id));
        if (items.length === 0) return null;
        return (
          <div key={g.titulo}>
            <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">{g.titulo}</p>
            <ul className="mt-2 space-y-0.5">
              {items.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setPestana(p.id)} aria-current={pestana === p.id ? 'page' : undefined}
                    className={`w-full rounded-lg px-3 py-2 text-left text-[15px] transition-colors ${pestana === p.id ? 'bg-white/[0.07] font-semibold text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white'}`}>
                    {p.nombre}
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
    <div className="min-h-screen bg-[#14100C] text-white lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Lateral (escritorio) */}
      <aside className="hidden border-r border-white/[0.06] lg:flex lg:h-screen lg:sticky lg:top-0 lg:flex-col">
        <div className="px-6 pb-6 pt-7">
          <p className="text-[15px] font-semibold tracking-tight">{restaurante.nombre}</p>
          <p className="mt-0.5 text-xs text-white/35">Carta QR · plan {restaurante.plan === 'ampliado' ? 'Ampliado' : 'Básico'}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3"><Navegacion /></div>
        <div className="space-y-2 border-t border-white/[0.06] px-6 py-5 text-sm">
          <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="block font-semibold text-[#E0703F] hover:underline">Ver mi carta</a>
          <p className="truncate text-xs text-white/30">{identidad.email}</p>
          <button onClick={salir} className="text-xs text-white/40 hover:text-white">Cerrar sesión</button>
          <p className="pt-2 text-[10px] uppercase tracking-[0.2em] text-white/20">DKitchen</p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barra superior (móvil y tablet) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#14100C]/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{restaurante.nombre}</p>
            <p className="text-xs text-white/40">{titulo}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="rounded-lg border border-white/10 px-3 py-2 text-sm">Ver carta</a>
            <button onClick={() => setMenu(true)} aria-expanded={menu} className="rounded-lg bg-white/[0.08] px-3 py-2 text-sm font-semibold">Menú</button>
          </div>
        </header>

        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
            <button aria-label="Cerrar menú" onClick={() => setMenu(false)} className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col bg-[#1A1510] shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4">
                <p className="font-semibold">{restaurante.nombre}</p>
                <button onClick={() => setMenu(false)} className="text-sm text-white/50">Cerrar</button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-4"><Navegacion /></div>
              <div className="border-t border-white/[0.06] px-5 py-4 text-sm">
                <p className="truncate text-xs text-white/35">{identidad.email}</p>
                <button onClick={salir} className="mt-2 text-white/60">Cerrar sesión</button>
              </div>
            </div>
          </div>
        )}

      {servicios.oferta && pestana !== 'diseno' && pestana !== 'modulos' && <OfertaFranja oferta={servicios.oferta.oferta} onVer={() => setPestana(['setup_experto', 'setup_esencial'].includes(servicios.oferta!.oferta) ? 'diseno' : 'modulos')} />}

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
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
      </main>
      </div>
    </div>
  );
}
