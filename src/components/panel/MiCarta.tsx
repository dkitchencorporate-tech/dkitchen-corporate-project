'use client';

import { useState, useTransition } from 'react';
import { ALERGENOS, CODIGOS_ALERGENOS } from '@/lib/alergenos';
import type { SeccionPropia, PlatoPropio } from '@/lib/menu-propietario';
import SubirImagen from './SubirImagen';
import {
  crearSeccionAction,
  editarSeccionAction,
  eliminarSeccionAction,
  crearPlatoAction,
  editarPlatoAction,
  eliminarPlatoAction,
} from '@/app/panel/actions';

export default function MiCarta({
  carta,
}: {
  carta: { secciones: SeccionPropia[]; platos: PlatoPropio[] };
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [nuevaSeccion, setNuevaSeccion] = useState('');
  const [platoEnEdicion, setPlatoEnEdicion] = useState<PlatoPropio | 'nuevo' | null>(null);

  function agregarSeccion() {
    if (!nuevaSeccion.trim()) return;
    iniciarTransicion(async () => {
      await crearSeccionAction(nuevaSeccion.trim());
      setNuevaSeccion('');
    });
  }

  const sueltos = carta.platos.filter((p) => !p.seccionId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Mi Carta</h2>
        <button
          onClick={() => setPlatoEnEdicion('nuevo')}
          className="bg-[#6E0C2B] hover:bg-[#4A0819] text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
        >
          + Añadir plato
        </button>
      </div>

      {platoEnEdicion && (
        <FormularioPlato
          plato={platoEnEdicion === 'nuevo' ? null : platoEnEdicion}
          secciones={carta.secciones}
          onCerrar={() => setPlatoEnEdicion(null)}
        />
      )}

      <div className="flex gap-2">
        <input
          value={nuevaSeccion}
          onChange={(e) => setNuevaSeccion(e.target.value)}
          placeholder="Nombre de la nueva sección (ej. Entrantes)"
          className="flex-1 rounded-lg bg-white border border-[#E6E6E2] px-4 py-2.5 text-[#1B1D22] placeholder-[#9A9EA6] focus:outline-none focus:border-[#6E0C2B]"
        />
        <button
          onClick={agregarSeccion}
          disabled={pendiente}
          className="rounded-lg bg-[#EDEDEA] hover:bg-[#E5E5E1] px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          Añadir sección
        </button>
      </div>

      {carta.secciones.map((seccion) => (
        <SeccionCard
          key={seccion.id}
          seccion={seccion}
          platos={carta.platos.filter((p) => p.seccionId === seccion.id)}
          onEditarPlato={setPlatoEnEdicion}
        />
      ))}

      {sueltos.length > 0 && (
        <SeccionCard
          seccion={{ id: '', nombre: 'Sin sección', orden: -1 }}
          platos={sueltos}
          onEditarPlato={setPlatoEnEdicion}
          sinBorrar
        />
      )}

      {carta.secciones.length === 0 && sueltos.length === 0 && (
        <p className="text-[#6B7079] text-center py-12">
          Todavía no tienes ninguna sección ni plato. Empieza creando una sección arriba.
        </p>
      )}
    </div>
  );
}

function SeccionCard({
  seccion,
  platos,
  onEditarPlato,
  sinBorrar,
}: {
  seccion: SeccionPropia;
  platos: PlatoPropio[];
  onEditarPlato: (p: PlatoPropio) => void;
  sinBorrar?: boolean;
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(seccion.nombre);

  function guardarNombre() {
    if (!nombre.trim()) return;
    iniciarTransicion(async () => {
      await editarSeccionAction(seccion.id, nombre.trim());
      setEditando(false);
    });
  }

  return (
    <div className="bg-white border border-[#E6E6E2] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        {editando ? (
          <div className="flex gap-2 flex-1">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex-1 rounded-lg bg-white border border-[#E6E6E2] px-3 py-1.5 text-[#1B1D22]"
            />
            <button onClick={guardarNombre} disabled={pendiente} className="text-sm text-green-700 font-semibold">
              Guardar
            </button>
          </div>
        ) : (
          <h3 className="text-lg font-semibold">{seccion.nombre}</h3>
        )}

        {!sinBorrar && !editando && (
          <div className="flex gap-3 text-sm">
            <button onClick={() => setEditando(true)} className="text-[#6B7079] hover:text-[#3F434B]">
              Renombrar
            </button>
            <button
              onClick={() => iniciarTransicion(() => eliminarSeccionAction(seccion.id))}
              className="text-red-400/70 hover:text-red-600"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {platos.length === 0 ? (
        <p className="text-[#9A9EA6] text-sm">Sin platos todavía.</p>
      ) : (
        <ul className="divide-y divide-[#ECECE8]">
          {platos.map((plato) => (
            <li key={plato.id} className="py-3 flex items-center justify-between gap-3">
              {plato.fotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={plato.fotoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <button onClick={() => onEditarPlato(plato)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#D6D6D1] text-[10px] text-[#9A9EA6]" title="Añadir foto">
                  + foto
                </button>
              )}
              <div className="min-w-0 flex-1">
                <p className={`font-medium truncate ${!plato.disponible ? 'text-[#9A9EA6] line-through' : ''}`}>
                  {plato.nombre}
                </p>
                {plato.descripcion ? (
                  <p className="text-xs text-[#6B7079] mt-0.5 line-clamp-1">{plato.descripcion}</p>
                ) : (
                  <button onClick={() => onEditarPlato(plato)} className="text-xs text-[#6E0C2B]/80 hover:text-[#6E0C2B] mt-0.5">+ Añadir descripción</button>
                )}
                {plato.alergenos.length > 0 && (
                  <p className="text-xs text-[#9A9EA6] mt-0.5">
                    {plato.alergenos.map((c) => ALERGENOS[c] ?? c).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold tabular-nums text-sm">{Number(plato.precio).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                <button onClick={() => onEditarPlato(plato)} className="text-[#6B7079] hover:text-[#3F434B] text-sm">
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormularioPlato({
  plato,
  secciones,
  onCerrar,
}: {
  plato: PlatoPropio | null;
  secciones: SeccionPropia[];
  onCerrar: () => void;
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [nombre, setNombre] = useState(plato?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(plato?.descripcion ?? '');
  const [precio, setPrecio] = useState(plato?.precio ?? '');
  const [fotoUrl, setFotoUrl] = useState(plato?.fotoUrl ?? '');
  const [seccionId, setSeccionId] = useState(plato?.seccionId ?? secciones[0]?.id ?? '');
  const [alergenos, setAlergenos] = useState<string[]>(plato?.alergenos ?? []);
  const [disponible, setDisponible] = useState(plato?.disponible ?? true);

  function alternarAlergeno(codigo: string) {
    setAlergenos((prev) => (prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]));
  }

  function guardar() {
    if (!nombre.trim() || !precio) return;
    iniciarTransicion(async () => {
      if (plato) {
        await editarPlatoAction(plato.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          precio: Number(precio),
          fotoUrl: fotoUrl.trim() || null,
          seccionId: seccionId || null,
          alergenos,
          disponible,
        });
      } else {
        await crearPlatoAction({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          precio: Number(precio),
          fotoUrl: fotoUrl.trim() || null,
          seccionId: seccionId || null,
          alergenos,
        });
      }
      onCerrar();
    });
  }

  return (
    <div className="bg-white border border-[#6E0C2B]/40 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plato ? 'Editar plato' : 'Nuevo plato'}</h3>
        <button onClick={onCerrar} className="text-[#6B7079] hover:text-[#3F434B] text-sm">
          Cancelar
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del plato"
          className="rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-[#1B1D22] placeholder-[#9A9EA6]"
        />
        <input
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          placeholder="Precio (€)"
          className="rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-[#1B1D22] placeholder-[#9A9EA6]"
        />
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-[#6B7079]">Descripción del plato ({descripcion.length}/300)</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value.slice(0, 300))}
          placeholder="Ej: Croquetas caseras de jamón ibérico, cremosas por dentro y crujientes por fuera. 6 unidades."
          rows={3}
          className="w-full rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-[#1B1D22] placeholder-[#9A9EA6]"
        />
        <span className="block text-[11px] text-[#9A9EA6]">Se ve en la carta y completa al abrir el plato. Una buena descripción vende más.</span>
      </label>

      <SubirImagen valor={fotoUrl || null} onCambio={(url) => setFotoUrl(url ?? '')} etiqueta="Foto" formato="plato" />

      {secciones.length > 0 && (
        <select
          value={seccionId}
          onChange={(e) => setSeccionId(e.target.value)}
          className="w-full rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-[#1B1D22]"
        >
          <option value="">Sin sección</option>
          {secciones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      )}

      <div>
        <p className="text-sm text-[#6B7079] mb-2">Alérgenos (obligatorio marcar si aplica — Reglamento UE 1169/2011)</p>
        <div className="flex flex-wrap gap-2">
          {CODIGOS_ALERGENOS.map((codigo) => (
            <button
              key={codigo}
              type="button"
              onClick={() => alternarAlergeno(codigo)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                alergenos.includes(codigo)
                  ? 'bg-[#6E0C2B] border-[#6E0C2B] text-white'
                  : 'border-[#D6D6D1] text-[#6B7079] hover:border-[#D6D6D1]'
              }`}
            >
              {ALERGENOS[codigo]}
            </button>
          ))}
        </div>
      </div>

      {plato && (
        <label className="flex items-center gap-2 text-sm text-[#6B7079] cursor-pointer">
          <input
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="w-4 h-4 accent-[#D9531E]"
          />
          Disponible (desmarca para "agotado" sin borrar el plato)
        </label>
      )}

      <div className="flex items-center justify-between pt-2">
        {plato && (
          <button
            onClick={() => iniciarTransicion(async () => { await eliminarPlatoAction(plato.id); onCerrar(); })}
            className="text-sm text-red-400/70 hover:text-red-600"
          >
            Eliminar plato
          </button>
        )}
        <button
          onClick={guardar}
          disabled={pendiente}
          className="ml-auto bg-[#6E0C2B] hover:bg-[#4A0819] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
