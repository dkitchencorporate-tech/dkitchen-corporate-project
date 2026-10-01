'use client';

import { useState } from 'react';

interface ProductoCatalogo {
  nombre: string;
  descripcion: string;
  precio: string;
  alergenos: string;
  variantes: string;
}

interface SeccionCatalogo {
  categoria: string;
  productos: ProductoCatalogo[];
}

function productoVacio(): ProductoCatalogo {
  return { nombre: '', descripcion: '', precio: '', alergenos: '', variantes: '' };
}

function seccionVacia(): SeccionCatalogo {
  return { categoria: '', productos: [productoVacio()] };
}

/**
 * Formulario de intake — Parte 8, Sección 5-bis. Un solo envío al final
 * (no autoguardado por sección): el backend hace upsert, así que reenviar
 * el formulario entero corrige lo anterior sin duplicar nada.
 */
export default function FormularioIntakeNivelB({ token }: { token: string }) {
  const [negocio, setNegocio] = useState({ nombre: '', direcciones: '', horario: '', colores: '' });
  const [catalogo, setCatalogo] = useState<SeccionCatalogo[]>([seccionVacia()]);
  const [rama, setRama] = useState<'propias' | 'ia'>('propias');
  const [enlaceFotos, setEnlaceFotos] = useState('');
  const [estiloIA, setEstiloIA] = useState('minimalista');
  const [referenciaIA, setReferenciaIA] = useState('');
  const [aceptaAvisoIA, setAceptaAvisoIA] = useState(false);
  const [integracion, setIntegracion] = useState({ posFiscal: '', pasarelaReservas: '', idiomas: '' });
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const actualizarProducto = (si: number, pi: number, campo: keyof ProductoCatalogo, valor: string) => {
    setCatalogo((prev) => {
      const copia = [...prev];
      const productos = [...copia[si].productos];
      productos[pi] = { ...productos[pi], [campo]: valor };
      copia[si] = { ...copia[si], productos };
      return copia;
    });
  };

  const faltaAlergeno = catalogo.some((s) => s.productos.some((p) => p.nombre.trim() && !p.alergenos.trim()));

  const enviar = async () => {
    if (!negocio.nombre.trim() || !negocio.direcciones.trim()) {
      setErrorMsg('Faltan los datos básicos del negocio.');
      setEstado('error');
      return;
    }
    if (faltaAlergeno) {
      setErrorMsg('Todos los productos con nombre necesitan sus alérgenos indicados (o "ninguno").');
      setEstado('error');
      return;
    }
    if (rama === 'ia' && !aceptaAvisoIA) {
      setErrorMsg('Tienes que aceptar el aviso sobre fotos generadas por IA para continuar con esa opción.');
      setEstado('error');
      return;
    }

    setEstado('enviando');
    try {
      const respuesta = await fetch(`/api/intake/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocio,
          catalogo: catalogo.filter((s) => s.categoria.trim() || s.productos.some((p) => p.nombre.trim())),
          fotos:
            rama === 'propias'
              ? { rama, enlace: enlaceFotos }
              : { rama, estilo: estiloIA, referencia: referenciaIA, aceptaAvisoRiesgo: true },
          integracion,
        }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        throw new Error(datos?.error ?? 'No se pudo guardar');
      }
      setEstado('enviado');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo guardar');
      setEstado('error');
    }
  };

  if (estado === 'enviado') {
    return (
      <div className="max-w-lg mx-auto text-center py-24 px-6">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Recibido</h1>
        <p className="text-gray-600 text-lg">
          Ya tenemos lo que necesitamos para empezar. Si necesitas corregir algo, vuelve a este mismo enlace y
          rellena el formulario otra vez — sustituye lo anterior.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-14">
      <header>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Cuéntanos tu negocio</h1>
        <p className="text-gray-600 text-lg">
          Con esto montamos tu sistema. Cuanto más completo, antes lo tenemos listo.
        </p>
      </header>

      {/* 1. Datos del negocio */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-gray-900">1. Datos del negocio</h2>
        <input
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
          placeholder="Nombre del negocio"
          value={negocio.nombre}
          onChange={(e) => setNegocio({ ...negocio, nombre: e.target.value })}
        />
        <textarea
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
          placeholder="Dirección (una por línea si tienes varios locales)"
          rows={2}
          value={negocio.direcciones}
          onChange={(e) => setNegocio({ ...negocio, direcciones: e.target.value })}
        />
        <textarea
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
          placeholder="Horario (por día de la semana)"
          rows={2}
          value={negocio.horario}
          onChange={(e) => setNegocio({ ...negocio, horario: e.target.value })}
        />
        <input
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
          placeholder="Colores de tu marca, si ya los tienes (si no, usamos la paleta de DKitchen)"
          value={negocio.colores}
          onChange={(e) => setNegocio({ ...negocio, colores: e.target.value })}
        />
      </section>

      {/* 2. Catálogo */}
      <section className="space-y-6">
        <h2 className="text-xl font-black text-gray-900">2. Catálogo</h2>
        <p className="text-gray-500 text-sm">
          Los alérgenos son obligatorios por producto (escribe &quot;ninguno&quot; si no aplica) — es un requisito
          legal, no opcional.
        </p>
        {catalogo.map((seccion, si) => (
          <div key={si} className="border-2 border-gray-100 rounded-2xl p-5 space-y-4">
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-[#6E0C2B] outline-none font-bold"
              placeholder="Categoría (ej. Entrantes, Pizzas, Postres)"
              value={seccion.categoria}
              onChange={(e) => {
                const copia = [...catalogo];
                copia[si] = { ...copia[si], categoria: e.target.value };
                setCatalogo(copia);
              }}
            />
            {seccion.productos.map((p, pi) => (
              <div key={pi} className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#FDFCF8] p-3 rounded-xl">
                <input
                  className="px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-[#6E0C2B]"
                  placeholder="Nombre del producto"
                  value={p.nombre}
                  onChange={(e) => actualizarProducto(si, pi, 'nombre', e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-[#6E0C2B]"
                  placeholder="Precio"
                  value={p.precio}
                  onChange={(e) => actualizarProducto(si, pi, 'precio', e.target.value)}
                />
                <input
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-[#6E0C2B]"
                  placeholder="Descripción"
                  value={p.descripcion}
                  onChange={(e) => actualizarProducto(si, pi, 'descripcion', e.target.value)}
                />
                <input
                  className={`px-3 py-2 rounded-lg border outline-none focus:border-[#6E0C2B] ${!p.alergenos.trim() && p.nombre.trim() ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Alérgenos (obligatorio)"
                  value={p.alergenos}
                  onChange={(e) => actualizarProducto(si, pi, 'alergenos', e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-[#6E0C2B]"
                  placeholder="Variantes/extras (opcional)"
                  value={p.variantes}
                  onChange={(e) => actualizarProducto(si, pi, 'variantes', e.target.value)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const copia = [...catalogo];
                copia[si] = { ...copia[si], productos: [...copia[si].productos, productoVacio()] };
                setCatalogo(copia);
              }}
              className="text-sm font-bold text-[#6E0C2B] hover:underline"
            >
              + Añadir producto
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCatalogo([...catalogo, seccionVacia()])}
          className="text-sm font-bold text-gray-700 hover:text-[#6E0C2B]"
        >
          + Añadir categoría
        </button>
      </section>

      {/* 3. Fotos de producto */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-gray-900">3. Fotos de producto</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRama('propias')}
            className={`flex-1 px-4 py-3 rounded-xl border-2 font-bold transition-colors ${rama === 'propias' ? 'border-[#6E0C2B] bg-orange-50 text-[#6E0C2B]' : 'border-gray-200 text-gray-600'}`}
          >
            Tengo mis propias fotos
          </button>
          <button
            type="button"
            onClick={() => setRama('ia')}
            className={`flex-1 px-4 py-3 rounded-xl border-2 font-bold transition-colors ${rama === 'ia' ? 'border-[#6E0C2B] bg-orange-50 text-[#6E0C2B]' : 'border-gray-200 text-gray-600'}`}
          >
            Que las genere DKitchen con IA
          </button>
        </div>

        {rama === 'propias' ? (
          <input
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
            placeholder="Enlace a tus fotos y tu logo (Google Drive, WeTransfer...)"
            value={enlaceFotos}
            onChange={(e) => setEnlaceFotos(e.target.value)}
          />
        ) : (
          <div className="space-y-3">
            <select
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
              value={estiloIA}
              onChange={(e) => setEstiloIA(e.target.value)}
            >
              <option value="minimalista">Minimalista / oscuro</option>
              <option value="calido">Cálido / rústico</option>
              <option value="vibrante">Vibrante / colorido</option>
            </select>
            <input
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
              placeholder="Enlace a 1-3 fotos de referencia/inspiración (opcional)"
              value={referenciaIA}
              onChange={(e) => setReferenciaIA(e.target.value)}
            />
            <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={aceptaAvisoIA}
                onChange={(e) => setAceptaAvisoIA(e.target.checked)}
                className="mt-1"
              />
              <span>
                Entiendo que una foto generada por IA es una <strong>aproximación</strong> del plato, no una
                fotografía real — si no se parece a lo que sirvo, puede generar quejas de mis clientes. Ninguna
                imagen se publica sin que yo la apruebe antes.
              </span>
            </label>
          </div>
        )}
      </section>

      {/* 4. Integración operativa */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-gray-900">4. Integración operativa</h2>
        <input
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
          placeholder="Sistema POS/fiscal que ya usas (para el cierre de día)"
          value={integracion.posFiscal}
          onChange={(e) => setIntegracion({ ...integracion, posFiscal: e.target.value })}
        />
        <input
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
          placeholder="Pasarela de pago propia, si vas a usar el motor de reservas (opcional)"
          value={integracion.pasarelaReservas}
          onChange={(e) => setIntegracion({ ...integracion, pasarelaReservas: e.target.value })}
        />
        <input
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6E0C2B] outline-none"
          placeholder="Idiomas que necesitas en la carta, si contrataste el add-on (opcional)"
          value={integracion.idiomas}
          onChange={(e) => setIntegracion({ ...integracion, idiomas: e.target.value })}
        />
      </section>

      {estado === 'error' && <p className="text-red-600 font-bold">{errorMsg}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={estado === 'enviando'}
        className="w-full bg-[#6E0C2B] text-white px-8 py-4 rounded-full font-black text-lg hover:bg-orange-600 transition-all disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Enviar'}
      </button>
    </div>
  );
}
