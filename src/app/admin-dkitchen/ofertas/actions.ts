'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TEMAS = ['halloween', 'navidad', 'san_valentin', 'carnaval', 'otra'];
const centimos = (v: FormDataEntryValue | null) => {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')) * 100);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Ofertas por fecha (0105): crear o cambiar. La base valida y guarda el precio que se cobrará. */
export async function guardarOfertaFechaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const tema = String(f.get('tema') ?? '');
  const desde = String(f.get('desde') ?? '');
  const hasta = String(f.get('hasta') ?? '');
  const precio = centimos(f.get('precio'));
  if (id && !UUID.test(id)) throw new Error('Oferta no válida.');
  if (!TEMAS.includes(tema)) throw new Error('Elige un tema.');
  if (!FECHA.test(desde) || !FECHA.test(hasta) || hasta < desde) throw new Error('Revisa las fechas: «hasta» no puede ser antes de «desde».');
  if (!precio || precio < 100 || precio > 100000) throw new Error('El precio va de 1 € a 1.000 €.');
  const incluye = String(f.get('incluye') ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 6);
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_oferta_fecha_guardar($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
    id || null, tema, String(f.get('titulo') ?? '').slice(0, 80), String(f.get('descripcion') ?? '').slice(0, 400), incluye,
    precio, (centimos(f.get('ancla')) ?? 0) > precio ? centimos(f.get('ancla')) : null, desde, hasta, f.get('activa') === 'si',
  ]));
  revalidatePath('/admin-dkitchen/ofertas');
}

export async function estadoSolicitudOfertaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const estado = String(f.get('estado') ?? '');
  if (!UUID.test(id) || !['recibida', 'en_curso', 'entregada', 'descartada'].includes(estado)) throw new Error('Datos no válidos.');
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_oferta_fecha_solicitud_estado($1, $2)', [id, estado]));
  revalidatePath('/admin-dkitchen/ofertas');
}
