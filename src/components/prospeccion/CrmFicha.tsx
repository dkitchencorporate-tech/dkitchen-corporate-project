import Link from 'next/link';
import {
  ESTADOS, TIPOS, FUENTES, MOTIVOS, CONTACTOS, enlaceWhatsapp, fechaCorta,
  type BaseCrm, type Ficha,
} from '@/lib/prospeccion';
import {
  guardarProspectoAction, estadoProspectoAction, crearPropuestaAction, reasignarAction,
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
import FrancotiradorWhatsapp from './FrancotiradorWhatsapp';
import EstadoProspectoForm from './EstadoProspectoForm';
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
  demo: 'Demo completa de Autor creada (con carta, platos con foto, 4 mesas y créditos visuales).',
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
  const ultimoWa = f.eventos.find((e) => e.tipo === 'whatsapp');
  const ultimoEnvioWhatsapp = ultimoWa ? momento(ultimoWa.creado_en) : null;
  const oculto = <input type="hidden" name="base" value={base} />;
  const idOculto = <input type="hidden" name="id" value={f.id} />;

  return (
    <div className="space-y-5 overflow-x-clip">
      <Link href={base} className="text-sm font-medium text-niebla hover:text-vino">← Locales objetivo</Link>
      <div>
        <div className="flex flex-wrap items-center gap-2"><EtiquetaEstado e={f.estado} />{f.no_contactar && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">No contactar</span>}</div>
        <h1 className="font-display mt-2 break-words text-3xl font-semibold md:text-4xl">{f.nombre}</h1>
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
      <FrancotiradorWhatsapp
        base={base}
        prospectoId={f.id}
        nombre={f.nombre}
        zona={f.zona}
        telefono={f.telefono}
        demoSlug={f.cliente_slug}
        propuestaToken={f.propuesta_token}
        preparacionInicial={f.preparacion}
        borradorInicial={f.whatsapp_borrador ?? null}
        ultimoEnvioWhatsapp={ultimoEnvioWhatsapp}
        noContactar={f.no_contactar}
      />
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
                  ].filter(Boolean).join(' · ')}
                </p>
                {k.texto && (k.texto.length > 160 ? (
                  <details className="mt-1 text-xs text-grafito">
                    <summary className="cursor-pointer">{k.texto.slice(0, 140)}… <span className="font-semibold text-vino">ver mensaje</span></summary>
                    <p className="mt-1 whitespace-pre-line">{k.texto}</p>
                  </details>
                ) : <p className="text-xs text-grafito">{k.texto}</p>)}
                <p className="text-xs text-ceniza">{momento(k.creado_en)} · {k.quien}{k.siguiente ? ` · siguiente: ${k.siguiente}${k.siguiente_fecha ? ` (${fechaCorta(k.siguiente_fecha)})` : ''}` : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      )}


      <section className={tarjeta}>
        <h2 className="text-sm font-semibold">Etapa y situación</h2>
        <p className="mt-1 text-xs text-niebla">La etapa avanza sola al registrar un envío o una visita. Aquí puedes corregirla, contar la situación con tus palabras y fijar el siguiente paso.</p>
        <EstadoProspectoForm accion={estadoProspectoAction} base={base} id={f.id} estado={f.estado} motivo={f.motivo_descarte} siguiente={f.siguiente_accion} fecha={f.siguiente_fecha ? String(f.siguiente_fecha).slice(0, 10) : null} />
      </section>

      <section id="demo" className="rounded-[24px] border border-vino/30 bg-gradient-to-br from-white via-papel/60 to-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-vino">
              {f.cliente_slug ? 'Kit comercial activo · Enlaces y Editor' : 'Demo interactiva + Propuesta'}
            </p>
            <h2 className="font-display mt-1 text-xl font-semibold text-carbon">
              {f.cliente_slug ? `Muestra lista de ${f.nombre}` : 'Prepara la Demo y Propuesta de este local'}
            </h2>
            <p className="mt-1 text-xs text-niebla">
              {f.cliente_slug
                ? 'Cada zona separada sin confusiones: lo que ve el comensal, el simulador para el dueño y tu editor interno.'
                : 'Genera la demo completa con Agente DK (foto de carta o perfil) o créala en modo manual.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(f.demo_vistas ?? 0) > 0 && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-900">
                Simulador visto {f.demo_vistas}×
              </span>
            )}
            {f.propuesta_vistas > 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                Propuesta abierta {f.propuesta_vistas}×
              </span>
            )}
          </div>
        </div>

        {f.cliente_slug && (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-linea bg-white p-3.5 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grafito">
                1. Carta QR del Comensal (enlace público)
              </p>
              <p className="mt-0.5 text-xs text-niebla">Así ven la carta sus clientes desde la mesa o Instagram: {SITIO}/m/{f.cliente_slug}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <a
                  href={`/m/${f.cliente_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-noche px-4 py-2.5 text-xs font-semibold text-white hover:bg-vino"
                >
                  Abrir Carta (/m/{f.cliente_slug}) ↗
                </a>
                <CopiarEnlace
                  texto={`${SITIO}/m/${f.cliente_slug}`}
                  etiqueta="Copiar link Carta"
                  className="inline-flex items-center rounded-full border border-linea bg-papel px-4 py-2.5 text-xs font-semibold text-carbon hover:border-vino"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-linea bg-white p-3.5 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-vino">
                2. Simulador de Sala para el Dueño (público, sin iniciar sesión)
              </p>
              <p className="mt-0.5 text-xs text-niebla">Para que el hostelero pruebe el panel y el comandero de mesas sin pedirle clave.</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <a
                  href={`/demo/panel?local=${f.cliente_slug}&preview=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-vino px-4 py-2.5 text-xs font-semibold text-white hover:bg-tinta"
                >
                  Probar Simulador (/demo/panel) ↗
                </a>
                <CopiarEnlace
                  texto={`${SITIO}/demo/panel?local=${f.cliente_slug}`}
                  etiqueta="Copiar link Simulador"
                  className="inline-flex items-center rounded-full border border-linea bg-papel px-4 py-2.5 text-xs font-semibold text-carbon hover:border-vino"
                />
              </div>
            </div>

            {f.restaurante_id && (
              <div className="rounded-2xl border border-oro/40 bg-oro/[0.08] p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-carbon">
                  3. Tu Editor Interno (solo para ti en Central)
                </p>
                <p className="mt-0.5 text-xs text-niebla">Acceso directo de gestión para cambiar platos, fotos, mesas o estilo de esta demo.</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <form action={abrirEditorDemoAction} className="w-full sm:inline sm:w-auto">
                    {oculto}
                    <input type="hidden" name="restaurante_id" value={f.restaurante_id} />
                    <input type="hidden" name="pestana" value="carta" />
                    <button className="w-full sm:w-auto rounded-full bg-oro px-4 py-2.5 text-center text-xs font-bold leading-snug text-noche hover:brightness-105">
                      Editar Platos y Fotos en Panel Real (/panel) →
                    </button>
                  </form>
                  <form action={abrirEditorDemoAction} className="w-full sm:inline sm:w-auto">
                    {oculto}
                    <input type="hidden" name="restaurante_id" value={f.restaurante_id} />
                    <input type="hidden" name="pestana" value="sala" />
                    <button className="w-full sm:w-auto rounded-full border border-linea bg-white px-4 py-2.5 text-center text-xs font-semibold leading-snug text-carbon hover:border-vino">
                      Plano de Mesas en /panel →
                    </button>
                  </form>
                  {base.startsWith('/admin-dkitchen') && (
                    <Link
                      href={`/admin-dkitchen/clientes/${f.restaurante_id}`}
                      className="w-full sm:w-auto text-center rounded-full border border-linea bg-white px-4 py-2.5 text-xs font-semibold text-grafito hover:border-tinta"
                    >
                      Ajustar Diseño de Autor en Central →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div id="propuesta" className="rounded-2xl border border-linea bg-white p-3.5 sm:p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grafito">
            {f.cliente_slug ? '4. Página web privada de la Propuesta (/propuesta)' : 'Página web privada de la Propuesta (/propuesta)'}
          </p>
          {propuesta ? (
            <div className="mt-2 space-y-2.5">
              <p className="break-all text-xs text-niebla">
                <a href={`${propuesta}?preview=1`} target="_blank" rel="noopener noreferrer" className="font-medium text-carbon underline underline-offset-2">{propuesta}</a>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a href={`${propuesta}?preview=1`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-tinta px-4 py-2 text-xs font-semibold text-white hover:bg-vino">
                  Abrir / imprimir Propuesta ↗
                </a>
                <CopiarEnlace
                  texto={propuesta}
                  etiqueta="Copiar link Propuesta"
                  className="inline-flex items-center rounded-full border border-linea bg-papel px-4 py-2 text-xs font-semibold text-carbon hover:border-vino"
                />
                {base.startsWith('/admin-dkitchen') && (
                  <a href={`/admin-dkitchen/propuesta-correo/${f.id}`} className="rounded-full border border-linea bg-white px-4 py-2 text-xs font-semibold text-carbon hover:border-vino">
                    Versión para correo
                  </a>
                )}
              </div>
              <p className="text-xs text-niebla">
                {f.propuesta_vistas > 0
                  ? `Abierta ${f.propuesta_vistas} ${f.propuesta_vistas === 1 ? 'vez' : 'veces'}; la última, ${momento(f.propuesta_vista_en!)}.`
                  : 'Aún no la ha abierto nadie (las aperturas con ?preview=1 o sesión interna no suman).'}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <form action={crearPropuestaAction}>{oculto}{idOculto}<button className={chip}>Crear enlace de la propuesta</button></form>
            </div>
          )}
        </div>

        <details open={!propuesta} className="rounded-2xl border border-linea bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-carbon">
            {propuesta ? 'Editar texto o plantilla de la página web /propuesta (opcional)' : 'Elegir plantilla y crear texto de /propuesta'}
          </summary>
          <p className="mt-1 text-xs text-niebla">
            Solo cambia la página web pública de la propuesta (`/propuesta`). El mensaje corto de WhatsApp se edita arriba en Francotirador.
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
        </details>

        <details className="rounded-2xl border border-linea bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-carbon">
            {f.cliente_slug ? 'Cambiar composición, fondo o color de acento de la Demo (opcional)' : 'Crear Demo en Modo Manual (composición, fondo y color)'}
          </summary>
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
              <button type="submit" name="abrir_editor" value="0" className="w-full sm:w-auto rounded-full bg-tinta px-5 py-3 text-sm font-semibold text-white hover:bg-vino">
                {f.cliente_slug ? 'Actualizar estilo de la Demo' : 'Crear Demo Completa en 1 clic'}
              </button>
              <button type="submit" name="abrir_editor" value="1" className="w-full sm:w-auto rounded-full bg-vino px-5 py-3 text-sm font-semibold text-white hover:bg-tinta">
                {f.cliente_slug ? 'Guardar y abrir panel para subir fotos →' : 'Crear Demo y abrir panel para subir fotos →'}
              </button>
            </div>
          </form>
        </details>

        <details open={!f.cliente_slug} className="rounded-2xl border border-[#b08d57]/40 bg-[#faf6ee]/50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#5a421c]">
            {f.cliente_slug
              ? 'Digitalizar carta en papel por foto o regenerar Demo con Agente DK (Calle Express)'
              : 'Crear Demo + Propuesta instantánea desde foto o perfil (Agente DK)'}
          </summary>
          <div className="mt-3">
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
          </div>
        </details>
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
        <h2 className="text-sm font-semibold">Historial · {f.eventos.length}</h2>
        {/* 27/11 (Alex): historial ordenado por días; los textos largos (mensajes enviados) se pliegan. */}
        <div className="mt-3 space-y-4">
          {Object.entries(f.eventos.reduce<Record<string, typeof f.eventos>>((acc, e) => {
            const dia = new Date(e.creado_en).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' });
            (acc[dia] ||= []).push(e);
            return acc;
          }, {})).map(([dia, lista]) => (
            <div key={dia}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-niebla">{dia}</p>
              <ol className="mt-2 space-y-2 border-l border-linea pl-3">
                {lista.map((e, i) => {
                  const texto = (e.texto || '').replace(/^\w+ · \w+ · /, '').trim();
                  const hora = new Date(e.creado_en).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });
                  return (
                    <li key={i} className="text-sm">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs tabular-nums text-ceniza">{hora}</span>
                        <span className="rounded-full bg-papel px-2 py-0.5 text-[11px] font-semibold text-carbon ring-1 ring-linea">{EVENTO[e.tipo] ?? e.tipo}</span>
                        {e.tipo !== 'propuesta_vista' && <span className="text-[11px] text-ceniza">{e.quien.split('·')[0].trim()}</span>}
                      </div>
                      {texto && (texto.length > 160 ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[13px] text-carbon/85">{texto.slice(0, 140)}… <span className="font-semibold text-vino">ver completo</span></summary>
                          <p className="mt-1 whitespace-pre-line text-[13px] text-carbon/85">{texto}</p>
                        </details>
                      ) : (
                        <p className="mt-1 text-[13px] text-carbon/85">{texto}</p>
                      ))}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
