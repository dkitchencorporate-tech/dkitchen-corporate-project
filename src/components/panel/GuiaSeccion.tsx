'use client';

import { useEffect, useState } from 'react';

/**
 * Guía de cada sección del panel (01/10/2026): recuadro pequeño y plegado que se
 * abre al pulsarlo, con los pasos numerados. Plegada por defecto: no es invasiva.
 */
export const GUIAS: Record<string, { titulo: string; pasos: string[] }> = {
  inicio: { titulo: 'Cómo empezar', pasos: ['Sigue los «Primeros pasos» de esta portada, de arriba abajo.', 'Carta → Estudio: crea tus categorías y añade los platos dentro de cada una.', 'Carta → Diseño: elige cómo se ve tu carta.', 'Carta → Mi QR: descarga tu código e imprímelo.', '¿Dudas? Pulsa el botón «?» de abajo a la derecha.'] },
  carta: { titulo: 'Cambios rápidos de tus platos', pasos: ['Aquí cambias lo del día: precio, foto o «agotado».', 'Toca un plato para editarlo. Para crear categorías, especiales, combos o promociones, usa Carta → Estudio.', 'En la foto: «Subir foto» o «✨ Crear con IA». La foto se encuadra y se ilumina sola.', 'Bajo el nombre y la descripción tienes «Aa Corregir» y «✨ Mejorar texto».'] },
  estudio: { titulo: 'Construye tu carta paso a paso', pasos: ['Categorías: crea una (p. ej. «Entrantes»), ábrela y añade sus platos ahí mismo. Puedes ponerle una descripción y ordenarlas con ▲▼.', 'Especiales y promociones: marca un plato como Especial, Nuevo o Recomendado, o ponle un precio de promoción con fechas.', 'Combos: junta varios platos con un precio cerrado; la carta muestra cuánto se ahorra el cliente.', 'Páginas legales: rellena tus datos y publícalas en el pie de tu carta.'] },
  diseno: { titulo: 'Cómo se ve tu carta', pasos: ['Elige estilo, fondo, letra y color; mira la vista previa a la derecha.', 'La etiqueta de cada estilo te dice si muestra fotos y banners.', 'La foto de cabecera (estilo Visual) se elige en «Foto de portada», aquí mismo.', 'Pulsa «Guardar estilo» y tu carta cambia al momento.'] },
  idiomas: { titulo: 'Tu carta en otros idiomas', pasos: ['Elige hasta 3 idiomas.', 'DKitchen traduce tu carta; aquí ves el estado de cada traducción.', 'Tus clientes ven un selector de idioma en la carta.'] },
  promociones: { titulo: 'Banners de tu carta', pasos: ['Crea un banner con imagen (súbela o «✨ Crear con IA») o solo con texto.', 'Elige qué hace el botón: nada, ir a una sección, abrir un plato o reservar.', 'Opcional: fechas, días y horas en que se muestra.', 'Bajo el título y el texto tienes «Aa Corregir» y «✨ Mejorar texto».'] },
  qr: { titulo: 'Tu código QR', pasos: ['Descarga el PNG en alta resolución e imprímelo (mínimo 3 cm).', 'O pide aquí tu QR físico profesional.', 'El QR no cambia nunca aunque cambies la carta.'] },
  reservas: { titulo: 'Reservas', pasos: ['Te llegan las reservas que hacen tus clientes desde la carta.', 'Confírmalas o recházalas; el cliente recibe la respuesta.', 'Pon tu WhatsApp en Negocio → Mi local para recibirlas también ahí.'] },
  camarero: { titulo: 'Llamadas de mesa', pasos: ['Deja esta pantalla abierta en la barra: avisa cuando una mesa llama o pide la cuenta.', 'Imprime los QR por mesa para saber quién llama.'] },
  sala: { titulo: 'Tu sala', pasos: ['Dibuja tu sala arrastrando mesas y elementos.', 'En el móvil: zoom y botones − y + para el tamaño.', 'El botón «?» del editor explica cada herramienta.'] },
  escaneos: { titulo: 'Visitas de tu carta', pasos: ['Cada escaneo es una vez que alguien abre tu carta desde el QR.', 'El contador grande es del mes en curso: el día 1 vuelve a empezar. Abajo ves los últimos 30 días.'] },
  local: { titulo: 'Datos de tu local', pasos: ['Nombre, logo, horario, teléfono y dirección aparecen en tu carta.', 'Pon tu WhatsApp para recibir reservas.', 'Sigue la guía para poner tu carta en Google Maps.'] },
  plan: { titulo: 'Tu plan y tus cobros', pasos: ['Ves lo que pagas, el próximo cobro (día 12) y el desglose.', 'Desde aquí subes de plan o te das de baja.'] },
  modulos: { titulo: 'Mejoras para tu local', pasos: ['Cada mejora muestra su precio antes de pagar.', 'Imágenes con IA: 3 gratis y bono de 50 cuando lo necesites.', 'Signature: tu propia app con pedidos y clientes.'] },
  soporte: { titulo: 'Ayuda', pasos: ['Pulsa «Abrir el chat de ayuda» para respuestas al momento.', 'Si no se resuelve, se lo pasa a una persona con todo el contexto.', 'Aquí ves tus mensajes y nuestras respuestas.'] },
};

export default function GuiaSeccion({ seccion }: { seccion: string }) {
  const guia = GUIAS[seccion];
  const [abierta, setAbierta] = useState(false);
  useEffect(() => { setAbierta(false); }, [seccion]);
  if (!guia) return null;
  return (
    <div className="mb-5">
      <button onClick={() => setAbierta(!abierta)} aria-expanded={abierta}
        className="inline-flex items-center gap-2 rounded-full border border-[#E6E2DC] bg-white px-3.5 py-1.5 text-[13px] font-medium text-grafito hover:border-vino/40">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vino text-[11px] font-bold text-white">?</span>
        {abierta ? 'Ocultar la guía' : `Guía: ${guia.titulo.toLowerCase()}`}
      </button>
      {abierta && (
        <ol className="mt-2 max-w-2xl space-y-1.5 rounded-2xl border border-[#E6E2DC] bg-white p-4 text-sm text-grafito">
          {guia.pasos.map((p, i) => (
            <li key={i} className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3EDE6] text-[11px] font-bold text-vino">{i + 1}</span><span>{p}</span></li>
          ))}
        </ol>
      )}
    </div>
  );
}
