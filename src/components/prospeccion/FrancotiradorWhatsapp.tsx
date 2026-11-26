'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  consultarAgenteProspeccionAction,
  guardarWhatsappBorradorAction,
  registrarEnvioWhatsappFrancotiradorAction,
} from '@/lib/prospeccion-acciones';
import type { BaseCrm } from '@/lib/prospeccion';
import CopiarEnlace from './CopiarEnlace';

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';

function normalizarTelefonoWa(telefono: string | null): string | null {
  if (!telefono) return null;
  const d = telefono.replace(/\D/g, '');
  if (!d) return null;
  const es = d.startsWith('34') && d.length >= 11 ? d.slice(2) : d;
  if (/^[67]\d{8}$/.test(es)) return `34${es}`;
  if (/^[89]\d{8}$/.test(es)) return null; // teléfono fijo español
  return d.length >= 9 ? d : null;
}

export default function FrancotiradorWhatsapp({
  base,
  prospectoId,
  nombre,
  zona,
  telefono,
  demoSlug,
  propuestaToken,
  preparacionInicial,
  borradorInicial,
  ultimoEnvioWhatsapp,
  noContactar,
}: {
  base: BaseCrm;
  prospectoId: string;
  nombre: string;
  zona: string;
  telefono: string | null;
  demoSlug: string | null;
  propuestaToken: string | null;
  preparacionInicial: string | null;
  borradorInicial: string | null;
  ultimoEnvioWhatsapp: string | null;
  noContactar: boolean;
}) {
  const router = useRouter();
  const propuestaUrl = propuestaToken ? `${SITIO}/propuesta/${propuestaToken}` : `${SITIO}/qr`;
  const cartaUrl = demoSlug ? `${SITIO}/m/${demoSlug}` : null;
  const panelDemoUrl = demoSlug ? `${SITIO}/demo/panel?local=${demoSlug}` : null;
  // 26/11 (Alex): estilo v4, lenguaje neutro (nunca os/vuestro/vosotros), cargo de consultor y saludo según la hora.
  const saludo = new Date().getHours() < 14 ? 'Buenos días' : 'Buenas tardes';
  const defecto = (
    borradorInicial ||
    `Buenos días, equipo de ${nombre}. Les escribe Alex, consultor de DKitchen; ayudamos a bares y restaurantes de ${zona} a presentar su carta en el móvil y a recibir pedidos sin comisiones.\n\nHemos preparado una demostración de cómo podría verse ${nombre}:\n${propuestaUrl}\n\nLleva platos, imágenes y precios de muestra, sin compromiso. Si resulta interesante, puedo acercarme estos días o lo comentamos por teléfono fuera del servicio.\n\nAlex\nConsultor digital · DKitchen\n\nSi prefieren no recibir más mensajes, indíquenmelo y así será.`
  ).replace(/^(Buenos días|Buenas tardes)/, saludo);

  const [preparacion, setPreparacion] = useState(preparacionInicial ?? '');
  const [mensaje, setMensaje] = useState(defecto);
  const [enviadoCuando, setEnviadoCuando] = useState<string | null>(ultimoEnvioWhatsapp);
  const [envioReciente, setEnvioReciente] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [pendienteIa, iniciarIa] = useTransition();
  const [pendienteGuardar, iniciarGuardar] = useTransition();
  const [pendienteEnviar, iniciarEnviar] = useTransition();

  const telWa = normalizarTelefonoWa(telefono);
  // 26/11 (Alex): mensaje en partes. Una línea que solo tenga --- separa cada burbuja;
  // el enlace va en la última. La parte 1 registra el envío; las demás solo abren WhatsApp.
  const partes = mensaje.split(/\n[ \t]*-{3,}[ \t]*\n/).map((p) => p.trim()).filter(Boolean);
  const enPartes = partes.length > 1;
  const [partesEnviadas, setPartesEnviadas] = useState(0);
  // Al volver de WhatsApp el móvil puede recargar la pestaña: se recuerda por qué parte iba.
  const clavePartes = `dk-franco-partes-${prospectoId}`;
  useEffect(() => {
    const n = Number(sessionStorage.getItem(clavePartes) || 0);
    if (n > 0) setPartesEnviadas(n);
  }, [clavePartes]);
  useEffect(() => {
    if (partesEnviadas > 0) sessionStorage.setItem(clavePartes, String(partesEnviadas));
  }, [clavePartes, partesEnviadas]);
  const abrirParte = (i: number) => {
    if (!telWa || noContactar) return;
    window.open(`https://wa.me/${telWa}?text=${encodeURIComponent(partes[i])}`, '_blank', 'noopener,noreferrer');
    setPartesEnviadas((n) => Math.max(n, i + 1));
  };
  const textoPlano = partes.join('\n\n');

  const afinarConAgente = () => {
    setError(null);
    setAviso(null);
    iniciarIa(async () => {
      const r = await consultarAgenteProspeccionAction({
        prospectoId,
        modo: 'mensaje_whatsapp',
        texto: preparacion.trim() || mensaje,
        demoSlug,
        propuestaToken,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMensaje(r.respuesta);
      setAviso('Mensaje afinado y guardado para enviar.');
      router.refresh();
    });
  };

  const guardarBorrador = () => {
    setError(null);
    setAviso(null);
    iniciarGuardar(async () => {
      const r = await guardarWhatsappBorradorAction({
        base,
        prospectoId,
        texto: mensaje,
        preparacion,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAviso('Auditoría y borrador de WhatsApp guardados.');
      router.refresh();
    });
  };

  const enviarYRegistrar = () => {
    if (noContactar) {
      setError('Este local está marcado como «No contactar».');
      return;
    }
    setError(null);
    setAviso(null);
    // 26/11: sin teléfono no hay envío real, así que no se registra nada.
    if (!telWa) {
      setError('Este local no tiene teléfono: copia el mensaje o visítalo; no se registra ningún envío.');
      return;
    }
    if (enPartes) {
      abrirParte(0);
    } else {
      window.open(`https://wa.me/${telWa}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
    }
    iniciarEnviar(async () => {
      const r = await registrarEnvioWhatsappFrancotiradorAction({
        base,
        prospectoId,
        texto: mensaje,
        preparacion,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const ahora = new Date().toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      setEnviadoCuando(ahora);
      setEnvioReciente(true);
      setAviso(
        enPartes
          ? `Parte 1 enviada y registrada (Tanda de hoy: ${r.enviosHoy} / 15). Vuelve aquí y pulsa la parte 2.`
          : `Envío registrado (Tanda de hoy: ${r.enviosHoy} / 15). Queda en «Demo hecha» con seguimiento a 48 h.`,
      );
      router.refresh();
    });
  };

  const pillRevision = 'inline-flex items-center rounded-full border border-emerald-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:border-emerald-700';

  return (
    <section
      id="francotirador"
      className="rounded-[24px] border-2 border-emerald-700/25 bg-gradient-to-br from-emerald-50/60 via-white to-papel p-4 sm:p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-900 sm:tracking-[0.18em]">
            Francotirador WhatsApp · Auditoría + Demo lista para enviar
          </p>
          <h2 className="font-display mt-1 break-words text-xl font-semibold text-carbon">
            Mensaje personalizado de {nombre}
          </h2>
        </div>
        {enviadoCuando ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
            WhatsApp enviado ({enviadoCuando})
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            Listo para primer impacto
          </span>
        )}
      </div>

      {(propuestaToken || demoSlug) && (
        <div className="mt-3 rounded-2xl border border-emerald-900/15 bg-white/85 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-900">
            Revisión rápida antes de enviar (sin sumar visitas)
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {propuestaToken && (
              <>
                <a href={`/propuesta/${propuestaToken}?preview=1`} target="_blank" rel="noopener noreferrer" className={pillRevision}>
                  Ver Propuesta ↗
                </a>
                <CopiarEnlace texto={propuestaUrl} etiqueta="Copiar link Propuesta" className={pillRevision} />
              </>
            )}
            {cartaUrl && demoSlug && (
              <>
                <a href={`/m/${demoSlug}`} target="_blank" rel="noopener noreferrer" className={pillRevision}>
                  Ver Carta (/m/{demoSlug}) ↗
                </a>
                <CopiarEnlace texto={cartaUrl} etiqueta="Copiar link Carta" className={pillRevision} />
              </>
            )}
            {panelDemoUrl && demoSlug && (
              <a href={`/demo/panel?local=${demoSlug}&preview=1`} target="_blank" rel="noopener noreferrer" className={pillRevision}>
                Ver Simulador del Dueño ↗
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-grafito">
            Auditoría digital real (qué falla hoy y argumento clave al hablarle)
          </label>
          <textarea
            value={preparacion}
            onChange={(e) => setPreparacion(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Diagnóstico del local (web caída, Drive, Linktree, comisiones delivery, reseñas…)"
            className="mt-1 w-full rounded-2xl border border-linea bg-white px-3.5 py-2.5 text-xs leading-relaxed text-carbon focus:border-emerald-700 focus:outline-none"
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-semibold text-grafito">
              Mensaje de WhatsApp listo (sin emojis, directo y con enlace a su propuesta)
            </label>
            <span className="text-[11px] text-niebla">{enPartes ? `${partes.length} partes · ` : ''}{mensaje.length}/1500 caracteres</span>
          </div>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={enPartes ? 12 : 6}
            maxLength={1500}
            className="mt-1 w-full rounded-2xl border border-linea bg-white px-3.5 py-3 text-sm leading-relaxed text-carbon focus:border-emerald-700 focus:outline-none"
          />
        </div>

        <p className="text-[11px] text-niebla">
          Para enviarlo en varios mensajes, separa cada parte con una línea que solo tenga <b>---</b>. El enlace, en la última.
        </p>

        {!telWa && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {telefono
              ? `El teléfono guardado (${telefono}) es fijo o no admite WhatsApp directo: usa «Copiar mensaje» para Instagram DM o muéstrale su demo en visita presencial.`
              : 'Este local no tiene móvil guardado: usa «Copiar mensaje» para Instagram DM o visita presencial.'}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
            {error}
          </p>
        )}
        {aviso && (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900">
            <p>{aviso}</p>
            {envioReciente && (!enPartes || partesEnviadas >= partes.length) && (
              <Link
                href={base}
                className="inline-flex min-h-[38px] items-center rounded-full bg-tinta px-4 py-1.5 text-xs font-bold text-white hover:bg-vino"
              >
                ← Volver a locales pendientes de envío
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {telWa && enPartes && (
            <div className="w-full space-y-2 rounded-2xl border border-emerald-900/15 bg-white/85 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-900">
                Envío en {partes.length} partes · pulsa, envía en WhatsApp y vuelve aquí
              </p>
              {partes.map((p, i) => {
                const hecha = partesEnviadas > i;
                const toca = partesEnviadas === i;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={noContactar || (i === 0 ? pendienteEnviar || hecha : !toca && !hecha)}
                    onClick={i === 0 ? enviarYRegistrar : () => abrirParte(i)}
                    className={`flex w-full min-h-[44px] items-start gap-3 rounded-2xl px-4 py-2.5 text-left text-sm ${
                      hecha
                        ? 'bg-emerald-100 text-emerald-950'
                        : toca
                          ? 'bg-emerald-700 font-bold text-white shadow-sm hover:bg-emerald-800'
                          : 'bg-papel text-niebla ring-1 ring-linea'
                    } disabled:opacity-60`}
                  >
                    <span className="shrink-0 font-bold">{hecha ? '✓' : `${i + 1}.`}</span>
                    <span className="min-w-0">
                      <span className="block font-bold">
                        {i === 0 && pendienteEnviar
                          ? 'Registrando envío…'
                          : `${hecha ? 'Enviada' : 'Enviar'} parte ${i + 1}${i === partes.length - 1 ? ' (enlace)' : ''}${i === 0 ? ' y registrar' : ''}`}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-normal opacity-80">{p.split('\n')[0]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {telWa && !enPartes && (
            <button
              type="button"
              disabled={pendienteEnviar || noContactar}
              onClick={enviarYRegistrar}
              className="w-full sm:w-auto min-h-[44px] rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {pendienteEnviar ? 'Registrando envío…' : 'Abrir WhatsApp con este mensaje y registrar envío'}
            </button>
          )}

          <button
            type="button"
            disabled={pendienteIa}
            onClick={afinarConAgente}
            className="w-full sm:w-auto min-h-[44px] rounded-full border border-[#b08d57] bg-[#faf6ee] px-4 py-2 text-center text-xs font-bold leading-snug text-[#5a421c] hover:bg-[#efe2c8] disabled:opacity-50"
          >
            {pendienteIa ? 'Redactando con Agente DK…' : 'Generar / Afinar Auditoría y WhatsApp con Agente DK'}
          </button>

          <button
            type="button"
            disabled={pendienteGuardar}
            onClick={guardarBorrador}
            className="w-full sm:w-auto min-h-[44px] rounded-full border border-linea bg-white px-4 py-2 text-center text-xs font-semibold text-carbon hover:border-tinta disabled:opacity-50"
          >
            {pendienteGuardar ? 'Guardando…' : 'Guardar borrador'}
          </button>

          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(textoPlano);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1800);
            }}
            className="w-full sm:w-auto min-h-[44px] rounded-full bg-papel px-4 py-2 text-center text-xs font-semibold text-carbon ring-1 ring-linea hover:bg-white"
          >
            {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
          </button>
        </div>
      </div>
    </section>
  );
}
