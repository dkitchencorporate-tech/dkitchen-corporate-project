'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TutorialEstado } from '@/lib/tutorial-tipos';
import { tutorialAvanzarAction, tutorialCompletarAction, tutorialEstadoAction } from '@/app/panel/actions';
import { mensajeError } from '@/lib/mensaje-error';

/**
 * Montaje guiado OBLIGATORIO la primera vez (B5 de karc0, 07/10/2026).
 * - «Aprender haciendo»: lleva a la sección real, ilumina el sitio exacto y la
 *   tarea se hace ahí mismo. La base comprueba cada tarea (0049); aquí solo se mira.
 * - Bloquea el panel (el resto de secciones no se abren) salvo llamadas y reservas,
 *   que siguen sonando. «Seguir luego» lo pausa en esta visita y vuelve en la siguiente.
 * - Al completar: +10 créditos de IA (una sola vez) y el panel pasa a modo Día a día.
 */
interface Paso { id: string; pestana: string; ancla: string; titulo: string; texto: string; hecho: (t: TutorialEstado) => boolean; incluir?: (t: TutorialEstado) => boolean }

const PASOS: Paso[] = [
  { id: 'logo', pestana: 'local', ancla: 'logo', titulo: 'Sube tu logo', texto: 'Súbelo desde el móvil o créalo con IA y pulsa «Guardar cambios» al final de la página.', hecho: (t) => t.logo },
  { id: 'local', pestana: 'local', ancla: 'datos-local', titulo: 'Dirección y horario', texto: 'Tus clientes los verán en la carta. Rellena los dos y pulsa «Guardar cambios».', hecho: (t) => t.local },
  { id: 'platos', pestana: 'carta', ancla: 'nuevo-plato', titulo: 'Crea 3 platos con su precio', texto: 'Pulsa «+ Añadir plato», escribe el nombre y el precio y guarda. Repite hasta tener 3.', hecho: (t) => t.platos },
  { id: 'foto_ia', pestana: 'carta', ancla: 'lista-platos', titulo: 'Tu primera foto con IA', texto: 'Abre uno de tus platos, pulsa «✨ Crear con IA», usa la foto y guarda el plato. Gasta 1 crédito de tu regalo de bienvenida.', hecho: (t) => t.foto_ia },
  { id: 'mesa', pestana: 'sala', ancla: 'editor-sala', titulo: 'Dibuja tu sala', texto: 'Abre el editor, añade al menos una mesa y guarda el plano.', hecho: (t) => t.mesa, incluir: (t) => t.pide_mesa },
  { id: 'camarero', pestana: 'equipo', ancla: 'alta-equipo', titulo: 'Da de alta a tu primer camarero', texto: 'Escribe su nombre y crea su acceso: le mandas el enlace por WhatsApp y entra desde su móvil.', hecho: (t) => t.camarero, incluir: (t) => t.pide_camarero },
  { id: 'qr', pestana: 'qr', ancla: 'mi-qr', titulo: 'Este es tu QR', texto: 'Es lo que tus clientes escanean en la mesa. Apunta siempre a tu carta: cambia la carta cuando quieras sin reimprimirlo.', hecho: (t) => t.qr },
];

const PAUSA = 'dk-tutorial-pausa';
const leerPausa = () => { try { return sessionStorage.getItem(PAUSA) === '1'; } catch { return false; } };

