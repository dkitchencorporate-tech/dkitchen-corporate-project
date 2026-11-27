'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  consultarAgenteProspeccionAction,
  guardarWhatsappBorradorAction,
  registrarEnvioWhatsappFrancotiradorAction,
  numeroNoEsDelLocalAction,
  guardarRedProspectoAction,
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

/**
 * 26/11 (Alex): todos los mensajes salen en 3 burbujas, sin copiar ni pegar.
 * Si el texto ya trae líneas «---», se respetan. Si no, se divide solo:
 * 1) el saludo, 2) lo que hemos visto del local y 3) desde el enlace hasta el final.
 */
export function dividirEnPartes(mensaje: string): string[] {
  const manual = mensaje.split(/\n[ \t]*-{3,}[ \t]*\n/).map((p) => p.trim()).filter(Boolean);
  if (manual.length > 1) return manual;
  const parrafos = mensaje.split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean);
  const conEnlace = parrafos.findIndex((p) => /https?:\/\//.test(p));
  if (parrafos.length < 3 || conEnlace < 1) return manual;
  if (conEnlace === 1) return [parrafos[0], parrafos.slice(1).join('\n\n')];
  return [parrafos[0], parrafos.slice(1, conEnlace).join('\n\n'), parrafos.slice(conEnlace).join('\n\n')];
}

