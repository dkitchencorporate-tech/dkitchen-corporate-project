'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useState, useTransition } from 'react';
import type { EstadoServicios, Servicio } from '@/lib/servicios';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { comprarServicioAction } from '@/app/panel/actions';
import EstiloCarta from './EstiloCarta';
import SaltoSignature from './SaltoSignature';
import PortadaCarta from './PortadaCarta';
import ActivarNucleoOperativoBoton from '@/components/sections/ActivarNucleoOperativoBoton';

const WHATSAPP_DK = '#solicitud-signature';

const euros = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);

const MODULOS: { id: Servicio; titulo: string; resuelve: string; como: string; incluye: string[] }[] = [
  { id: 'plano_mesas', titulo: 'Plano de mesas', resuelve: 'Ves tu local de un vistazo: qué mesa llama, cuál pide la cuenta y de quién es cada mesa.',
    como: 'Dibujas tu local una vez (paredes, barra, puertas, terraza) y colocas tus mesas. Creas zonas y se las asignas a cada camarero.',
    incluye: ['Editor de sala en pantalla completa', 'Zonas por camarero con un toque', 'Mesas que llaman, resaltadas en el plano'] },
  { id: 'app_sala', titulo: 'App de sala', resuelve: 'Adiós a las comandas en papel y a las mesas olvidadas: cada camarero lleva sus mesas en el móvil.',
    como: 'Cada camarero recibe un enlace personal (sin contraseñas). Ve sus mesas y llamadas, y anota lo que pide cada mesa en segundos.',
    incluye: ['Avisos de llamada con sonido y vibración', 'Registro de comandas por mesa', 'Informe por camarero: comandas, productos, llamadas y tiempo de respuesta', 'Mesa sin dueño: la toma quien la atiende'] },
  { id: 'conexion_tpv', titulo: 'Conexión con tu TPV', resuelve: 'Lo que anota el camarero llega solo a tu TPV. Sin teclear dos veces ni errores.',
    como: 'DKitchen configura la conexión con tu TPV. Tu TPV sigue siendo quien cobra y factura.',
    incluye: ['Compatible con la mayoría de TPV en España', 'Tu facturación no cambia (Verifactu, gestoría)', 'Instalación y pruebas hechas por DKitchen'] },
];

