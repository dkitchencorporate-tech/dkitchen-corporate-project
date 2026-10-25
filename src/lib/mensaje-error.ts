/**
 * Mensaje de error para el cliente, siempre en español (01/10/2026).
 * En producción, Next.js sustituye el mensaje de cualquier error lanzado desde
 * el servidor por un texto técnico en inglés («An error occurred in the Server
 * Components render…»). Nunca se enseña eso: se usa el mensaje por defecto.
 */
const TECNICO = /Server Components|Minified React|digest|NEXT_|fetch failed|Failed to fetch|NetworkError|Unexpected token|is not a function|undefined|null/i;

export function mensajeError(e: unknown, porDefecto = 'No se pudo completar. Revisa los datos e inténtalo de nuevo.'): string {
  const m = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  if (!m || TECNICO.test(m)) return porDefecto;
  return m;
}
