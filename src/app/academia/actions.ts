'use server';

import { revalidatePath } from 'next/cache';
import { exigirAcademia } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { empezarTest, corregirTest, empezarEscenario, responderEscenario, nivelDe } from '@/lib/academia/motor';
import type { Nivel } from '@/lib/academia/banco';

/** Academia (0112): la nota la calcula el servidor; la base la guarda y aplica la espera de 24 h y los permisos. */
const esAlex = (jwt: string) => comoCliente(jwt, async (c) => (await c.query<{ a: boolean }>('SELECT dk.es_alex() AS a')).rows[0]?.a === true).catch(() => false);
const registrar = (jwt: string, bloque: string, version: string, nota: number, aprobado: boolean, notas: unknown, detalle: unknown) =>
  comoCliente(jwt, (c) => c.query('SELECT dk.academia_registrar($1, $2, $3, $4, $5::jsonb, $6::jsonb)', [bloque, version, nota, aprobado, JSON.stringify(notas), JSON.stringify(detalle)]));
const motivo = (e: unknown) => (String((e as Error)?.message ?? '').includes('24 h') ? 'Has suspendido dos veces seguidas este bloque: vuelve a intentarlo dentro de 24 h.' : 'No se pudo guardar el intento. Inténtalo de nuevo.');

export async function empezarTestAction(nivel: Nivel | 'ALEX', practica = false) {
  const jwt = await exigirAcademia();
  if ((nivel === 'N4' || nivel === 'ALEX') && !(await esAlex(jwt))) return { error: 'Este entrenamiento es solo de dirección.' };
  if (!['N1', 'N2', 'N3', 'N4', 'ALEX'].includes(nivel)) return { error: 'Nivel no válido.' };
  return empezarTest(nivel, practica);
}

export async function entregarTestAction(token: string, respuestas: Record<string, number>, practica = false) {
  const jwt = await exigirAcademia();
  const r = corregirTest(token, respuestas);
  if (!r) return { error: 'El intento ha caducado. Empieza de nuevo.' };
  // Una práctica (solo objeciones) nunca cuenta como test, aunque se envíe como tal.
  if (practica || r.practica) return { resultado: r };
  const alex = r.modo === 'alex';
  try {
    await registrar(jwt, alex ? 'N4' : r.nivel, alex ? 'alex' : 'test', r.nota, r.aprobado, r.dims, { fallos: r.fallos.map((f) => f.donde).slice(0, 20), nivel: nivelDe(r.nota) });
  } catch (e) {
    return { error: motivo(e), resultado: r };
  }
  revalidatePath('/academia');
  revalidatePath('/admin-dkitchen/entrenamiento');
  return { resultado: r };
}

export async function empezarEscenarioAction(id: string, version: 'pie' | 'digital') {
  await exigirAcademia();
  const e = empezarEscenario(id, version === 'digital' ? 'digital' : 'pie');
  return e ?? { error: 'Escenario no encontrado.' };
}

export async function responderEscenarioAction(token: string, opcion: number) {
  const jwt = await exigirAcademia();
  const r = responderEscenario(token, opcion);
  if (!r) return { error: 'El escenario ha caducado. Empieza de nuevo.' };
  if (r.terminado) {
    const x = r.resultado;
    try {
      await registrar(jwt, x.escenario, x.version, x.nota, x.aprobado, x.dims, { regla: x.regla, fallos: x.fallos.map((f) => f.donde) });
    } catch (e) {
      return { ...r, error: motivo(e) };
    }
    revalidatePath('/academia');
    revalidatePath('/admin-dkitchen/entrenamiento');
  }
  return r;
}

/** Bitácora de campo de Alex (0112: solo su usuario, lo comprueba la base). Sin datos personales. */
export async function bitacoraAction(f: FormData) {
  const jwt = await exigirAcademia();
  const campos = ['fecha', 'perfil', 'canal', 'servicio', 'objecion', 'respuesta', 'resultado', 'distinto'];
  const datos = Object.fromEntries(campos.map((k) => [k, String(f.get(k) ?? '').trim().slice(0, 600)]).filter(([, v]) => v));
  if (!datos.objecion && !datos.resultado) return;
  await comoCliente(jwt, (c) => c.query('SELECT dk.academia_bitacora_guardar($1::jsonb)', [JSON.stringify(datos)]));
  revalidatePath('/admin-dkitchen/entrenamiento');
}
