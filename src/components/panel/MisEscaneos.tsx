'use client';

import type { EscaneosPorDia } from '@/lib/escaneos-cliente';
import { motion } from 'framer-motion';
import FiltroEscaneos from './FiltroEscaneos';

export default function MisEscaneos({
  escaneosMes,
  escaneos30d,
}: {
  escaneosMes: number;
  escaneos30d: EscaneosPorDia[];
}) {
  const maximo = Math.max(1, ...escaneos30d.map((d) => d.total));
  const mapa = new Map(escaneos30d.map((d) => [d.fecha, d.total]));

  const dias: { fecha: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const clave = fecha.toISOString().slice(0, 10);
    dias.push({ fecha: clave, total: mapa.get(clave) ?? 0 });
  }

  return (
    <div className="space-y-8">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Mis Escaneos</h2>

      <div className="bg-white border border-[#E6E6E2] rounded-2xl p-6">
        <p className="text-[#6B7079] text-sm">Este mes</p>
        <p className="text-4xl font-black text-[#6E0C2B] mt-1">{escaneosMes}</p>
        <p className="text-[#6B7079] text-xs mt-1">
          Cuenta cada vez que alguien escanea tu QR — el umbral que usamos para saber si conviene subir
          de plan es 600/mes sostenido.
        </p>
      </div>

      <div className="bg-white border border-[#E6E6E2] rounded-2xl p-6">
        <p className="text-[#6B7079] text-sm mb-4">Últimos 30 días</p>
        <div className="flex items-end gap-0.5 h-32">
          {dias.map((d, i) => (
            <motion.div
              key={d.fecha}
              title={`${d.fecha}: ${d.total}`}
              className="flex-1 rounded-t-md bg-[#6E0C2B] min-h-[2px]"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(2, (d.total / maximo) * 100)}%` }}
              transition={{ duration: 0.7, delay: i * 0.02, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
      </div>
      <FiltroEscaneos />
    </div>
  );
}
