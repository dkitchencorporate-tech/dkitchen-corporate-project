'use client';

import { useState, useTransition } from 'react';
import type { EstadoServicios, Servicio } from '@/lib/servicios';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { comprarServicioAction } from '@/app/panel/actions';

const euros = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);

const MODULOS: { id: Servicio; icono: string; titulo: string; resuelve: string; incluye: string[] }[] = [
  { id: 'plano_mesas', icono: '🗺️', titulo: 'Plano de mesas', resuelve: 'Ves tu local de un vistazo: qué mesa llama, cuál pide la cuenta.',
    incluye: ['Editor visual de tu sala y terraza', 'Estado de cada mesa en tiempo real', 'Asignación de mesas a camareros'] },
  { id: 'app_sala', icono: '📱', titulo: 'App de sala', resuelve: 'Adiós a las comandas en papel: cada camarero lleva sus mesas en el móvil.',
    incluye: ['Acceso personal por camarero (sin contraseñas)', 'Avisos de llamada con sonido y vibración', 'Registra lo que pide cada mesa en segundos'] },
  { id: 'conexion_tpv', icono: '🔌', titulo: 'Conexión con tu TPV', resuelve: 'Lo que registra el camarero llega solo a tu TPV. Sin teclear dos veces.',
    incluye: ['Compatible con la gran mayoría de TPV en España', 'Tu TPV sigue facturando (Verifactu, gestoría)', 'Configuración hecha por DKitchen'] },
];