export default function TutorialMontaje({ inicial, pestana, irA, onBloqueo, avisoBloqueo, onCompletado }: {
  inicial: TutorialEstado;
  pestana: string;
  irA: (p: string) => void;
  onBloqueo: (permitidas: string[] | null) => void;
  avisoBloqueo: number;
  onCompletado: (t: TutorialEstado) => void;
}) {
  const [t, setT] = useState(inicial);
  const [pausa, setPausa] = useState(true); // se lee en el efecto (sessionStorage solo existe en el navegador)
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [premio, setPremio] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  useEffect(() => setPausa(leerPausa()), []);

  const pasos = useMemo(() => PASOS.filter((p) => !p.incluir || p.incluir(t)), [t]);
  const actual = t.paso === 0 ? null : pasos.find((p) => !p.hecho(t)) ?? null;
  const hechos = pasos.filter((p) => p.hecho(t)).length;
  const fase: 'bienvenida' | 'paso' | 'final' = t.paso === 0 ? 'bienvenida' : actual ? 'paso' : 'final';

  // Refresco del estado mientras está activo (cada tarea la guarda su propia sección)
  const refrescar = useCallback(async () => { try { const e = await tutorialEstadoAction(); if (e) setT(e); } catch { /* siguiente ciclo */ } }, []);
  useEffect(() => {
    if (pausa || premio) return;
    const id = setInterval(refrescar, 4000);
    return () => clearInterval(id);
  }, [pausa, premio, refrescar]);
  useEffect(() => { if (!pausa) void refrescar(); }, [pestana, pausa, refrescar]);

  // Bloqueo: solo la sección del paso (y la de llamadas/reservas, que decide el panel)
  useEffect(() => {
    if (pausa || premio) onBloqueo(null);
    else onBloqueo(fase === 'paso' && actual ? [actual.pestana] : ['inicio']);
  }, [pausa, premio, fase, actual, onBloqueo]);
  useEffect(() => () => onBloqueo(null), [onBloqueo]);

  // Lleva a la sección del paso; el paso del QR se marca al verlo
  useEffect(() => {
    if (pausa || premio) return;
    if (fase === 'paso' && actual) {
      if (pestana !== actual.pestana) irA(actual.pestana);
      else if (actual.id === 'qr' && !t.qr) void tutorialAvanzarAction(1, true).then((e) => e && setT(e)).catch(() => {});
    } else if (pestana !== 'inicio') irA('inicio');
  }, [pausa, premio, fase, actual, pestana, irA, t.qr]);

  // Aviso visual cuando intenta salir de la sección del paso
  useEffect(() => {
    if (!avisoBloqueo) return;
    setSacudir(true);
    const id = setTimeout(() => setSacudir(false), 700);
    return () => clearTimeout(id);
  }, [avisoBloqueo]);

  // Foco: anillo pulsante sobre el sitio exacto de la tarea
  const [rect, setRect] = useState<DOMRect | null>(null);
  const llevado = useRef<string | null>(null);
  useEffect(() => {
    if (pausa || fase !== 'paso' || !actual) { setRect(null); return; }
    const medir = () => {
      const el = document.querySelector<HTMLElement>(`[data-tutorial="${actual.ancla}"]`);
      if (!el) { setRect(null); return; }
      if (llevado.current !== actual.id) { llevado.current = actual.id; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      setRect(el.getBoundingClientRect());
    };
    medir();
    const id = setInterval(medir, 300);
    return () => clearInterval(id);
  }, [pausa, fase, actual]);

  async function empezar() {
    setOcupado(true); setError(null);
    try { const e = await tutorialAvanzarAction(1, false); if (e) setT(e); } catch (e) { setError(mensajeError(e, 'No se pudo empezar.')); }
    setOcupado(false);
  }
  async function completar() {
    setOcupado(true); setError(null);
    try { const e = await tutorialCompletarAction(); if (e) { setT(e); setPremio(true); } } catch (e) { setError(mensajeError(e, 'No se pudo completar.')); void refrescar(); }
    setOcupado(false);
  }
  const pausar = () => { try { sessionStorage.setItem(PAUSA, '1'); } catch { /* sin almacenamiento */ } setPausa(true); };
  const seguir = () => { try { sessionStorage.removeItem(PAUSA); } catch { /* sin almacenamiento */ } setPausa(false); };

  if (pausa) {
    return (
      <button onClick={seguir} className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 z-40 animate-pulse rounded-full bg-oro px-4 py-2.5 text-sm font-black text-tinta shadow-2xl lg:bottom-6 lg:left-[112px]">
        ▶ Continuar el montaje · {hechos}/{pasos.length} · +10 créditos IA
      </button>
    );
  }

  const progreso = (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
      <div className="h-full rounded-full bg-oro transition-all" style={{ width: `${Math.round((hechos / pasos.length) * 100)}%` }} />
    </div>
  );

  return (
    <>
      {rect && (
        <div aria-hidden className="pointer-events-none fixed z-[44] rounded-2xl ring-4 ring-oro ring-offset-2 ring-offset-transparent animate-pulse"
          style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      )}

      {fase !== 'paso' && <div aria-hidden className="fixed inset-0 z-[44] bg-black/55" />}

      <div role="dialog" aria-modal={fase !== 'paso'} aria-labelledby="tutorial-titulo"
        className={`fixed z-[45] rounded-3xl bg-noche p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,.45)] ${sacudir && fase === 'paso' ? 'animate-bounce' : ''} ${
          fase === 'paso'
            ? 'inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[400px]'
            : 'inset-x-3 top-1/2 mx-auto max-w-lg -translate-y-1/2'}`}>
        {fase === 'bienvenida' && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-oro">Montaje guiado · obligatorio la primera vez</p>
            <h2 id="tutorial-titulo" className="mt-1 font-display text-2xl font-semibold">Monta tu local en unos 10 minutos</h2>
            <p className="mt-2 text-sm text-white/75">Te llevamos a cada sitio del panel y lo haces tú mismo: al terminar sabrás dónde está todo y tu carta estará lista para tus clientes.</p>
            <ol className="mt-4 space-y-1.5 text-sm">
              {pasos.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.hecho(t) ? 'bg-emerald-500 text-white' : 'bg-white/10'}`}>{p.hecho(t) ? '✓' : i + 1}</span>
                  {p.titulo}
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-2xl bg-oro/15 p-3 text-sm font-semibold text-oro">🎁 Al completarlo: +10 créditos de IA para fotos de tus platos.</p>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button disabled={ocupado} onClick={empezar} className="rounded-2xl bg-oro py-3 font-black text-tinta disabled:opacity-60">{ocupado ? 'Un momento…' : 'Empezar'}</button>
              <button onClick={pausar} className="rounded-2xl px-4 py-3 text-sm font-semibold text-white/70">Seguir luego</button>
            </div>
          </>
        )}

        {fase === 'paso' && actual && (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-oro">Paso {pasos.indexOf(actual) + 1} de {pasos.length}</p>
              <button onClick={pausar} className="text-xs font-semibold text-white/60 underline">Seguir luego</button>
            </div>
            <h2 id="tutorial-titulo" className="mt-1 text-lg font-bold">{actual.titulo}</h2>
            <p className="mt-1 text-sm text-white/80">{actual.texto}</p>
            {progreso}
            <p className="mt-2 text-[11px] text-white/50">{sacudir ? 'Primero termina este paso (o pulsa «Seguir luego»).' : 'Cuando lo hagas, este aviso pasa solo al siguiente paso.'}</p>
          </>
        )}

        {fase === 'final' && !premio && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-oro">Último paso</p>
            <h2 id="tutorial-titulo" className="mt-1 font-display text-2xl font-semibold">¡Tu local está montado!</h2>
            <p className="mt-2 text-sm text-white/80">A partir de ahora el panel se ordena para el día a día: <b>Servicio</b> primero (pedidos, llamadas de mesa y reservas, que suenan solos), después <b>Carta</b> y <b>Negocio</b>. La ayuda está siempre en el botón «?».</p>
            {progreso}
            <button disabled={ocupado} onClick={completar} className="mt-4 w-full rounded-2xl bg-oro py-3 font-black text-tinta disabled:opacity-60">{ocupado ? 'Comprobando…' : 'Completar y recibir 10 créditos de IA'}</button>
          </>
        )}

        {premio && (
          <>
            <p className="text-4xl">🎉</p>
            <h2 id="tutorial-titulo" className="mt-1 font-display text-2xl font-semibold">+10 créditos de IA</h2>
            <p className="mt-2 text-sm text-white/80">Ya están en tu saldo. Úsalos con «✨ Crear con IA» en cualquier plato, banner o portada.</p>
            <button onClick={() => onCompletado(t)} className="mt-4 w-full rounded-2xl bg-oro py-3 font-black text-tinta">Ir a mi panel</button>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </>
  );
}
