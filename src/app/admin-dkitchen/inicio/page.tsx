import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { listarClientesQr, pestanaDe, type ClienteQr } from '@/lib/admin-clientes';
import { comoCliente } from '@/lib/db';
import { listarProyectos, type ProyectoFila } from '@/lib/proyectos';
import { listaProspectos } from '@/lib/prospeccion';
import { recordatoriosPendientes } from '@/lib/comunicaciones';
import { dineroReal, objetivoMensual, guardarObjetivoMensual } from '@/lib/hoy-central';
import { esComercialActual } from '@/lib/rol-central';
import NuevoCliente from '@/components/admin/NuevoCliente';

export const dynamic = 'force-dynamic';

/**
 * Central → Hoy (decisión 5 de karc0, 01/11): PANEL VISUAL, nada de listas.
 * (a) Ingresos en vivo: anillo del objetivo + gráfica de 30 días (cobrado frente a pendiente de enlaces).
 * (b) Embudo animado Prospecto → Enlace → Pagado → Activo. (c) Mapa de salud: un punto por cliente.
 * (d) Servicios en marcha: 3 medidores por fase + próxima fecha clave. Todo pulsable y < 0,6 s.
 */
const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

async function objetivoAction(f: FormData) {
  'use server';
  await exigirAdmin();
  const n = Math.round(Number(String(f.get('euros') ?? '').replace(',', '.')));
  if (Number.isFinite(n) && n >= 100 && n <= 1_000_000) await guardarObjetivoMensual(n);
  revalidatePath('/admin-dkitchen/inicio');
}

type Salud = 'bien' | 'atencion' | 'riesgo' | 'espera';
function salud(c: ClienteQr, hoy: string): Salud {
  const p = pestanaDe(c, hoy);
  if (p === 'riesgo' || c.pagoFallidoDesde) return 'riesgo';
  if (!c.activo && c.estadoAcceso !== 'activo') return 'espera';
  if (p === 'prueba' || c.platos === 0 || c.escaneos14d === 0) return 'atencion';
  return 'bien';
}
const COLOR: Record<Salud, string> = { bien: '#2F8F6B', atencion: '#D9B25C', riesgo: '#B3261E', espera: '#9A9EA6' };
const NOMBRE_SALUD: Record<Salud, string> = { bien: 'Van bien', atencion: 'Necesitan un empujón', riesgo: 'En riesgo', espera: 'Esperando pago' };

