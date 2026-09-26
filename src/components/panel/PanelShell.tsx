'use client';

import { useState } from 'react';
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
import { authClient } from '@/lib/auth-client';

type Pestana = 'carta' | 'local' | 'camarero' | 'qr' | 'escaneos' | 'plan' | 'soporte';

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'carta', nombre: 'Mi Carta' },
  { id: 'local', nombre: 'Mi Local' },
  { id: 'camarero', nombre: 'Llamadas de mesa' },
  { id: 'qr', nombre: 'Mi QR' },
  { id: 'escaneos', nombre: 'Mis Escaneos' },
  { id: 'plan', nombre: 'Mi Plan' },
  { id: 'soporte', nombre: 'Soporte' },
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
}: {
  identidad: { id: string; nombre: string; email: string };
  restaurante: MiRestaurante;
  codigoQr: string | null;
  carta: { secciones: SeccionPropia[]; platos: PlatoPropio[] };
  escaneosMes: number;
  escaneos30d: EscaneosPorDia[];
  solicitudesQr: SolicitudQrFisico[];
  tickets: Ticket[];
}) {
  const [pestana, setPestana] = useState<Pestana>('carta');

  return (
    <div className="min-h-screen bg-[#171008] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">
            D<span className="text-[#D9531E]">Kitchen</span>
          </h1>
          <p className="text-white/40 text-xs">{restaurante.nombre}</p>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="text-sm font-semibold text-[#D9531E] hover:underline">
            Ver mi carta ↗
          </a>
          <p className="text-white/40 text-sm hidden sm:block">{identidad.email}</p>
          <button
            onClick={async () => {
              await authClient.signOut();
              window.location.href = '/panel/iniciar-sesion';
            }}
            className="text-white/40 hover:text-white text-sm"
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="border-b border-white/10 px-6 flex gap-1 overflow-x-auto">
        {PESTANAS.filter((p) => p.id !== 'camarero' || restaurante.plan === 'ampliado').map((p) => (
          <button
            key={p.id}
            onClick={() => setPestana(p.id)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              pestana === p.id
                ? 'border-[#D9531E] text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {pestana === 'carta' && <MiCarta carta={carta} />}
        {pestana === 'local' && <MiLocal restaurante={restaurante} />}
        {pestana === 'camarero' && <Camarero slug={restaurante.slug} codigoQr={codigoQr} />}
        {pestana === 'qr' && (
          <MiQr codigoQr={codigoQr} restauranteNombre={restaurante.nombre} solicitudes={solicitudesQr} />
        )}
        {pestana === 'escaneos' && <MisEscaneos escaneosMes={escaneosMes} escaneos30d={escaneos30d} />}
        {pestana === 'plan' && <MiPlan restaurante={restaurante} />}
        {pestana === 'soporte' && <Soporte tickets={tickets} />}
      </main>
    </div>
  );
}
