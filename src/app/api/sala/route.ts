import { NextResponse } from 'next/server';
import { contextoSala, atenderLlamadaSala, registrarSala } from '@/lib/sala';
import { enviarRegistroAlTpv } from '@/lib/envio-tpv';
import { abrirCuenta, cuentaDeMesa, cerrarCuentaCamarero } from '@/lib/comandero';
import { claveDeLimite, ipDeLaPeticion, algunLimiteSuperado } from '@/lib/limite-frecuencia';
import {
  equipoEncargado, reservasEncargado, crearCamareroEncargado, editarCamareroEncargado, regenerarEnlaceEncargado, asignarZonaEncargado,
  anularLineaEncargado, cambiarCantidadEncargado, anularCuentaEncargado, moverCuentaEncargado,
} from '@/lib/equipo';

export const runtime = 'nodejs';

const TOKEN = /^[A-Za-z0-9_-]{24,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESA = /^[A-Za-z0-9-]{1,12}$/;

/**
 * App de sala (0027). El camarero entra con su enlace personal; el token solo
 * viaja en el cuerpo y la base valida su huella SHA-256 en cada llamada (se
 * revoca desactivando al camarero).
 * Freno doble (08/10): por token (90/min; un móvil gasta ~21) y por IP (600/min).
 * Antes era solo por IP a 120/min y un local con 6 o más móviles en el mismo
 * WiFi (misma IP pública) se bloqueaba. Contra fuerza bruta basta el de IP:
 * los tokens tienen 24+ caracteres aleatorios.
 * Comandero (0045): abrir cuenta, ver la cuenta de una mesa y cerrarla
 * («cobrada fuera»). Los importes los pone la base; aquí no se calcula nada.
 * Encargado (0047): las acciones de equipo y de anular/mover solo funcionan si
 * el token es de un encargado activo (la base lo comprueba; si no, 403).
 */
export async function POST(peticion: Request) {
  const c = (await peticion.json().catch(() => null)) as Record<string, unknown> | null;
  const token = String(c?.token ?? '');
  if (!TOKEN.test(token)) return NextResponse.json({ error: 'acceso' }, { status: 401 });

  try {
    if (await algunLimiteSuperado([
      { clave: claveDeLimite('sala-token', token), limite: 90, ventanaSegundos: 60 },
      { clave: claveDeLimite('sala', ipDeLaPeticion(peticion)), limite: 600, ventanaSegundos: 60 },
    ])) {
      return NextResponse.json({ error: 'limite' }, { status: 429 });
    }
  } catch { /* si el freno falla, se sigue: la BD valida el token igualmente */ }

  try {
    switch (c?.accion) {
      case 'contexto': {
        const x = await contextoSala(token);
        return x ? NextResponse.json(x) : NextResponse.json({ error: 'acceso' }, { status: 401 });
      }
      case 'atender': {
        const id = String(c?.llamadaId ?? '');
        if (!UUID.test(id)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ ok: await atenderLlamadaSala(token, id) });
      }
      case 'registrar': {
        const mesa = String(c?.mesa ?? '');
        const lineas = Array.isArray(c?.lineas) ? (c!.lineas as { plato_id?: string; cantidad?: number; nota?: string }[]) : [];
        const limpias = lineas
          .filter((l) => UUID.test(String(l.plato_id ?? '')))
          .slice(0, 60)
          .map((l) => ({ plato_id: String(l.plato_id), cantidad: Math.min(50, Math.max(1, Math.trunc(Number(l.cantidad)) || 1)), nota: String(l.nota ?? '').slice(0, 120) }));
        if (!MESA.test(mesa) || limpias.length === 0) return NextResponse.json({ error: 'datos' }, { status: 400 });
        const id = await registrarSala(token, mesa, limpias);
        if (!id) return NextResponse.json({ error: 'acceso' }, { status: 401 });
        const tpv = await enviarRegistroAlTpv(token, id);
        return NextResponse.json({ ok: true, id, tpv });
      }
      case 'abrir': {
        const mesa = String(c?.mesa ?? '');
        const n = Math.trunc(Number(c?.comensales));
        if (!MESA.test(mesa)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        const id = await abrirCuenta(token, mesa, n >= 1 && n <= 99 ? n : null);
        return id ? NextResponse.json({ ok: true, id }) : NextResponse.json({ error: 'acceso' }, { status: 401 });
      }
      case 'cuenta': {
        const mesa = String(c?.mesa ?? '');
        if (!MESA.test(mesa)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ cuenta: await cuentaDeMesa(token, mesa) });
      }
      case 'cerrar': {
        const id = String(c?.cuentaId ?? '');
        if (!UUID.test(id)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ ok: await cerrarCuentaCamarero(token, id) });
      }
      // ------------------------------------------------------- encargado (0047)
      case 'reservas': {
        const r = await reservasEncargado(token);
        if (r === null) return NextResponse.json({ error: 'acceso' }, { status: 403 });
        return NextResponse.json({ reservas: r });
      }
      case 'equipo': {
        const x = await equipoEncargado(token);
        return x ? NextResponse.json(x) : NextResponse.json({ error: 'rol' }, { status: 403 });
      }
      case 'equipo_crear': {
        const nombre = String(c?.nombre ?? '').trim().slice(0, 40);
        if (!nombre) return NextResponse.json({ error: 'datos', mensaje: 'Pon el nombre del camarero.' }, { status: 400 });
        const nuevo = await crearCamareroEncargado(token, nombre);
        if (!nuevo) return NextResponse.json({ error: 'rol' }, { status: 403 });
        return NextResponse.json({ ok: true, enlace: `${new URL(peticion.url).origin}/sala/${nuevo}` });
      }
      case 'equipo_editar': {
        const id = String(c?.camareroId ?? '');
        const nombre = typeof c?.nombre === 'string' ? c.nombre.trim().slice(0, 40) : undefined;
        const activo = typeof c?.activo === 'boolean' ? c.activo : undefined;
        if (!UUID.test(id) || nombre === '') return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ ok: await editarCamareroEncargado(token, id, { nombre, activo }) });
      }
      case 'equipo_regenerar': {
        const id = String(c?.camareroId ?? '');
        if (!UUID.test(id)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        const nuevo = await regenerarEnlaceEncargado(token, id);
        return nuevo ? NextResponse.json({ ok: true, enlace: `${new URL(peticion.url).origin}/sala/${nuevo}` }) : NextResponse.json({ ok: false });
      }
      case 'equipo_zona': {
        const zona = String(c?.zona ?? '').trim();
        const cam = c?.camareroId ? String(c.camareroId) : null;
        if (!zona || zona.length > 30 || (cam && !UUID.test(cam))) return NextResponse.json({ error: 'datos' }, { status: 400 });
        const n = await asignarZonaEncargado(token, zona, cam);
        return n === null ? NextResponse.json({ error: 'rol' }, { status: 403 }) : NextResponse.json({ ok: true, mesas: n });
      }
      case 'anular_linea': {
        const id = String(c?.lineaId ?? '');
        if (!UUID.test(id)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ ok: await anularLineaEncargado(token, id, String(c?.motivo ?? '').slice(0, 200)) });
      }
      case 'cambiar_cantidad': {
        const id = String(c?.lineaId ?? '');
        const n = Math.trunc(Number(c?.cantidad));
        if (!UUID.test(id) || !(n >= 0 && n <= 50)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ ok: await cambiarCantidadEncargado(token, id, n, String(c?.motivo ?? '').trim().slice(0, 200) || null) });
      }
      case 'anular_cuenta': {
        const id = String(c?.cuentaId ?? '');
        if (!UUID.test(id)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ ok: await anularCuentaEncargado(token, id, String(c?.motivo ?? '').slice(0, 200)) });
      }
      case 'mover': {
        const id = String(c?.cuentaId ?? '');
        const mesa = String(c?.mesa ?? '');
        if (!UUID.test(id) || !MESA.test(mesa)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json(await moverCuentaEncargado(token, id, mesa));
      }
      default:
        return NextResponse.json({ error: 'accion' }, { status: 400 });
    }
  } catch (error) {
    // P0001 = mensaje de la base pensado para la persona (motivo, tope, cantidad…)
    if ((error as { code?: string })?.code === 'P0001') {
      return NextResponse.json({ error: 'datos', mensaje: (error as Error).message }, { status: 400 });
    }
    console.error('App de sala:', (error as Error).message);
    return NextResponse.json({ error: 'servidor' }, { status: 500 });
  }
}
