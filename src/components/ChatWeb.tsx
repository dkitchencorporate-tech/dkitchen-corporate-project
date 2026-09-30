'use client';

import ChatAyuda from '@/components/ayuda/ChatAyuda';
import { abrirSolicitud } from '@/components/Solicitud';
import { TEMAS_WEB, normalizar } from '@/lib/ayuda';

/**
 * Chat de la web pública (30/09/2026): sustituye al botón flotante de
 * WhatsApp. Resuelve dudas de venta y termina en el formulario global
 * (`#solicitud-<motivo>`), con WhatsApp como alternativa.
 */
export default function ChatWeb() {
  return (
    <ChatAyuda
      modo="web"
      temas={TEMAS_WEB}
      seccion={null}
      saludo="Hola. ¿Qué te gustaría saber? Elige una duda o escríbela abajo."
      posicion="bottom-5 right-5"
      onPersona={async () => {}}
      onSolicitud={(interes, contexto) => {
        // El formulario solo admite un detalle corto (60 caracteres, sin tildes).
        const ultimo = contexto.camino.at(-1) ?? contexto.busquedas.at(-1) ?? '';
        abrirSolicitud(interes, normalizar(`chat ${ultimo}`).slice(0, 60));
      }}
    />
  );
}
