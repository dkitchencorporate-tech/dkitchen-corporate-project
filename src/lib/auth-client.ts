'use client';
import { createAuthClient } from '@neondatabase/auth/next';

/** Cliente de navegador — habla con /api/auth/* de este mismo dominio, nunca con Neon directamente. */
export const authClient = createAuthClient();