export default function Mejoras({ restaurante, servicios }: { restaurante: MiRestaurante; servicios: EstadoServicios }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ampliado = restaurante.plan === 'ampliado';
  const precio = (s: Servicio) => servicios.catalogo.find((c) => c.servicio === s);
  const tiene = (s: Servicio) => servicios.contratados.some((c) => c.servicio === s || (c.servicio === 'pack_sala' && ['plano_mesas', 'app_sala', 'conexion_tpv'].includes(s)));
  const nModulos = MODULOS.filter((m) => tiene(m.id)).length;

  function comprar(s: Servicio) {
    setError(null);
    iniciar(async () => {
      try { const { url } = await comprarServicioAction(s); window.location.href = url; }
      catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago.'); }
    });
  }

  const Boton = ({ s, texto }: { s: Servicio; texto?: string }) =>
    tiene(s) ? (
      <span className="block rounded-xl bg-green-500/15 py-3 text-center text-sm font-bold text-green-300">✓ Activo en tu cuenta</span>
    ) : (
      <button disabled={pendiente} onClick={() => comprar(s)} className="w-full rounded-xl bg-[#D9531E] py-3 text-sm font-bold hover:bg-[#B8451A] disabled:opacity-50">
        {pendiente ? 'Abriendo pago seguro…' : texto ?? 'Activar'}
      </button>
    );

  const experto = precio('setup_experto');
  const esencial = precio('setup_esencial');
  const pack = precio('pack_sala');
  const credito = servicios.credito;
  const diasCredito = credito ? Math.max(0, Math.ceil((new Date(credito.venceEn).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-12">
      <header>
        <h2 className="text-2xl font-bold">Mejoras para tu local</h2>
        <p className="mt-1 text-sm text-white/50">Todo lo que puedes añadir a tu carta QR, y cuándo te conviene dar el salto a un sistema propio.</p>
        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </header>

      {/* 1. DISEÑO */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#D9531E]">1 · El diseño de tu carta</p>
          <h3 className="mt-1 text-xl font-bold">Tu carta es tu escaparate. Que se vea a la altura de tu cocina.</h3>
          <p className="mt-1 text-sm text-white/50">Tú gestionas platos, precios y fotos. El diseño lo prepara un experto de DKitchen, una vez, bien hecho.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <NivelCard titulo="Esencial" subtitulo="Incluida en tu plan" actual={restaurante.nivelDiseno === 'esencial'}
            puntos={['Carta clara por categorías', 'Tu logo y un color de la paleta', 'Fotos pequeñas por plato']}
            maqueta={<MaquetaEsencial />} />
          <NivelCard titulo="Carta de Autor" subtitulo="Setup Experto" destacada actual={restaurante.nivelDiseno === 'autor'}
            puntos={['Portada con tu mejor foto', 'Categorías en tarjetas con imagen', 'Tipografía editorial y tu color exacto', 'Te cargamos toda la carta y optimizamos tus fotos']}
            maqueta={<MaquetaAutor />}
            pie={
              <div className="space-y-2">
                {experto && (
                  <p className="text-center">
                    {experto.precioAnclaCentimos && servicios.plazasExperto > 0 && <span className="mr-2 text-sm text-white/40 line-through">{euros(experto.precioAnclaCentimos)}</span>}
                    <span className="text-2xl font-black">{euros(experto.precioCentimos)}</span> <span className="text-xs text-white/50">pago único</span>
                  </p>
                )}
                {servicios.plazasExperto > 0 && <p className="text-center text-xs font-semibold text-[#D9531E]">Precio de lanzamiento · quedan {servicios.plazasExperto} de 20 plazas</p>}
                <a href="/panel/vista-previa" target="_blank" rel="noopener" className="block rounded-xl border border-white/20 py-2.5 text-center text-sm font-semibold hover:border-white/50">👀 Ver MI carta así</a>
                <Boton s="setup_experto" texto="Quiero mi Carta de Autor" />
              </div>
            } />
          <NivelCard titulo="Signature" subtitulo="A medida" actual={restaurante.nivelDiseno === 'signature'}
            puntos={['Diseño único de tu marca', 'Animaciones, vídeo y dominio propio', 'Pensada para grupos y locales de referencia']}
            maqueta={<MaquetaSignature />}
            pie={<a href="/panel?pestana=soporte&asunto=Quiero%20una%20carta%20Signature" className="block rounded-xl border border-white/20 py-3 text-center text-sm font-bold hover:border-white/50">Hablar con DKitchen</a>} />
        </div>
        {esencial && !tiene('setup_experto') && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#1c140b] p-5">
            <div>
              <p className="font-bold">¿Prefieres que te montemos la carta sin cambiar el diseño?</p>
              <p className="text-sm text-white/50">Setup Esencial: te cargamos toda la carta, fotos optimizadas, banner de lanzamiento, Google Business, 50 pegatinas QR y 1 formación.</p>
            </div>
            <div className="w-full sm:w-56"><Boton s="setup_esencial" texto={`Setup Esencial · ${euros(esencial.precioCentimos)}`} /></div>
          </div>
        )}
      </section>

      {/* 2. IDIOMAS */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#1c140b] p-6">
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D9531E]">2 · Carta en idiomas</p>
          <h3 className="mt-1 text-lg font-bold">🇬🇧 🇫🇷 🇩🇪 Que tus clientes extranjeros lean tu carta en su idioma</h3>
          <p className="mt-1 text-sm text-white/50">Hasta 3 idiomas, con selector en la carta. Pago único, sin cuota.</p>
        </div>
        <div className="w-full sm:w-56"><Boton s="idiomas" texto={`Activar · ${euros(precio('idiomas')?.precioCentimos ?? 2900)}`} /></div>
      </section>

      {/* 3. MÓDULOS DE SALA */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#D9531E]">3 · Módulos de Sala</p>
          <h3 className="mt-1 text-xl font-bold">Organiza el servicio en sala sin cambiar tu TPV</h3>
          <p className="mt-1 text-sm text-white/50">
            Tu carta sigue siendo para mirar: el cliente nunca pide desde el móvil. Estos módulos ayudan a tu equipo.
            {!ampliado && ' Requieren el plan Ampliado.'}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {MODULOS.map((m) => {
            const p = precio(m.id);
            return (
              <article key={m.id} className="flex flex-col rounded-2xl border border-white/10 bg-[#1c140b] p-5">
                <p className="text-3xl">{m.icono}</p>
                <h4 className="mt-2 font-bold">{m.titulo}</h4>
                <p className="mt-1 text-sm text-white/60">{m.resuelve}</p>
                <ul className="mt-3 flex-1 space-y-1 text-sm text-white/70">{m.incluye.map((i) => <li key={i}>✓ {i}</li>)}</ul>
                <p className="mt-4 text-lg font-black">{p ? euros(p.precioCentimos) : ''}<span className="text-xs font-normal text-white/50"> /mes</span></p>
                <div className="mt-2">{ampliado ? <Boton s={m.id} /> : <a href="/panel?pestana=plan" className="block rounded-xl border border-white/20 py-3 text-center text-sm font-bold">Pasar a Ampliado</a>}</div>
              </article>
            );
          })}
        </div>
        {pack && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#D9531E]/50 bg-[#D9531E]/10 p-5">
            <div>
              <p className="font-bold">Pack Sala Completo: los 3 módulos</p>
              <p className="text-sm text-white/60">
                {pack.precioAnclaCentimos && <span className="mr-1 line-through text-white/40">{euros(pack.precioAnclaCentimos)}</span>}
                <strong className="text-white">{euros(pack.precioCentimos)}/mes</strong>{nModulos >= 2 ? ' · completa lo que ya tienes' : ''}
              </p>
            </div>
            <div className="w-full sm:w-56">{ampliado ? <Boton s="pack_sala" texto="Activar el Pack" /> : null}</div>
          </div>
        )}
      </section>

      {/* 4. MAPA QR ≠ NÚCLEO */}
      <MapaNucleo credito={credito ? { euros: euros(credito.centimos), dias: diasCredito } : null} nModulos={nModulos} />
    </div>
  );
}

function NivelCard({ titulo, subtitulo, puntos, maqueta, pie, actual, destacada }: {
  titulo: string; subtitulo: string; puntos: string[]; maqueta: React.ReactNode; pie?: React.ReactNode; actual?: boolean; destacada?: boolean;
}) {
  return (
    <article className={`flex flex-col rounded-2xl border p-5 ${destacada ? 'border-[#D9531E]/60 bg-[#D9531E]/[0.06]' : 'border-white/10 bg-[#1c140b]'}`}>
      <div className="mb-3 overflow-hidden rounded-xl">{maqueta}</div>
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold">{titulo}</h4>
        {actual && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-bold text-green-300">Tu diseño</span>}
      </div>
      <p className="text-xs text-white/45">{subtitulo}</p>
      <ul className="mt-3 flex-1 space-y-1 text-sm text-white/70">{puntos.map((p) => <li key={p}>✓ {p}</li>)}</ul>
      {pie && <div className="mt-4">{pie}</div>}
    </article>
  );
}

const barra = 'h-1.5 rounded bg-black/15';
function MaquetaEsencial() {
  return (
    <div className="h-40 space-y-2 bg-[#fbfaf8] p-3" aria-hidden="true">
      <div className="mx-auto h-5 w-5 rounded-full bg-[#D9531E]" /><div className={`mx-auto w-16 ${barra}`} />
      <div className="space-y-1.5 rounded-lg bg-white p-2 shadow-sm">
        {[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-2"><div className="flex-1 space-y-1"><div className={barra} /><div className="h-1 w-2/3 rounded bg-black/10" /></div><div className="h-6 w-6 rounded bg-black/10" /></div>)}
      </div>
    </div>
  );
}
function MaquetaAutor() {
  return (
    <div className="h-40 space-y-2 bg-[#FBF7F0] p-3" aria-hidden="true">
      <div className="h-12 rounded-xl bg-gradient-to-br from-[#8A5A2B] to-[#C58B2A]" />
      <p className="text-center font-serif text-sm text-[#1C1712]">Nuestra carta</p>
      <div className="grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-gradient-to-t from-black/50 to-black/10" />)}</div>
      <div className="flex justify-between"><div className={`w-20 ${barra}`} /><div className="h-3 w-8 rounded-full bg-[#C58B2A]/40" /></div>
    </div>
  );
}
function MaquetaSignature() {
  return (
    <div className="flex h-40 flex-col justify-end bg-gradient-to-br from-[#111] via-[#2a1d12] to-[#5c3a1e] p-3" aria-hidden="true">
      <p className="font-serif text-lg text-white">Tu marca</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">diseño único · vídeo · dominio propio</p>
    </div>
  );
}

function MapaNucleo({ credito, nModulos }: { credito: { euros: string; dias: number } | null; nModulos: number }) {
  const filas: [string, string, string][] = [
    ['Qué es', 'Tu carta digital y herramientas de sala', 'Tu propio sistema operativo del restaurante'],
    ['El cliente final', 'Mira la carta (no pide)', 'Pide y paga: en mesa, para recoger y a domicilio'],
    ['Pedidos y cocina', '—', 'Comandas y tickets automáticos a cocina y barra'],
    ['Cobros y ventas', 'Los gestiona tu TPV', 'TPV propio, historial de ventas y cierres'],
    ['Marca', 'Plantillas de DKitchen', 'App/web con tu marca, diseño de autor'],
    ['Propiedad', 'Servicio mensual: si lo dejas, se apaga', 'En propiedad: el sistema es tuyo'],
    ['Precio', 'QR Ampliado + Pack Sala = 124 €/mes', 'Entrada + 69 €/mes de mantenimiento'],
  ];
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#D9531E]">4 · El siguiente nivel</p>
        <h3 className="mt-1 text-xl font-bold">QR Menú y Núcleo Operativo no son lo mismo</h3>
        <p className="mt-1 text-sm text-white/50">
          El QR es una herramienta para tu carta y tu sala. El Núcleo Operativo es el sistema que gestiona todo tu restaurante, y es tuyo.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/45">
            <tr><th className="p-3"></th><th className="p-3">QR Menú (lo que tienes)</th><th className="p-3 text-[#D9531E]">Núcleo Operativo</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filas.map(([k, a, b]) => (
              <tr key={k}><td className="p-3 font-semibold text-white/60">{k}</td><td className="p-3 text-white/70">{a}</td><td className="p-3 font-medium">{b}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl bg-gradient-to-r from-[#D9531E]/25 to-transparent p-5">
        <p className="font-bold">Con todos los módulos del QR pagarías 124 €/mes y nunca sería tuyo. Con el Núcleo pagas 69 €/mes y el sistema es tuyo.</p>
        {credito && nModulos > 0 ? (
          <p className="mt-2 text-sm">
            🎁 Te descontamos lo que ya llevas pagado en módulos: <strong>{credito.euros}</strong> de la entrada del Núcleo (hasta la mitad).
            <strong className="text-[#D9531E]"> Te quedan {credito.dias} días</strong> para aprovecharlo.
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/60">Si activas módulos de sala, durante 6 meses lo que pagues se descuenta de la entrada del Núcleo (hasta la mitad).</p>
        )}
        <a href="/panel?pestana=soporte&asunto=Quiero%20conocer%20el%20N%C3%BAcleo%20Operativo" className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#1A1714]">
          Quiero conocer el Núcleo Operativo
        </a>
      </div>
    </section>
  );
}
