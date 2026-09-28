'use client';

import { useEffect, useState } from 'react';
import { registrarOfertaAction } from '@/app/panel/actions';

const TEXTOS: Record<string, string> = {
  plan_ampliado: 'Tu carta ya tiene movimiento: con el plan Ampliado activas reservas, llamada al camarero y 3 banners.',
  setup_experto: 'Dale a tu carta el diseño que merece tu cocina: Carta de Autor a precio de lanzamiento.',
  idiomas: '¿Recibes turistas? Tu carta en 3 idiomas por un pago único.',
  plano_mesas: 'Tu sala crece: ve todas tus mesas y quién llama en un solo plano.',
  app_sala: 'Elimina las comandas en papel: tus camareros con sus mesas en el móvil.',
  conexion_tpv: 'Que lo que anotan tus camareros llegue solo a tu TPV.',
  pack_sala: 'Completa tu sala con el Pack: los 3 módulos por 99 €/mes.',
  nucleo: 'Tu volumen ya pide un sistema propio: descubre el Núcleo Operativo.',
};

/** Una sola oferta, decidida por la base (dk.ofertas_para_mi), cerrable. */
export default function OfertaFranja({ oferta, onVer }: { oferta: string; onVer: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { registrarOfertaAction(oferta, 'mostrada').catch(() => {}); }, [oferta]);
  if (!visible || !TEXTOS[oferta]) return null;
  return (
    <div className="border-b border-[#D9531E]/30 bg-[#D9531E]/10 px-6 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-3 text-sm">
        <span aria-hidden="true">✨</span>
        <p className="flex-1 text-white/85">{TEXTOS[oferta]}</p>
        <button onClick={onVer} className="shrink-0 rounded-lg bg-[#D9531E] px-3 py-1.5 font-bold">Ver</button>
        <button onClick={() => { setVisible(false); registrarOfertaAction(oferta, 'cerrada').catch(() => {}); }} aria-label="Cerrar" className="shrink-0 text-white/40 hover:text-white">✕</button>
      </div>
    </div>
  );
}