export default function Mejoras({ restaurante, servicios, vista, fotos = [] }: { restaurante: MiRestaurante; servicios: EstadoServicios; vista: 'diseno' | 'modulos'; fotos?: string[] }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Portada compartida con la vista previa de Diseño (se actualiza al momento).
  const [portada, setPortada] = useState<{ url: string | null; conNombre: boolean }>({ url: restaurante.portadaUrl ?? null, conNombre: !!restaurante.portadaConNombre });
  const ampliado = restaurante.plan === 'ampliado';
  const precio = (s: Servicio) => servicios.catalogo.find((c) => c.servicio === s);
  const tiene = (s: Servicio) => servicios.contratados.some((c) => c.servicio === s || (c.servicio === 'pack_sala' && ['plano_mesas', 'app_sala', 'conexion_tpv'].includes(s)));
  const nModulos = MODULOS.filter((m) => tiene(m.id)).length;

  function comprar(s: Servicio) {
    setError(null);
    iniciar(async () => {
      try { const { url } = await comprarServicioAction(s); window.location.href = url; }
      catch (e) { setError(mensajeError(e, 'No se pudo iniciar el pago.')); }
    });
  }

  const Boton = ({ s, texto }: { s: Servicio; texto?: string }) =>
    tiene(s) ? (
      <span className="block rounded-xl bg-green-500/15 py-3 text-center text-sm font-bold text-green-700">✓ Activo en tu cuenta</span>
    ) : (
      <button disabled={pendiente} onClick={() => comprar(s)} className="w-full rounded-full bg-[#6E0C2B] py-3 text-sm font-bold hover:bg-[#4A0819] disabled:opacity-50">
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
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{vista === 'diseno' ? 'Diseño de tu carta' : 'Módulos para tu local'}</h2>
        <p className="mt-1 text-sm text-[#6B7079]">{vista === 'diseno'
          ? (restaurante.nivelDiseno === 'esencial' ? 'Elige cómo se ve tu carta: estilo, fondo, letra, color y foto de portada. La vista previa cambia al momento.' : 'Tú gestionas platos, precios y fotos. El diseño de autor lo prepara DKitchen.')
          : 'Herramientas que se suman a tu carta QR, una a una. Activas solo lo que necesitas.'}</p>
        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      </header>

      {vista === 'diseno' && (<>
      <EstiloCarta fotos={fotos} logo={restaurante.logoUrl ?? null} portada={portada.url} portadaConNombre={portada.conNombre} nombre={restaurante.nombre} bloqueado={restaurante.nivelDiseno !== 'esencial'}
        inicial={{ plantilla: restaurante.plantilla || 'clasica', fondo: restaurante.estiloFondo || 'papel', letra: restaurante.estiloLetra || 'sans', color: (restaurante.colorMarca || '#E8592A').toUpperCase() }} />
      <PortadaCarta inicial={restaurante.portadaUrl ?? null} conNombreInicial={!!restaurante.portadaConNombre} demo={restaurante.id === 'demo'} onCambio={(url, conNombre) => setPortada({ url, conNombre })} />
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#6E0C2B]">Niveles de diseño</p>
          <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight">Tu carta es tu escaparate. Que se vea a la altura de tu cocina.</h3>
          <p className="mt-1 text-sm text-[#6B7079]">Tú gestionas platos, precios y fotos. El diseño lo prepara un experto de DKitchen, una vez, bien hecho.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <NivelCard titulo="Esencial" subtitulo="Incluida en tu plan" actual={restaurante.nivelDiseno === 'esencial'}
            puntos={['Carta clara por categorías', 'Tu logo y un color de la paleta', 'Fotos pequeñas por plato']}
            maqueta={<MaquetaEsencial />} />
          <NivelCard titulo="Carta de Autor" subtitulo="Diseño de autor hecho por DKitchen" destacada actual={restaurante.nivelDiseno === 'autor'}
            puntos={['Portada editorial con tu mejor foto', 'Personalización: tus colores exactos, tipografía y estilo', 'Categorías en tarjetas con imagen', 'Te cargamos toda la carta y optimizamos tus fotos', 'Flyers de mesa y QR físicos con tu diseño', 'Sesión de formación para ti y tu equipo']}
            maqueta={<MaquetaAutor />}
            pie={
              <div className="space-y-2">
                {experto && (
                  <p className="text-center">
                    {experto.precioAnclaCentimos && servicios.plazasExperto > 0 && <span className="mr-2 text-sm text-[#6B7079] line-through">{euros(experto.precioAnclaCentimos)}</span>}
                    <span className="text-2xl font-black">{euros(experto.precioCentimos)}</span> <span className="text-xs text-[#6B7079]">pago único</span>
                  </p>
                )}
                {servicios.plazasExperto > 0 && <p className="text-center text-xs font-semibold text-[#6E0C2B]">Precio de lanzamiento · quedan {servicios.plazasExperto} de 20 plazas</p>}
                <a href="/panel/vista-previa" target="_blank" rel="noopener" className="block rounded-xl border border-[#D6D6D1] py-2.5 text-center text-sm font-semibold hover:border-[#D6D6D1]">Ver mi carta con este diseño</a>
                <Boton s="setup_experto" texto="Quiero mi Carta de Autor" />
              </div>
            } />
          <NivelCard titulo="DKitchen Signature" subtitulo="Tu propia app, con tu marca y en propiedad" actual={restaurante.nivelDiseno === 'signature'}
            puntos={['App instalable (PWA) con tu marca y tu dominio', 'Tus clientes piden y pagan: en mesa, recogida y domicilio', 'Comandas a cocina, TPV propio e historial de ventas', 'Es tuya: pagas la entrada y 69 €/mes de mantenimiento']}
            maqueta={<MaquetaSignature />}
            pie={
              <div className="space-y-2">
                <a href="/signature" target="_blank" rel="noopener" className="block rounded-xl border border-[#D6D6D1] py-2.5 text-center text-sm font-semibold hover:border-[#D6D6D1]">Ver cómo es DKitchen Signature</a>
                <a href={WHATSAPP_DK} className="block rounded-xl border border-[#D6D6D1] py-2.5 text-center text-sm font-semibold hover:border-[#D6D6D1]">Pedir propuesta de Signature</a>
                <ActivarNucleoOperativoBoton className="w-full rounded-full bg-[#17191E] py-3 text-sm font-bold text-white" />
              </div>
            } />
        </div>
        {esencial && !tiene('setup_experto') && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6E6E2] bg-white p-5">
            <div>
              <p className="font-bold">Puesta a punto: te dejamos tu carta perfecta, sin cambiar el diseño</p>
              <p className="text-sm text-[#6B7079]">Un experto de DKitchen revisa y configura tu carta contigo: categorías, textos, alérgenos, fotos, horarios y tu ficha de Google.</p>
            </div>
            <div className="w-full sm:w-56"><Boton s="setup_esencial" texto={`Puesta a punto · ${euros(esencial.precioCentimos)}`} /></div>
          </div>
        )}
      </section>
      </>)}

      {vista === 'modulos' && (<>
      <SaltoSignature />
      {/* IMÁGENES CON IA (0038) */}
      <section className="rounded-2xl border border-[#E6E6E2] bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#6E0C2B]">Imágenes con IA</p>
        <h3 className="font-display mt-1 text-xl font-semibold tracking-tight">✨ Fotos de tus platos y banners, creadas o mejoradas con IA</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-[#3F434B]">
          <li>• <strong>3 imágenes gratis</strong>, siempre.</li>
          <li>• ¿Necesitas más? <strong>Bono de 50 imágenes por 9 € + IVA</strong>: pago único, no es una cuota. Lo vuelves a comprar solo si lo necesitas.</li>
          <li>• Las imágenes compradas <strong>nunca caducan</strong> y las fotos creadas son tuyas.</li>
        </ul>
        <p className="mt-3 text-sm text-[#6B7079]">Lo encontrarás en el botón <strong>«✨ Crear con IA»</strong> al poner la foto de un plato o la imagen de un banner. En tu carta llevan la nota «Imagen orientativa».</p>
      </section>
      {/* IDIOMAS */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E6E6E2] bg-white p-6">
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-widest text-[#6E0C2B]">Carta en idiomas</p>
          <h3 className="font-display mt-1 text-xl font-semibold tracking-tight">🇬🇧 🇫🇷 🇩🇪 Que tus clientes extranjeros lean tu carta en su idioma</h3>
          <p className="mt-1 text-sm text-[#6B7079]">Eliges hasta 3 idiomas y <strong className="text-[#3F434B]">nosotros traducimos tu carta</strong>. Tus clientes ven un selector de idioma. Pago único, sin cuota.</p>
        </div>
        <div className="w-full sm:w-56"><Boton s="idiomas" texto={`Activar · ${euros(precio('idiomas')?.precioCentimos ?? 2900)}`} /></div>
      </section>

      {/* 3. MÓDULOS DE SALA */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#6E0C2B]">Módulos de Sala</p>
          <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight">Organiza el servicio en sala sin cambiar tu TPV</h3>
          <p className="mt-1 text-sm text-[#6B7079]">
            Tu carta sigue siendo para mirar: el cliente nunca pide desde el móvil. Estos módulos ayudan a tu equipo.
            {!ampliado && ' Requieren el plan Ampliado.'}
          </p>
        </div>
        <div className="space-y-4">
          {MODULOS.map((m) => {
            const p = precio(m.id);
            return (
              <article key={m.id} className="grid gap-4 rounded-2xl border border-[#E6E6E2] bg-white p-5 md:grid-cols-[1fr_14rem]">
                <div>
                  <h4 className="text-lg font-bold">{m.titulo}</h4>
                  <p className="mt-1 text-sm text-[#3F434B]">{m.resuelve}</p>
                  <p className="mt-2 text-sm text-[#6B7079]"><strong className="text-[#3F434B]">Cómo funciona:</strong> {m.como}</p>
                  <ul className="mt-3 grid gap-1 text-sm text-[#3F434B] sm:grid-cols-2">{m.incluye.map((i) => <li key={i}>✓ {i}</li>)}</ul>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <p className="text-center text-2xl font-black">{p ? euros(p.precioCentimos) : ''}<span className="text-xs font-normal text-[#6B7079]"> /mes</span></p>
                  {ampliado ? <Boton s={m.id} /> : <a href="/panel?pestana=plan" className="block rounded-xl border border-[#D6D6D1] py-3 text-center text-sm font-bold">Pasar a Ampliado</a>}
                </div>
              </article>
            );
          })}
        </div>
        {nModulos === MODULOS.length ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
            <p className="font-bold text-green-700">Tienes todos los Módulos de Sala activos</p>
            <p className="mt-1 text-sm text-[#6B7079]">Plano, App de sala y Conexión TPV ya funcionan en tu cuenta. Los gestionas en la pestaña Sala; el resumen de lo que pagas está en Mi Plan.</p>
          </div>
        ) : pack && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#6E0C2B]/50 bg-[#6E0C2B]/10 p-5">
            <div>
              <p className="font-bold">Pack Sala Completo: los 3 módulos</p>
              <p className="text-sm text-[#6B7079]">
                {pack.precioAnclaCentimos && <span className="mr-1 line-through text-[#6B7079]">{euros(pack.precioAnclaCentimos)}</span>}
                <strong className="text-[#1B1D22]">{euros(pack.precioCentimos)}/mes</strong>{nModulos >= 2 ? ' · completa lo que ya tienes' : ''}
              </p>
            </div>
            <div className="w-full sm:w-56">{ampliado ? <Boton s="pack_sala" texto="Activar el Pack" /> : null}</div>
          </div>
        )}
        {tiene('app_sala') && precio('comandero_pro') && (
          <article className="grid gap-4 rounded-2xl border border-[#E6E6E2] bg-white p-5 md:grid-cols-[1fr_14rem]">
            <div>
              <h4 className="text-lg font-bold">Comandero Pro</h4>
              <p className="mt-1 text-sm text-[#3F434B]">Sabes qué mesa, qué camarero y qué día te deja más, y qué se anula y por qué.</p>
              <ul className="mt-3 grid gap-1 text-sm text-[#3F434B] sm:grid-cols-2">
                {['Histórico por fechas, mesa y camarero', 'Descarga en Excel y CSV', 'Informe de anulaciones con motivo', 'Ranking de camareros'].map((i) => <li key={i}>✓ {i}</li>)}
              </ul>
              <p className="mt-2 text-xs text-[#6B7079]">Sin Pro, la App de sala ya incluye la cuenta por mesa, las rondas, las mesas en vivo y el resumen de hoy.</p>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <p className="text-center text-2xl font-black">{euros(precio('comandero_pro')!.precioCentimos)}<span className="text-xs font-normal text-[#6B7079]"> /mes + IVA</span></p>
              {servicios.comanderoPro && !tiene('comandero_pro')
                ? <span className="block rounded-xl bg-green-500/15 py-3 text-center text-sm font-bold text-green-700">✓ Incluido en tu plan</span>
                : <Boton s="comandero_pro" />}
            </div>
          </article>
        )}
      </section>

      </>)}

      {/* QR ≠ DKitchen Signature (Núcleo Operativo), en ambas pestañas */}
      <MapaNucleo credito={credito ? { euros: euros(credito.centimos), dias: diasCredito } : null} nModulos={nModulos} precioTodo={euros((precio('pack_sala')?.precioCentimos ?? 11900) + 2500)} />
    </div>
  );
}

