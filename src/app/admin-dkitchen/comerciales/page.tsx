import Link from 'next/link';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { listarClientesQr, type ClienteQr } from '@/lib/admin-clientes';
import { listaProspectos, embudoProspeccion, ESTADOS, CANALES, NIVELES, PALANCAS, MATERIALES, type Prospecto, type Embudo } from '@/lib/prospeccion';
import PerfilComercialControl, { type ConfigComercialUI } from '@/components/admin/PerfilComercialControl';
import { decidirPalancaAction, habilitarAction, cambiarRolComercialAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Central → Ventas → Comerciales (0112; ampliación de karc0 31/10 21:00): equipo con su progreso en la
 * Academia, cartera, embudo por comercial y por canal, ventas (comisión cuando el contrato fije el %) y las
 * solicitudes de OK pendientes, que dirección aprueba con un botón también desde el móvil.
 */
type Miembro = {
  id: string;
  email: string;
  nombre: string | null;
  rol: string;
  cumple: boolean;
  bloques: Record<string, { mejor: number; aprobado: boolean }>;
  config_comercial?: ConfigComercialUI | null;
};
type Solicitud = { id: string; tipo: string; local: string; detalle: Record<string, unknown>; estado: string; creado_en: string; comercial: string; comercial_nombre: string | null; comercial_email: string };

const TIPO: Record<string, string> = { descuento: 'Descuento 6–10 %', montaje_gratis: 'Montaje gratis (cupo)', experience_piloto: 'Experience piloto', signature_fraccionado: 'Signature por hitos', signature_financiado: 'Signature financiado' };
const ROL: Record<string, [string, string]> = { direccion: ['Dirección', 'bg-tinta text-white'], comercial: ['Comercial', 'bg-exito/15 text-exito'], en_formacion: ['En formación', 'bg-oro/25 text-tinta'] };
const EMBUDO: (keyof typeof ESTADOS)[] = ['por_visitar', 'visitado', 'demo', 'interesado', 'cliente'];
const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

export default async function Comerciales({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string; m?: string }> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const esDir = await comoCliente(jwt, async (c) => (await c.query<{ d: boolean }>('SELECT dk.es_direccion() AS d')).rows[0]?.d === true).catch(() => false);
  if (!esDir) return <div className="p-10 text-center text-sm text-niebla">La zona de comerciales es de dirección.</div>;
  const [equipo, solicitudes, clientes, prospectos, embudo] = await Promise.all([
    comoCliente(jwt, async (c) => (await c.query<{ j: Miembro[] }>('SELECT dk.admin_academia_equipo() AS j')).rows[0].j).catch(() => [] as Miembro[]),
    comoCliente(jwt, async (c) => (await c.query<{ j: Solicitud[] }>('SELECT dk.palancas_ver() AS j')).rows[0].j).catch(() => [] as Solicitud[]),
    listarClientesQr(jwt).catch(() => [] as ClienteQr[]),
    listaProspectos(jwt, null, null).catch(() => [] as Prospecto[]),
    // 0114: embudo real por canal (contactos registrados en 3 toques), por comercial, objeción y palanca
    embudoProspeccion(jwt, null).catch(() => null as Embudo | null),
  ]);
  // 0116: contratos de agente firmados (casilla en Academia), con su PDF regenerado desde lo firmado.
  type Firmado = { id: string; email: string; nombre: string; version: string; simulacion: boolean; firmado_en: string };
  const contratos = await comoCliente(jwt, async (c) => (await c.query<{ j: Firmado[] }>('SELECT dk.admin_contratos_comerciales() AS j')).rows[0].j).catch(() => [] as Firmado[]);
  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const reales = clientes.filter((c) => !c.demoInterna && !c.archivadoEn && !c.nombre.startsWith('PRUEBA'));
  const hace30 = Date.now() - 30 * 864e5;
  const filas = embudo?.canales ?? [];
  const maxCanal = Math.max(1, ...filas.map((k) => k.locales));
  const pctDe = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const PASOS = [['locales', 'Contactados'], ['hablo', 'Hablaron'], ['demo', 'Demo'], ['propuesta', 'Propuesta'], ['cerrado', 'Cerrados']] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-tinta sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Ventas</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Comerciales</h1>
        </div>
        <Link href="/admin-dkitchen/administradores" className="dk-btn inline-flex min-h-[44px] items-center rounded-full bg-vino px-5 text-sm font-bold text-white">+ Nuevo comercial</Link>
      </div>
      {q.ok && <p role="status" className="rounded-2xl bg-exito/10 px-4 py-3 text-sm text-exito">{q.ok === 'aprobada' ? 'Aprobada: el comercial ya puede aplicarla en el alta.' : q.ok === 'rechazada' ? 'Rechazada.' : 'Habilitado: ya puede vender.'}</p>}
      {q.e && <p role="alert" className="rounded-2xl bg-vino/10 px-4 py-3 text-sm text-vino">{q.m ? decodeURIComponent(q.m) : 'No se pudo hacer.'}</p>}

      {/* Solicitudes de OK (lo primero: se aprueban al momento, también desde el móvil) */}
      <section className="space-y-3" data-testid="solicitudes-ok">
        <h2 className="font-display text-xl font-bold">Piden tu OK {pendientes.length > 0 && <span className="ml-1 rounded-full bg-vino px-2 py-0.5 text-sm text-white">{pendientes.length}</span>}</h2>
        {!pendientes.length && <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-niebla">Nada pendiente.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {pendientes.map((s) => (
            <article key={s.id} className="dk-carta space-y-3 rounded-[22px] border-2 border-oro/60 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-vino">{TIPO[s.tipo] ?? s.tipo}</p><p className="font-display text-lg font-bold">{s.local}</p>
                  <p className="text-xs text-niebla">{s.comercial_nombre ?? s.comercial_email}{s.detalle?.motivo ? ` · «${String(s.detalle.motivo)}»` : ''}</p></div>
                {typeof s.detalle?.pct === 'number' && <b className="font-display text-2xl text-vino">−{String(s.detalle.pct)} %</b>}
              </div>
              <form action={decidirPalancaAction} className="space-y-2">
                <input type="hidden" name="id" value={s.id} />
                {(s.tipo === 'experience_piloto' || s.tipo === 'descuento') && (
                  <div className="flex flex-wrap gap-1.5">{(s.tipo === 'descuento' ? [6, 8, 10] : [20, 30, 40, 50]).map((p) => (
                    <label key={p} className="cursor-pointer"><input type="radio" name="pct" value={p} defaultChecked={p === Number(s.detalle?.pct ?? (s.tipo === 'descuento' ? 10 : 50))} className="peer sr-only" /><span className="inline-flex min-h-[40px] items-center rounded-full border border-linea px-3 text-sm font-bold peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-white">−{p} %</span></label>
                  ))}</div>
                )}
                {s.tipo.startsWith('signature_') && (
                  <label className="block text-sm font-semibold">Plazos (los fijas tú)<select name="cuotas" defaultValue={String(s.detalle?.cuotas ?? 3)} className="mt-1 w-full rounded-2xl border border-linea bg-white px-3 py-2.5">{[2, 3, 4, 6, 9, 12].map((n) => <option key={n} value={n}>{n} pagos</option>)}</select></label>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button name="aprobar" value="1" className="dk-btn min-h-[48px] rounded-full bg-exito text-sm font-bold text-white" data-testid="aprobar">Aprobar</button>
                  <button name="aprobar" value="0" className="min-h-[48px] rounded-full border border-linea bg-white text-sm font-bold">Rechazar</button>
                </div>
              </form>
            </article>
          ))}
        </div>
      </section>

      {/* Equipo */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Equipo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {equipo.map((m) => {
            const mios = reales.filter((c) => c.comercialId === m.id);
            const pros = prospectos.filter((p) => p.comercial_id === m.id);
            const hechos = ['N1', 'N2', 'N3'].filter((n) => (m.bloques[`${n}:test`]?.mejor ?? 0) >= 90).length + ['E1', 'E2', 'E3', 'E4'].reduce((s, e) => s + (m.bloques[`${e}:pie`]?.aprobado ? 1 : 0) + (m.bloques[`${e}:digital`]?.aprobado ? 1 : 0), 0);
            const [rolT, rolC] = ROL[m.rol] ?? [m.rol, 'bg-papel'];
            return (
              <article key={m.id} className="dk-carta space-y-3 rounded-[22px] border border-linea bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate font-display text-lg font-bold">{m.nombre ?? m.email}</p><p className="truncate text-xs text-niebla">{m.email}</p></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${rolC}`}>{rolT}</span>
                </div>
                <div><p className="flex justify-between text-xs"><span className="text-niebla">Academia</span><b>{hechos}/11</b></p><div className="dk-barra-prog mt-1 h-2 overflow-hidden rounded-full bg-linea"><span style={{ width: `${(hechos / 11) * 100}%` }} /></div></div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <span className="rounded-xl bg-papel py-2"><b className="block font-display text-lg">{mios.length}</b><span className="text-[11px] text-niebla">clientes</span></span>
                  <span className="rounded-xl bg-papel py-2"><b className="block font-display text-lg">{eur(mios.reduce((s, c) => s + c.cuota, 0))}</b><span className="text-[11px] text-niebla">cuota/mes</span></span>
                  <span className="rounded-xl bg-papel py-2"><b className="block font-display text-lg">{pros.length}</b><span className="text-[11px] text-niebla">prospectos</span></span>
                </div>
                <p className="text-xs text-niebla">Altas en 30 días: <b className="text-tinta">{mios.filter((c) => new Date(c.creadoEn).getTime() > hace30).length}</b> · Comisión: se calcula al fijar el % en su contrato.</p>
                {m.rol !== 'direccion' && (
                  <>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {(m.config_comercial?.servicios ?? ['qr', 'signature', 'experience', 'auditoria']).map((s) => (
                        <span key={s} className="rounded-full bg-papel px-2.5 py-0.5 font-semibold text-tinta">
                          {s === 'qr' ? 'Carta QR' : s === 'signature' ? 'Signature' : s === 'experience' ? 'Experience' : 'Auditoría'}
                        </span>
                      ))}
                    </div>
                    <PerfilComercialControl
                      identidadId={m.id}
                      nombre={m.nombre ?? m.email}
                      configInicial={m.config_comercial}
                    />
                  </>
                )}
                {m.rol === 'en_formacion' && (
                  <div className="space-y-1.5">
                    <form action={habilitarAction}><input type="hidden" name="id" value={m.id} />
                      <button disabled={!m.cumple} className="dk-btn min-h-[44px] w-full rounded-full bg-exito text-sm font-bold text-white disabled:bg-linea disabled:text-niebla">{m.cumple ? 'Habilitar para vender (Academia 11/11)' : 'Aún no cumple la Academia'}</button></form>
                    <form action={cambiarRolComercialAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="rol" value="comercial" />
                      <button className="min-h-[38px] w-full rounded-full border border-vino/40 bg-white text-xs font-bold text-vino hover:bg-vino/5">Habilitar manualmente (Dirección)</button></form>
                  </div>
                )}
                {m.rol === 'comercial' && (
                  <form action={cambiarRolComercialAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="rol" value="en_formacion" />
                    <button className="min-h-[36px] w-full rounded-full border border-linea bg-white text-xs font-medium text-niebla hover:text-tinta">Pasar a «En formación»</button></form>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Embudo por comercial */}
        <section className="dk-carta rounded-[22px] border border-linea bg-white p-5">
          <h2 className="font-display text-xl font-bold">Embudo por comercial</h2>
          <div className="mt-3 space-y-4">
            {equipo.map((m) => {
              const pros = prospectos.filter((p) => p.comercial_id === m.id);
              const max = Math.max(1, pros.length);
              return (
                <div key={m.id}>
                  <p className="text-sm font-semibold">{m.nombre ?? m.email} <span className="text-xs font-normal text-niebla">· {pros.length} prospectos</span></p>
                  <div className="mt-1 grid grid-cols-5 gap-1">
                    {EMBUDO.map((e, i) => {
                      const n = pros.filter((p) => EMBUDO.indexOf(p.estado as keyof typeof ESTADOS) >= i).length;
                      return <div key={e} title={`${ESTADOS[e]}: ${n}`} className="rounded-lg bg-papel p-1.5 text-center"><div className="mx-auto flex h-10 w-3 items-end overflow-hidden rounded-full bg-linea"><div className="dk-aparece w-full rounded-full bg-vino" style={{ height: `${Math.max(4, (n / max) * 100)}%` }} /></div><b className="mt-1 block text-xs">{n}</b><span className="block truncate text-[9px] text-niebla">{ESTADOS[e]}</span></div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Embudo por canal */}
        <section className="dk-carta rounded-[22px] border border-linea bg-white p-5" data-testid="embudo-canal">
          <h2 className="font-display text-xl font-bold">Embudo por canal</h2>
          <p className="text-xs text-niebla">Locales distintos por canal, de los contactos registrados en Prospección.</p>
          {!filas.length ? (
            <p className="mt-3 rounded-2xl bg-papel px-4 py-5 text-center text-sm text-niebla">Aún no hay contactos registrados. Se llenará con cada registro en 3 toques.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {filas.map((k) => (
                <li key={k.canal}>
                  <p className="flex justify-between text-sm"><span className="font-semibold">{CANALES[k.canal]}</span>
                    <span><b>{k.cerrado}</b> de {k.locales} cerrados <span className="text-niebla">({pctDe(k.cerrado, k.locales)} %)</span></span></p>
                  <div className="mt-1.5 flex h-7 items-stretch gap-0.5 overflow-hidden rounded-full bg-papel" style={{ width: `${Math.max(18, (k.locales / maxCanal) * 100)}%` }}>
                    {PASOS.map(([c, t], i) => (
                      <span key={c} title={`${t}: ${k[c]}`} className="flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ flexGrow: Math.max(k[c], 0.15), background: ['#9A9EA6', '#6366F1', '#8B5CF6', '#EA8A3C', '#2F8F6B'][i] }}>{k[c] || ''}</span>
                    ))}
                  </div>
                </li>
              ))}
              <li className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-niebla">
                {PASOS.map(([c, t], i) => <span key={c} className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: ['#9A9EA6', '#6366F1', '#8B5CF6', '#EA8A3C', '#2F8F6B'][i] }} />{t}</span>)}
              </li>
            </ul>
          )}
          {embudo && (embudo.objeciones.length > 0 || embudo.palancas.length > 0) && (
            <div className="mt-5 grid gap-4 border-t border-linea pt-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold">Objeción por nivel</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {embudo.objeciones.map((o) => (
                    <li key={o.nivel} className="flex justify-between"><span>{NIVELES[o.nivel]}</span><span><b>{o.n}</b> · {o.cerrado} cerradas · {o.perdido} perdidas</span></li>
                  ))}
                </ul>
                {embudo.frenan.length > 0 && <p className="mt-2 text-xs text-niebla">Lo que más frena: {embudo.frenan.map((x) => `«${x.objecion}» (${x.n})`).join(', ')}</p>}
              </div>
              <div>
                <h3 className="text-sm font-bold">Qué palanca cierra</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {embudo.palancas.map((p) => (
                    <li key={p.palanca} className="flex justify-between"><span>{PALANCAS[p.palanca]}</span><span><b>{p.cerrado}</b> de {p.n} ({pctDe(p.cerrado, p.n)} %)</span></li>
                  ))}
                </ul>
                {embudo.material.length > 0 && <p className="mt-2 text-xs text-niebla">Material: {embudo.material.map((m) => `${MATERIALES[m.material]} ${m.cerrado}/${m.n}`).join(' · ')}</p>}
              </div>
              {embudo.comerciales.length > 0 && (
                <div className="sm:col-span-2">
                  <h3 className="text-sm font-bold">Por comercial</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {embudo.comerciales.map((c) => (
                      <li key={c.comercial} className="flex justify-between gap-2"><span className="truncate">{c.comercial}</span><span className="shrink-0">{c.locales} locales · {c.demo} demos · <b>{c.cerrado}</b> cerrados</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <Link href="/admin-dkitchen/prospeccion" className="mt-4 inline-block text-sm font-semibold text-vino">Ir a Prospección →</Link>
        </section>
      </div>

      <section className="dk-carta rounded-[22px] border border-linea bg-white p-5" data-testid="contratos-agente">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Contratos de agente firmados</p>
            <p className="text-xs text-niebla">Comisión: 20 % de lo cobrado durante 12 meses por cliente. Se firman con una casilla al entrar en Academia, antes de la formación.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <a href="/academia?vista=contrato" className="rounded-full border border-linea px-3 py-2 hover:border-vino">Ver la pantalla de firma</a>
            <a href="/admin-dkitchen/comerciales/contrato/muestra" className="rounded-full border border-linea px-3 py-2 hover:border-vino">PDF de muestra</a>
          </div>
        </div>
        {contratos.length === 0 ? <p className="mt-3 text-sm text-niebla">Aún no ha firmado ningún comercial.</p> : (
          <ul className="mt-3 divide-y divide-linea">
            {contratos.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0"><b>{k.nombre}</b> <span className="text-niebla">· {k.email} · {k.version} · {new Date(k.firmado_en).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' })}</span>{k.simulacion && <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Simulación</span>}</span>
                <a href={`/admin-dkitchen/comerciales/contrato/${k.id}`} className="rounded-full bg-vino px-3 py-1.5 text-xs font-semibold text-white">PDF firmado</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
