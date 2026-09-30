'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { buscarTemas, temasDeSeccion, type AccionAyuda, type ContextoAyuda, type TemaAyuda } from '@/lib/ayuda';

/**
 * Chat de ayuda sin IA (30/09/2026): burbuja flotante que abre un panel
 * lateral (escritorio) u hoja inferior (móvil). Respuestas en árbol según la
 * sección, búsqueda por palabras y, como salida, una persona. Se abre también
 * con el evento global `dk:ayuda`.
 */
export function abrirAyuda() {
  window.dispatchEvent(new Event('dk:ayuda'));
}

type Entrada =
  | { tipo: 'bot'; lineas: string[] }
  | { tipo: 'yo'; texto: string }
  | { tipo: 'tema'; tema: TemaAyuda }
  | { tipo: 'opciones'; temas: TemaAyuda[]; titulo?: string }
  | { tipo: 'utilidad'; tema: TemaAyuda }
  | { tipo: 'puesta' }
  | { tipo: 'persona' }
  | { tipo: 'enviado'; texto: string };

export interface PropsChat {
  modo: 'panel' | 'web';
  temas: TemaAyuda[];
  seccion: string | null;
  saludo: string;
  /** Clases de posición de la burbuja (cambian entre panel y web). */
  posicion: string;
  onIr?: (pestana: string) => void;
  /** Puesta a punto: solo panel y solo si no la tiene ya. */
  puesta?: { precio: string; comprar: () => Promise<void> } | null;
  /** Paso a una persona. En el panel crea un ticket; en la web abre el formulario. */
  onPersona: (datos: { asunto: string; mensaje: string; contexto: ContextoAyuda }) => Promise<string | void>;
  onSolicitud?: (interes: string, contexto: ContextoAyuda) => void;
}

