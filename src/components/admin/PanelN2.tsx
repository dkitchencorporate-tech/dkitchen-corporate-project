import { CATEGORIAS, type Diagnostico, type Sugerencia } from '@/lib/soporte-n2';
import { n2ReenviarAccesoAction, n2BienvenidaAction, n2RegenerarEnlaceAction, n2ReintentarTpvAction, n2ResolverAction } from '@/app/admin-dkitchen/soporte/actions';

/**
 * Soporte N2 en Central (0055). Diagnóstico por reglas con los datos reales del
 * local, las cuatro acciones seguras y el cierre con resolución (cuenta para
 * los 50 tickets que decidirán la automatización). Lo usa karc0 (o Claude Code
 * con su permiso); el borrador se edita en el formulario de respuesta.
 */
const COLOR = { alta: 'bg-red-50 text-red-800 border-red-200', media: 'bg-amber-50 text-amber-900 border-amber-200', info: 'bg-papel text-grafito border-linea' };
const boton = 'rounded-full border border-linea-fuerte bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-papel';

export default function PanelN2({ ticketId, restauranteId, d, s, acciones }: {
  ticketId: string; restauranteId: string; d: Diagnostico | null; s: Sugerencia; acciones: { accion: string; en: string }[];
}) {
  const ocultos = (<><input type="hidden" name="ticketId" value={ticketId} /><input type="hidden" name="restauranteId" value={restauranteId} /></>);
  const sugeridas = new Set(s.hallazgos.map((h) => h.accion).filter(Boolean));
  const activos = d?.equipo.filter((e) => e.activo) ?? [];
  return (
    <details className="rounded-xl border border-linea bg-crema/60 p-3 text-sm" open={s.hallazgos.some((h) => h.gravedad !== 'info')}>
      <summary className="cursor-pointer select-none font-semibold">
        Diagnóstico N2 · sugerido: {CATEGORIAS[s.categoria]} · nivel {s.nivel}{s.nivel === 3 ? ' (persona)' : ''}
      </summary>
      {!d ? <p className="mt-2 text-niebla">No se pudo leer el estado del local.</p> : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-niebla">
            Plan {d.local.plan} · {d.local.estado_acceso}{d.local.fundador ? ' · Fundador' : ''} · {d.carta.platos} platos · QR {d.qr.activo ? 'activo' : 'NO activo'} ·
            dueño {d.acceso ? `${d.acceso.sesiones} sesiones` : 'sin cuenta'} · equipo {activos.length} activo(s){d.tpv ? ` · TPV ${d.tpv.proveedor}${d.tpv.activa ? '' : ' (off)'}` : ''}
          </p>
          {s.hallazgos.length === 0 ? <p className="text-niebla">Sin hallazgos: probablemente se responde con la guía (nivel 1).</p> : (
            <ul className="space-y-1.5">{s.hallazgos.map((h, i) => <li key={i} className={`rounded-lg border px-3 py-2 text-xs ${COLOR[h.gravedad]}`}>{h.texto}</li>)}</ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <form action={n2ReenviarAccesoAction}>{ocultos}<button className={`${boton} ${sugeridas.has('reenviar_acceso') ? 'border-vino text-vino' : ''}`}>Reenviar acceso</button></form>
            <form action={n2BienvenidaAction}>{ocultos}<button className={`${boton} ${sugeridas.has('reenviar_bienvenida') ? 'border-vino text-vino' : ''}`}>Reenviar bienvenida</button></form>
            {activos.length > 0 && (
              <form action={n2RegenerarEnlaceAction} className="flex items-center gap-1.5">{ocultos}
                <select name="camareroId" className="rounded-full border border-acero bg-white px-2 py-1.5 text-xs">
                  {activos.map((e) => <option key={e.id} value={e.id}>{e.nombre} ({e.rol}){e.ultimo_acceso ? '' : ' · nunca entró'}</option>)}
                </select>
                <button className={`${boton} ${sugeridas.has('regenerar_enlace') ? 'border-vino text-vino' : ''}`}>Nuevo enlace</button>
              </form>
            )}
            {!!d.tpv?.fallidos_7d.length && <form action={n2ReintentarTpvAction}>{ocultos}<button className={`${boton} border-vino text-vino`}>Reintentar {d.tpv.fallidos_7d.length} envío(s) al TPV</button></form>}
          </div>
          {acciones.length > 0 && <p className="text-xs text-niebla">Hecho: {acciones.map((a) => `${a.accion.replace('_', ' ')} (${new Date(a.en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`).join(' · ')}</p>}
          <form action={n2ResolverAction} className="grid gap-2 rounded-lg border border-linea bg-white p-3 sm:grid-cols-[1fr_auto_auto]">
            {ocultos}
            <input name="resolucion" maxLength={500} placeholder="Qué se hizo y qué lo causaba (para la base de conocimiento)" className="rounded-lg border border-acero px-3 py-2 text-xs sm:col-span-3" />
            <select name="categoria" defaultValue={s.categoria} className="rounded-lg border border-acero bg-white px-2 py-2 text-xs">
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="nivel" defaultValue={s.nivel} className="rounded-lg border border-acero bg-white px-2 py-2 text-xs">
              <option value={1}>Nivel 1 · guía</option><option value={2}>Nivel 2 · acción segura</option><option value={3}>Nivel 3 · persona</option>
            </select>
            <select name="acertado" defaultValue="" required className="rounded-lg border border-acero bg-white px-2 py-2 text-xs">
              <option value="" disabled>¿Acertó el diagnóstico?</option><option value="si">Sí, acertó</option><option value="no">No acertó</option>
            </select>
            <button className="rounded-full bg-tinta px-4 py-2 text-xs font-semibold text-white sm:col-span-3 sm:justify-self-end">Cerrar como resuelto</button>
          </form>
        </div>
      )}
    </details>
  );
}
