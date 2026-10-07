/** Iconos de trazo del panel (29/09/2026): SVG propios, sin dependencias. */
const RUTAS: Record<string, string> = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  carta: 'M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1zM9 8h6M9 12h6',
  servicio: 'M4 17h16M6 17a6 6 0 0 1 12 0M12 7V5M10 5h4',
  negocio: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  local: 'M4 10h16l-1.6-6H5.6zM5 10v10h14V10M9.5 20v-5h5v5',
  ayuda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01',
  salir: 'M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  destello: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  check: 'M5 12.5l4.5 4.5L19 7',
  flecha: 'M5 12h14M13 6l6 6-6 6',
};

export function Icono({ n, className = 'h-5 w-5' }: { n: keyof typeof RUTAS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={RUTAS[n] ?? RUTAS.inicio} />
    </svg>
  );
}
