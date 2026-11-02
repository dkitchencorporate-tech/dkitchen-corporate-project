'use client';

/**
 * Selector de rol de un miembro del equipo (Central → Equipo). Va en un componente de cliente porque
 * envía el formulario al cambiar: un onChange dentro de la página (componente de servidor) la rompía
 * entera («Event handlers cannot be passed to Client Component props») — 02/11/2026.
 */
export default function RolEquipo({ id, rol, accion }: { id: string; rol: string; accion: (f: FormData) => void | Promise<void> }) {
  return (
    <form action={accion} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`rol-${id}`}>Rol</label>
      <select
        id={`rol-${id}`}
        name="nuevo_rol"
        defaultValue={rol}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-linea bg-papel px-2 py-1 text-xs font-semibold text-carbon outline-none focus:border-vino"
      >
        <option value="comercial">Comercial</option>
        <option value="direccion">Dirección</option>
      </select>
    </form>
  );
}