function Anillo({ seguro, pendiente, objetivo }: { seguro: number; pendiente: number; objetivo: number }) {
  const R = 54, C = 2 * Math.PI * R;
  const pS = Math.min(1, seguro / objetivo), pP = Math.min(1 - pS, pendiente / objetivo);
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label={`${Math.round(pS * 100)} % del objetivo`}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="14" />
      <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(217,178,92,.35)" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${(pS + pP) * C} ${C}`} className="dk-anillo" style={{ ['--l' as string]: `${C}` }} />
      <circle cx="70" cy="70" r={R} fill="none" stroke="#D9B25C" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${pS * C} ${C}`} className="dk-anillo" style={{ ['--l' as string]: `${C}` }} />
    </svg>
  );
}

function Grafica({ dias }: { dias: { dia: string; euros: number }[] }) {
  const W = 300, H = 90, max = Math.max(1, ...dias.map((d) => d.euros));
  const pts = dias.map((d, i) => [(i / (dias.length - 1)) * W, H - (d.euros / max) * (H - 8) - 4] as const);
  const linea = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label="Cobrado en los últimos 30 días">
      <defs><linearGradient id="dkArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#D9B25C" stopOpacity=".35" /><stop offset="1" stopColor="#D9B25C" stopOpacity="0" /></linearGradient></defs>
      <path d={`${linea} L${W},${H} L0,${H} Z`} fill="url(#dkArea)" className="dk-aparece" />
      <path d={linea} fill="none" stroke="#D9B25C" strokeWidth="2.2" vectorEffect="non-scaling-stroke" pathLength={1} className="dk-traza" />
    </svg>
  );
}

export default async function CentralHoy() {
  const jwt = await exigirAdmin();
  const [clientes, proyectos, prospectos, recordatorios, dinero, objetivo, eventos, esComercial] = await Promise.all([
    listarClientesQr(jwt).catch(() => [] as ClienteQr[]),
    listarProyectos(jwt, {}).catch(() => [] as ProyectoFila[]),
    listaProspectos(jwt, null, null).catch(() => [] as { estado: string }[]),
    recordatoriosPendientes(jwt).catch(() => []),
    dineroReal(),
    objetivoMensual(),
    comoCliente(jwt, async (c) => (await c.query<{ id: string; titulo: string; fecha: string; vendidas: number; aforo: number; estado: string }>('SELECT id, titulo, fecha, vendidas, aforo, estado FROM dk.admin_eventos() WHERE NOT muestra')).rows.map((e) => ({ ...e, fecha: new Date(e.fecha as unknown as string).toISOString() }))).catch(() => []),
    esComercialActual(jwt),
  ]);
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const reales = clientes.filter((c) => !c.demoInterna && !c.archivadoEn && !c.nombre.startsWith('PRUEBA'));
  const mrr = reales.reduce((s, c) => s + c.cuota, 0);
  const saludes = reales.filter((c) => pestanaDe(c, hoy) !== 'bajas').map((c) => ({ c, s: salud(c, hoy) }));

  // (b) Embudo
  const pros = (prospectos as { estado: string }[]).filter((p) => p.estado !== 'descartado' && p.estado !== 'cliente').length;
  const enlace = saludes.filter((x) => x.s === 'espera').length;
  const hace30 = Date.now() - 30 * 864e5;
  const pagados = reales.filter((c) => c.activo && new Date(c.creadoEn).getTime() > hace30).length;
  const activos = reales.filter((c) => c.activo && c.estadoAcceso === 'activo').length;
  const embudo: [string, number, string][] = [
    ['Prospectos', pros, '/admin-dkitchen/prospeccion'], ['Enlace enviado', enlace, '/admin-dkitchen/servicios/qr'],
    ['Pagado (30 d)', pagados, '/admin-dkitchen/qr'], ['Activos', activos, '/admin-dkitchen/qr'],
  ];
  const maxE = Math.max(1, ...embudo.map((e) => e[1]));

  // (d) Servicios en marcha
  const vivos = proyectos.filter((p) => !['descartado', 'cerrado', 'cerrada', 'mantenimiento'].includes(p.fase));
  const proxEvento = eventos.filter((e) => new Date(e.fecha).getTime() > Date.now()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const medidores = [
    { t: 'Carta QR', a: saludes.filter((x) => x.c.activo && x.c.platos === 0).length, b: saludes.filter((x) => x.s === 'bien').length, an: 'por montar', bn: 'en marcha', href: '/admin-dkitchen/servicios/qr', clave: null as string | null },
    { t: 'Signature', a: vivos.filter((p) => p.producto === 'signature' && ['solicitud', 'pagado', 'contrato_enviado', 'contrato_firmado', 'datos_recibidos'].includes(p.fase)).length, b: vivos.filter((p) => p.producto === 'signature' && ['en_construccion', 'primera_version', 'publicado'].includes(p.fase)).length, an: 'por arrancar', bn: 'en producción', href: '/admin-dkitchen/servicios/signature', clave: vivos.filter((p) => p.producto === 'signature' && p.siguiente_fecha).sort((a, b) => a.siguiente_fecha!.localeCompare(b.siguiente_fecha!))[0]?.siguiente_fecha ?? null },
    { t: 'Experience', a: vivos.filter((p) => p.producto === 'experience' && ['solicitud', 'llamada', 'contrato_pago', 'concepto'].includes(p.fase)).length, b: eventos.filter((e) => e.estado === 'venta').length, an: 'preparando', bn: 'en venta', href: '/admin-dkitchen/servicios/experience', clave: proxEvento?.fecha?.slice(0, 10) ?? null },
  ];
  const hora = Number(new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }));
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const fechaHoy = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' });
  const delMes = mrr + dinero.mesCobrado;
  const dia = (s: string) => new Date(s + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 text-tinta sm:p-6 lg:p-10" data-testid="hoy">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm capitalize text-niebla">{saludo} · {fechaHoy}</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Hoy</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {recordatorios.length > 0 && <Link href="/admin-dkitchen/tareas" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-oro bg-white px-4 text-sm font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-oro" />{recordatorios.length} recordatorio{recordatorios.length > 1 ? 's' : ''}</Link>}
          <NuevoCliente esComercial={esComercial} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* (a) Ingresos en vivo */}
        <section className="dk-carta overflow-hidden rounded-[26px] bg-noche p-5 text-white lg:col-span-3" data-testid="hoy-ingresos">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/admin-dkitchen/qr" className="relative grid place-items-center" aria-label="Ver clientes que pagan">
              <Anillo seguro={delMes} pendiente={dinero.pendiente} objetivo={objetivo} />
              <span className="absolute text-center"><b className="cv-cifra block font-display text-2xl">{Math.round((delMes / objetivo) * 100)} %</b><span className="text-[10px] uppercase tracking-[0.18em] text-white/60">del objetivo</span></span>
            </Link>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-oro">Ingresos de {new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', month: 'long' })}</p>
              <p className="font-display text-4xl font-bold"><span className="cv-cifra">{eur(delMes)}</span> <span className="text-base font-normal text-white/50">/ {eur(objetivo)}</span></p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-oro" />Cuotas {eur(mrr)}/mes · cobrado {eur(dinero.mesCobrado)}</span>
                <span className="text-white/70"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-oro/35" />Pendiente {eur(dinero.pendiente)} en {dinero.nPendientes} enlace{dinero.nPendientes === 1 ? '' : 's'}</span>
              </div>
              <details className="text-xs text-white/50"><summary className="cursor-pointer">Cambiar objetivo</summary>
                <form action={objetivoAction} className="mt-2 flex gap-2"><input name="euros" inputMode="numeric" defaultValue={objetivo} className="w-28 rounded-full bg-white/10 px-3 py-2 text-white" /><button className="rounded-full bg-oro px-4 py-2 font-bold text-noche">Guardar</button></form>
              </details>
            </div>
          </div>
          <div className="mt-4">
            <Grafica dias={dinero.dias} />
            <p className="mt-1 flex justify-between text-[11px] text-white/45"><span>hace 30 días</span><span>{dinero.ok ? 'cobrado por Stripe, día a día' : 'Stripe no respondió: reintenta en un momento'}</span><span>hoy</span></p>
          </div>
        </section>

        {/* (b) Embudo */}
        <section className="dk-carta rounded-[26px] bg-white p-5 shadow-[0_20px_60px_-40px_rgba(62,5,21,.5)] lg:col-span-2" style={{ ['--i' as string]: 1 }} data-testid="hoy-embudo">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-vino">Embudo</p>
          <ol className="mt-3 space-y-2.5">
            {embudo.map(([t, n, href], i) => {
              const conv = i > 0 && embudo[i - 1][1] ? Math.round((n / embudo[i - 1][1]) * 100) : null;
              return (
                <li key={t}>
                  <Link href={href} className="group block">
                    <span className="flex items-baseline justify-between text-sm"><span className="font-semibold group-hover:text-vino">{t}</span><span><b className="cv-cifra font-display text-lg">{n}</b>{conv !== null && <span className="ml-2 text-xs text-niebla">{conv} %</span>}</span></span>
                    <span className="dk-barra-prog mt-1 block h-3 overflow-hidden rounded-full bg-papel" style={{ marginLeft: `${i * 6}%`, marginRight: `${i * 6}%` }}><span style={{ width: `${Math.max(4, (n / maxE) * 100)}%`, animationDelay: `${i * 90}ms` }} /></span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* (c) Mapa de salud */}
        <section className="dk-carta rounded-[26px] bg-white p-5 shadow-[0_20px_60px_-40px_rgba(62,5,21,.5)] lg:col-span-2" style={{ ['--i' as string]: 2 }} data-testid="hoy-salud">
          <div className="flex items-baseline justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-vino">Salud de clientes</p><span className="text-xs text-niebla">{saludes.length} clientes</span></div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {saludes.map(({ c, s }, i) => (
              <Link key={c.restauranteId} href={`/admin-dkitchen/qr/${c.restauranteId}`} title={`${c.nombre} · ${NOMBRE_SALUD[s]}`}
                className="dk-punto block h-5 w-5 rounded-full ring-offset-2 transition hover:scale-125 hover:ring-2" style={{ background: COLOR[s], ['--i' as string]: i % 40, ['--tw-ring-color' as string]: COLOR[s] }} />
            ))}
            {!saludes.length && <p className="text-sm text-niebla">Aún no hay clientes. Empieza con «+ Nuevo cliente».</p>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {(Object.keys(COLOR) as Salud[]).map((s) => (
              <Link key={s} href={s === 'riesgo' ? '/admin-dkitchen/qr?pestana=riesgo' : s === 'espera' ? '/admin-dkitchen/servicios/qr' : '/admin-dkitchen/qr'} className="flex items-center gap-2 rounded-xl bg-papel px-3 py-2 hover:bg-linea">
                <span className="h-3 w-3 rounded-full" style={{ background: COLOR[s] }} /><span className="flex-1">{NOMBRE_SALUD[s]}</span><b className="cv-cifra">{saludes.filter((x) => x.s === s).length}</b>
              </Link>
            ))}
          </div>
        </section>

        {/* (d) Servicios en marcha */}
        <section className="grid gap-3 sm:grid-cols-3 lg:col-span-3" data-testid="hoy-servicios">
          {medidores.map((m, i) => {
            const total = Math.max(1, m.a + m.b);
            return (
              <Link key={m.t} href={m.href} style={{ ['--i' as string]: 3 + i }} className="dk-carta group flex flex-col rounded-[26px] bg-white p-5 shadow-[0_20px_60px_-40px_rgba(62,5,21,.5)] transition hover:shadow-[0_24px_60px_-30px_rgba(62,5,21,.55)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-vino">{m.t}</p>
                <div className="relative mx-auto mt-3 h-20 w-36">
                  <svg viewBox="0 0 120 64" className="h-full w-full" aria-hidden>
                    <path d="M8,60 A52,52 0 0 1 112,60" fill="none" stroke="#EDEDEA" strokeWidth="12" strokeLinecap="round" />
                    <path d="M8,60 A52,52 0 0 1 112,60" fill="none" stroke="#6E0C2B" strokeWidth="12" strokeLinecap="round" pathLength={1} strokeDasharray={`${m.b / total} 1`} className="dk-medidor" />
                  </svg>
                  <b className="cv-cifra absolute inset-x-0 bottom-0 text-center font-display text-2xl">{m.b}</b>
                </div>
                <p className="mt-2 text-center text-sm"><b>{m.b}</b> {m.bn} · <b>{m.a}</b> {m.an}</p>
                <p className="mt-auto pt-2 text-center text-xs text-niebla">{m.clave ? `Próxima fecha: ${dia(m.clave)}` : 'Sin fechas próximas'}</p>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
