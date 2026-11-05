'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  subirFotoCartaProspectoAction,
  ejecutarAgenteDemoPropuestaAction,
  consultarAgenteProspeccionAction,
  abrirEditorDemoAction,
} from '@/lib/prospeccion-acciones';
import { PLANTILLAS_PROPUESTA, plantillaSegunTipo } from '@/lib/prospeccion-catalogo';
import type { BaseCrm } from '@/lib/prospeccion';

const COMPOSICIONES_POR_PERFIL: Record<string, { plantilla: string; color: string; fondo: string; etiqueta: string }> = {
  qr_papel_redes: { plantilla: 'taberna', color: '#6E0C2B', fondo: 'papel', etiqueta: 'Taberna · Barra & Raciones' },
  qr_sala_terraza: { plantilla: 'taberna', color: '#6E0C2B', fondo: 'papel', etiqueta: 'Taberna · Terraza & Sala' },
  qr_autor_gastro: { plantilla: 'gastro', color: '#6E0C2B', fondo: 'papel', etiqueta: 'Gastro · Sala & Carta de Autor' },
  qr_turistas_idiomas: { plantilla: 'editorial', color: '#1C3128', fondo: 'papel', etiqueta: 'Editorial · Multilingüe & Alérgenos' },
  signature_delivery: { plantilla: 'urbano', color: '#9A3412', fondo: 'oscuro', etiqueta: 'Urbano · Delivery & Pedidos' },
  experience_evento: { plantilla: 'premium', color: '#1E3A5F', fondo: 'oscuro', etiqueta: 'Premium · Eventos & Sala' },
};

