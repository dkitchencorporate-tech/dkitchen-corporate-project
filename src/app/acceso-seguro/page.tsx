import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { comoCliente } from '@/lib/db';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { estadoAdmin } from '@/lib/guard-admin';
import { verificarSegundoFactorAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acceso seguro · DKitchen', robots: { index: false, follow: false } };

const MENSAJES: Record<string, string> = {
  codigo: 'Código incorrecto o ya utilizado. Espera al siguiente y vuelve a intentarlo.',
  formato: 'El código tiene 6 números.',
  bloqueado: 'Demasiados intentos fallidos. Espera 15 minutos antes de volver a intentarlo.',
};

/** RFC 4648 base32, el formato que leen las apps de autenticación. */
function base32(bytes: Buffer): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, valor = 0, salida = '';
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      salida += alfabeto[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += alfabeto[(valor << (5 - bits)) & 31];
  return salida;
}

export default async function AccesoSeguro({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');

  const estado = await estadoAdmin(jwt);
  if (estado === 'ok') redirect('/admin-dkitchen/qr');
  if (estado === 'no_admin') redirect('/panel');

  const { e } = await searchParams;
  const error = e ? MENSAJES[e] : null;

  let alta: { qr: string; clave: string } | null = null;
  if (estado === 'sin_configurar') {
    const identidad = await identidadActual();
    const hex = await comoCliente(jwt, async (c) => {
      const { rows } = await c.query<{ s: string }>('SELECT dk.admin_2fa_alta() AS s');
      return rows[0].s;
    });
    const clave = base32(Buffer.from(hex, 'hex'));
    const etiqueta = encodeURIComponent(`DKitchen:${identidad?.email ?? 'super-admin'}`);
    const uri = `otpauth://totp/${etiqueta}?secret=${clave}&issuer=DKitchen&algorithm=SHA1&digits=6&period=30`;
    alta = { qr: await QRCode.toDataURL(uri, { width: 240, margin: 1 }), clave: clave.replace(/(.{4})/g, '$1 ').trim() };
  }

  return (
    <div className="min-h-screen bg-crema flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-sm border border-linea space-y-6">
        <div className="text-center">
          <p className="text-xl font-bold text-[#1A1714]">
            D<span className="text-vino">Kitchen</span> · Super admin
          </p>
          <p className="mt-1 text-sm text-[#6B6560]">Verificación en dos pasos</p>
        </div>

        {alta ? (
          <div className="space-y-3 text-sm text-[#1A1714]">
            <p className="font-semibold">Primera vez: activa tu segundo factor</p>
            <ol className="list-decimal pl-5 space-y-1 text-[#6B6560]">
              <li>Abre Google Authenticator, Microsoft Authenticator o 1Password en tu móvil.</li>
              <li>Añade una cuenta escaneando este código.</li>
              <li>Escribe abajo el código de 6 números que aparece.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={alta.qr} alt="Código QR para la app de autenticación" width={240} height={240} className="mx-auto" />
            <p className="text-center text-xs text-[#6B6560]">
              ¿No puedes escanear? Clave manual:
              <br />
              <code className="font-mono text-[#1A1714] select-all">{alta.clave}</code>
            </p>
            <p className="rounded-lg bg-[#FCEBE3] p-3 text-xs text-[#1A1714]">
              Esta clave solo se muestra hasta que la actives. Después no se puede volver a ver.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#6B6560] text-center">Escribe el código de 6 números de tu app de autenticación.</p>
        )}

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <form action={verificarSegundoFactorAction} className="space-y-3">
          <input
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className="w-full rounded-lg border border-linea px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-[#1A1714] focus:border-vino focus:outline-none"
          />
          <button className="w-full rounded-lg bg-vino py-3 font-bold text-white hover:bg-vino-hondo">Verificar</button>
        </form>
      </div>
    </div>
  );
}
