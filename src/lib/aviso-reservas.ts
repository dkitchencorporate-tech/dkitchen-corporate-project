'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Reservas «nuevas» = pendientes, creadas en las últimas 24 h y que nadie ha
 * marcado como vistas EN ESTE DISPOSITIVO (B4, 07/10/2026). Lo visto se guarda
 * en el navegador: el móvil del dueño y la tablet de la barra suenan cada uno
 * hasta que alguien toca «Visto» en él. Confirmar o cancelar la reserva también
 * la saca (deja de estar pendiente).
 */
const CLAVE = 'dk-reservas-vistas';
const EVENTO = 'dk-reservas-vistas';
const leer = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

export function marcarReservasVistas(ids: string[]) {
  if (!ids.length) return;
  const todas = Array.from(new Set([...leer(), ...ids])).slice(-300);
  try { localStorage.setItem(CLAVE, JSON.stringify(todas)); } catch { /* navegador sin almacenamiento */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: ids }));
}

export function useReservasNuevas<T extends { id: string; estado: string; creadaEn: string }>(lista: T[]) {
  const [vistas, setVistas] = useState<string[] | null>(null);
  useEffect(() => {
    setVistas(leer());
    // Si el almacenamiento falla, el evento trae los ids: así «Visto» funciona igual en esta pestaña
    const al = (e: Event) => setVistas((prev) => Array.from(new Set([...(prev ?? []), ...leer(), ...((e as CustomEvent<string[]>).detail ?? [])])));
    window.addEventListener(EVENTO, al);
    return () => window.removeEventListener(EVENTO, al);
  }, []);
  const desde = Date.now() - 24 * 3600 * 1000;
  const nuevas = vistas === null ? [] : lista.filter((r) => r.estado === 'pendiente' && new Date(r.creadaEn).getTime() > desde && !vistas.includes(r.id));
  const marcar = useCallback((ids: string[]) => marcarReservasVistas(ids), []);
  return { nuevas, marcar };
}

export const textoReserva = (r: { nombre: string; fecha: string; hora: string; personas: number }) =>
  `${r.nombre} · ${new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${r.fecha}T00:00:00Z`))} · ${r.hora} · ${r.personas} pax`;
