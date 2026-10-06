'use client';

import HerramientasTexto from './HerramientasTexto';
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
          className="bg-vino hover:bg-vino-hondo text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
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
          className="flex-1 rounded-lg bg-white border border-linea px-4 py-2.5 text-carbon placeholder-ceniza focus:outline-none focus:border-vino"
        />
        <button
          onClick={agregarSeccion}
          disabled={pendiente}
          className="rounded-lg bg-papel hover:bg-linea px-4 py-2.5 text-sm font-semibold transition-colors"
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
        <p className="text-niebla text-center py-12">
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
    <div className="bg-white border border-linea rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        {editando ? (
          <div className="flex gap-2 flex-1">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex-1 rounded-lg bg-white border border-linea px-3 py-1.5 text-carbon"
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
            <button onClick={() => setEditando(true)} className="text-niebla hover:text-grafito">
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
        <p className="text-ceniza text-sm">Sin platos todavía.</p>
      ) : (
        <ul className="divide-y divide-linea">
          {platos.map((plato) => (
            <li key={plato.id} className="py-3 flex items-center justify-between gap-3">
              {plato.fotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={plato.fotoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <button onClick={() => onEditarPlato(plato)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-linea-fuerte text-[10px] text-ceniza" title="Añadir foto">
                  + foto
                </button>
              )}
              <div className="min-w-0 flex-1">
                <p className={`font-medium truncate ${!plato.disponible ? 'text-ceniza line-through' : ''}`}>
                  {plato.esCombo && <span className="mr-1.5 rounded-full bg-vino px-2 py-0.5 align-[2px] text-[10px] font-bold uppercase tracking-wider text-white no-underline">Combo</span>}
                  {plato.nombre}
                </p>
                {plato.descripcion ? (
                  <p className="text-xs text-niebla mt-0.5 line-clamp-1">{plato.descripcion}</p>
                ) : (
                  <button onClick={() => onEditarPlato(plato)} className="text-xs text-vino/80 hover:text-vino mt-0.5">+ Añadir descripción</button>
                )}
                {plato.alergenos.length > 0 && (
                  <p className="text-xs text-ceniza mt-0.5">
                    {plato.alergenos.map((c) => ALERGENOS[c] ?? c).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold tabular-nums text-sm">{Number(plato.precio).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                <button onClick={() => onEditarPlato(plato)} className="text-niebla hover:text-grafito text-sm">
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
          ...(plato.esCombo ? {} : { alergenos }),
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
    <div className="bg-white border border-vino/40 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plato ? 'Editar plato' : 'Nuevo plato'}</h3>
        <button onClick={onCerrar} className="text-niebla hover:text-grafito text-sm">
          Cancelar
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del plato"
            spellCheck
            lang="es"
            className="w-full rounded-lg bg-white border border-linea px-3 py-2 text-carbon placeholder-ceniza"
          />
          <HerramientasTexto valor={nombre} onCambio={setNombre} tipo="titulo" />
        </div>
        <input
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          placeholder="Precio (€)"
          className="rounded-lg bg-white border border-linea px-3 py-2 text-carbon placeholder-ceniza"
        />
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-niebla">Descripción del plato ({descripcion.length}/300)</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value.slice(0, 300))}
          placeholder="Ej: Croquetas caseras de jamón ibérico, cremosas por dentro y crujientes por fuera. 6 unidades."
          rows={3}
          spellCheck
          lang="es"
          className="w-full rounded-lg bg-white border border-linea px-3 py-2 text-carbon placeholder-ceniza"
        />
        <HerramientasTexto valor={descripcion} onCambio={(v) => setDescripcion(v.slice(0, 300))} tipo="descripcion" contexto={nombre} />
        <span className="block text-[11px] text-ceniza">Se ve en la carta y completa al abrir el plato. Una buena descripción vende más.</span>
      </label>

      <SubirImagen valor={fotoUrl || null} onCambio={(url) => setFotoUrl(url ?? '')} etiqueta="Foto" formato="plato" ia={{ modo: 'plato', plato: { nombre, descripcion } }} />

      {secciones.length > 0 && (
        <select
          value={seccionId}
          onChange={(e) => setSeccionId(e.target.value)}
          className="w-full rounded-lg bg-white border border-linea px-3 py-2 text-carbon"
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
        <p className="text-sm text-niebla mb-2">Alérgenos (obligatorio marcar si aplica — Reglamento UE 1169/2011)</p>
        {plato?.esCombo ? (
          <p className="rounded-lg bg-crema px-3 py-2.5 text-sm text-grafito">Es un combo: sus alérgenos se calculan solos a partir de sus platos. Para cambiar lo que incluye, ve a <strong>Carta → Estudio → Combos</strong>.</p>
        ) : (
        <div className="flex flex-wrap gap-2">
          {CODIGOS_ALERGENOS.map((codigo) => (
            <button
              key={codigo}
              type="button"
              onClick={() => alternarAlergeno(codigo)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                alergenos.includes(codigo)
                  ? 'bg-vino border-vino text-white'
                  : 'border-linea-fuerte text-niebla hover:border-linea-fuerte'
              }`}
            >
              {ALERGENOS[codigo]}
            </button>
          ))}
        </div>
        )}
      </div>

      {plato && (
        <label className="flex items-center gap-2 text-sm text-niebla cursor-pointer">
          <input
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="w-4 h-4 accent-vino"
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
          className="ml-auto bg-vino hover:bg-vino-hondo text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
