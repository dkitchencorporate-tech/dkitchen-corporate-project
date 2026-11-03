'use client';

import { useState, useTransition } from 'react';
import { guardarConfigComercialAction } from '@/app/admin-dkitchen/comerciales/actions';

export type ConfigComercialUI = {
  servicios?: string[];
  zonas?: string[];
  puede_crear_demos?: boolean;
  tope_demos?: number;
  tope_imagenes_demo?: number;
};

const SERVICIOS = [
  { id: 'qr', nombre: 'Carta QR' },
  { id: 'signature', nombre: 'Signature' },
  { id: 'experience', nombre: 'Experience' },
  { id: 'auditoria', nombre: 'Auditoría' },
] as const;

const ZONAS = [
  { id: 'inicio', nombre: 'Hoy (su cartera)' },
  { id: 'prospeccion', nombre: 'Prospección' },
  { id: 'clientes', nombre: 'Clientes' },
  { id: 'servicios', nombre: 'Servicios' },
  { id: 'oportunidades', nombre: 'Oportunidades' },
  { id: 'propuestas', nombre: 'Propuestas / Ofertas' },
  { id: 'academia', nombre: 'Academia' },
  { id: 'soporte', nombre: 'Soporte' },
  { id: 'buzon', nombre: 'Buzón Agentes IA (propio)' },
] as const;

const PRESETS: { id: string; titulo: string; desc: string; cfg: Required<Omit<ConfigComercialUI, 'tope_demos' | 'tope_imagenes_demo'>> }[] = [
  {
    id: 'qr',
    titulo: 'Solo Carta QR',
    desc: 'Prospección + Demos + Alta Carta QR',
    cfg: {
      servicios: ['qr'],
      zonas: ['inicio', 'prospeccion', 'clientes', 'servicios', 'propuestas', 'academia', 'soporte', 'buzon'],
      puede_crear_demos: true,
    },
  },
  {
    id: 'premium',
    titulo: 'Solo Signature / Experience',
    desc: 'Proyectos de alto ticket y Oportunidades',
    cfg: {
      servicios: ['signature', 'experience', 'auditoria'],
      zonas: ['inicio', 'prospeccion', 'clientes', 'servicios', 'oportunidades', 'propuestas', 'academia', 'buzon'],
      puede_crear_demos: true,
    },
  },
  {
    id: 'completo',
    titulo: 'Comercial Completo',
    desc: 'Todos los servicios y herramientas de venta',
    cfg: {
      servicios: ['qr', 'signature', 'experience', 'auditoria'],
      zonas: ['inicio', 'prospeccion', 'clientes', 'servicios', 'oportunidades', 'propuestas', 'academia', 'soporte', 'buzon'],
      puede_crear_demos: true,
    },
  },
];