const CURVA = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function ChatAyuda({ modo, temas, seccion, saludo, posicion, onIr, puesta, onPersona, onSolicitud }: PropsChat) {
  const [abierto, setAbierto] = useState(false);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [texto, setTexto] = useState('');
  const [camino, setCamino] = useState<string[]>([]);
  const [busquedas, setBusquedas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const fin = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const contexto = (): ContextoAyuda => ({ seccion, camino, busquedas, pagina: typeof location !== 'undefined' ? location.pathname : undefined });

  const reiniciar = () => {
    setEntradas([{ tipo: 'bot', lineas: [saludo] }, { tipo: 'opciones', temas: temasDeSeccion(temas, seccion) }]);
    setCamino([]); setBusquedas([]); setMensaje(''); setError('');
  };

  useEffect(() => {
    const abrir = () => setAbierto(true);
    const cerrarSiModal = () => { if (modo === 'web') setAbierto(false); };
    window.addEventListener('dk:ayuda', abrir);
    window.addEventListener('modal-open', cerrarSiModal);
    return () => { window.removeEventListener('dk:ayuda', abrir); window.removeEventListener('modal-open', cerrarSiModal); };
  }, [modo]);

  // Cada vez que se abre en otra sección, empieza por las dudas de esa sección.
  useEffect(() => { if (abierto) reiniciar(); }, [abierto, seccion]);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [entradas]);
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto]);

  const poner = (...nuevas: Entrada[]) => setEntradas((e) => [...e, ...nuevas]);

  function elegir(tema: TemaAyuda) {
    setCamino((c) => [...c, tema.pregunta].slice(-12));
    poner({ tipo: 'yo', texto: tema.pregunta }, { tipo: 'tema', tema }, { tipo: 'utilidad', tema });
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = texto.trim().slice(0, 300);
    if (!q) return;
    setTexto('');
    setBusquedas((b) => [...b, q].slice(-6));
    const hallados = buscarTemas(temas, q);
    if (hallados.length === 1) { setCamino((c) => [...c, `«${q}» → ${hallados[0].pregunta}`].slice(-12)); poner({ tipo: 'yo', texto: q }, { tipo: 'tema', tema: hallados[0] }, { tipo: 'utilidad', tema: hallados[0] }); return; }
    if (hallados.length) { poner({ tipo: 'yo', texto: q }, { tipo: 'opciones', temas: hallados, titulo: '¿Es alguna de estas?' }); return; }
    setMensaje((m) => m || q);
    poner({ tipo: 'yo', texto: q }, { tipo: 'bot', lineas: ['No tengo una respuesta preparada para eso.'] }, { tipo: 'persona' });
  }

  function noSirvio(tema: TemaAyuda) {
    setCamino((c) => [...c, `No resolvió: ${tema.pregunta}`].slice(-12));
    const siguientes = (tema.siguientes ?? []).map((id) => temas.find((t) => t.id === id)).filter(Boolean) as TemaAyuda[];
    poner({ tipo: 'yo', texto: 'No, sigo igual' });
    if (siguientes.length) poner({ tipo: 'opciones', temas: siguientes, titulo: '¿Va por aquí?' });
    poner({ tipo: 'persona' });
  }

  function sinTiempo() {
    setCamino((c) => [...c, 'No sé / no tengo tiempo'].slice(-12));
    poner({ tipo: 'yo', texto: 'No sé hacerlo o no tengo tiempo' }, { tipo: 'puesta' });
  }

  async function enviarPersona() {
    const m = mensaje.trim();
    if (m.length < 3) { setError('Cuéntanos en una frase qué necesitas.'); return; }
    setEnviando(true); setError('');
    const ultimo = camino.filter((c) => !c.startsWith('No resolvió')).at(-1)?.replace(/^«.*» → /, '');
    try {
      const r = await onPersona({ asunto: `Ayuda: ${ultimo ?? 'consulta desde el chat'}`.slice(0, 120), mensaje: m.slice(0, 2000), contexto: contexto() });
      poner({ tipo: 'enviado', texto: r || 'Recibido. Te responde una persona de DKitchen por correo y en Ayuda → Soporte, normalmente en el mismo día laborable.' });
      setMensaje('');
    } catch {
      setError('No se pudo enviar. Inténtalo de nuevo.');
    } finally { setEnviando(false); }
  }

  function accion(a: AccionAyuda) {
    if (a.tipo === 'ir') { onIr?.(a.pestana); setAbierto(false); }
    else if (a.tipo === 'solicitud') { onSolicitud?.(a.interes, contexto()); setAbierto(false); }
  }

  const botonOpcion = 'block w-full rounded-2xl border border-[#E6E2DC] bg-white px-4 py-3 text-left text-[14px] font-medium text-[#1B1D22] transition hover:border-[#6E0C2B]/40 hover:bg-[#FBF8F5]';

  return (
    <>
      <AnimatePresence>
        {!abierto && (
          <motion.button key="burbuja" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.25, ease: CURVA }}
            onClick={() => setAbierto(true)} aria-label="Abrir la ayuda"
            className={`fixed z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#6E0C2B] text-white shadow-[0_14px_34px_rgba(62,5,21,.4)] ring-1 ring-[#D9B25C]/40 transition-transform hover:scale-105 active:scale-95 ${posicion}`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /><path d="M9.8 9.6a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.5v.3M12 16.3h.01" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {abierto && (
          <div className="fixed inset-0 z-[9999] sm:inset-auto sm:bottom-5 sm:right-5" role="dialog" aria-modal="true" aria-label="Ayuda de DKitchen">
            <motion.button aria-label="Cerrar la ayuda" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/40 sm:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.section initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.3, ease: CURVA }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[28px] bg-[#F7F5F2] text-[#1B1D22] shadow-2xl sm:relative sm:h-[min(640px,calc(100dvh-40px))] sm:max-h-none sm:w-[400px] sm:rounded-[28px]"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <header className="flex items-center justify-between gap-3 bg-[#0A080C] px-5 py-4 text-white">
                <div>
                  <p className="font-display text-[17px] font-semibold">Ayuda <span className="text-[#D9B25C]">DKitchen</span></p>
                  <p className="text-xs text-white/55">{modo === 'panel' ? 'Respuestas al momento · una persona si hace falta' : 'Resolvemos tus dudas antes de empezar'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={reiniciar} className="rounded-full px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white">Empezar de nuevo</button>
                  <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite">
                {entradas.map((e, i) => {
                  if (e.tipo === 'yo') return <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#17191E] px-4 py-2.5 text-[14px] text-white">{e.texto}</p>;
                  if (e.tipo === 'bot') return <div key={i} className="max-w-[90%] space-y-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[14px] leading-relaxed shadow-sm">{e.lineas.map((l, j) => <p key={j}>{l}</p>)}</div>;
                  if (e.tipo === 'opciones') return (
                    <div key={i} className="space-y-2">
                      {e.titulo && <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[#6B7079]">{e.titulo}</p>}
                      {e.temas.map((t) => <button key={t.id} onClick={() => elegir(t)} className={botonOpcion}>{t.pregunta}</button>)}
                    </div>
                  );
                  if (e.tipo === 'tema') return (
                    <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[14px] leading-relaxed shadow-sm">
                      <ol className="space-y-2">{e.tema.respuesta.map((l, j) => <li key={j} className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3EDE6] text-[11px] font-bold text-[#6E0C2B]">{j + 1}</span><span>{l}</span></li>)}</ol>
                      {e.tema.acciones?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {e.tema.acciones.map((a) => a.tipo === 'enlace'
                            ? <a key={a.texto} href={a.href} onClick={() => setAbierto(false)} className="rounded-full bg-[#6E0C2B] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#4A0819]">{a.texto}</a>
                            : (a.tipo === 'ir' && !onIr) ? null
                            : <button key={a.texto} onClick={() => accion(a)} className="rounded-full bg-[#6E0C2B] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#4A0819]">{a.texto}</button>)}
                        </div>
                      ) : null}
                    </div>
                  );
                  if (e.tipo === 'utilidad') return (
                    <div key={i} className="flex flex-wrap gap-2 pl-1">
                      <button onClick={() => poner({ tipo: 'yo', texto: 'Sí, resuelto' }, { tipo: 'bot', lineas: ['¡Perfecto! Si surge otra duda, aquí estoy.'] }, { tipo: 'opciones', temas: temasDeSeccion(temas, seccion), titulo: 'Otras dudas frecuentes' })}
                        className="rounded-full border border-[#2F8F6B]/40 bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#2F8F6B]">Sí, resuelto</button>
                      <button onClick={() => noSirvio(e.tema)} className="rounded-full border border-[#E0DBD4] bg-white px-3.5 py-1.5 text-[13px] font-medium">No, sigo igual</button>
                      {e.tema.ofrecerPuesta && puesta && <button onClick={sinTiempo} className="rounded-full border border-[#E0DBD4] bg-white px-3.5 py-1.5 text-[13px] font-medium">No sé o no tengo tiempo</button>}
                    </div>
                  );
                  if (e.tipo === 'puesta') return (
                    <div key={i} className="rounded-2xl bg-[#0A080C] p-4 text-white">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D9B25C]">Puesta a punto</p>
                      <p className="mt-1.5 text-[15px] font-semibold">Te lo dejamos hecho nosotros</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/70">Un experto de DKitchen revisa y configura tu carta contigo: secciones, textos, alérgenos, fotos, horarios y tu ficha de Google. Pago único de {puesta?.precio} + IVA.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {puesta && <button onClick={() => { setEnviando(true); puesta.comprar().catch(() => setError('No se pudo abrir el pago. Inténtalo de nuevo.')).finally(() => setEnviando(false)); }} disabled={enviando}
                          className="rounded-full bg-[#6E0C2B] px-4 py-2 text-[13px] font-semibold text-white ring-1 ring-[#D9B25C]/40 disabled:opacity-60">{enviando ? 'Abriendo pago seguro…' : `Quiero la Puesta a punto · ${puesta.precio}`}</button>}
                        <button onClick={() => poner({ tipo: 'persona' })} className="rounded-full px-3 py-2 text-[13px] text-white/70 hover:text-white">Prefiero preguntar antes</button>
                      </div>
                      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
                    </div>
                  );
                  if (e.tipo === 'persona') return (
                    <div key={i} className="rounded-2xl border border-[#E6E2DC] bg-white p-4">
                      <p className="text-[14px] font-semibold">{modo === 'panel' ? 'Hablar con una persona' : 'Te respondemos personalmente'}</p>
                      <p className="mt-1 text-[13px] text-[#6B7079]">{modo === 'panel' ? 'Le pasamos lo que has visto aquí, así no tienes que repetirlo.' : 'Déjanos tus datos y te escribimos. Si lo prefieres, también por WhatsApp.'}</p>
                      {modo === 'panel' ? (<>
                        <textarea value={mensaje} onChange={(ev) => setMensaje(ev.target.value)} rows={3} maxLength={2000} placeholder="Cuéntanos qué necesitas"
                          className="mt-3 w-full rounded-xl border border-[#E6E2DC] bg-white px-3 py-2 text-[14px] placeholder-[#9A9EA6] focus:border-[#6E0C2B] focus:outline-none" />
                        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
                        <button onClick={enviarPersona} disabled={enviando} className="mt-2 w-full rounded-full bg-[#6E0C2B] py-2.5 text-[14px] font-semibold text-white hover:bg-[#4A0819] disabled:opacity-60">{enviando ? 'Enviando…' : 'Enviar a una persona'}</button>
                      </>) : (
                        <div className="mt-3 grid gap-2">
                          <button onClick={() => { onSolicitud?.('dudas', contexto()); setAbierto(false); }} className="w-full rounded-full bg-[#6E0C2B] py-2.5 text-[14px] font-semibold text-white hover:bg-[#4A0819]">Escribir mi consulta</button>
                          <a href="https://wa.me/34622652659?text=Hola,%20tengo%20una%20duda%20sobre%20DKitchen." target="_blank" rel="noopener noreferrer" className="w-full rounded-full border border-[#E0DBD4] py-2.5 text-center text-[14px] font-medium">Por WhatsApp</a>
                        </div>
                      )}
                    </div>
                  );
                  if (e.tipo === 'enviado') return <div key={i} className="rounded-2xl border border-[#2F8F6B]/30 bg-[#2F8F6B]/10 px-4 py-3 text-[14px] text-[#1F6B4F]">{e.texto}</div>;
                  return null;
                })}
                <div ref={fin} />
              </div>

              <form onSubmit={buscar} className="flex items-center gap-2 border-t border-[#E6E2DC] bg-white px-3 py-3">
                <input ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder="Escribe tu duda (p. ej. «foto», «QR», «precio»)" aria-label="Escribe tu duda"
                  className="min-w-0 flex-1 rounded-full bg-[#F3F1EE] px-4 py-2.5 text-[14px] placeholder-[#9A9EA6] focus:outline-none focus:ring-2 focus:ring-[#6E0C2B]/30" />
                <button type="submit" aria-label="Buscar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6E0C2B] text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </form>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
