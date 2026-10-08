import { exigirAdmin } from '@/lib/guard-admin';
import { administradores } from '@/lib/buzon';
import GuiaZona from '@/components/admin/GuiaZona';
import { altaAdminAction, retirarAdminAction } from './actions';

export const dynamic = 'force-dynamic';

const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const campo = 'mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta';
const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const ERRORES: Record<string, string> = {
  correo: 'El correo no es válido.', nombre: 'El nombre debe tener entre 2 y 80 letras.',
  confirmo: 'Marca la casilla de confirmación para seguir.', base: 'La base no lo ha aceptado.',
};

/** Central → Cuenta → Administradores (0065): quién entra en Central, añadir y retirar. */
export default async function Administradores({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const sp = await searchParams;
  const lista = await administradores(jwt).catch(() => null);
  const aviso = sp.ok === 'alta'
    ? `Administrador añadido. ${sp.cuenta === 'nueva' ? (sp.correo === 'si' ? 'Le hemos enviado «Crea tu contraseña de DKitchen».' : 'No se pudo enviar el correo de la contraseña: que use «¿Olvidaste tu contraseña?».') : 'Ya tenía cuenta: entra con su contraseña de siempre.'} La primera vez, Central le pedirá configurar el segundo factor.`
    : sp.ok === 'retirado' ? 'Acceso retirado. Ya no puede entrar en Central.' : null;
  const error = sp.e ? `${ERRORES[sp.e] ?? 'No se pudo hacer.'}${sp.m ? ` (${sp.m})` : ''}` : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-carbon sm:p-6 lg:p-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Cuenta</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Administradores</h1>
        <p className="mt-1 text-sm text-niebla">{lista ? `${lista.length} con acceso completo a Central` : 'No se pudo leer la lista.'}</p>
      </header>
      <GuiaZona titulo="Administradores" ancla="administradores"
        que="Las personas que pueden entrar en Central con todos los permisos: clientes, cobros, bajas, proyectos y otros administradores. Para vendedores usa Socios, que tienen un acceso recortado."
        pasos={['Escribe el nombre y el correo de la persona y marca la confirmación.', 'Si no tenía cuenta, le llega «Crea tu contraseña de DKitchen». Si ya la tenía, entra con la suya.', 'La primera vez que entre, Central le obliga a configurar el segundo factor (app de autenticación).', 'Para quitarle el acceso, pulsa «Retirar acceso» en su fila. Nadie puede retirarse a sí mismo y Central nunca se queda sin administradores.']} />
      {aviso && <p className="rounded-2xl bg-exito/10 p-4 text-sm text-exito">{aviso}</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Con acceso ahora</p>
        <ul className="mt-3 divide-y divide-linea">
          {lista?.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.nombre}{a.yo && <span className="ml-2 rounded-full bg-tinta px-2 py-0.5 text-[11px] text-oro">Tú</span>}</p>
                <p className="truncate text-xs text-niebla">{a.email} · desde el {fecha.format(new Date(a.creadoEn))}</p>
                <p className={`mt-1 text-xs font-medium ${a.dosFa ? 'text-exito' : 'text-amber-700'}`}>{a.dosFa ? 'Segundo factor activado' : 'Aún no ha configurado el segundo factor'}</p>
              </div>
              {!a.yo && (
                <form action={retirarAdminAction} className="flex items-center gap-2 text-xs">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="email" value={a.email} />
                  <label className="flex items-center gap-1.5 text-niebla"><input type="checkbox" name="confirmo" value="si" required /> Confirmo</label>
                  <button className="rounded-full border border-vino/40 px-3.5 py-1.5 font-semibold text-vino hover:bg-vino hover:text-white">Retirar acceso</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Añadir administrador</p>
        <p className="mt-1 text-xs text-niebla">Acceso completo. Usa una cuenta propia de esa persona: no vale la de un socio ni la de un local.</p>
        <form action={altaAdminAction} className="mt-3 space-y-3">
          <label className="block text-sm">Nombre<input name="nombre" required minLength={2} maxLength={80} autoComplete="off" className={campo} /></label>
          <label className="block text-sm">Correo<input name="email" type="email" required autoComplete="off" className={campo} /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmo" value="si" required className="mt-1" /> Entiendo que tendrá los mismos permisos que yo en Central.</label>
          <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Añadir administrador</button>
        </form>
      </section>
    </div>
  );
}
