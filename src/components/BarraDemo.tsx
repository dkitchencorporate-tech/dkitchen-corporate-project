/**
 * 30/10/2026 (mapeo de karc0): las cartas de muestra (/demo/carta, /m/demo)
 * eran callejones sin salida. Esta barra fija arriba lleva al plan y al
 * contacto. Solo se pinta en demos, nunca en la carta real de un cliente.
 */
export default function BarraDemo({ texto = '¿Quieres tu carta así?' }: { texto?: string }) {
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-[#2A0A12]/95 px-4 py-2.5 text-center font-sans text-sm text-white shadow-lg backdrop-blur">
      <span className="font-semibold">{texto} <span className="text-[#D4AF6A]">Desde 1 €</span></span>
      <span className="flex gap-2">
        <a href="/qr" className="rounded-full bg-[#D4AF6A] px-4 py-1.5 font-semibold text-[#1A0710]">Ver planes</a>
        <a href="/contacto?i=carta" className="rounded-full border border-white/40 px-4 py-1.5 font-semibold">Que me llamen</a>
      </span>
    </div>
  );
}
