import { NextResponse } from 'next/server';
import { COOKIE_PUESTA } from '@/lib/socio-codigo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cierra el modo soporte (0061): borra la cookie y vuelve a la ficha del cliente en Central. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const res = NextResponse.redirect(new URL(UUID.test(id) ? `/admin-dkitchen/qr/${id}` : '/admin-dkitchen/qr', url.origin));
  res.cookies.set(COOKIE_PUESTA, '', { path: '/', maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
  return res;
}
