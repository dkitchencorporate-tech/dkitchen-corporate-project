import { exigirAdmin } from '@/lib/guard-admin';
import { administradores } from '@/lib/buzon';
import GuiaZona from '@/components/admin/GuiaZona';
import { altaAdminAction, cambiarRolAdminAction, retirarAdminAction } from './actions';

export const dynamic = 'force-dynamic';

const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const campo = 'mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta';
const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const ERRORES: Record<string, string> = {
  correo: 'El correo no es válido.', nombre: 'El nombre debe tener entre 2 y 80 letras.',
  confirmo: 'Marca la casilla de confirmación para seguir.', base: 'La base no lo ha aceptado.',
};

/** Central → Cuenta → Administradores (0065, P1 31/10): quién entra en Central, roles, añadir y retirar. */
export default async function Administradores({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const lista = await administradores(jwt).catch(() => null);
  const aviso = sp.ok === 'alta'
    ? `Administrador añadido. ${sp.cuenta === 'nueva' ? (sp.correo === 'si' ? 'Le hemos enviado «Crea tu contraseña de DKitchen».' : 'No se pudo enviar el correo de la contraseña: que use «¿Olvidaste tu contraseña?».') : 'Ya tenía cuenta: entra con su contraseña de siempre.'} La primera vez, Central le pedirá configurar el segundo factor.`
    : sp.ok === 'retirado' ? 'Acceso retirado. Ya no puede entrar en Central.'
    : sp.ok === 'rol_actualizado' ? 'Rol de administración actualizado en el servidor.' : null;
  const error = sp.e ? `${ERRORES[sp.e] ?? 'No se pudo hacer.'}${sp.m ? ` (${sp.m})` : ''}` : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Cuenta</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Equipo y Permisos</h1>
        <p className="mt-1 text-sm text-niebla">{lista ? `${lista.length} miembros en el equipo de Central` : 'No se pudo leer la lista.'}</p>
      </header>
      <GuiaZona titulo="Equipo y Roles de Central" ancla="administradores"
        que="Las personas que forman el equipo de Central. Dirección tiene acceso total a métricas, tareas y decisiones. Comercial tiene acceso enfocado a vender y seguir: cartera propia, altas de clientes y gestión de servicios."
        pasos={[
          'Al dar de alta a un miembro, elige su rol: Comercial (por defecto) o Dirección.',
          'Solo dirección puede cambiar los roles de los miembros en cualquier momento.',
          'La primera vez que entre, Central le obliga a configurar el segundo factor (2FA).',
          'Los comerciales ven únicamente sus clientes asignados y no tienen acceso a datos globales ni facturación total.'
        ]} />
      {aviso && <p className="rounded-2xl bg-exito/10 p-4 text-sm text-exito">{aviso}</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Miembros del equipo</p>
        <ul className="mt-3 divide-y divide-linea">
          {lista?.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{a.nombre}</p>
                  {a.yo && <span className="rounded-full bg-tinta px-2 py-0.5 text-[11px] text-oro">Tú</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${a.rolAdmin === 'direccion' ? 'bg-vino/15 text-vino' : 'bg-papel text-carbon'}`}>
                    {a.rolAdmin === 'direccion' ? 'Dirección' : 'Comercial'}
                  </span>
                </div>
                <p className="truncate text-xs text-niebla mt-0.5">{a.email} · desde el {fecha.format(new Date(a.creadoEn))}</p>
                <p className={`mt-1 text-xs font-medium ${a.dosFa ? 'text-exito' : 'text-amber-700'}`}>{a.dosFa ? 'Segundo factor activado' : 'Aún no ha configurado el segundo factor'}</p>
              </div>
              <div className="flex items-center gap-3">
                {!a.yo && (
                  <form action={cambiarRolAdminAction} className="inline-flex items-center gap-1.5">
                    <input type="hidden" name="id" value={a.id} />
                    <select
                      name="nuevo_rol"
                      defaultValue={a.rolAdmin ?? 'comercial'}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="rounded-lg border border-linea px-2 py-1 text-xs font-semibold outline-none focus:border-vino bg-papel text-carbon"
                    >
                      <option value="comercial">Comercial</option>
                      <option value="direccion">Dirección</option>
                    </select>
                  </form>
                )}
                {!a.yo && (
                  <form action={retirarAdminAction} className="flex items-center gap-2 text-xs">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="email" value={a.email} />
                    <label className="flex items-center gap-1.5 text-niebla"><input type="checkbox" name="confirmo" value="si" required /> Confirmo</label>
                    <button className="rounded-full border border-vino/40 px-3.5 py-1.5 font-semibold text-vino hover:bg-vino hover:text-white">Retirar</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Añadir miembro al equipo</p>
        <p className="mt-1 text-xs text-niebla">Elige si su función es de Dirección o Comercial (vender y cartera propia). No uses correos de socios ni de locales.</p>
        <form action={altaAdminAction} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Nombre<input name="nombre" required minLength={2} maxLength={80} autoComplete="off" className={campo} /></label>
            <label className="block text-sm">Correo<input name="email" type="email" required autoComplete="off" className={campo} /></label>
          </div>
          <label className="block text-sm">Rol asignado
            <select name="rol_admin" defaultValue="comercial" className={campo}>
              <option value="comercial">Comercial (por defecto: vender y cartera propia)</option>
              <option value="direccion">Dirección (acceso global y administración completa)</option>
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmo" value="si" required className="mt-1" /> Confirmo el alta de este miembro en el equipo de Central.</label>
          <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white hover:bg-hondo">Añadir miembro</button>
        </form>
      </section>
    </div>
  );
}
