import type { Tarea } from '@/lib/tareas';

/**
 * «Hoy» de Mis tareas (18/10/2026, karc0): lo de hoy o atrasado, de karc0 y de Claude. Cuando uno de los
 * dos acaba lo suyo del día, entra el ADELANTO: las tareas del siguiente día con fecha y las urgentes,
 * para sacar trabajo por adelantado. Sin dependencias de servidor: lo usan la página y el menú.
 */
const madrid = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d);
export const hoyMadrid = () => madrid(new Date());
// 0101: desde el 25/10 DKitchen es de dk-vzl (operadores en Venezuela); karc0 solo conserva los flyers.
export const esMia = (t: Tarea) => t.responsable === 'dk-vzl' || t.responsable === 'karc0' || t.responsable === 'ambos';
export const esDeClaude = (t: Tarea) => t.responsable === 'claude' || t.responsable === 'antigravity';

export interface Adelanto { dia: string | null; lista: Tarea[] }
export interface Hoy { hoy: string; mias: Tarea[]; claude: Tarea[]; adelantoMias: Adelanto | null; adelantoClaude: Adelanto | null; hechasHoyMias: number; hechasHoyClaude: number }

export function tareasDeHoy(todas: Tarea[], hoy = hoyMadrid()): Hoy {
  const abiertas = todas.filter((t) => t.estado !== 'hecha');
  const delDia = (t: Tarea) => (t.paraCuando ? t.paraCuando <= hoy : t.urgencia === 'urgente');
  const adelanto = (lista: Tarea[]): Adelanto | null => {
    const futuras = lista.filter((t) => t.paraCuando && t.paraCuando > hoy);
    const dia = futuras.map((t) => t.paraCuando as string).sort()[0] ?? null;
    const l = futuras.filter((t) => t.paraCuando === dia || t.urgencia === 'urgente');
    return l.length ? { dia, lista: l } : null;
  };
  const mias = abiertas.filter((t) => esMia(t) && delDia(t));
  // 0095: lo que karc0 pidió «implementar ya» va primero, en el orden en que lo pidió.
  const claude = abiertas.filter((t) => esDeClaude(t) && (delDia(t) || !!t.implementarYaEn))
    .sort((a, b) => (a.implementarYaEn ?? '9').localeCompare(b.implementarYaEn ?? '9'));
  const hechasHoy = todas.filter((t) => t.estado === 'hecha' && t.hechaEn && madrid(new Date(t.hechaEn)) === hoy);
  return {
    hoy, mias, claude,
    adelantoMias: mias.length ? null : adelanto(abiertas.filter(esMia)),
    adelantoClaude: claude.length ? null : adelanto(abiertas.filter(esDeClaude)),
    hechasHoyMias: hechasHoy.filter(esMia).length, hechasHoyClaude: hechasHoy.filter(esDeClaude).length,
  };
}
