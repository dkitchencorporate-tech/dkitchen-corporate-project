'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { registrarContactoAction } from '@/lib/prospeccion-acciones';
import {
  CANALES, RESULTADOS, NIVELES, PRODUCTOS, PALANCAS, MATERIALES, MOTIVOS, FLYERS, PLANTILLAS, OBJECIONES,
  type Canal, type Resultado,
} from '@/lib/prospeccion-catalogo';
import type { BaseCrm } from '@/lib/prospeccion';

/**
 * 0114 · Registro de un contacto en 3 toques desde el móvil, en la puerta del local:
 * (1) canal (ya marcado: a pie si viene de la ruta), (2) resultado, (3) Guardar.
 * Todo lo demás (objeción, producto, palanca, material, plantilla) es opcional y se toca, no se escribe.
 * Con canal «A pie» se pide la posición del móvil para situar el local en el mapa (si no la tiene).
 */
const RES_ICONO: Record<Resultado, string> = {
  no_estaba: '🚪', hablo_encargado: '🗣️', demo: '📱', propuesta: '✉️', cerrado: '🤝', descartado: '✕', perdido: '↻',
};
const RES_TONO: Record<Resultado, string> = {
  no_estaba: 'from-white/10', hablo_encargado: 'from-indigo-400/25', demo: 'from-violet-400/30', propuesta: 'from-orange-400/30',
  cerrado: 'from-emerald-400/35', descartado: 'from-zinc-400/20', perdido: 'from-amber-400/25',
};

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={`min-h-[40px] shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 ${activo ? 'bg-oro text-noche shadow-[0_6px_18px_-8px_rgba(217,178,92,.8)]' : 'bg-white/[.07] text-white/80 ring-1 ring-white/15 hover:bg-white/15'}`}>
      {children}
    </button>
  );
}

function Guardar({ listo }: { listo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={!listo || pending}
      className="mt-4 w-full rounded-full bg-vino px-6 py-4 text-base font-semibold text-white transition disabled:opacity-40">
      {pending ? 'Guardando…' : listo ? 'Guardar' : 'Elige el resultado'}
    </button>
  );
}

