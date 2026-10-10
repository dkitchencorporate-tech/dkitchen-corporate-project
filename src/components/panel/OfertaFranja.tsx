'use client';

import { useEffect, useState } from 'react';
import { registrarOfertaAction } from '@/app/panel/actions';

export const TEXTOS_OFERTA: Record<string, string> = {
  plan_ampliado: 'Tu carta ya tiene movimiento: con el plan Local tienes plano de mesas, app para 3 camareros y 150 reservas al mes.',
  plan_sala: 'Tu local va lanzado: el plan Sala trae el máximo de platos, mesas, equipo y comandas al TPV.',
  comandero_pro: 'Tu comandero ya está incluido: con un plan mayor guardas más días de historial.',
  setup_experto: 'Dale a tu carta el diseño que merece tu cocina: Carta de Autor a precio de lanzamiento.',
  idiomas: '¿Recibes turistas? Español e inglés ya van en tu plan; añade cada idioma más por un pago único.',
  plano_mesas: 'Tu sala crece: ve todas tus mesas y quién llama en un solo plano.',
  app_sala: 'Elimina las comandas en papel: tus camareros con sus mesas en el móvil.',
  conexion_tpv: 'Tu plan ya incluye la conexión con tu TPV: actívala en Sala y las comandas llegarán solas.',
  nucleo: 'Tu volumen ya pide un sistema propio: descubre DKitchen Signature.',
};

/** Una sola oferta, decidida por la base (dk.ofertas_para_mi), cerrable. */
export default function OfertaFranja({ oferta, onVer }: { oferta: string; onVer: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { registrarOfertaAction(oferta, 'mostrada').catch(() => {}); }, [oferta]);
  if (!visible || !TEXTOS_OFERTA[oferta]) return null;
  return (
    <div className="border-b border-vino/20 bg-vino/[0.07] px-4 py-3 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-4xl items-center gap-3 text-sm">
        <p className="flex-1 text-grafito">{TEXTOS_OFERTA[oferta]}</p>
        <button onClick={onVer} className="shrink-0 rounded-full bg-vino px-3 py-1.5 font-bold">Ver</button>
        <button onClick={() => { setVisible(false); registrarOfertaAction(oferta, 'cerrada').catch(() => {}); }} aria-label="Cerrar" className="shrink-0 text-niebla hover:text-carbon">✕</button>
      </div>
    </div>
  );
}