export default function FrancotiradorWhatsapp({
  base,
  prospectoId,
  nombre,
  zona,
  telefono,
  instagram,
  facebook,
  tiktok,
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
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
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
  // 27/11 (Alex): prospectar por el canal que más usa el local. En redes: seguir primero, copiar y pegar en su chat.
  type CanalF = 'whatsapp' | 'instagram' | 'facebook' | 'tiktok';
  const [canal, setCanal] = useState<CanalF>(telWa ? 'whatsapp' : instagram ? 'instagram' : 'facebook');
  const enWa = canal === 'whatsapp';
  const [copiadoDm, setCopiadoDm] = useState(false);
  const [redes, setRedes] = useState<Record<'instagram' | 'facebook' | 'tiktok', string>>({
    instagram: (instagram || '').replace(/^@/, ''), facebook: facebook || '', tiktok: (tiktok || '').replace(/^@/, ''),
  });
  const [editandoRed, setEditandoRed] = useState(false);
  const [valorRed, setValorRed] = useState('');
  const [pendienteRed, iniciarRed] = useTransition();
  const nombreQ = encodeURIComponent(`"${nombre}" ${zona}`);
  const perfilRed: Record<Exclude<CanalF, 'whatsapp'>, { nombre: string; url: string | null; buscar: string; ayuda: string }> = {
    instagram: { nombre: 'Instagram', url: redes.instagram ? `https://www.instagram.com/${redes.instagram}/` : null, buscar: `https://www.google.com/search?q=${nombreQ}+instagram`, ayuda: 'Pega el enlace o el usuario (@cuenta)' },
    facebook: { nombre: 'Facebook', url: redes.facebook || null, buscar: `https://www.google.com/search?q=${nombreQ}+facebook`, ayuda: 'Pega el enlace de su página de Facebook' },
    tiktok: { nombre: 'TikTok', url: redes.tiktok ? `https://www.tiktok.com/@${redes.tiktok}` : null, buscar: `https://www.google.com/search?q=${nombreQ}+tiktok`, ayuda: 'Pega el enlace o el usuario (@cuenta)' },
  };
  const guardarRed = (red: 'instagram' | 'facebook' | 'tiktok', valor: string) => {
    setError(null);
    iniciarRed(async () => {
      const r = await guardarRedProspectoAction({ base, prospectoId, red, valor });
      if (!r.ok) { setError(r.error); return; }
      const limpio = red === 'facebook'
        ? (valor.trim() && !/^https?:\/\//.test(valor.trim()) ? `https://${valor.trim()}` : valor.trim())
        : valor.trim().replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/, '').replace(/^@/, '').replace(/[/?].*$/, '');
      setRedes((x) => ({ ...x, [red]: red === 'instagram' ? limpio.toLowerCase() : limpio }));
      setEditandoRed(false);
      setValorRed('');
      router.refresh();
    });
  };
  const textoDm = dividirEnPartes(mensaje).join('\n\n');
  // 26/11 (Alex): mensaje en partes. Una línea que solo tenga --- separa cada burbuja;
  // el enlace va en la última. La parte 1 registra el envío; las demás solo abren WhatsApp.
  const partes = dividirEnPartes(mensaje);
  const enPartes = partes.length > 1;
  const [partesEnviadas, setPartesEnviadas] = useState(0);
  // 27/11 (caso La Góndola): antes de enviar, comprobar que el perfil de WhatsApp es del local.
  const claveVerif = `dk-franco-verif-${prospectoId}`;
  const [verificado, setVerificado] = useState(false);
  const [numeroMal, setNumeroMal] = useState(false);
  useEffect(() => { if (sessionStorage.getItem(claveVerif) === '1') setVerificado(true); }, [claveVerif]);
  const confirmarPerfil = () => { sessionStorage.setItem(claveVerif, '1'); setVerificado(true); };
  const marcarNumeroMal = () => {
    setError(null);
    iniciarEnviar(async () => {
      const r = await numeroNoEsDelLocalAction({ base, prospectoId });
      if (!r.ok) { setError(r.error); return; }
      setNumeroMal(true);
      setAviso('Anotado: el número no es del local. No se envía nada; el siguiente paso queda en «Verificar teléfono».');
      router.refresh();
    });
  };
  // Al volver de WhatsApp el móvil puede recargar la pestaña: se recuerda por qué parte iba.
  const clavePartes = `dk-franco-partes-${prospectoId}`;
  useEffect(() => {
    const n = Number(sessionStorage.getItem(clavePartes) || 0);
    if (n > 0) setPartesEnviadas(n);
  }, [clavePartes]);
  useEffect(() => {
    if (partesEnviadas > 0) sessionStorage.setItem(clavePartes, String(partesEnviadas));
  }, [clavePartes, partesEnviadas]);
  // 27/11 (Alex): abrir NO es enviar. Las partes se pueden abrir siempre, en cualquier orden y
  // las veces que haga falta; solo cuenta como enviado cuando Alex pulsa «Ya los envié».
  const bloqueado = Boolean(enviadoCuando) || noContactar;
  // 27/11: el estado real vive en la base. Al volver a la pestaña (p. ej. tras enviar desde el
  // móvil) se recarga la ficha, así el PC y el móvil ven lo mismo sin tocar nada.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') router.refresh(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    const t = window.setInterval(alVolver, 30000);
    return () => { document.removeEventListener('visibilitychange', alVolver); window.removeEventListener('focus', alVolver); window.clearInterval(t); };
  }, [router]);
  useEffect(() => { setEnviadoCuando(ultimoEnvioWhatsapp); }, [ultimoEnvioWhatsapp]);
  const abrirParte = (i: number) => {
    if (!telWa || bloqueado) return;
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
    if (enWa && !telWa) {
      setError('Este local no tiene teléfono: copia el mensaje o visítalo; no se registra ningún envío.');
      return;
    }
    iniciarEnviar(async () => {
      const r = await registrarEnvioWhatsappFrancotiradorAction({
        base,
        prospectoId,
        texto: enWa ? mensaje : textoDm,
        preparacion,
        canal,
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
      sessionStorage.removeItem(clavePartes);
      setAviso(`Envío registrado (Tanda de hoy: ${r.enviosHoy} / 15). Queda en «Propuesta enviada» con seguimiento a 48 h.`);
      router.refresh();
    });
  };

  const pillRevision = 'inline-flex items-center rounded-full border border-emerald-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:border-emerald-700';
  const yaEnviado = Boolean(enviadoCuando) && !envioReciente;

  return (
    <section
      id="francotirador"
      className="rounded-[24px] border-2 border-emerald-700/25 bg-gradient-to-br from-emerald-50/60 via-white to-papel p-4 sm:p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-900 sm:tracking-[0.18em]">
            Francotirador · Enviar WhatsApp
          </p>
          <h2 className="font-display mt-1 break-words text-xl font-semibold text-carbon">{nombre}</h2>
        </div>
        {enviadoCuando ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
            Enviado ({enviadoCuando})
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Sin enviar</span>
        )}
      </div>

      {yaEnviado && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          A este local ya se le escribió el {enviadoCuando}. No lo repitas: toca llamada o visita.
          <Link href={`${base}?zona=enviar`} className="mt-2 flex min-h-[38px] w-fit items-center rounded-full bg-tinta px-4 py-1.5 text-xs font-bold text-white hover:bg-vino">← Siguiente local por enviar</Link>
        </p>
      )}
      {!bloqueado && (
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-900">Canal · elige el que más usa el local</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(['whatsapp', 'instagram', 'facebook', 'tiktok'] as CanalF[]).map((c) => (
              <button key={c} type="button" onClick={() => { setCanal(c); setCopiadoDm(false); }}
                className={`inline-flex min-h-[36px] items-center rounded-full px-3.5 text-xs font-bold ${canal === c ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-950 ring-1 ring-emerald-900/20 hover:ring-emerald-700'}`}>
                {c === 'whatsapp' ? 'WhatsApp' : perfilRed[c].nombre}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-niebla">El correo no aparece a propósito: por ley (LSSI) solo se puede escribir por correo a quien lo haya autorizado.</p>
        </div>
      )}

      {!enWa && !bloqueado && (() => {
        const red = perfilRed[canal as Exclude<CanalF, 'whatsapp'>];
        return (
          <div className="mt-3 space-y-2">
            {textoDm.length > 1000 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">El mensaje tiene {textoDm.length} caracteres y en Instagram el máximo es 1.000: acórtalo en «Ver o cambiar el texto» antes de copiarlo.</p>}
            {canal === 'tiktok' && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">TikTok solo deja escribir a cuentas que te siguen o que tienen los mensajes abiertos. Si no aparece el botón «Mensaje», usa otro canal.</p>}
            {red.url && !editandoRed ? (
              <div className="flex flex-wrap items-center gap-2">
                <a href={red.url} target="_blank" rel="noopener noreferrer" className="flex min-h-[52px] flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-linea hover:ring-emerald-700">
                  <span className="font-bold">1.</span>
                  <span><b>Abrir su {red.nombre} y seguirle</b><span className="block text-xs text-niebla">Cuenta verificada por ti · seguirle antes hace que tu mensaje no llegue de un desconocido.</span></span>
                </a>
                <button type="button" onClick={() => { setEditandoRed(true); setValorRed(''); }} className="min-h-[36px] rounded-full bg-white px-3 text-[11px] font-bold text-grafito ring-1 ring-linea">Cambiar cuenta</button>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl bg-white p-3.5 ring-1 ring-amber-300">
                <p className="text-xs font-bold text-amber-950">1. Encuentra y verifica su {red.nombre}</p>
                <a href={red.buscar} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center rounded-full bg-amber-100 px-3.5 text-xs font-bold text-amber-950 hover:bg-amber-200">Buscar «{nombre}» en {red.nombre} ↗</a>
                <p className="text-[11px] text-niebla">Comprueba que es la cuenta del local (nombre, fotos, dirección) y pega aquí su enlace. Quedará guardada en la ficha.</p>
                <div className="flex gap-2">
                  <input value={valorRed} onChange={(e) => setValorRed(e.target.value)} placeholder={red.ayuda} className="min-w-0 flex-1 rounded-xl border border-linea px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none" />
                  <button type="button" disabled={pendienteRed || !valorRed.trim()} onClick={() => guardarRed(canal as 'instagram' | 'facebook' | 'tiktok', valorRed)} className="rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white disabled:opacity-50">{pendienteRed ? 'Guardando…' : 'Guardar'}</button>
                </div>
                {red.url && <button type="button" onClick={() => setEditandoRed(false)} className="text-[11px] font-semibold text-niebla underline">Cancelar</button>}
              </div>
            )
            <button type="button" onClick={() => { void navigator.clipboard.writeText(textoDm).then(() => setCopiadoDm(true)); }}
              className={`flex w-full min-h-[52px] items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm ${copiadoDm ? 'bg-emerald-100 text-emerald-950' : 'bg-emerald-700 font-bold text-white hover:bg-emerald-800'}`}>
              <span className="font-bold">{copiadoDm ? '✓' : '2.'}</span>
              <span><b>{copiadoDm ? 'Mensaje copiado' : 'Copiar el mensaje'}</b><span className="block text-xs font-normal opacity-80">Un solo mensaje con el enlace ({textoDm.length} caracteres). Pégalo en su chat de {red.nombre} y envíalo: en redes, si no te siguen, solo deja enviar un primer mensaje hasta que lo acepten.</span></span>
            </button>
            <button type="button" disabled={pendienteEnviar || !copiadoDm} onClick={enviarYRegistrar}
              className="w-full min-h-[48px] rounded-2xl bg-tinta px-5 py-3 text-sm font-bold text-white hover:bg-vino disabled:opacity-50">
              {pendienteEnviar ? 'Registrando envío…' : copiadoDm ? `3. Ya lo envié por ${red.nombre} · registrar y bloquear` : '3. Copia el mensaje para poder registrar'}
            </button>
          </div>
        );
      })()}

      {enWa && !telWa && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {telefono
            ? `El teléfono guardado (${telefono}) es fijo o no admite WhatsApp: llama o visítalo. No se registra ningún envío.`
            : 'Este local no tiene móvil guardado: llama o visítalo. No se registra ningún envío.'}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
          {error}
        </p>
      )}
      {aviso && (
        <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900">
          <p>{aviso}</p>
          {envioReciente && (
            <Link
              href={`${base}?zona=enviar`}
              className="inline-flex min-h-[38px] items-center rounded-full bg-tinta px-4 py-1.5 text-xs font-bold text-white hover:bg-vino"
            >
              ← Siguiente local por enviar
            </Link>
          )}
        </div>
      )}

      {enWa && telWa && !bloqueado && !numeroMal && (
        <div className={`mt-3 rounded-2xl border px-3.5 py-3 text-xs ${verificado ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
          {verificado ? (
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">✓ Perfil comprobado: el número es del local.</p><button type="button" onClick={() => { sessionStorage.removeItem(claveVerif); setVerificado(false); }} className="inline-flex min-h-[32px] items-center rounded-full bg-white px-3 text-[11px] font-bold text-emerald-900 ring-1 ring-emerald-300 hover:ring-emerald-700">Deshacer</button></div>
          ) : (
            <>
              <p className="font-bold">Paso 0 · Comprueba que el número es del local</p>
              <p className="mt-1">Abre el mensaje 1 <b>sin enviarlo</b>, toca el nombre arriba del chat y mira el perfil: nombre, foto y empresa deben ser de {nombre}. Si no coincide, no envíes nada.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={confirmarPerfil} className="inline-flex min-h-[38px] items-center rounded-full bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800">Es del local</button>
                <button type="button" onClick={marcarNumeroMal} disabled={pendienteEnviar} className="inline-flex min-h-[38px] items-center rounded-full bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60">No es del local · no enviar</button>
              </div>
            </>
          )}
        </div>
      )}

      {enWa && telWa && enPartes && !numeroMal && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-900">
            {partes.length} mensajes · ábrelos, envíalos en WhatsApp y, al terminar, confirma abajo
          </p>
          {partes.map((p, i) => {
            const hecha = partesEnviadas > i;
            const toca = partesEnviadas === i;
            return (
              <button
                key={i}
                type="button"
                disabled={bloqueado || (i > 0 && !verificado)}
                onClick={() => abrirParte(i)}
                className={`flex w-full min-h-[52px] items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm ${
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
                    {`${hecha ? 'Abierto' : 'Abrir'} mensaje ${i + 1}${i === partes.length - 1 ? ' (enlace)' : ''}${hecha && !bloqueado ? ' · volver a abrir' : ''}`}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-normal opacity-80">{p.split('\n')[0]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {enWa && telWa && !enPartes && (
        <button
          type="button"
          disabled={bloqueado}
          onClick={() => { window.open(`https://wa.me/${telWa}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer'); setPartesEnviadas(1); }}
          className="mt-3 w-full min-h-[52px] rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
        >
          Abrir el mensaje en WhatsApp
        </button>
      )}

      {enWa && telWa && !bloqueado && !numeroMal && (
        <button
          type="button"
          disabled={pendienteEnviar || !verificado}
          onClick={enviarYRegistrar}
          className="mt-2 w-full min-h-[48px] rounded-2xl bg-tinta px-5 py-3 text-sm font-bold text-white hover:bg-vino disabled:opacity-60"
        >
          {pendienteEnviar
            ? 'Registrando envío…'
            : `Ya envié ${enPartes ? `los ${partes.length} mensajes` : 'el mensaje'} · registrar y bloquear`}
        </button>
      )}

      {(propuestaToken || demoSlug) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {propuestaToken && (
            <a href={`/propuesta/${propuestaToken}?preview=1`} target="_blank" rel="noopener noreferrer" className={pillRevision}>
              Ver su propuesta ↗
            </a>
          )}
          {demoSlug && (
            <a href={`/m/${demoSlug}`} target="_blank" rel="noopener noreferrer" className={pillRevision}>
              Ver su carta ↗
            </a>
          )}
        </div>
      )}

      <details className="mt-3 rounded-2xl border border-linea bg-white/85">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-grafito">Ver o cambiar el texto, la auditoría y los enlaces</summary>
        <div className="space-y-3 border-t border-linea p-3.5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-grafito">Mensaje de WhatsApp</label>
              <span className="text-[11px] text-niebla">{enPartes ? `${partes.length} mensajes · ` : ''}{mensaje.length}/1500 caracteres</span>
            </div>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={12}
              maxLength={1500}
              className="mt-1 w-full rounded-2xl border border-linea bg-white px-3.5 py-3 text-sm leading-relaxed text-carbon focus:border-emerald-700 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-niebla">
              Se divide solo en 3: el saludo, lo que hemos visto del local y, desde el enlace, el resto. Para cortarlo a mano, pon una línea con <b>---</b>.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-grafito">Auditoría del local (argumento al hablarle)</label>
            <textarea
              value={preparacion}
              onChange={(e) => setPreparacion(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Diagnóstico del local (web caída, Drive, Linktree, comisiones delivery, reseñas…)"
              className="mt-1 w-full rounded-2xl border border-linea bg-white px-3.5 py-2.5 text-xs leading-relaxed text-carbon focus:border-emerald-700 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pendienteGuardar}
              onClick={guardarBorrador}
              className="min-h-[44px] rounded-full bg-tinta px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pendienteGuardar ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              disabled={pendienteIa}
              onClick={afinarConAgente}
              className="min-h-[44px] rounded-full border border-[#b08d57] bg-[#faf6ee] px-4 py-2 text-xs font-bold text-[#5a421c] hover:bg-[#efe2c8] disabled:opacity-50"
            >
              {pendienteIa ? 'Redactando con Agente DK…' : 'Reescribir con Agente DK'}
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(textoPlano);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1800);
              }}
              className="min-h-[44px] rounded-full bg-papel px-4 py-2 text-xs font-semibold text-carbon ring-1 ring-linea hover:bg-white"
            >
              {copiado ? 'Copiado' : 'Copiar (para Instagram)'}
            </button>
          </div>
          {(propuestaToken || cartaUrl) && (
            <div className="flex flex-wrap items-center gap-2">
              {propuestaToken && <CopiarEnlace texto={propuestaUrl} etiqueta="Copiar enlace de la propuesta" className={pillRevision} />}
              {cartaUrl && <CopiarEnlace texto={cartaUrl} etiqueta="Copiar enlace de la carta" className={pillRevision} />}
              {panelDemoUrl && demoSlug && (
                <a href={`/demo/panel?local=${demoSlug}&preview=1`} target="_blank" rel="noopener noreferrer" className={pillRevision}>
                  Simulador del dueño ↗
                </a>
              )}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
