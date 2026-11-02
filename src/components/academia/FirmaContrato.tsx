'use client';

import { useMemo, useState } from 'react';

/**
 * Paso 0 de la Academia (0116): el comercial firma su contrato antes de formarse. Rellena sus datos y el
 * contrato se completa en vivo; la casilla + «Firmar» = firma electrónica. En vista previa (dirección) no envía.
 */
type Clausula = { n: string; titulo: string; texto: string[] };
export type TextoContrato = { titulo: string; version: string; fecha: string; partes: [string, string]; clausulas: Clausula[]; anexo: { campo: string; valor: string }[] };
const ERR: Record<string, string> = {
  acepto: 'Marca la casilla «He leído el contrato y lo acepto» para firmar.', nombre: 'Escribe tu nombre y apellidos completos.',
  nif: 'El NIF no es válido. Revisa los números y la letra.', domicilio: 'Escribe tu domicilio completo (calle, número, código postal y localidad).',
  base: 'No se pudo firmar. Inténtalo de nuevo; si sigue, avisa a dirección.',
};

export default function FirmaContrato({ contrato, nombre, simulacion, error, accion, vistaPrevia = false }: {
  contrato: TextoContrato; nombre: string; simulacion: boolean; error?: string; accion: (f: FormData) => void | Promise<void>; vistaPrevia?: boolean;
}) {
  const [d, setD] = useState({ nombre: nombre.length >= 5 ? nombre : '', nif: '', domicilio: '', zona: '' });
  const [acepto, setAcepto] = useState(false);
  const [leido, setLeido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const vals: Record<string, string> = {
    'nombre del agente': d.nombre || '[tu nombre completo]', NIF: d.nif.toUpperCase() || '[tu NIF]', 'dirección': d.domicilio || '[tu domicilio]',
    zona: d.zona || 'España (sin zona exclusiva)', 'fecha de firma': 'la de la firma electrónica',
  };
  const f = (t: string) => t.replace(/\[\[([^\]]+)\]\]/g, (m, k: string) => vals[k.trim()] ?? m);
  const listo = d.nombre.trim().length >= 5 && /^[0-9XYZA-W][0-9]{7}[0-9A-Z]$/i.test(d.nif.replace(/[\s.-]/g, '')) && d.domicilio.trim().length >= 10;
  const pasos = useMemo(() => [listo, leido, acepto], [listo, leido, acepto]);
  const campo = 'mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-3 text-base outline-none focus:border-vino sm:text-sm';

  return (
    <section id="contrato" className="space-y-5" data-testid="firma-contrato">
      <header className="relative overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-vino/50 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.24em] text-oro">Paso 0 · antes de la formación</p>
        <h2 className="font-display relative mt-2 text-3xl font-bold">Tu contrato de agente</h2>
        <p className="relative mt-2 max-w-2xl text-sm text-white/70">Trabajas como agente independiente de DKitchen. Rellena tus datos, lee el contrato (se completa solo con lo que escribes) y fírmalo con la casilla. Te llega el PDF firmado a tu correo y se abre la Academia.</p>
        <ol className="relative mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]">
          {['Tus datos', 'Lee el contrato', 'Firma'].map((t, i) => (
            <li key={t} className={`rounded-2xl px-2 py-2.5 ring-1 ${pasos[i] ? 'bg-exito/25 text-white ring-exito/60' : 'bg-white/[0.06] text-white/60 ring-white/10'}`}>{pasos[i] ? '✓ ' : `${i + 1} · `}{t}</li>
          ))}
        </ol>
        {simulacion && <p className="relative mt-4 rounded-2xl bg-red-600/90 px-4 py-2.5 text-sm font-semibold">SIMULACIÓN: eres la titular de DKitchen. Firmas para probar el recorrido del comercial; el contrato queda marcado sin valor legal.</p>}
        {vistaPrevia && <p className="relative mt-4 rounded-2xl bg-oro px-4 py-2.5 text-sm font-semibold text-noche">Vista previa de dirección: así lo ve un comercial nuevo. Desde aquí no se firma.</p>}
      </header>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">{ERR[error] ?? ERR.base}</p>}

      <form action={accion} onSubmit={() => setEnviando(true)} className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-[22px] border border-linea bg-white p-5 lg:sticky lg:top-4 lg:self-start">
          <p className="text-sm font-semibold">1 · Tus datos</p>
          <label className="block text-sm">Nombre y apellidos<input name="nombre" required minLength={5} maxLength={120} autoComplete="name" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} className={campo} /></label>
          <label className="block text-sm">NIF / NIE<input name="nif" required maxLength={12} autoComplete="off" value={d.nif} onChange={(e) => setD({ ...d, nif: e.target.value })} className={`${campo} uppercase`} placeholder="12345678Z" /></label>
          <label className="block text-sm">Domicilio fiscal<input name="domicilio" required minLength={10} maxLength={240} autoComplete="street-address" value={d.domicilio} onChange={(e) => setD({ ...d, domicilio: e.target.value })} className={campo} placeholder="Calle, número, CP y localidad" /></label>
          <label className="block text-sm">Zona en la que trabajarás <span className="text-niebla">(opcional)</span><input name="zona" maxLength={120} value={d.zona} onChange={(e) => setD({ ...d, zona: e.target.value })} className={campo} placeholder="p. ej. Baza y comarca" /></label>
          <div className="rounded-2xl bg-crema p-3 text-xs text-carbon/80">
            <b>Comisión:</b> 20 % de lo cobrado (sin IVA) durante los 12 primeros meses de cada cliente que traigas. Sin permanencia ni exclusividad. Nunca cobras a un cliente: el pago siempre va por Stripe.
          </div>
          <label className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${acepto ? 'border-vino bg-vino/5' : 'border-linea'}`}>
            <input type="checkbox" name="acepto" value="si" checked={acepto} disabled={!listo || !leido} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#6E0C2B]" />
            <span><b>He leído el contrato y lo acepto.</b> Al marcar esta casilla y pulsar «Firmar contrato», lo firmo electrónicamente.{!leido && <span className="mt-1 block text-xs text-niebla">Se activa cuando llegues al final del contrato.</span>}</span>
          </label>
          <button disabled={vistaPrevia || !listo || !acepto || enviando} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-vino px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40">
            {enviando ? 'Firmando…' : 'Firmar contrato'}
          </button>
        </div>

        <article className="min-w-0 rounded-[22px] border border-linea bg-white p-5 text-sm leading-relaxed sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-vino">2 · Lee tu contrato</p>
          <h3 className="font-display mt-1 text-2xl font-bold">{contrato.titulo}</h3>
          <p className="text-xs text-niebla">Versión {contrato.version} · texto del {contrato.fecha}</p>
          <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-2" onScroll={(e) => { const t = e.currentTarget; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 40) setLeido(true); }} data-testid="texto-contrato">
            <div><p className="font-semibold">Reunidos</p>{contrato.partes.map((p) => <p key={p.slice(0, 30)} className="mt-1">{f(p)}</p>)}</div>
            {contrato.clausulas.map((k) => (
              <div key={k.n}><p className="font-semibold">{k.n}. {k.titulo}</p>{k.texto.map((t) => <p key={t.slice(0, 40)} className="mt-1">{f(t)}</p>)}</div>
            ))}
            <div className="rounded-2xl bg-crema p-4"><p className="font-semibold">Anexo A · Datos de este contrato</p>
              <dl className="mt-2 grid gap-1.5">{contrato.anexo.map((a) => <div key={a.campo} className="grid gap-0.5 sm:grid-cols-[200px_minmax(0,1fr)]"><dt className="text-niebla">{a.campo}</dt><dd className="font-medium">{f(a.valor)}</dd></div>)}</dl>
            </div>
            <p className="pb-2 text-center text-xs text-niebla">— Fin del contrato —</p>
          </div>
          {!leido && <button type="button" onClick={() => setLeido(true)} className="mt-3 text-xs font-semibold text-vino underline">Ya lo he leído entero</button>}
        </article>
      </form>
    </section>
  );
}
