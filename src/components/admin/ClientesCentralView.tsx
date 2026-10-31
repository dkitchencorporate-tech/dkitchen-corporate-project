'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { nombrePlan } from '@/lib/pricing-config';
import type { ClienteQr, Pestana } from '@/lib/admin-clientes';
import { asignarComercialAction } from '@/app/admin-dkitchen/qr/actions';

export function pestanaDe(c: ClienteQr, hoy = new Date().toISOString().slice(0, 10)): Pestana {
  if (c.archivadoEn) return 'archivados';
  if (c.demoInterna) return 'demo';
  if (c.estadoAcceso === 'suspendido') return 'bajas';
  if (c.bajaProgramadaEn || c.estadoAcceso === 'gracia' || c.estadoAcceso === 'solo_lectura') return 'riesgo';
  if (c.pruebaHasta && c.pruebaHasta >= hoy) return 'prueba';
  return 'activos';
}

export interface MiembroEquipo {
  id: string;
  nombre: string;
  email: string;
  rolAdmin?: string;
}

interface Props {
  clientesIniciales: ClienteQr[];
  usuarioActual: { id?: string; nombre?: string; email?: string } | null;
  miembrosEquipo?: MiembroEquipo[];
  esComercial?: boolean;
  filtroInicial?: {
    pestana?: string;
    servicio?: string;
    comercial?: string;
    mis?: string;
    busqueda?: string;
  };
}

const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
const dia = (iso: string) => fecha.format(new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso));
const euros = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';

