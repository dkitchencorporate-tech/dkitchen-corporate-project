/** Tipos del equipo de sala (0047), compartidos por el panel y la app de sala. */
export type RolSala = 'camarero' | 'encargado';

export interface MiembroEquipo {
  id: string; nombre: string; rol: RolSala; activo: boolean;
  creado_en: string; ultimo_acceso: string | null;
  mesas: string[]; zonas: string[];
}
export interface ZonaEquipo { nombre: string; mesas: number; camareros: string[] }
export interface Equipo { camareros: MiembroEquipo[]; zonas: ZonaEquipo[] }
