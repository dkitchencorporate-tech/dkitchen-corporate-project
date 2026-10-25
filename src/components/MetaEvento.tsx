'use client';

import { useEffect } from 'react';
import { dkMeta } from '@/components/AnaliticaWeb';

/** Lanza un evento del píxel de Meta al montar la página (solo si hay consentimiento y píxel). */
export default function MetaEvento({ evento }: { evento: 'Lead' | 'CompleteRegistration' }) {
  useEffect(() => { const t = setTimeout(() => dkMeta(evento), 1500); return () => clearTimeout(t); }, [evento]);
  return null;
}
