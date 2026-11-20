'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  consultarAgenteProspeccionAction,
  guardarWhatsappBorradorAction,
  registrarEnvioWhatsappFrancotiradorAction,
} from '@/lib/prospeccion-acciones';
import type { BaseCrm } from '@/lib/prospeccion';

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
  const defecto =
    borradorInicial ||
    `Buenas, soy Alex, de DKitchen.\nOs hemos dejado montada una muestra real de la carta y panel de ${nombre} en ${zona} con vuestros platos para que la probéis sin compromiso.\nPodéis verla aquí desde el móvil: ${propuestaUrl}\nSi os encaja, comentamos dos minutos fuera de horas de servicio.`;

  const [preparacion, setPreparacion] = useState(preparacionInicial ?? '');
  const [mensaje, setMensaje] = useState(defecto);
  const [enviadoCuando, setEnviadoCuando] = useState<string | null>(ultimoEnvioWhatsapp);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [pendienteIa, iniciarIa] = useTransition();
  const [pendienteGuardar, iniciarGuardar] = useTransition();
  const [pendienteEnviar, iniciarEnviar] = useTransition();

  const telWa = normalizarTelefonoWa(telefono);

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
    if (telWa) {
      const url = `https://wa.me/${telWa}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
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
      setAviso(`Envío registrado. Tanda de hoy: ${r.enviosHoy} / 15 locales contactados por WhatsApp.`);
      router.refresh();
    });
  };

  return (
    <section
      id="francotirador"
      className="rounded-[24px] border-2 border-emerald-700/25 bg-gradient-to-br from-emerald-50/60 via-white to-papel p-4 sm:p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-900">
            Francotirador WhatsApp · Auditoría + Demo lista para enviar
          </p>
          <h2 className="font-display mt-1 text-xl font-semibold text-carbon">
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
            <span className="text-[11px] text-niebla">{mensaje.length}/1500 caracteres</span>
          </div>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={6}
            maxLength={1500}
            className="mt-1 w-full rounded-2xl border border-linea bg-white px-3.5 py-3 text-sm leading-relaxed text-carbon focus:border-emerald-700 focus:outline-none"
          />
        </div>

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
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
            {aviso}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {telWa && (
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
            className="min-h-[44px] rounded-full border border-[#b08d57] bg-[#faf6ee] px-4 py-2 text-xs font-bold text-[#5a421c] hover:bg-[#efe2c8] disabled:opacity-50"
          >
            {pendienteIa ? 'Redactando con Agente DK…' : 'Generar / Afinar Auditoría y WhatsApp con Agente DK'}
          </button>

          <button
            type="button"
            disabled={pendienteGuardar}
            onClick={guardarBorrador}
            className="min-h-[44px] rounded-full border border-linea bg-white px-4 py-2 text-xs font-semibold text-carbon hover:border-tinta disabled:opacity-50"
          >
            {pendienteGuardar ? 'Guardando…' : 'Guardar borrador'}
          </button>

          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(mensaje);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1800);
            }}
            className="min-h-[44px] rounded-full bg-papel px-4 py-2 text-xs font-semibold text-carbon ring-1 ring-linea hover:bg-white"
          >
            {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
          </button>
        </div>
      </div>
    </section>
  );
}
