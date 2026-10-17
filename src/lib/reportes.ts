import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Central → Reportes (17/10, encargo de karc0): auditorías, mapeos y cierres de sesión fechados.
 * Viven en el repo (docs/reportes/AAAA-MM-DD_tema.md) para que git, el escritorio y Central digan
 * lo mismo; Central solo los lee. next.config.js los incluye en el despliegue (outputFileTracingIncludes).
 * Formato: 1.ª línea «# Título»; una línea «> …» justo debajo hace de resumen en la lista.
 */
export interface Reporte { slug: string; fecha: string; titulo: string; resumen: string | null; texto: string }

const CARPETA = path.join(process.cwd(), 'docs', 'reportes');
const NOMBRE = /^(\d{4}-\d{2}-\d{2})_([a-z0-9-_]+)\.md$/;

async function leer(archivo: string): Promise<Reporte | null> {
  const m = NOMBRE.exec(archivo);
  if (!m) return null;
  const texto = await fs.readFile(path.join(CARPETA, archivo), 'utf8');
  const lineas = texto.split(/\r?\n/);
  const titulo = (lineas.find((l) => l.startsWith('# ')) ?? `# ${m[2]}`).slice(2).trim();
  const resumen = lineas.find((l) => l.startsWith('> '))?.slice(2).trim() ?? null;
  return { slug: archivo.slice(0, -3), fecha: m[1], titulo, resumen, texto };
}

/** Todos los reportes, el más reciente primero. */
export async function verReportes(): Promise<Reporte[]> {
  const archivos = await fs.readdir(CARPETA).catch(() => [] as string[]);
  const lista = (await Promise.all(archivos.map(leer))).filter((r): r is Reporte => !!r);
  return lista.sort((a, b) => b.slug.localeCompare(a.slug));
}

export async function verReporte(slug: string): Promise<Reporte | null> {
  if (!NOMBRE.test(`${slug}.md`)) return null;
  return leer(`${slug}.md`).catch(() => null);
}
