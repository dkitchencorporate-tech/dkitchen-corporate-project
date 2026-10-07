import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { altaSocioAction, activoSocioAction, atribuirLocalAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Socios en Central (0052; regla de acceso de karc0: el alta del socio solo
 * desde aquí). Comisión: por ahora SOLO atribución (altas, cuáles pagan y
 * cuánto facturan); la regla de comisión se añadirá cuando karc0 cierre el acuerdo.
 */
type Fila = { id: string; nombre: string; email: string; codigo: string; activo: boolean; creado_en: string; altas: number; de_pago: number; mensual_centimos: number };
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5';
const campo = 'mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-2.5 text-sm outline-none focus:border-tinta';
const eur = (c: number) => (c / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' €';
const ERRORES: Record<string, string> = {
  correo: 'El correo no es válido.', nombre: 'El nombre debe tener entre 2 y 80 letras.',
  codigo: 'El código lleva de 3 a 12 letras mayúsculas o números, sin espacios (p. ej. PEPE1).',
  slug: 'La dirección del local no es válida (la parte final de /m/…).', base: 'La base no lo ha aceptado.',
};

export default async function SociosCentral({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jwt = await exigirAdmin();
  const q = await searchParams;
  const filas = await comoCliente(jwt, async (c) => (await c.query<Fila>('SELECT * FROM dk.admin_socios()')).rows);
  const totales = filas.reduce((t, f) => ({ altas: t.altas + f.altas, pago: t.pago + f.de_pago, mensual: t.mensual + f.mensual_centimos }), { altas: 0, pago: 0, mensual: 0 });
  const aviso = q.ok === 'alta'
    ? `Socio dado de alta${q.cuenta === 'nueva' ? ' con cuenta nueva' : ' (ya tenía cuenta)'}. ${q.correo === 'si' ? 'Le hemos enviado el correo para fijar su contraseña.' : 'No se pudo enviar el correo de contraseña: reenvíalo desde «¿Olvidaste tu contraseña?».'} Al entrar, configurará su app de autenticación.`
    : q.ok === 'desactivado' ? 'Socio desactivado: pierde el acceso al momento y su código deja de valer.'
    : q.ok === 'activado' ? 'Socio activado de nuevo.' : q.ok === 'atribuido' ? 'Local atribuido.' : q.ok === 'quitado' ? 'Atribución quitada.' : null;
  const error = q.e ? `${ERRORES[q.e] ?? 'No se pudo hacer.'}${q.m ? ` (${q.m})` : ''}` : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Central · Socios</p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Socios y código de vendedor</h1>
        <p className="mt-1 text-sm text-niebla">Cada socio vende con su enlace o QR (<code>?v=CÓDIGO</code>) y pone a punto la carta de sus clientes desde <code>/socio</code>, con el mismo 2FA que Central. Nunca ve pagos, planes ni clientes de otros.</p>
      </div>

      {aviso && <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{aviso}</p>}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[['Altas atribuidas', String(totales.altas)], ['De pago', String(totales.pago)], ['Facturan al mes (sin IVA)', eur(totales.mensual)]].map(([t, v]) => (
          <div key={t} className={tarjeta}><p className="text-xs text-niebla">{t}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p></div>
        ))}
      </div>

      <section className={tarjeta}>
        <p className="text-sm font-semibold">Socios ({filas.length})</p>
        {filas.length === 0 ? (
          <p className="mt-2 text-sm text-niebla">Todavía no hay ninguno. Da de alta el primero abajo.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linea text-sm">
            {filas.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{f.nombre} <span className="ml-1 rounded-full bg-papel px-2 py-0.5 font-mono text-xs">{f.codigo}</span></p>
                  <p className="truncate text-xs text-niebla">{f.email} · {f.altas} altas · {f.de_pago} de pago · {eur(f.mensual_centimos)}/mes</p>
                </div>
                <form action={activoSocioAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="activo" value={f.activo ? 'no' : 'si'} />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${f.activo ? 'bg-green-500/15 text-green-700' : 'bg-papel text-niebla'}`}>{f.activo ? 'Activo' : 'De baja'}</span>
                  <button className="rounded-full border border-linea-fuerte px-3.5 py-1.5 text-xs font-semibold hover:bg-papel">{f.activo ? 'Desactivar' : 'Activar'}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={tarjeta}>
          <p className="text-sm font-semibold">Dar de alta un socio</p>
          <p className="mt-1 text-xs text-niebla">Usa un correo que no sea de ningún local. Recibirá un correo para fijar su contraseña.</p>
          <form action={altaSocioAction} className="mt-3 space-y-3">
            <label className="block text-sm">Nombre<input name="nombre" required maxLength={80} className={campo} /></label>
            <label className="block text-sm">Correo<input name="email" type="email" required className={campo} /></label>
            <label className="block text-sm">Código de vendedor<input name="codigo" required maxLength={12} pattern="[A-Za-z0-9]{3,12}" placeholder="PEPE1" className={`${campo} font-mono uppercase`} /></label>
            <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Dar de alta</button>
          </form>
        </section>
        <section className={tarjeta}>
          <p className="text-sm font-semibold">Corregir la atribución de un local</p>
          <p className="mt-1 text-xs text-niebla">Para un alta que entró sin código o con el código equivocado. Deja el código vacío para quitarla.</p>
          <form action={atribuirLocalAction} className="mt-3 space-y-3">
            <label className="block text-sm">Dirección del local (lo que va tras /m/)<input name="slug" required placeholder="el-rincon-del-flores" className={campo} /></label>
            <label className="block text-sm">Código del socio<input name="codigo" maxLength={12} placeholder="PEPE1" className={`${campo} font-mono uppercase`} /></label>
            <button className="rounded-full border border-linea-fuerte px-5 py-2.5 text-sm font-semibold hover:bg-papel">Guardar atribución</button>
          </form>
        </section>
      </div>
    </div>
  );
}
