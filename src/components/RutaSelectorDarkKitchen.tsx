'use client';

import { useState } from 'react';
import DarkKitchen from './DarkKitchen';
import MarcaEnCaja from './MarcaEnCaja';

/**
 * Selector entre las dos rutas de Dark Kitchen Multimarca (DKITCHEN_MIGRACION_COMPLETA.md,
 * Sección 9): una sola página con selector, no dos páginas separadas — fragmentaría el SEO
 * de una keyword ya nicho y duplicaría navegación para un visitante que a veces no sabe
 * todavía en qué situación está.
 */
export default function RutaSelectorDarkKitchen() {
  const [ruta, setRuta] = useState<'A' | 'B'>('A');

  return (
    <div>
      <div className="bg-white py-10 md:py-14 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
          <p className="text-lg md:text-xl font-bold text-gray-900 mb-6">¿Partes de cero o ya tienes cocina operativa?</p>
          <div className="inline-flex bg-gray-100 rounded-full p-1.5">
            <button
              onClick={() => setRuta('A')}
              className={`px-6 py-3 rounded-full font-bold text-sm transition-all ${
                ruta === 'A' ? 'bg-vino text-white shadow-lg' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Empezar desde cero
            </button>
            <button
              onClick={() => setRuta('B')}
              className={`px-6 py-3 rounded-full font-bold text-sm transition-all ${
                ruta === 'B' ? 'bg-vino text-white shadow-lg' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ya tengo cocina, quiero sumar marca
            </button>
          </div>
        </div>
      </div>
      {ruta === 'A' ? <DarkKitchen /> : <MarcaEnCaja />}
    </div>
  );
}
