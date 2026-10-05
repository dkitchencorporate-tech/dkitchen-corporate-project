/**
 * «Lo que tendrías con Signature» (30/09/2026): siguiente paso natural para un
 * cliente QR. Solo se citan funciones que existen en el motor Signature
 * (ver SIGNATURE_VS_QR_2026-09-30.md).
 */
const PUNTOS = [
  ['Tu propia app', 'Instalable en el móvil de tus clientes, con tu marca y tu propio dominio.'],
  ['Pedidos sin comisiones', 'A domicilio y para recoger, con seguimiento en tiempo real.'],
  ['Tus clientes, tuyos', 'Base de clientes propia, club de puntos y campañas por correo.'],
  ['Tu local conectado', 'Kiosko de autoservicio, TPV propio y comandas impresas en cocina.'],
];

export default function SaltoSignature() {
  return (
    <section className="relative overflow-hidden rounded-[26px] bg-[#0A080C] p-6 text-white sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.45),transparent)]" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-[#D9B25C]">El siguiente nivel · DKitchen Signature</p>
      <h3 className="relative font-display mt-2 text-2xl font-semibold leading-tight sm:text-3xl">Tu carta es el comienzo. Signature es tu propio negocio digital.</h3>
      <p className="relative mt-2 max-w-xl text-sm text-white/65">Aunque tengas la carta con todo incluido, con Signature das otro salto: tu app, tus pedidos, tus clientes y tus datos, sin comisiones.</p>
      <ul className="relative mt-6 grid gap-3 sm:grid-cols-2">
        {PUNTOS.map(([t, d]) => (
          <li key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-white/60">{d}</p>
          </li>
        ))}
      </ul>
      <div className="relative mt-6 flex flex-wrap gap-3">
        <a href="/signature" target="_blank" rel="noopener" className="rounded-full bg-[#6E0C2B] px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-[#D9B25C]/40">Ver Signature y sus apps reales</a>
        <a href="/panel?pestana=soporte&asunto=Quiero%20saber%20m%C3%A1s%20de%20Signature" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white">Pedir una propuesta</a>
      </div>
    </section>
  );
}