export default function AgenteDemoPropuestaIa({
  base,
  prospectoId,
  nombre,
  tipo,
  zona,
  demoSlug,
  restauranteId,
  propuestaToken,
  cuotaIa,
}: {
  base: BaseCrm;
  prospectoId: string;
  nombre: string;
  tipo: string;
  zona: string;
  demoSlug: string | null;
  restauranteId: string | null;
  propuestaToken: string | null;
  cuotaIa?: {
    rol: string;
    sin_limite: boolean;
    demos_usadas: number;
    demos_tope: number;
    imagenes_tope_demo: number;
  } | null;
}) {
  const router = useRouter();
  const sugerida = plantillaSegunTipo(tipo);
  const [perfilId, setPerfilId] = useState<string>(sugerida.id);
  const compSugerida = COMPOSICIONES_POR_PERFIL[perfilId] ?? COMPOSICIONES_POR_PERFIL.qr_papel_redes;

  const [plantillaDemo, setPlantillaDemo] = useState<string>(compSugerida.plantilla);
  const [colorDemo, setColorDemo] = useState<string>(compSugerida.color);
  const [fondoDemo, setFondoDemo] = useState<string>(compSugerida.fondo);

  const [fotosCarta, setFotosCarta] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [generarLogoIa, setGenerarLogoIa] = useState(true);
  const [generarBannerIa, setGenerarBannerIa] = useState(true);
  const [cantidadPlatosIa, setCantidadPlatosIa] = useState<number>(5);
  const [instruccionExtra, setInstruccionExtra] = useState('');

  const [pendienteAgente, iniciarAgente] = useTransition();
  const [pasoActual, setPasoActual] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    slug: string;
    restauranteId: string;
    propuestaToken: string;
    platosCreadosDeFoto: number;
    logoGenerado: boolean;
    bannerGenerado: boolean;
    platosConFotoIa: number;
    restantesIa: number | null;
    aviso?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado del Chat / Asistente IA Comercial
  const [chatAbierto, setChatAbierto] = useState(false);
  const [preguntaChat, setPreguntaChat] = useState('');
  const [respuestaChat, setRespuestaChat] = useState<string | null>(null);
  const [pendienteChat, iniciarChat] = useTransition();
  const [copiadoChat, setCopiadoChat] = useState(false);

  const sinLimite = cuotaIa?.sin_limite === true;
  const demosUsadas = cuotaIa?.demos_usadas ?? 0;
  const demosTope = cuotaIa?.demos_tope ?? 10;
  const imgTope = cuotaIa?.imagenes_tope_demo ?? 10;

  const cambiarPerfilUnificado = (id: string) => {
    setPerfilId(id);
    const c = COMPOSICIONES_POR_PERFIL[id];
    if (c) {
      setPlantillaDemo(c.plantilla);
      setColorDemo(c.color);
      setFondoDemo(c.fondo);
    }
  };

  const handleSubirFotosCarta = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setError(null);
    setSubiendoFoto(true);
    try {
      const nuevas: string[] = [];
      for (const file of Array.from(archivos).slice(0, 4 - fotosCarta.length)) {
        const fd = new FormData();
        fd.set('prospecto_id', prospectoId);
        fd.set('archivo', file);
        const r = await subirFotoCartaProspectoAction(fd);
        if (!r.ok) {
          setError(r.error);
          break;
        }
        nuevas.push(r.url);
      }
      if (nuevas.length > 0) {
        setFotosCarta((prev) => [...prev, ...nuevas].slice(0, 4));
      }
    } finally {
      setSubiendoFoto(false);
    }
  };

  const lanzarAgenteUnificado = () => {
    setError(null);
    setResultado(null);
    setPasoActual(
      fotosCarta.length > 0
        ? 'Leyendo foto de la carta con IA, creando Demo de Autor, generando Logo + Banner + fotos IA en principal y redactando propuesta…'
        : 'Creando Demo de Autor, generando Logo + Banner + 5–6 fotos IA en platos principales y preparando propuesta unificada…'
    );
    iniciarAgente(async () => {
      const p = PLANTILLAS_PROPUESTA.find((x) => x.id === perfilId) ?? sugerida;
      const r = await ejecutarAgenteDemoPropuestaAction({
        base,
        prospectoId,
        fotosCartaUrls: fotosCarta,
        plantillaDemo,
        colorDemo,
        fondoDemo,
        plantillaPropuestaId: perfilId,
        oferta: p.oferta,
        generarLogoIa,
        generarBannerIa,
        cantidadPlatosIa,
        instruccionExtra,
      });
      setPasoActual(null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResultado({
        slug: r.slug,
        restauranteId: r.restauranteId,
        propuestaToken: r.propuestaToken,
        platosCreadosDeFoto: r.platosCreadosDeFoto,
        logoGenerado: r.logoGenerado,
        bannerGenerado: r.bannerGenerado,
        platosConFotoIa: r.platosConFotoIa,
        restantesIa: r.restantesIa,
        aviso: r.aviso,
      });
      router.refresh();
    });
  };

  const consultarIa = (
    modo: 'mejorar_propuesta' | 'guion_llamada' | 'mensaje_whatsapp' | 'responder_objecion' | 'chat_libre',
    textoManual?: string
  ) => {
    setError(null);
    setChatAbierto(true);
    iniciarChat(async () => {
      const r = await consultarAgenteProspeccionAction({
        prospectoId,
        modo,
        texto: textoManual ?? preguntaChat,
        demoSlug: resultado?.slug ?? demoSlug,
        propuestaToken: resultado?.propuestaToken ?? propuestaToken,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setRespuestaChat(r.respuesta);
    });
  };

  const slugActivo = resultado?.slug ?? demoSlug;
  const restIdActivo = resultado?.restauranteId ?? restauranteId;
  const tokenActivo = resultado?.propuestaToken ?? propuestaToken;
  const totalImagenesEstimadas = (generarLogoIa ? 1 : 0) + (generarBannerIa ? 1 : 0) + cantidadPlatosIa;

  return (
    <div className="mb-4 rounded-2xl border-2 border-[#b08d57]/50 bg-gradient-to-br from-[#faf6ee] via-white to-[#f6efe2] p-4 shadow-sm">
      {/* Cabecera + Indicador de sesión y cuota IA */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2a1f1a] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#f3e5c8]">
            ✨ Agente IA Unificado · Prospecto → Demo Impacto → Propuesta
          </span>
          <h4 className="mt-1.5 font-serif text-base font-semibold text-neutral-900">
            Generación con IA para captar en vivo o por llamada ({nombre})
          </h4>
          <p className="text-xs text-neutral-600">
            Sube una foto de su carta (o usa la base de su perfil): el agente crea los platos, genera el <b>Logo</b>, el <b>Banner de portada</b> y <b>5 o 6 fotos IA en platos principales</b>, y deja la propuesta lista con el link de su demo.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-right text-[11px]">
          {sinLimite ? (
            <>
              <p className="font-bold text-emerald-800">👑 Dirección · IA Sin Restricción</p>
              <p className="text-neutral-500">Demos, fotos IA y chats ilimitados</p>
            </>
          ) : (
            <>
              <p className="font-bold text-neutral-800">
                🎯 Cupo Comercial: {demosUsadas} / {demosTope} demos
              </p>
              <p className="text-neutral-500">Hasta {imgTope} imágenes IA por demo + Chat IA</p>
            </>
          )}
        </div>
      </div>

      {/* Paso 1: Unificación con el tipo de prospecto y propuesta */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-neutral-700">
          1. Perfil unificado (une estilo de Demo + plantilla de Propuesta)
          <select
            value={perfilId}
            onChange={(e) => cambiarPerfilUnificado(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900"
          >
            {PLANTILLAS_PROPUESTA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <label className="block font-medium text-neutral-700">
            Composición
            <select
              value={plantillaDemo}
              onChange={(e) => setPlantillaDemo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-2 py-2 text-xs"
            >
              <option value="taberna">Taberna</option>
              <option value="gastro">Gastro</option>
              <option value="urbano">Urbano</option>
              <option value="editorial">Editorial</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label className="block font-medium text-neutral-700">
            Ambiente
            <select
              value={fondoDemo}
              onChange={(e) => setFondoDemo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-2 py-2 text-xs"
            >
              <option value="papel">Crema</option>
              <option value="oscuro">Noir</option>
              <option value="blanco">Blanco</option>
            </select>
          </label>
          <label className="block font-medium text-neutral-700">
            Color
            <select
              value={colorDemo}
              onChange={(e) => setColorDemo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-2 py-2 text-xs"
            >
              <option value="#6E0C2B">Vino</option>
              <option value="#1C3128">Salvia</option>
              <option value="#9A3412">Brasa</option>
              <option value="#1E3A5F">Marino</option>
              <option value="#4C1D95">Autor</option>
            </select>
          </label>
        </div>
      </div>

      {/* Paso 2: Subir foto(s) de la carta del prospecto (opcional) */}
      <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-neutral-900">
              2. Subir foto de su carta física o pantalla (opcional · hasta 4 fotos)
            </p>
            <p className="text-[11px] text-neutral-500">
              Si subes foto de su carta, el Agente IA extrae sus platos y precios reales. Si lo dejas vacío, monta una carta de impacto adaptada a {tipo} en {zona}.
            </p>
          </div>
          {fotosCarta.length < 4 && (
            <label className="cursor-pointer rounded-xl border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800">
              {subiendoFoto ? 'Subiendo foto…' : '📷 Subir foto de su carta'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={subiendoFoto || pendienteAgente}
                onChange={(e) => {
                  void handleSubirFotosCarta(e.target.files);
                  e.currentTarget.value = '';
                }}
                className="hidden"
              />
            </label>
          )}
        </div>

        {fotosCarta.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {fotosCarta.map((u, idx) => (
              <div key={u} className="relative overflow-hidden rounded-lg border border-neutral-300 bg-neutral-50">
                <img src={u} alt={`Carta ${idx + 1}`} className="h-14 w-14 object-cover" />
                <button
                  type="button"
                  onClick={() => setFotosCarta((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white"
                  title="Quitar foto"
                >
                  ×
                </button>
              </div>
            ))}
            <span className="text-[11px] font-medium text-emerald-800">
              ✓ {fotosCarta.length} foto{fotosCarta.length === 1 ? '' : 's'} lista{fotosCarta.length === 1 ? '' : 's'} para leer con IA
            </span>
          </div>
        )}
      </div>

      {/* Paso 3: Control de imágenes IA (Logo + Banner + 5 o 6 platos en principal) */}
      <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-neutral-900">
            3. Imágenes generadas con IA para causar impacto ({totalImagenesEstimadas} imágenes en este pase)
          </p>
          <span className="text-[11px] text-neutral-500">
            Todas las fotos creadas podrán mejorarse o cambiarse manualmente en el panel
          </span>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={generarLogoIa}
              onChange={(e) => setGenerarLogoIa(e.target.checked)}
              className="h-4 w-4 accent-[#6E0C2B]"
            />
            <span>🎨 Generar Logo con IA</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={generarBannerIa}
              onChange={(e) => setGenerarBannerIa(e.target.checked)}
              className="h-4 w-4 accent-[#6E0C2B]"
            />
            <span>🖼️ Generar Banner / Portada IA</span>
          </label>

          <label className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium">
            <span>🍽️ Fotos IA en Principal:</span>
            <select
              value={cantidadPlatosIa}
              onChange={(e) => setCantidadPlatosIa(Number(e.target.value))}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-bold text-[#6E0C2B]"
            >
              <option value={6}>6 platos principales</option>
              <option value={5}>5 platos principales</option>
              <option value={4}>4 platos principales</option>
              <option value={0}>0 (subir a mano)</option>
            </select>
          </label>
        </div>

        <input
          type="text"
          value={instruccionExtra}
          onChange={(e) => setInstruccionExtra(e.target.value)}
          placeholder="Indicación opcional al Agente IA (ej. Destaca sus carnes a la brasa y arroces, estilo rústico elegante)…"
          maxLength={140}
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400"
        />
      </div>

      {/* Botonera principal: Flujo Agente IA vs Modo Manual */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pendienteAgente || subiendoFoto}
          onClick={lanzarAgenteUnificado}
          className="w-full sm:w-auto rounded-xl bg-[#6E0C2B] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#540921] disabled:opacity-50 whitespace-normal text-center"
        >
          {pendienteAgente
            ? '⏳ Ejecutando Agente IA…'
            : `✨ Ejecutar Agente IA (${ fotosCarta.length > 0 ? 'Leer Carta + ' : '' }Logo + Banner + ${cantidadPlatosIa} Fotos IA + Propuesta)`}
        </button>

        {restIdActivo && (
          <form action={abrirEditorDemoAction} className="inline w-full sm:w-auto">
            <input type="hidden" name="base" value={base} />
            <input type="hidden" name="restaurante_id" value={restIdActivo} />
            <input type="hidden" name="pestana" value="carta" />
            <button
              type="submit"
              className="w-full sm:w-auto rounded-xl border border-neutral-900 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 text-center"
            >
              🛠️ Modo Manual: Abrir Editor (/panel)
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => setChatAbierto((v) => !v)}
          className="w-full sm:w-auto sm:ml-auto rounded-xl border border-[#b08d57] bg-[#f7efe0] px-3.5 py-2.5 text-xs font-semibold text-[#5a421c] hover:bg-[#efe2c8] text-center"
        >
          💬 {chatAbierto ? 'Ocultar Chat' : 'Chat y Guiones con Agente IA'}
        </button>
      </div>

      {pasoActual && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-950">
          <p className="font-semibold">⚡ {pasoActual}</p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            Puede tardar entre 25 y 60 segundos mientras Vercel AI Gateway genera el logo, la portada y las fotos de los platos principales.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
          {error}
        </p>
      )}

      {resultado && (
        <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-xs text-emerald-950">
          <p className="font-bold">
            ✅ ¡Flujo completado! Demo de impacto + Propuesta listas para enseñar a {nombre}:
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {resultado.platosCreadosDeFoto > 0 && <li>📋 {resultado.platosCreadosDeFoto} platos leídos de su carta</li>}
            <li>🎨 Logo IA: {resultado.logoGenerado ? 'Creado' : 'Mantenido'}</li>
            <li>🖼️ Banner/Portada IA: {resultado.bannerGenerado ? 'Creado' : 'Mantenido'}</li>
            <li>🍽️ Platos principales con foto IA: {resultado.platosConFotoIa}</li>
            {resultado.restantesIa !== null && (
              <li>⚡ Créditos IA restantes en esta demo: {sinLimite ? 'Ilimitados' : resultado.restantesIa}</li>
            )}
          </ul>
          {resultado.aviso && <p className="mt-1 text-[11px] text-amber-800">Nota: {resultado.aviso}</p>}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <a
              href={`/m/${resultado.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Ver Carta Demo viva (/m/{resultado.slug}) ↗
            </a>
            <a
              href={`/demo/panel?local=${resultado.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-emerald-900 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950"
            >
              Abrir Simulador de Comandas ↗
            </a>
            <a
              href={`/propuesta/${resultado.propuestaToken}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-emerald-900 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950"
            >
              Ver Propuesta lista (/propuesta) ↗
            </a>
          </div>
        </div>
      )}

      {/* Chat y Asistente IA para Comerciales y Dirección */}
      {chatAbierto && (
        <div className="mt-3 rounded-xl border border-[#b08d57]/60 bg-white p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-neutral-900">
              💬 Asistente IA Comercial para {nombre} ({zona})
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={pendienteChat}
                onClick={() => consultarIa('guion_llamada')}
                className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold hover:bg-neutral-100"
              >
                📞 Guion llamada en vivo
              </button>
              <button
                type="button"
                disabled={pendienteChat}
                onClick={() => consultarIa('mensaje_whatsapp')}
                className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold hover:bg-neutral-100"
              >
                📲 WhatsApp / DM con Demo
              </button>
              <button
                type="button"
                disabled={pendienteChat}
                onClick={() => consultarIa('responder_objecion', 'El cliente dice que ahora mismo no tiene tiempo o que ya tiene un PDF')}
                className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold hover:bg-neutral-100"
              >
                🛡️ Rebatir objeción
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={preguntaChat}
              onChange={(e) => setPreguntaChat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && preguntaChat.trim()) {
                  e.preventDefault();
                  consultarIa('chat_libre');
                }
              }}
              placeholder="Pide al Agente IA: ej. «Adáptame el mensaje para enseñarle sus arroces», «Cómo le cierro hoy el plan Sala»…"
              className="w-full flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs"
            />
            <button
              type="button"
              disabled={pendienteChat}
              onClick={() => consultarIa('chat_libre')}
              className="w-full sm:w-auto rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pendienteChat ? 'Pensando…' : 'Preguntar IA'}
            </button>
          </div>

          {respuestaChat && (
            <div className="rounded-xl bg-[#faf6ee] p-3 text-xs text-neutral-900">
              <p className="whitespace-pre-wrap leading-relaxed">{respuestaChat}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(respuestaChat);
                    setCopiadoChat(true);
                    setTimeout(() => setCopiadoChat(false), 1800);
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold"
                >
                  {copiadoChat ? '¡Copiado!' : 'Copiar texto'}
                </button>
              </div>
            </div>
          )}

          {slugActivo && tokenActivo && (
            <p className="text-[11px] text-neutral-500">
              Enlaces activos en el contexto del Agente: Carta <code>/m/{slugActivo}</code> · Sala <code>/demo/panel?local={slugActivo}</code> · Propuesta <code>/propuesta/{tokenActivo.slice(0, 8)}…</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
