import Link from 'next/link';
import {
  ESTADOS, TIPOS, FUENTES, MOTIVOS, CONTACTOS, enlaceWhatsapp, fechaCorta,
  type BaseCrm, type Ficha,
} from '@/lib/prospeccion';
import {
  guardarProspectoAction, estadoProspectoAction, anotarContactoAction, crearPropuestaAction, reasignarAction,
  crearDemoProspectoAction, abrirEditorDemoAction,
} from '@/lib/prospeccion-acciones';
import { EtiquetaEstado } from './CrmLista';
import CopiarEnlace from './CopiarEnlace';
import RegistroRapido from './RegistroRapido';
import AntesDeEntrar from './AntesDeEntrar';
import EstoyAqui from './EstoyAqui';
import MapaRuta from './MapaRuta';
import PlantillasPropuesta from './PlantillasPropuesta';
import AgenteDemoPropuestaIa from './AgenteDemoPropuestaIa';
import NuevoCliente from '@/components/admin/NuevoCliente';
import { CANALES, RESULTADOS, NIVELES, PRODUCTOS, PALANCAS, MATERIALES } from '@/lib/prospeccion-catalogo';

/** Ficha de un local del CRM (0058/0117): contacto rápido, demo completa con editor de fotos, propuesta con plantillas y ficha completa. */
const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const campo = 'w-full rounded-2xl border border-linea bg-white px-4 py-3 text-[15px] focus:border-vino focus:outline-none';
const boton = 'rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white';
const chip = 'inline-flex items-center rounded-full bg-papel px-4 py-2.5 text-sm font-semibold text-carbon ring-1 ring-linea';
const AVISOS: Record<string, string> = {
  permiso: 'No tienes permiso para eso.', datos: 'Revisa los datos: algún campo no es válido.',
  slug: 'No encuentro ese local dado de alta (o no es de tu cartera).', motivo: 'Para descartar, elige el motivo.', error: 'No se pudo guardar.',
  consentimiento: 'Email solo con consentimiento o relación previa (LSSI): marca una de las dos.', nocontactar: 'Este local pidió que no le contactemos.',
  reintento: 'Para «perdido», pon la fecha de reintento.', fecha: 'La fecha no es válida (de hoy a un año).',
  tope_demos: 'Has alcanzado tu cupo máximo de 10 demos comerciales. Pide a Dirección ampliar tu cupo o reutiliza una demo existente.',
};
const OKS: Record<string, string> = {
  guardado: 'Guardado.', estado: 'Estado cambiado.', anotado: 'Contacto apuntado.', propuesta: 'Propuesta guardada y enlace listo.', reasignado: 'Reasignado.',
  registrado: 'Contacto registrado.', situado: 'Local situado en el mapa.',
  demo: 'Demo completa de Autor creada (con carta, platos con foto, 4 mesas y 15 créditos IA).',
};
const momento = (s: string) => new Date(s).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const EVENTO: Record<string, string> = { ...CONTACTOS, alta: 'Alta', estado: 'Estado', propuesta_vista: 'Abrió la propuesta', demo_vista: 'Abrió la demo', reasignado: 'Reasignado a' };

function Campo({ n, l, v, tipo = 'text', max = 200, full }: { n: string; l: string; v: string | number | null; tipo?: string; max?: number; full?: boolean }) {
  return (
    <label className={`text-xs text-niebla ${full ? 'sm:col-span-2' : ''}`}>{l}
      <input name={n} type={tipo} maxLength={max} defaultValue={v == null ? '' : String(v)} className={`${campo} mt-1 text-carbon`} />
    </label>
  );
}