function NivelCard({ titulo, subtitulo, puntos, maqueta, pie, actual, destacada }: {
  titulo: string; subtitulo: string; puntos: string[]; maqueta: React.ReactNode; pie?: React.ReactNode; actual?: boolean; destacada?: boolean;
}) {
  return (
    <article className={`flex flex-col rounded-2xl border p-5 ${destacada ? 'border-[#6E0C2B]/60 bg-[#6E0C2B]/[0.06]' : 'border-[#E6E6E2] bg-white'}`}>
      <div className="mb-3 overflow-hidden rounded-xl">{maqueta}</div>
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold">{titulo}</h4>
        {actual && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-bold text-green-700">Tu diseño</span>}
      </div>
      <p className="text-xs text-[#6B7079]">{subtitulo}</p>
      <ul className="mt-3 flex-1 space-y-1 text-sm text-[#3F434B]">{puntos.map((p) => <li key={p}>✓ {p}</li>)}</ul>
      {pie && <div className="mt-4">{pie}</div>}
    </article>
  );
}

const barra = 'h-1.5 rounded bg-white';
function MaquetaEsencial() {
  return (
    <div className="h-40 space-y-2 bg-[#fbfaf8] p-3" aria-hidden="true">
      <div className="mx-auto h-5 w-5 rounded-full bg-[#6E0C2B]" /><div className={`mx-auto w-16 ${barra}`} />
      <div className="space-y-1.5 rounded-lg bg-white p-2 shadow-sm">
        {[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-2"><div className="flex-1 space-y-1"><div className={barra} /><div className="h-1 w-2/3 rounded bg-white" /></div><div className="h-6 w-6 rounded bg-white" /></div>)}
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
      <p className="font-serif text-lg text-[#1B1D22]">Tu marca</p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#6B7079]">tu app · tus pedidos · tu propiedad</p>
    </div>
  );
}

function MapaNucleo({ credito, nModulos, precioTodo }: { credito: { euros: string; dias: number } | null; nModulos: number; precioTodo: string }) {
  const filas: [string, string, string][] = [
    ['Qué es', 'Tu carta digital y herramientas de sala', 'Tu propio sistema operativo del restaurante'],
    ['El cliente final', 'Mira la carta (no pide)', 'Pide y paga: en mesa, para recoger y a domicilio'],
    ['Pedidos y cocina', '—', 'Comandas y tickets automáticos a cocina y barra'],
    ['Cobros y ventas', 'Los gestiona tu TPV', 'TPV propio, historial de ventas y cierres'],
    ['Marca', 'Plantillas de DKitchen', 'App/web con tu marca, diseño de autor'],
    ['Propiedad', 'Servicio mensual: si lo dejas, se apaga', 'En propiedad: el sistema es tuyo'],
    ['Precio', `QR Ampliado + Pack Sala = ${precioTodo}/mes`, 'Entrada + 69 €/mes de mantenimiento'],
  ];
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#6E0C2B]">El siguiente nivel</p>
        <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight">QR Menú y DKitchen Signature no son lo mismo</h3>
        <p className="mt-1 text-sm text-[#6B7079]">
          El QR es una herramienta para tu carta y tu sala. DKitchen Signature (nuestro Núcleo Operativo) es el sistema que gestiona todo tu restaurante, y es tuyo.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#E6E6E2]">
        <div className="grid grid-cols-2 bg-[#F3F3F0] text-xs font-semibold uppercase tracking-wider">
          <p className="p-3 text-[#6B7079]">QR Menú · lo que tienes</p>
          <p className="border-l border-[#E6E6E2] p-3 text-[#6E0C2B]">DKitchen Signature</p>
        </div>
        {filas.map(([k, a, b]) => (
          <div key={k} className="border-t border-[#E6E6E2]">
            <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9EA6]">{k}</p>
            <div className="grid grid-cols-2 text-sm">
              <p className="p-3 pt-1 text-[#3F434B]">{a}</p>
              <p className="border-l border-[#E6E6E2] p-3 pt-1 font-medium">{b}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-gradient-to-r from-[#6E0C2B]/25 to-transparent p-5">
        <p className="font-bold">Con todos los módulos del QR pagarías {precioTodo}/mes y nunca sería tuyo. Con DKitchen Signature pagas 69 €/mes y el sistema es tuyo.</p>
        {credito && nModulos > 0 ? (
          <p className="mt-2 text-sm">
            🎁 Te descontamos lo que ya llevas pagado en módulos: <strong>{credito.euros}</strong> de la entrada de Signature (hasta la mitad).
            <strong className="text-[#6E0C2B]"> Te quedan {credito.dias} días</strong> para aprovecharlo.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#6B7079]">Si activas módulos de sala, durante 6 meses lo que pagues se descuenta de la entrada de Signature (hasta la mitad).</p>
        )}
        <a href="/panel?pestana=soporte&asunto=Quiero%20conocer%20DKitchen%20Signature" className="mt-4 inline-block rounded-full bg-[#17191E] px-5 py-2.5 text-sm font-bold text-white">
          Quiero conocer DKitchen Signature
        </a>
      </div>
    </section>
  );
}