function EstadoBadge({ c }: { c: ClienteQr }) {
  const [t, cl] = c.bajaProgramadaEn && c.estadoAcceso !== 'suspendido' ? [`Baja el ${dia(c.bajaProgramadaEn)}`, 'bg-vino/10 text-vino']
    : c.estadoAcceso === 'gracia' ? ['Cobro fallido', 'bg-amber-500/15 text-amber-700']
    : c.estadoAcceso === 'solo_lectura' ? [c.pruebaHasta ? 'Prueba vencida' : 'Solo lectura', 'bg-amber-500/15 text-amber-700']
    : c.estadoAcceso === 'suspendido' ? [c.bajaDesde ? `De baja desde ${dia(c.bajaDesde)}` : 'Suspendido', 'bg-red-500/15 text-red-600']
    : c.demoInterna ? ['Demo interna', 'bg-papel text-niebla border border-linea']
    : c.pruebaHasta ? [`Prueba hasta ${dia(c.pruebaHasta)}`, 'bg-vino/10 text-vino']
    : ['Activo', 'bg-green-500/15 text-green-700'];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cl}`}>{t}</span>;
}

export default function ClientesCentralView({
  clientesIniciales,
  usuarioActual,
  miembrosEquipo = [],
  esComercial = false,
  filtroInicial = {},
}: Props) {
  const hoy = useMemo(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }), []);

  const [busqueda, setBusqueda] = useState(filtroInicial.busqueda || '');
  const [servicioFiltro, setServicioFiltro] = useState<'todos' | 'qr' | 'signature' | 'experience'>(
    (filtroInicial.servicio as any) || 'todos'
  );
  const [estadoFiltro, setEstadoFiltro] = useState<string>(filtroInicial.pestana || 'todos');
  const [comercialFiltro, setComercialFiltro] = useState<string>(filtroInicial.comercial || '');
  const [ciudadFiltro, setCiudadFiltro] = useState<string>('');
  const [soloMisClientes, setSoloMisClientes] = useState<boolean>(filtroInicial.mis === '1');

  // Identificador UUID estricto del usuario actual (servidor)
  const miId = usuarioActual?.id || null;

  // Lista única de ciudades para el selector
  const listaCiudades = useMemo(() => {
    const setCiu = new Set<string>();
    clientesIniciales.forEach((c) => {
      if (c.ciudad && c.ciudad.trim()) setCiu.add(c.ciudad.trim());
    });
    return Array.from(setCiu).sort();
  }, [clientesIniciales]);

  // Contadores para las píldoras de acceso rápido
  const conteo = useMemo(() => {
    const todos = clientesIniciales.length;
    const qr = clientesIniciales.filter((c) => !c.soloProyecto).length;
    const sig = clientesIniciales.filter((c) => c.tieneSignature).length;
    const exp = clientesIniciales.filter((c) => c.tieneExperience).length;
    const prueba = clientesIniciales.filter((c) => pestanaDe(c, hoy) === 'prueba').length;
    const riesgo = clientesIniciales.filter((c) => pestanaDe(c, hoy) === 'riesgo').length;
    // Comparación estricta por UUID de identidad asignada
    const mis = miId ? clientesIniciales.filter((c) => c.comercialId === miId).length : 0;
    return { todos, qr, sig, exp, prueba, riesgo, mis };
  }, [clientesIniciales, hoy, miId]);

  // Filtrado reactivo en tiempo real
  const clientesFiltrados = useMemo(() => {
    return clientesIniciales.filter((c) => {
      // 1. Filtro "Mis clientes" (estricto por UUID de identidad)
      if (soloMisClientes && miId) {
        if (c.comercialId !== miId) return false;
      }

      // 2. Filtro por comercial seleccionado (UUID de identidad)
      if (comercialFiltro) {
        if (c.comercialId !== comercialFiltro) return false;
      }

      // 3. Filtro por ciudad seleccionada
      if (ciudadFiltro) {
        const cCiu = (c.ciudad || '').toLowerCase().trim();
        if (cCiu !== ciudadFiltro.toLowerCase().trim()) return false;
      }

      // 4. Filtro por servicio
      if (servicioFiltro === 'qr' && c.soloProyecto) return false;
      if (servicioFiltro === 'signature' && !c.tieneSignature) return false;
      if (servicioFiltro === 'experience' && !c.tieneExperience) return false;

      // 5. Filtro por estado / situación
      if (estadoFiltro !== 'todos') {
        const situacion = pestanaDe(c, hoy);
        if (situacion !== estadoFiltro) return false;
      }

      // 6. Buscador de texto libre
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const enNombre = c.nombre.toLowerCase().includes(q);
        const enSlug = c.slug.toLowerCase().includes(q);
        const enEmail = (c.email || '').toLowerCase().includes(q);
        const enContacto = (c.contacto || '').toLowerCase().includes(q);
        const enCiudad = (c.ciudad || '').toLowerCase().includes(q);
        const enComercial = (c.comercialNombre || '').toLowerCase().includes(q);
        const enPaso = (c.siguientePaso || '').toLowerCase().includes(q);
        if (!enNombre && !enSlug && !enEmail && !enContacto && !enCiudad && !enComercial && !enPaso) {
          return false;
        }
      }

      return true;
    });
  }, [clientesIniciales, soloMisClientes, comercialFiltro, ciudadFiltro, servicioFiltro, estadoFiltro, busqueda, miId, hoy]);

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setBusqueda('');
    setServicioFiltro('todos');
    setEstadoFiltro('todos');
    setComercialFiltro('');
    setCiudadFiltro('');
    setSoloMisClientes(false);
  };

  const hayFiltrosActivos = busqueda || servicioFiltro !== 'todos' || estadoFiltro !== 'todos' || comercialFiltro || ciudadFiltro || soloMisClientes;

  return (
    <div className="space-y-6">
      {/* Píldoras de filtrado rápido — diseño de autor Gran Reserva */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setServicioFiltro('todos');
            setEstadoFiltro('todos');
            setSoloMisClientes(false);
          }}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            servicioFiltro === 'todos' && estadoFiltro === 'todos' && !soloMisClientes
              ? 'bg-tinta text-white ring-2 ring-tinta/20'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          Todos <span className="ml-1 opacity-75 tabular-nums">{conteo.todos}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setServicioFiltro(servicioFiltro === 'qr' ? 'todos' : 'qr');
            setSoloMisClientes(false);
          }}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            servicioFiltro === 'qr'
              ? 'bg-tinta text-white ring-2 ring-tinta/20'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          Carta QR <span className="ml-1 opacity-75 tabular-nums">{conteo.qr}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setServicioFiltro(servicioFiltro === 'signature' ? 'todos' : 'signature');
            setSoloMisClientes(false);
          }}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            servicioFiltro === 'signature'
              ? 'bg-vino text-white ring-2 ring-vino/30'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          Signature <span className="ml-1 opacity-75 tabular-nums">{conteo.sig}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setServicioFiltro(servicioFiltro === 'experience' ? 'todos' : 'experience');
            setSoloMisClientes(false);
          }}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            servicioFiltro === 'experience'
              ? 'bg-[#1F2A44] text-white ring-2 ring-[#1F2A44]/30'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          Experience <span className="ml-1 opacity-75 tabular-nums">{conteo.exp}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEstadoFiltro(estadoFiltro === 'prueba' ? 'todos' : 'prueba');
            setSoloMisClientes(false);
          }}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            estadoFiltro === 'prueba'
              ? 'bg-vino text-white ring-2 ring-vino/30'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          En prueba <span className="ml-1 opacity-75 tabular-nums">{conteo.prueba}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEstadoFiltro(estadoFiltro === 'riesgo' ? 'todos' : 'riesgo');
            setSoloMisClientes(false);
          }}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            estadoFiltro === 'riesgo'
              ? 'bg-amber-600 text-white ring-2 ring-amber-600/30'
              : 'border border-linea bg-white text-carbon hover:bg-papel'
          }`}
        >
          En riesgo <span className="ml-1 opacity-75 tabular-nums">{conteo.riesgo}</span>
        </button>

        {!esComercial && miId && (
          <button
            type="button"
            onClick={() => {
              setSoloMisClientes(!soloMisClientes);
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              soloMisClientes
                ? 'bg-oro text-noche ring-2 ring-oro/40 font-bold'
                : 'border border-oro/60 bg-oro/10 text-carbon hover:bg-oro/20'
            }`}
          >
            ★ Mis clientes {conteo.mis > 0 && <span className="ml-1 tabular-nums">({conteo.mis})</span>}
          </button>
        )}

        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs font-medium text-vino hover:underline ml-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Barra de búsqueda y selectores secundarios */}
      <div className="flex flex-col gap-3 rounded-2xl border border-linea bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por local, ciudad, contacto o comercial..."
            className="w-full rounded-xl border border-linea bg-papel px-3.5 py-2 pl-9 text-sm text-carbon outline-none transition placeholder:text-niebla focus:border-vino focus:bg-white"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-niebla"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-2.5 text-xs text-niebla hover:text-carbon"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de comercial con miembros del Equipo (identidades) */}
          {!esComercial && miembrosEquipo.length > 0 && (
            <select
              value={comercialFiltro}
              onChange={(e) => setComercialFiltro(e.target.value)}
              className="rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-medium text-carbon outline-none focus:border-vino"
            >
              <option value="">Todos los comerciales</option>
              {miembrosEquipo.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.email})
                </option>
              ))}
            </select>
          )}

          {/* Selector de ciudad */}
          {listaCiudades.length > 0 && (
            <select
              value={ciudadFiltro}
              onChange={(e) => setCiudadFiltro(e.target.value)}
              className="rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-medium text-carbon outline-none focus:border-vino"
            >
              <option value="">Todas las ciudades</option>
              {listaCiudades.map((ciu) => (
                <option key={ciu} value={ciu}>
                  {ciu}
                </option>
              ))}
            </select>
          )}

          {/* Selector de situación */}
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-medium text-carbon outline-none focus:border-vino"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="prueba">En prueba</option>
            <option value="riesgo">En riesgo</option>
            <option value="bajas">Bajas</option>
            <option value="demo">Demo interna</option>
            <option value="archivados">Archivados</option>
          </select>
        </div>
      </div>

      {/* Resultados de la búsqueda */}
      {clientesFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-linea bg-white p-12 text-center">
          <p className="font-display text-lg font-semibold text-carbon">Ningún cliente coincide con los filtros</p>
          <p className="mt-1 text-sm text-niebla">Prueba a cambiar los términos de búsqueda o a limpiar los filtros.</p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-4 inline-flex items-center rounded-full bg-vino px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-hondo"
          >
            Ver todos los clientes
          </button>
        </div>
      ) : (
        <>
          {/* Vista móvil (<768px): tarjeta responsive por cliente sin corte lateral */}
          <ul className="space-y-3 md:hidden">
            {clientesFiltrados.map((c) => {
              const urlFicha = c.soloProyecto
                ? `/admin-dkitchen/proyectos/${c.restauranteId}`
                : `/admin-dkitchen/qr/${c.restauranteId}`;

              return (
                <li key={c.restauranteId}>
                  <div className="rounded-2xl border border-linea bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={urlFicha} className="truncate font-display font-semibold text-carbon hover:text-vino">
                          {c.nombre}
                        </Link>
                        <p className="truncate text-xs text-niebla">
                          {c.ciudad || 'España'}
                          {c.comercialNombre ? ` · comercial ${c.comercialNombre}` : c.contacto ? ` · ${c.contacto}` : ''}
                        </p>
                      </div>
                      <EstadoBadge c={c} />
                    </div>

                    {/* Chips de servicios */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {!c.soloProyecto && (
                        <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#EFE6D3] text-carbon">
                          QR {nombrePlan(c.plan)}
                        </span>
                      )}
                      {c.tieneSignature && (
                        <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#F2DDE1] text-vino">
                          Signature
                        </span>
                      )}
                      {c.tieneExperience && (
                        <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#E3E7F1] text-[#1F2A44]">
                          Experience
                        </span>
                      )}
                      {c.plan === 'sala' && (
                        <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold bg-oro/20 text-[#8C6D28]">
                          Fundador
                        </span>
                      )}
                    </div>

                    {/* Siguiente paso */}
                    {c.siguientePaso && (
                      <div className="mt-3 rounded-xl bg-papel p-2.5 text-xs">
                        <span className="font-semibold text-carbon">Siguiente paso:</span>{' '}
                        <span className="text-grafito">{c.siguientePaso}</span>
                      </div>
                    )}

                    {/* Selector de comercial con el Equipo */}
                    {!esComercial && miembrosEquipo.length > 0 && !c.soloProyecto && (
                      <div className="mt-3 border-t border-linea pt-2.5">
                        <form action={asignarComercialAction} className="flex items-center justify-between gap-2 text-xs">
                          <input type="hidden" name="restauranteId" value={c.restauranteId} />
                          <label className="text-niebla shrink-0">Comercial:</label>
                          <select
                            name="comercialId"
                            defaultValue={c.comercialId || ''}
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                            className="rounded-lg border border-linea bg-papel px-2 py-1 text-xs text-carbon outline-none focus:border-vino"
                          >
                            <option value="">Sin asignar</option>
                            {miembrosEquipo.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nombre}
                              </option>
                            ))}
                          </select>
                        </form>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-linea pt-3 text-xs">
                      <div>
                        {!esComercial && (
                          <>
                            <span className="text-niebla">Paga: </span>
                            <span className="font-semibold tabular-nums text-carbon">{euros(c.cuota)}/mes</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!c.soloProyecto && (
                          <a
                            href={`/m/${c.slug}`}
                            target="_blank"
                            rel="noopener"
                            className="rounded-lg border border-linea bg-papel px-2.5 py-1 font-medium text-carbon hover:bg-white"
                          >
                            Carta ↗
                          </a>
                        )}
                        <Link
                          href={urlFicha}
                          className="rounded-lg bg-vino px-3 py-1 font-semibold text-white hover:bg-hondo"
                        >
                          Ficha →
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Vista de escritorio (>=768px): Tabla unificada con diseño de autor Gran Reserva */}
          <div className="hidden overflow-x-auto rounded-2xl border border-linea bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-linea bg-papel text-left text-xs uppercase tracking-wider text-niebla">
                <tr>
                  <th className="px-5 py-3.5">Local</th>
                  <th className="px-4 py-3.5">Servicios</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Comercial</th>
                  <th className="px-4 py-3.5">Siguiente paso</th>
                  {!esComercial && <th className="px-4 py-3.5 text-right">Paga/mes</th>}
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {clientesFiltrados.map((c) => {
                  const urlFicha = c.soloProyecto
                    ? `/admin-dkitchen/proyectos/${c.restauranteId}`
                    : `/admin-dkitchen/qr/${c.restauranteId}`;

                  return (
                    <tr key={c.restauranteId} className="transition-colors hover:bg-papel/60">
                      <td className="px-5 py-3.5">
                        <Link href={urlFicha} className="font-display font-semibold text-carbon hover:text-vino">
                          {c.nombre}
                        </Link>
                        <p className="text-xs text-ceniza">
                          <span>{c.ciudad || 'España'}</span>
                          {c.contacto && <span> · {c.contacto}</span>}
                          {!c.soloProyecto ? (
                            <a
                              href={`/m/${c.slug}`}
                              target="_blank"
                              rel="noopener"
                              className="ml-1.5 text-niebla hover:text-carbon"
                            >
                              /{c.slug} ↗
                            </a>
                          ) : (
                            <span className="ml-1.5 text-niebla italic">(Proyecto)</span>
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {!c.soloProyecto && (
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#EFE6D3] text-carbon">
                              QR {nombrePlan(c.plan)}
                            </span>
                          )}
                          {c.tieneSignature && (
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F2DDE1] text-vino">
                              Signature
                            </span>
                          )}
                          {c.tieneExperience && (
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#E3E7F1] text-[#1F2A44]">
                              Experience
                            </span>
                          )}
                          {c.plan === 'sala' && (
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-oro/20 text-[#8C6D28]">
                              Fundador
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <EstadoBadge c={c} />
                      </td>

                      {/* Asignación de comercial con selector del Equipo */}
                      <td className="px-4 py-3.5 text-xs">
                        {!esComercial && miembrosEquipo.length > 0 && !c.soloProyecto ? (
                          <form action={asignarComercialAction}>
                            <input type="hidden" name="restauranteId" value={c.restauranteId} />
                            <select
                              name="comercialId"
                              defaultValue={c.comercialId || ''}
                              onChange={(e) => e.currentTarget.form?.requestSubmit()}
                              className="rounded-lg border border-linea bg-papel px-2 py-1 text-xs text-carbon outline-none focus:border-vino transition hover:border-acero"
                              title="Reasignar comercial del equipo"
                            >
                              <option value="">Sin asignar</option>
                              {miembrosEquipo.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nombre}
                                </option>
                              ))}
                            </select>
                          </form>
                        ) : (
                          <span className="font-medium text-carbon">
                            {c.comercialNombre || 'Sin asignar'}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        {c.siguientePaso ? (
                          <span className="font-medium text-carbon">{c.siguientePaso}</span>
                        ) : (
                          <span className="text-ceniza">—</span>
                        )}
                      </td>

                      {!esComercial && (
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-carbon">
                          {euros(c.cuota)}
                        </td>
                      )}

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={urlFicha}
                          className="inline-flex items-center rounded-lg border border-linea bg-white px-2.5 py-1 text-xs font-semibold text-vino hover:border-vino hover:bg-papel transition"
                        >
                          Ver ficha →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