export default function CrmFicha({ base, f, aviso, ok, comerciales }: {
  base: BaseCrm; f: Ficha; aviso?: string; ok?: string; comerciales?: { id: string; nombre: string }[];
}) {
  const wa = enlaceWhatsapp(f.telefono);
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.direccion || f.nombre}, ${f.zona}`)}`;
  const propuesta = f.propuesta_token ? `${SITIO}/propuesta/${f.propuesta_token}` : null;
  const oculto = <input type="hidden" name="base" value={base} />;
  const idOculto = <input type="hidden" name="id" value={f.id} />;

  return (
    <div className="space-y-5">
      <Link href={base} className="text-sm font-medium text-niebla hover:text-vino">← Locales objetivo</Link>
      <div>
        <div className="flex flex-wrap items-center gap-2"><EtiquetaEstado e={f.estado} />{f.no_contactar && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">No contactar</span>}</div>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">{f.nombre}</h1>
        <p className="mt-1 text-sm text-niebla">{TIPOS[f.tipo]} · {[f.barrio, f.zona].filter(Boolean).join(', ')} · {FUENTES[f.fuente]}{f.referido_por ? ` (${f.referido_por})` : ''}{f.rol === 'admin' ? ` · cartera de ${f.mio ? 'karc0' : f.comercial}` : ''}</p>
        {f.estado === 'descartado' && f.motivo_descarte && <p className="mt-1 text-sm text-niebla">Motivo: {MOTIVOS[f.motivo_descarte as keyof typeof MOTIVOS]}</p>}
        {f.cliente_slug && <p className="mt-1 text-sm">Alta vinculada: <span className="font-semibold">{f.cliente_slug}</span></p>}
      </div>
      {aviso && AVISOS[aviso] && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{AVISOS[aviso]}</p>}
      {ok && OKS[ok] && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{OKS[ok]}</p>}
      {f.duplicados.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Posible duplicado</p>
          <ul className="mt-1 space-y-0.5">{f.duplicados.map((d, i) => (
            <li key={i}>{d.id ? <Link href={`${base}/${d.id}`} className="underline">{d.nombre}</Link> : d.nombre} · {d.zona} · {ESTADOS[d.estado]} · de {d.comercial}</li>
          ))}</ul>
        </div>
      )}
      {f.nota_guia && f.rol !== 'admin' && <p className="rounded-2xl border border-vino/20 bg-vino/5 px-4 py-3 text-sm"><span className="font-semibold text-vino">Nota de karc0: </span>{f.nota_guia}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {f.telefono && <a href={`tel:${f.telefono.replace(/\s/g, '')}`} className={chip}>Llamar</a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={chip}>WhatsApp</a>}
        {f.instagram && <a href={`https://instagram.com/${f.instagram}`} target="_blank" rel="noopener noreferrer" className={chip}>Instagram</a>}
        {f.web && <a href={/^https?:/.test(f.web) ? f.web : `https://${f.web}`} target="_blank" rel="noopener noreferrer" className={chip}>Web</a>}
        <a href={maps} target="_blank" rel="noopener noreferrer" className={chip}>Cómo llegar</a>
        {base.startsWith('/admin-dkitchen') && f.estado !== 'cliente' && (
          <NuevoCliente
            esComercial={f.rol !== 'admin'}
            etiqueta={f.restaurante_id ? '+ Convertir en cliente (usando su demo)' : '+ Convertir en cliente'}
            prefijo={{
              prospectoId: f.id,
              local: f.nombre,
              ciudad: f.zona,
              contacto: f.contacto ?? undefined,
              telefono: f.telefono ?? undefined,
            }}
          />
        )}
      </div>

      {f.siguiente_accion && <p className="text-sm text-niebla">Siguiente paso: <span className="font-medium text-carbon">{f.siguiente_accion}</span>{f.siguiente_fecha ? ` · ${fechaCorta(f.siguiente_fecha)}` : ''}</p>}
      {!f.no_contactar && <RegistroRapido base={base} id={f.id} canalInicial={f.canal} consentimiento={f.consentimiento || f.relacion_previa} />}
      <AntesDeEntrar p={f} demo={f.cliente_slug ?? undefined} />
      <div className="flex flex-wrap items-center gap-3">
        <EstoyAqui base={base} id={f.id} situado={f.lat != null} />
        <span className="text-xs text-niebla">{f.lat != null ? `En el mapa (${f.geo_fuente === 'osm' ? 'OpenStreetMap' : f.geo_fuente === 'gps' ? 'GPS en la puerta' : 'a mano'})` : 'Aún sin situar en el mapa'}{f.consentimiento || f.relacion_previa ? ' · ✓ permiso para email' : ''}</span>
      </div>
      {f.lat != null && f.lng != null && <MapaRuta base={base} etiqueta={`Situación de ${f.nombre}`} puntos={[{ id: f.id, nombre: f.nombre, lat: Number(f.lat), lng: Number(f.lng) }]} />}

      {f.contactos.length > 0 && (
        <section className={tarjeta}>
          <h2 className="text-sm font-semibold">Contactos registrados · {f.contactos.length}</h2>
          <ul className="mt-3 space-y-3">
            {f.contactos.map((k, i) => (
              <li key={i} className="border-l-2 border-vino/40 pl-3 text-sm">
                <p><span className="font-semibold">{RESULTADOS[k.resultado]}</span> · {CANALES[k.canal]}{k.plantilla ? ` · ${k.plantilla}` : ''}</p>
                <p className="text-xs text-grafito">
                  {[k.objecion_nivel && `Objeción ${NIVELES[k.objecion_nivel].toLowerCase()}${k.objecion ? `: «${k.objecion}»` : ''}`,
                    k.producto && PRODUCTOS[k.producto], k.palanca && k.palanca !== 'ninguna' && `Palanca: ${PALANCAS[k.palanca]}`,
                    k.material.length > 0 && `Material: ${k.material.map((m) => MATERIALES[m]).join(', ')}${k.flyer_codigo ? ` (${k.flyer_codigo})` : ''}`,
                    k.texto].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-ceniza">{momento(k.creado_en)} · {k.quien}{k.siguiente ? ` · siguiente: ${k.siguiente}${k.siguiente_fecha ? ` (${fechaCorta(k.siguiente_fecha)})` : ''}` : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className={tarjeta}>
        <summary className="cursor-pointer text-sm font-semibold">Solo apuntar una nota o cambiar el siguiente paso</summary>
        <form action={anotarContactoAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          {oculto}{idOculto}
          <select name="tipo" defaultValue="nota" className={campo}>{Object.entries(CONTACTOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input name="texto" maxLength={1000} placeholder="Qué pasó / qué dijo" className={campo} />
          <input name="siguiente" maxLength={200} placeholder="Siguiente acción (volver con tablet, llamar…)" className={campo} />
          <input name="fecha" type="date" aria-label="Fecha de la siguiente acción" className={campo} />
          <button className={`${boton} bg-vino sm:col-span-2 sm:justify-self-start`}>Apuntar</button>
        </form>
      </details>

      <section className={tarjeta}>
        <h2 className="text-sm font-semibold">Estado</h2>
        <form action={estadoProspectoAction} className="mt-3 grid gap-3 sm:grid-cols-3">
          {oculto}{idOculto}
          <select name="estado" defaultValue={f.estado} className={campo}>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select name="motivo" defaultValue={f.motivo_descarte ?? ''} className={campo} aria-label="Motivo si se descarta">
            <option value="">Motivo (si se descarta)</option>
            {Object.entries(MOTIVOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input name="slug" maxLength={80} placeholder="Si es cliente: su slug de alta" className={campo} />
          <button className={`${boton} sm:col-span-3 sm:justify-self-start`}>Cambiar estado</button>
        </form>
      </section>

      <section id="demo" className="rounded-[24px] border border-vino/30 bg-gradient-to-br from-white via-papel/60 to-white p-3 sm:p-5 shadow-sm">
        <AgenteDemoPropuestaIa
          base={base}
          prospectoId={f.id}
          nombre={f.nombre}
          tipo={f.tipo}
          zona={f.zona}
          demoSlug={f.cliente_slug}
          restauranteId={f.restaurante_id ?? null}
          propuestaToken={f.propuesta_token}
          cuotaIa={f.cuota_ia ?? null}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-vino">Demo interactiva real · Opción Manual y Acceso Rápido</p>
            <h2 className="font-display mt-1 text-xl font-semibold text-carbon">
              {f.cliente_slug ? `Demo activa: /m/${f.cliente_slug}` : 'O crear/ajustar Demo en Modo Manual'}
            </h2>
            <p className="mt-1 text-xs text-niebla">
              Incluye Carta de Autor personalizada, Panel con Comandero en vivo (4 mesas), subida/mejora de fotos con IA al momento y reutilización automática si el cliente compra.
            </p>
          </div>
          {(f.demo_vistas ?? 0) > 0 && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-900">
              👁 Demo vista {f.demo_vistas} {f.demo_vistas === 1 ? 'vez' : 'veces'}
            </span>
          )}
        </div>

        {f.cliente_slug && (
          <div className="mt-4 space-y-3 rounded-2xl border border-linea bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/m/${f.cliente_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-noche px-4 py-2.5 text-xs font-semibold text-white hover:bg-vino"
              >
                📱 Ver Carta (/m/{f.cliente_slug}) ↗
              </a>
              <CopiarEnlace texto={`${SITIO}/m/${f.cliente_slug}`} />
              <a
                href={`/demo/panel?local=${f.cliente_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-vino px-4 py-2.5 text-xs font-semibold text-white hover:bg-tinta"
              >
                🛎️ Probar Panel y Comandero en vivo ↗
              </a>
              <CopiarEnlace texto={`${SITIO}/demo/panel?local=${f.cliente_slug}`} />
            </div>

            {f.restaurante_id && (
              <div className="flex flex-wrap items-center gap-2 border-t border-linea pt-3">
                <span className="text-xs font-semibold text-grafito">Editor en vivo (subir fotos de platos e IA):</span>
                <form action={abrirEditorDemoAction} className="inline">
                  {oculto}
                  <input type="hidden" name="restaurante_id" value={f.restaurante_id} />
                  <input type="hidden" name="pestana" value="carta" />
                  <button className="rounded-full bg-oro px-4 py-2 text-xs font-bold text-noche hover:brightness-105">
                    📸 Subir fotos de platos / Editar Carta en el Panel →
                  </button>
                </form>
                <form action={abrirEditorDemoAction} className="inline">
                  {oculto}
                  <input type="hidden" name="restaurante_id" value={f.restaurante_id} />
                  <input type="hidden" name="pestana" value="sala" />
                  <button className="rounded-full border border-linea bg-papel px-3.5 py-2 text-xs font-semibold text-carbon hover:border-vino">
                    🪑 Mesas y Comandero →
                  </button>
                </form>
                {base.startsWith('/admin-dkitchen') && (
                  <Link
                    href={`/admin-dkitchen/clientes/${f.restaurante_id}`}
                    className="rounded-full border border-linea bg-white px-3.5 py-2 text-xs font-semibold text-grafito hover:border-tinta"
                  >
                    🎨 Diseño de Autor en Central →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        <form action={crearDemoProspectoAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          {oculto}{idOculto}
          <label className="text-xs font-semibold text-grafito">
            Composición de Autor
            <select name="plantilla" defaultValue={f.demo_plantilla ?? 'taberna'} className={`${campo} mt-1`}>
              <option value="taberna">Taberna / Bar de tapas</option>
              <option value="gastro">Alta cocina / Gastronómico</option>
              <option value="urbano">Urbana / Burger / Pizzería</option>
              <option value="clasica">Clásica</option>
              <option value="editorial">Editorial</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-grafito">
            Fondo de la carta
            <select name="fondo" defaultValue={f.demo_fondo ?? 'papel'} className={`${campo} mt-1`}>
              <option value="papel">Papel cálido</option>
              <option value="oscuro">Noche / Oscuro</option>
              <option value="blanco">Blanco limpio</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-grafito">
            Color de acento del local
            <input
              name="color"
              type="color"
              defaultValue={f.demo_color ?? '#8b5e34'}
              className="mt-1 h-[48px] w-full cursor-pointer rounded-2xl border border-linea bg-white p-1.5"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <button type="submit" name="abrir_editor" value="0" className="rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white hover:bg-vino">
              {f.cliente_slug ? '🎨 Actualizar estilo de la Demo' : '⚡ Crear Demo Completa en 1 clic'}
            </button>
            <button type="submit" name="abrir_editor" value="1" className="rounded-full bg-vino px-5 py-3 text-sm font-semibold text-white hover:bg-tinta">
              📸 {f.cliente_slug ? 'Guardar y abrir editor para subir fotos →' : 'Crear Demo y abrir editor para subir fotos →'}
            </button>
          </div>
        </form>
      </section>

      <section id="propuesta" className={tarjeta}>
        <h2 className="text-sm font-semibold">Propuesta personalizada automatizada</h2>
        <p className="mt-1 text-xs text-niebla">
          Escoge una plantilla según el perfil del cliente y lo que hayáis hablado: se rellena con sus datos e incluye el link directo a su demo.
        </p>
        <PlantillasPropuesta
          base={base}
          id={f.id}
          nombre={f.nombre}
          zona={f.zona}
          textoInicial={f.propuesta_texto}
          muestraUrlInicial={f.muestra_url}
          ofertaInicial={f.oferta}
          demoSlug={f.cliente_slug}
          sitio={SITIO}
        />
        <div className="mt-4 border-t border-linea pt-4">
          {propuesta ? (
            <div className="space-y-2">
              <p className="break-all text-sm"><a href={propuesta} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">{propuesta}</a></p>
              <div className="flex flex-wrap gap-2">
                <CopiarEnlace texto={propuesta} />
                <a href={propuesta} target="_blank" rel="noopener noreferrer" className={chip}>Abrir / imprimir</a>
                {base.startsWith('/admin-dkitchen') && <a href={`/admin-dkitchen/propuesta-correo/${f.id}`} className={chip}>Versión para correo</a>}
              </div>
              <p className="text-xs text-niebla">{f.propuesta_vistas > 0 ? `Abierta ${f.propuesta_vistas} ${f.propuesta_vistas === 1 ? 'vez' : 'veces'}; la última, ${momento(f.propuesta_vista_en!)}.` : 'Aún no la ha abierto nadie.'}</p>
            </div>
          ) : (
            <form action={crearPropuestaAction}>{oculto}{idOculto}<button className={chip}>Crear enlace de la propuesta</button></form>
          )}
        </div>
      </section>

      <details className={tarjeta}>
        <summary className="cursor-pointer text-sm font-semibold">Ficha completa</summary>
        <form action={guardarProspectoAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          {oculto}{idOculto}
          <input type="hidden" name="no_contactar_campo" value="1" />
          <Campo n="nombre" l="Nombre" v={f.nombre} max={120} full />
          <label className="text-xs text-niebla">Tipo<select name="tipo" defaultValue={f.tipo} className={`${campo} mt-1 text-carbon`}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-xs text-niebla">Fuente<select name="fuente" defaultValue={f.fuente} className={`${campo} mt-1 text-carbon`}>{Object.entries(FUENTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <Campo n="zona" l="Zona" v={f.zona} max={60} />
          <Campo n="barrio" l="Barrio" v={f.barrio} max={60} />
          <Campo n="direccion" l="Dirección" v={f.direccion} full />
          <Campo n="telefono" l="Teléfono" v={f.telefono} tipo="tel" max={30} />
          <Campo n="contacto" l="Persona de contacto" v={f.contacto} max={120} />
          <Campo n="instagram" l="Instagram" v={f.instagram} max={120} />
          <Campo n="web" l="Web" v={f.web} />
          <Campo n="plataformas" l="Plataformas (Glovo, Just Eat, propia…)" v={f.plataformas} />
          <Campo n="competidores" l="Competidores cerca" v={f.competidores} max={300} />
          <Campo n="ticket_medio" l="Ticket medio estimado (€)" v={f.ticket_medio} max={10} />
          <Campo n="mesas" l="Mesas" v={f.mesas} tipo="number" max={4} />
          <Campo n="puntuacion" l="Puntuación (0–100)" v={f.puntuacion} tipo="number" max={3} />
          <Campo n="apertura_prevista" l="Apertura prevista" v={f.apertura_prevista} tipo="date" />
          <Campo n="referido_por" l="Referido por" v={f.referido_por} max={120} />
          <Campo n="place_id" l="Google place_id" v={f.place_id} max={300} />
          <label className="text-xs text-niebla">Canal principal
            <select name="canal" defaultValue={f.canal ?? ''} className={`${campo} mt-1 text-carbon`}>
              <option value="">Sin canal</option>
              {Object.entries(CANALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-1 text-xs text-niebla">
            <input type="hidden" name="consentimiento_campo" value="1" />
            <label className="flex items-center gap-2"><input type="checkbox" name="consentimiento" defaultChecked={f.consentimiento} className="h-5 w-5" /> Consentimiento para escribirle (email)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="relacion_previa" defaultChecked={f.relacion_previa} className="h-5 w-5" /> Relación previa</label>
          </div>
          <label className="text-xs text-niebla sm:col-span-2">Preparación antes de entrar (turistas, reseñas, carta actual, quién decide…)
            <textarea name="preparacion" maxLength={1000} rows={2} defaultValue={f.preparacion ?? ''} className={`${campo} mt-1 text-carbon`} />
          </label>
          <label className="text-xs text-niebla sm:col-span-2">Notas
            <textarea name="notas" maxLength={2000} rows={4} defaultValue={f.notas ?? ''} className={`${campo} mt-1 text-carbon`} />
          </label>
          {f.rol === 'admin' && (
            <label className="text-xs text-niebla sm:col-span-2">Nota de guía (la ve el comercial)
              <textarea name="nota_guia" maxLength={1000} rows={2} defaultValue={f.nota_guia ?? ''} className={`${campo} mt-1 text-carbon`} />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="no_contactar" defaultChecked={f.no_contactar} className="h-5 w-5" /> No contactar (ha dicho que no; la propuesta deja de funcionar)</label>
          <button className={`${boton} sm:col-span-2 sm:justify-self-start`}>Guardar ficha</button>
        </form>
      </details>

      {f.rol === 'admin' && comerciales && (
        <section className={tarjeta}>
          <h2 className="text-sm font-semibold">Reasignar</h2>
          <form action={reasignarAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
            {oculto}{idOculto}
            <select name="comercial" defaultValue={f.comercial_id} className={campo}>{comerciales.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            <button className={boton}>Reasignar</button>
          </form>
        </section>
      )}

      <section className={tarjeta}>
        <h2 className="text-sm font-semibold">Historial</h2>
        <ul className="mt-3 space-y-2.5">
          {f.eventos.map((e, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{EVENTO[e.tipo] ?? e.tipo}</span>{e.texto ? `: ${e.texto}` : ''}
              <span className="block text-xs text-ceniza">{momento(e.creado_en)}{e.tipo !== 'propuesta_vista' ? ` · ${e.quien}` : ''}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
