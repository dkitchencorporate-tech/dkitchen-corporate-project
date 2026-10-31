import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { nivelDe, REGLA_ABANDONO } from '@/lib/academia/motor';
import EntrenamientoAlex from '@/components/academia/EntrenamientoAlex';
import { bitacoraAction } from '@/app/academia/actions';

export const dynamic = 'force-dynamic';

/**
 * Mi entrenamiento (0112, decisión §0.2 de karc0): solo su usuario (dk.es_alex en la base). No restringe nada;
 * puntúa sin concesiones: prospector, cerrador, físico y digital, con nivel, informe y bitácora de campo.
 */
type Intento = { bloque: string; version: string; nota: number; aprobado: boolean; notas: Record<string, number>; detalle: { fallos?: string[] }; creado_en: string };
const DIM: [string, string][] = [['prospector', 'Prospector'], ['cerrador', 'Cerrador'], ['fisico', 'Comercial físico'], ['digital', 'Comercial digital']];
const campo = 'mt-1 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-base outline-none focus:border-vino';

function Anillo({ n, t }: { n: number | null; t: string }) {
  const C = 2 * Math.PI * 40;
  return (
    <div className="dk-carta flex flex-col items-center rounded-[22px] bg-white p-4 text-center">
      <div className="relative grid h-24 w-24 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90"><circle cx="50" cy="50" r="40" fill="none" stroke="#EDEDEA" strokeWidth="9" />
          {n !== null && <circle cx="50" cy="50" r="40" fill="none" stroke={n >= 75 ? '#2F8F6B' : n >= 50 ? '#D9B25C' : '#6E0C2B'} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(n / 100) * C} ${C}`} className="dk-anillo" style={{ ['--l' as string]: `${C}` }} />}</svg>
        <b className="font-display text-2xl">{n === null ? '—' : `${n} %`}</b>
      </div>
      <p className="mt-2 text-sm font-bold">{t}</p>
      <p className="text-xs text-niebla">{n === null ? 'Sin datos' : nivelDe(n)}</p>
    </div>
  );
}

export default async function Entrenamiento() {
  const jwt = await exigirAdmin();
  const alex = await comoCliente(jwt, async (c) => (await c.query<{ a: boolean }>('SELECT dk.es_alex() AS a')).rows[0]?.a === true).catch(() => false);
  if (!alex) return <div className="p-10 text-center text-sm text-niebla">Este entrenamiento es solo del usuario de Alex.</div>;
  const [intentos, bitacora] = await Promise.all([
    comoCliente(jwt, async (c) => (await c.query<{ j: Intento[] }>('SELECT dk.academia_mis_intentos(60) AS j')).rows[0].j).catch(() => [] as Intento[]),
    comoCliente(jwt, async (c) => (await c.query<{ j: { id: string; datos: Record<string, string>; creado_en: string }[] }>('SELECT dk.academia_bitacora() AS j')).rows[0].j).catch(() => []),
  ]);
  // Cada nota: media de los últimos 5 intentos que la miden (test N4 + escenarios), sin redondeos a favor.
  const nota = (d: string) => {
    const v = intentos.filter((i) => typeof i.notas?.[d] === 'number').slice(0, 5).map((i) => i.notas[d]);
    return v.length ? Math.floor(v.reduce((s, x) => s + x, 0) / v.length) : null;
  };
  const notas = DIM.map(([d, t]) => ({ d, t, n: nota(d) }));
  const validas = notas.filter((x) => x.n !== null).map((x) => x.n as number);
  const global = validas.length ? Math.floor(validas.reduce((s, x) => s + x, 0) / validas.length) : null;
  const ultimo = intentos.find((i) => i.version === 'alex');
  const flojas = notas.filter((x) => x.n !== null).sort((a, b) => (a.n as number) - (b.n as number)).slice(0, 2);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-tinta sm:p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Solo Alex</p>
        <h1 className="font-display text-4xl font-bold">Mi entrenamiento</h1>
        <p className="mt-1 text-sm text-niebla">Nivel máximo y sin concesiones. Si sale un 30 %, sale un 30 %.</p>
      </header>

      <section className="dk-carta rounded-[26px] bg-noche p-6 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-oro">Nivel global</p>
        <p className="font-display text-5xl font-bold">{global === null ? 'Sin datos' : `${global} %`}</p>
        <p className="text-lg text-white/80">{global === null ? 'Haz el test completo para tener tu primera nota.' : nivelDe(global)}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{notas.map((x) => <Anillo key={x.d} n={x.n} t={x.t} />)}</section>

      <section className="space-y-3 rounded-[26px] border border-linea bg-white p-5">
        <h2 className="font-display text-xl font-bold">Informe</h2>
        {flojas.length ? (
          <ul className="space-y-2 text-sm">
            {flojas.map((x) => <li key={x.d}><b>{x.t}: {x.n} %.</b> {x.d === 'prospector' ? 'Prepara cada local 3 minutos antes de entrar y elige perfil y frase de entrada.' : x.d === 'cerrador' ? 'Pasa a cierre con una sola propuesta y una fecha; usa palancas públicas antes que descuentos.' : x.d === 'fisico' ? 'Nunca salgas de un local sin hora concreta del siguiente contacto.' : 'Primer mensaje de 3 líneas sin enlaces; seguimiento a 48 h; máximo 3 toques en 10 días.'}</li>)}
            {ultimo?.detalle?.fallos?.slice(0, 3).map((f) => <li key={f} className="text-niebla">Punto decisivo fallado: «{f}»</li>)}
          </ul>
        ) : <p className="text-sm text-niebla">Aún no hay intentos.</p>}
        <p className="rounded-2xl bg-papel px-4 py-3 text-sm"><b>Regla de abandono.</b> {REGLA_ABANDONO}</p>
      </section>

      <EntrenamientoAlex />

      <section className="space-y-3 rounded-[26px] border border-linea bg-white p-5">
        <h2 className="font-display text-xl font-bold">Bitácora de campo</h2>
        <p className="text-sm text-niebla">Lo que vives en la calle. Sin datos personales: Claude convierte cada caso en un escenario nuevo.</p>
        <form action={bitacoraAction} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Fecha<input type="date" name="fecha" className={campo} /></label>
          <label className="text-sm font-semibold">Perfil<input name="perfil" placeholder="Bar de barrio, chiringuito…" className={campo} /></label>
          <label className="text-sm font-semibold">Canal<input name="canal" placeholder="A pie, Instagram, WhatsApp…" className={campo} /></label>
          <label className="text-sm font-semibold">Servicio<input name="servicio" placeholder="Carta QR, Signature…" className={campo} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Objeción literal<input name="objecion" className={campo} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Lo que respondiste<input name="respuesta" className={campo} /></label>
          <label className="text-sm font-semibold">Resultado<input name="resultado" placeholder="Cerrado, perdido, reintento…" className={campo} /></label>
          <label className="text-sm font-semibold">Qué harías distinto<input name="distinto" className={campo} /></label>
          <button className="dk-btn min-h-[48px] rounded-full bg-tinta px-6 text-sm font-bold text-white sm:col-span-2 sm:justify-self-end">Guardar en la bitácora</button>
        </form>
        <ul className="divide-y divide-linea text-sm">
          {bitacora.map((b) => <li key={b.id} className="py-2"><b>{b.datos.perfil ?? '—'}</b> · {b.datos.canal ?? ''} · {b.datos.resultado ?? ''}<span className="block text-niebla">«{b.datos.objecion ?? ''}»</span></li>)}
        </ul>
      </section>
    </div>
  );
}
