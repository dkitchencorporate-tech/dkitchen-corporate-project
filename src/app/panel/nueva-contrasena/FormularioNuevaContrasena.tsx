'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const SEGUNDOS_REDIRECCION = 4;

function calcularFortaleza(contrasena: string): { nivel: 0 | 1 | 2 | 3; etiqueta: string; color: string } {
  if (!contrasena) return { nivel: 0, etiqueta: '', color: 'bg-gray-200' };

  let puntos = 0;
  if (contrasena.length >= 8) puntos++;
  if (contrasena.length >= 12) puntos++;
  if (/[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena)) puntos++;
  if (/[0-9]/.test(contrasena)) puntos++;
  if (/[^a-zA-Z0-9]/.test(contrasena)) puntos++;

  if (puntos <= 1) return { nivel: 1, etiqueta: 'Débil', color: 'bg-red-500' };
  if (puntos <= 3) return { nivel: 2, etiqueta: 'Aceptable', color: 'bg-amber-500' };
  return { nivel: 3, etiqueta: 'Potente', color: 'bg-green-500' };
}

function CampoContrasena({
  id,
  label,
  valor,
  onChange,
  error,
}: {
  id: string;
  label: string;
  valor: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          minLength={8}
          required
          aria-invalid={!!error}
          className={`w-full border-2 rounded-xl px-4 py-3 pr-12 outline-none transition-colors ${
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-200 focus:border-vino'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <circle cx="12" cy="12" r="10" fillOpacity="0.15" />
            <path d="M12 7v6M12 16.5v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export default function FormularioNuevaContrasena() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [tocoConfirmacion, setTocoConfirmacion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_REDIRECCION);

  const fortaleza = useMemo(() => calcularFortaleza(contrasena), [contrasena]);

  useEffect(() => {
    if (!hecho) return;
    if (segundosRestantes <= 0) {
      router.push('/panel/iniciar-sesion');
      return;
    }
    const temporizador = setTimeout(() => setSegundosRestantes((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [hecho, segundosRestantes, router]);

  // Se calcula en cada tecla, no solo al enviar — así el campo se marca en
  // rojo en cuanto deja de coincidir, en vez de que el aviso solo aparezca
  // después de pulsar "Fijar contraseña".
  const noCoinciden = tocoConfirmacion && confirmacion.length > 0 && contrasena !== confirmacion;
  const erroCorta = contrasena.length > 0 && contrasena.length < 8;

  if (!token) {
    return (
      <p className="text-center text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
        Este enlace no es válido o le falta el token. Pide uno nuevo desde el correo de bienvenida o
        escríbenos por WhatsApp.
      </p>
    );
  }

  if (hecho) {
    return (
      <div className="text-center bg-green-50 border border-green-200 rounded-xl p-6">
        <p className="text-green-700 font-bold mb-2">Contraseña fijada.</p>
        <p className="text-gray-600 text-sm mb-5">
          Ya puedes iniciar sesión en tu panel con tu correo y esta contraseña.
        </p>
        <a
          href="/panel/iniciar-sesion"
          className="inline-block w-full bg-vino text-white font-black py-3.5 rounded-full hover:bg-orange-600 transition-colors"
        >
          Iniciar sesión ahora
        </a>
        <p className="text-gray-400 text-xs mt-3">
          Te llevamos automáticamente en {segundosRestantes}s…
        </p>
      </div>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    setTocoConfirmacion(true);

    if (contrasena.length < 8) {
      return;
    }
    if (contrasena !== confirmacion) {
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: contrasena }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos?.error ?? 'No se pudo fijar la contraseña.');
      setHecho(true);
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : 'No se pudo fijar la contraseña.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <CampoContrasena
          id="contrasena"
          label="Nueva contraseña"
          valor={contrasena}
          onChange={setContrasena}
          error={erroCorta ? 'Necesita al menos 8 caracteres.' : null}
        />
        {contrasena.length > 0 && !erroCorta && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= fortaleza.nivel ? fortaleza.color : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <p
              className={`text-xs mt-1 font-semibold ${
                fortaleza.nivel === 1 ? 'text-red-600' : fortaleza.nivel === 2 ? 'text-amber-600' : 'text-green-600'
              }`}
            >
              {fortaleza.etiqueta}
            </p>
          </div>
        )}
      </div>

      <CampoContrasena
        id="confirmacion"
        label="Repite la contraseña"
        valor={confirmacion}
        onChange={(v) => {
          setConfirmacion(v);
          setTocoConfirmacion(true);
        }}
        error={noCoinciden ? 'No coincide con la contraseña de arriba.' : null}
      />

      {errorGeneral && <p className="text-red-600 text-sm">{errorGeneral}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-vino text-white font-black py-3.5 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {enviando ? 'Guardando…' : 'Fijar contraseña'}
      </button>
    </form>
  );
}