export default function PerfilComercialControl({
  identidadId,
  nombre,
  configInicial,
}: {
  identidadId: string;
  nombre: string;
  configInicial?: ConfigComercialUI | null;
}) {
  const [servicios, setServicios] = useState<string[]>(
    configInicial?.servicios?.length ? configInicial.servicios : ['qr', 'signature', 'experience', 'auditoria'],
  );
  const [zonas, setZonas] = useState<string[]>(
    configInicial?.zonas?.length
      ? configInicial.zonas
      : ['inicio', 'clientes', 'servicios', 'prospeccion', 'oportunidades', 'propuestas', 'academia', 'soporte', 'buzon'],
  );
  const [puedeDemos, setPuedeDemos] = useState<boolean>(configInicial?.puede_crear_demos !== false);
  const [topeDemos, setTopeDemos] = useState<number>(configInicial?.tope_demos ?? 10);
  const [topeImgDemo, setTopeImgDemo] = useState<number>(configInicial?.tope_imagenes_demo ?? 10);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const alternar = (lista: string[], item: string, setter: (v: string[]) => void, obligatorio?: string) => {
    if (obligatorio && item === obligatorio) return;
    setter(lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]);
    setMensaje(null);
  };

  const aplicarPreset = (cfg: Required<Omit<ConfigComercialUI, 'tope_demos' | 'tope_imagenes_demo'>>) => {
    setServicios(cfg.servicios);
    setZonas(cfg.zonas);
    setPuedeDemos(cfg.puede_crear_demos);
    setMensaje(null);
  };

  const guardar = () => {
    if (servicios.length === 0) {
      setMensaje({ tipo: 'err', texto: 'Marca al menos un servicio para vender.' });
      return;
    }
    setMensaje(null);
    iniciar(async () => {
      const res = await guardarConfigComercialAction(identidadId, {
        servicios,
        zonas: zonas.includes('inicio') ? zonas : ['inicio', ...zonas],
        puede_crear_demos: puedeDemos,
        tope_demos: topeDemos,
        tope_imagenes_demo: topeImgDemo,
      });
      if (res.error) setMensaje({ tipo: 'err', texto: res.error });
      else setMensaje({ tipo: 'ok', texto: 'Permisos actualizados al instante.' });
    });
  };

  return (
    <details className="rounded-2xl border border-linea bg-papel/60 p-3 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-tinta">
        <span>⚙ Configurar acceso y servicios ({servicios.length}/4 servicios · {zonas.length} zonas)</span>
        <span className="text-vino">Editar ▾</span>
      </summary>

      <div className="mt-3 space-y-3 border-t border-linea pt-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-vino">Presets en 1 clic para {nombre}</p>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => aplicarPreset(p.cfg)}
                className="rounded-xl border border-linea bg-white p-2 text-left transition hover:border-vino"
              >
                <b className="block text-xs text-tinta">{p.titulo}</b>
                <span className="block text-[10px] text-niebla">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-tinta">Servicios que puede vender y dar de alta</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SERVICIOS.map((s) => {
              const activo = servicios.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => alternar(servicios, s.id, setServicios)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activo ? 'bg-tinta text-white' : 'border border-linea bg-white text-niebla'
                  }`}
                >
                  {activo ? '✓ ' : ''}{s.nombre}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-tinta">Secciones visibles en su Central</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ZONAS.map((z) => {
              const activo = zonas.includes(z.id);
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => alternar(zonas, z.id, setZonas, 'inicio')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activo ? 'bg-vino text-white' : 'border border-linea bg-white text-niebla'
                  }`}
                >
                  {activo ? '✓ ' : ''}{z.nombre}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
          <span className="font-medium text-tinta">Permitir crear Demos completas desde Prospección</span>
          <input
            type="checkbox"
            checked={puedeDemos}
            onChange={(e) => {
              setPuedeDemos(e.target.checked);
              setMensaje(null);
            }}
            className="h-4 w-4 accent-vino"
          />
        </label>

        {puedeDemos && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-2.5">
            <label className="block text-[11px] font-medium text-tinta">
              Máx. demos comerciales
              <input
                type="number"
                min={1}
                max={100}
                value={topeDemos}
                onChange={(e) => {
                  setTopeDemos(Math.max(1, Math.min(100, Number(e.target.value) || 10)));
                  setMensaje(null);
                }}
                className="mt-1 w-full rounded-lg border border-linea px-2.5 py-1.5 text-xs font-bold text-tinta"
              />
            </label>
            <label className="block text-[11px] font-medium text-tinta">
              Máx. imágenes IA / demo
              <input
                type="number"
                min={1}
                max={50}
                value={topeImgDemo}
                onChange={(e) => {
                  setTopeImgDemo(Math.max(1, Math.min(50, Number(e.target.value) || 10)));
                  setMensaje(null);
                }}
                className="mt-1 w-full rounded-lg border border-linea px-2.5 py-1.5 text-xs font-bold text-tinta"
              />
            </label>
          </div>
        )}

        {mensaje && (
          <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${mensaje.tipo === 'ok' ? 'bg-exito/15 text-exito' : 'bg-vino/10 text-vino'}`}>
            {mensaje.texto}
          </p>
        )}

        <button
          type="button"
          disabled={pendiente}
          onClick={guardar}
          className="dk-btn min-h-[40px] w-full rounded-full bg-vino px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {pendiente ? 'Guardando…' : 'Guardar configuración del comercial'}
        </button>
      </div>
    </details>
  );
}
