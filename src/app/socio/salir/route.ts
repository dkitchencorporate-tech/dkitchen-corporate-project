import { NextResponse } from 'next/server';
import { COOKIE_PUESTA } from '@/lib/socio-codigo';

/** Cierra la puesta a punto (0052): borra la cookie y vuelve a la lista de clientes. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const res = url.searchParams.get('cerrar') === '1'
    ? new NextResponse(null, { status: 204 })
    : NextResponse.redirect(new URL('/socio', url.origin));
  res.cookies.set(COOKIE_PUESTA, '', { path: '/', maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
  return res;
}