export default function RegistroRapido({ base, id, canalInicial, volver = 'ficha', compacto = false, consentimiento = false }: {
  base: BaseCrm; id: string; canalInicial: Canal | null; volver?: 'ficha' | 'ruta'; compacto?: boolean; consentimiento?: boolean;
}) {
  const [canal, setCanal] = useState<Canal>(canalInicial ?? 'fisico');
  const [res, setRes] = useState<Resultado | null>(null);
  const [nivel, setNivel] = useState<string>('');
  const [objecion, setObjecion] = useState('');
  const [producto, setProducto] = useState('');
  const [palanca, setPalanca] = useState('');
  const [material, setMaterial] = useState<string[]>(canal === 'fisico' ? ['flyer'] : []);
  const [flyer, setFlyer] = useState('f-carta');
  const [plantilla, setPlantilla] = useState('');
  const [motivo, setMotivo] = useState('');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mas, setMas] = useState(false);
  const digital = canal !== 'fisico';
  const reintento = new Date(Date.now() + 30 * 864e5).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const listo = !!res && (res !== 'descartado' || !!motivo);

  const elegirResultado = (r: Resultado) => {
    setRes(r);
    if (canal === 'fisico' && !pos && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { timeout: 6000, maximumAge: 120000, enableHighAccuracy: true });
    }
  };
  const alternar = (m: string) => setMaterial((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]));
  const fila = 'mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]';
  const titulo = 'text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50';

  return (
    <form id={compacto ? undefined : 'registro'} action={registrarContactoAction}
      className="relative overflow-hidden rounded-[26px] bg-noche p-4 text-white shadow-[0_24px_60px_-30px_rgba(10,8,12,.9)] sm:p-5">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-vino/40 blur-3xl" />
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="volver" value={volver} />
      <input type="hidden" name="canal" value={canal} />
      <input type="hidden" name="resultado" value={res ?? ''} />
      {nivel && <input type="hidden" name="objecion_nivel" value={nivel} />}
      {objecion && <input type="hidden" name="objecion" value={objecion} />}
      {producto && <input type="hidden" name="producto" value={producto} />}
      {palanca && <input type="hidden" name="palanca" value={palanca} />}
      {material.map((m) => <input key={m} type="hidden" name="material" value={m} />)}
      {material.includes('flyer') && <input type="hidden" name="flyer_codigo" value={flyer} />}
      {digital && plantilla && <input type="hidden" name="plantilla" value={plantilla} />}
      {res === 'descartado' && motivo && <input type="hidden" name="motivo" value={motivo} />}
      {pos && <><input type="hidden" name="lat" value={pos.lat} /><input type="hidden" name="lng" value={pos.lng} /></>}

      <div className="relative flex items-baseline justify-between gap-2">
        <p className={titulo}>Registrar contacto · 3 toques</p>
        {pos && <span className="text-[11px] text-oro">📍 posición tomada</span>}
      </div>

      <div className={fila} role="group" aria-label="Canal">
        {(Object.keys(CANALES) as Canal[]).map((c) => (
          <Chip key={c} activo={canal === c} onClick={() => { setCanal(c); if (c !== 'fisico') setMaterial((x) => x.filter((m) => m !== 'flyer')); }}>{CANALES[c]}</Chip>
        ))}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Resultado">
        {(Object.keys(RESULTADOS) as Resultado[]).map((r) => (
          <button key={r} type="button" onClick={() => elegirResultado(r)} aria-pressed={res === r}
            className={`flex min-h-[64px] flex-col items-start justify-between rounded-2xl bg-gradient-to-br ${RES_TONO[r]} to-white/[.03] px-3 py-2.5 text-left ring-1 transition duration-200 ${res === r ? 'ring-2 ring-oro' : 'ring-white/10 hover:ring-white/30'}`}>
            <span aria-hidden className="text-lg leading-none">{RES_ICONO[r]}</span>
            <span className="text-[13px] font-semibold leading-tight">{RESULTADOS[r]}</span>
          </button>
        ))}
      </div>

      {res === 'descartado' && (
        <div className={fila} role="group" aria-label="Motivo">
          {Object.entries(MOTIVOS).map(([k, v]) => <Chip key={k} activo={motivo === k} onClick={() => setMotivo(k)}>{v}</Chip>)}
        </div>
      )}
      {res === 'perdido' && (
        <label className="mt-4 block text-xs text-white/60">Reintentar el
          <input type="date" name="siguiente_fecha" defaultValue={reintento} required className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 text-[16px] text-white ring-1 ring-white/15" />
        </label>
      )}
      {canal === 'email' && !consentimiento && (
        <div className="mt-4 rounded-2xl bg-white/[.06] p-3 text-[13px] ring-1 ring-white/10">
          <p className="text-white/70">Email solo con permiso (LSSI): sin una de estas dos, no se guarda.</p>
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" name="consentimiento" className="h-5 w-5 accent-[#D9B25C]" /> Nos ha dado su consentimiento</label>
          <label className="mt-1 flex items-center gap-2"><input type="checkbox" name="relacion_previa" className="h-5 w-5 accent-[#D9B25C]" /> Ya hay relación previa</label>
        </div>
      )}

      {res && (
        <button type="button" onClick={() => setMas((x) => !x)} className="mt-4 text-[13px] font-semibold text-oro">
          {mas ? '− Menos detalle' : '+ Objeción, producto, palanca y material (opcional)'}
        </button>
      )}
      {res && mas && (
        <div className="space-y-1">
          <p className={`${titulo} mt-3`}>Objeción</p>
          <div className="flex gap-2 overflow-x-auto pb-1">{Object.entries(NIVELES).map(([k, v]) => <Chip key={k} activo={nivel === k} onClick={() => setNivel(nivel === k ? '' : k)}>{v}</Chip>)}</div>
          <div className="flex gap-2 overflow-x-auto pb-1">{OBJECIONES.map((o) => <Chip key={o} activo={objecion === o} onClick={() => setObjecion(objecion === o ? '' : o)}>{o}</Chip>)}</div>
          <p className={`${titulo} pt-2`}>Producto propuesto</p>
          <div className="flex gap-2 overflow-x-auto pb-1">{Object.entries(PRODUCTOS).map(([k, v]) => <Chip key={k} activo={producto === k} onClick={() => setProducto(producto === k ? '' : k)}>{v}</Chip>)}</div>
          <p className={`${titulo} pt-2`}>Palanca usada</p>
          <div className="flex gap-2 overflow-x-auto pb-1">{Object.entries(PALANCAS).map(([k, v]) => <Chip key={k} activo={palanca === k} onClick={() => setPalanca(palanca === k ? '' : k)}>{v}</Chip>)}</div>
          <p className={`${titulo} pt-2`}>Material entregado</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(MATERIALES).map(([k, v]) => <Chip key={k} activo={material.includes(k)} onClick={() => alternar(k)}>{v}</Chip>)}
          </div>
          {material.includes('flyer') && (
            <div className="flex gap-2 overflow-x-auto pb-1">{Object.entries(FLYERS).map(([k, v]) => <Chip key={k} activo={flyer === k} onClick={() => setFlyer(k)}>{v} · {k}</Chip>)}</div>
          )}
          {digital && (
            <>
              <p className={`${titulo} pt-2`}>Plantilla del mensaje</p>
              <div className="flex gap-2 overflow-x-auto pb-1">{PLANTILLAS.map((p) => <Chip key={p} activo={plantilla === p} onClick={() => setPlantilla(plantilla === p ? '' : p)}>{p}</Chip>)}</div>
            </>
          )}
          <input name="texto" maxLength={1000} placeholder="Nota (opcional)" className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-[16px] text-white placeholder:text-white/40 ring-1 ring-white/15" />
          {res !== 'perdido' && res !== 'cerrado' && res !== 'descartado' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="siguiente" maxLength={200} placeholder={digital ? 'Siguiente paso (por defecto: seguimiento a 48 h)' : 'Siguiente paso'} className="w-full rounded-2xl bg-white/10 px-4 py-3 text-[16px] text-white placeholder:text-white/40 ring-1 ring-white/15" />
              <input name="siguiente_fecha" type="date" aria-label="Fecha del siguiente paso" className="w-full rounded-2xl bg-white/10 px-4 py-3 text-[16px] text-white ring-1 ring-white/15" />
            </div>
          )}
        </div>
      )}
      <Guardar listo={listo} />
      {digital && res && !['cerrado', 'descartado', 'perdido'].includes(res) && <p className="mt-2 text-center text-[11px] text-white/50">Si no pones fecha, el seguimiento queda a 48 h y sale en «Toca hoy».</p>}
    </form>
  );
}
